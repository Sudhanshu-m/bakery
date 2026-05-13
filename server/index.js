import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, "..", "sessions");

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());

const sessions = {};

// Normalize to Indian number: bare 10-digit numbers get 91 prefixed automatically
function normalizePhone(phone) {
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (digits.length === 10) return "91" + digits;
  return digits;
}

function clearSessionFiles(bakeryId) {
  const sessionDir = path.join(SESSIONS_DIR, bakeryId);
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to clear session files for ${bakeryId}:`, err.message);
  }
}

async function createSession(bakeryId) {
  const sessionDir = path.join(SESSIONS_DIR, bakeryId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["BakeryPing", "Chrome", "1.0.0"],
  });

  sessions[bakeryId] = { sock, qr: null, connected: false, phone: null };

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log(`[${bakeryId}] QR generated`);
      sessions[bakeryId].qr = await QRCode.toDataURL(qr);
      sessions[bakeryId].connected = false;
    }

    if (connection === "open") {
      const phone = sock.user?.id?.split(":")[0] ?? null;
      console.log(`[${bakeryId}] Connected — phone: ${phone}`);
      sessions[bakeryId].connected = true;
      sessions[bakeryId].phone = phone;
      sessions[bakeryId].qr = null;
    }

    if (connection === "close") {
      sessions[bakeryId].connected = false;
      sessions[bakeryId].phone = null;

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[${bakeryId}] Disconnected — statusCode: ${statusCode}`);

      if (!loggedOut) {
        console.log(`[${bakeryId}] Reconnecting…`);
        // Small delay before reconnect to avoid tight loops
        setTimeout(() => createSession(bakeryId), 3000);
      } else {
        console.log(`[${bakeryId}] Logged out — clearing session`);
        delete sessions[bakeryId];
        clearSessionFiles(bakeryId);
      }
    }
  });
}

// ── On startup: reconnect any sessions saved on disk ──────────────────────────
// This means owners only scan QR once — the session persists across restarts.
async function reconnectExistingSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const entries = fs.readdirSync(SESSIONS_DIR);
  for (const entry of entries) {
    const sessionDir = path.join(SESSIONS_DIR, entry);
    if (!fs.statSync(sessionDir).isDirectory()) continue;
    const hasCreds = fs.existsSync(path.join(sessionDir, "creds.json"));
    if (!hasCreds) continue;
    console.log(`[startup] Reconnecting saved session: ${entry}`);
    try {
      await createSession(entry);
    } catch (err) {
      console.error(`[startup] Failed to reconnect ${entry}:`, err.message);
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Start a new WhatsApp session (or return existing)
app.post("/connect/:bakeryId", async (req, res) => {
  try {
    const { bakeryId } = req.params;
    if (sessions[bakeryId]?.connected) {
      return res.json({ success: true, alreadyConnected: true });
    }
    if (!sessions[bakeryId]) {
      await createSession(bakeryId);
    }
    res.json({ success: true, bakeryId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Check current connection status
app.get("/status/:bakeryId", (req, res) => {
  const { bakeryId } = req.params;
  const session = sessions[bakeryId];
  if (!session) {
    return res.json({ exists: false, connected: false, qr: null, phone: null });
  }
  res.json({
    exists: true,
    connected: session.connected,
    qr: session.qr,
    phone: session.phone,
  });
});

// Poll for QR code / connection state
app.get("/qr/:bakeryId", (req, res) => {
  const { bakeryId } = req.params;
  const session = sessions[bakeryId];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ qr: session.qr, connected: session.connected, phone: session.phone });
});

// Disconnect and clear a session
app.post("/disconnect/:bakeryId", async (req, res) => {
  try {
    const { bakeryId } = req.params;
    const session = sessions[bakeryId];
    if (!session) {
      return res.json({ success: true, message: "No active session" });
    }
    try {
      await session.sock.logout();
    } catch {
      try { session.sock.end(); } catch { /* already closed */ }
    }
    delete sessions[bakeryId];
    clearSessionFiles(bakeryId);
    console.log(`[${bakeryId}] Session disconnected and cleared`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// Send a single WhatsApp message
app.post("/send-message", async (req, res) => {
  try {
    const { bakeryId, phone, message } = req.body;
    const session = sessions[bakeryId];
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.connected) return res.status(400).json({ error: "WhatsApp not connected" });

    const jid = normalizePhone(phone) + "@s.whatsapp.net";
    await session.sock.sendMessage(jid, { text: message });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Message failed" });
  }
});

// Bulk send — used when publishing a campaign
app.post("/send-bulk", async (req, res) => {
  try {
    const { bakeryId, recipients } = req.body;
    // recipients: Array<{ phone: string; message: string }>
    const session = sessions[bakeryId];
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.connected) return res.status(400).json({ error: "WhatsApp not connected" });

    const results = { sent: 0, failed: 0, errors: [] };

    for (const { phone, message } of recipients) {
      try {
        const jid = normalizePhone(phone) + "@s.whatsapp.net";
        await session.sock.sendMessage(jid, { text: message });
        results.sent++;
        // Small delay between messages to avoid rate-limiting
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        results.failed++;
        results.errors.push({ phone, error: err.message });
      }
    }

    res.json({ success: true, ...results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bulk send failed" });
  }
});

app.get("/", (_req, res) => {
  res.json({
    status: "BakeryPing WhatsApp server running",
    activeSessions: Object.keys(sessions).length,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`WhatsApp server running on http://localhost:${PORT}`);
  await reconnectExistingSessions();
});
