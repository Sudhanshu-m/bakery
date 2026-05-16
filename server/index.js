import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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

// Supabase client (for webhook to update subscription status)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Razorpay webhook secret (set in Render env vars)
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

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
        setTimeout(() => createSession(bakeryId), 3000);
      } else {
        console.log(`[${bakeryId}] Logged out — clearing session`);
        delete sessions[bakeryId];
        clearSessionFiles(bakeryId);
      }
    }
  });
}

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

app.get("/qr/:bakeryId", (req, res) => {
  const { bakeryId } = req.params;
  const session = sessions[bakeryId];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ qr: session.qr, connected: session.connected, phone: session.phone });
});

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

// ── Helper: download image URL → Buffer so Baileys always gets raw bytes ──────
// Passing { url: ... } to Baileys can silently fail if the CDN blocks
// server-side fetches (Supabase Storage, Render networking, etc.).
// Downloading first and sending as a Buffer is always reliable.
async function fetchImageBuffer(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "BakeryPing/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status} ${response.statusText} — ${imageUrl}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimetype: response.headers.get("content-type") || "image/jpeg",
  };
}

// ── Send a single WhatsApp message (supports optional image) ─────────────────
app.post("/send-message", async (req, res) => {
  try {
    const { bakeryId, phone, message, imageUrl } = req.body;
    const session = sessions[bakeryId];
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.connected) return res.status(400).json({ error: "WhatsApp not connected" });

    const jid = normalizePhone(phone) + "@s.whatsapp.net";

    if (imageUrl) {
      console.log(`[${bakeryId}] Downloading image: ${imageUrl}`);
      const { buffer, mimetype } = await fetchImageBuffer(imageUrl);
      console.log(`[${bakeryId}] Image downloaded — ${buffer.length} bytes (${mimetype})`);
      await session.sock.sendMessage(jid, {
        image: buffer,
        mimetype,
        caption: message,
      });
    } else {
      await session.sock.sendMessage(jid, { text: message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(`[send-message] Error:`, err.message);
    res.status(500).json({ error: err.message || "Message failed" });
  }
});

// ── Bulk send (supports optional imageUrl for all recipients) ─────────────────
app.post("/send-bulk", async (req, res) => {
  try {
    const { bakeryId, recipients, imageUrl } = req.body;
    const session = sessions[bakeryId];
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.connected) return res.status(400).json({ error: "WhatsApp not connected" });

    const results = { sent: 0, failed: 0, errors: [] };

    // Download image ONCE before the loop — not on every message
    let imageBuffer = null;
    let imageMimetype = "image/jpeg";
    if (imageUrl) {
      try {
        console.log(`[${bakeryId}] Downloading campaign image: ${imageUrl}`);
        const result = await fetchImageBuffer(imageUrl);
        imageBuffer = result.buffer;
        imageMimetype = result.mimetype;
        console.log(`[${bakeryId}] Image ready — ${imageBuffer.length} bytes`);
      } catch (err) {
        console.error(`[${bakeryId}] Image download failed — sending text-only:`, err.message);
        // Don't abort the whole campaign — send text only if image fails
      }
    }

    for (const { phone, message } of recipients) {
      try {
        const jid = normalizePhone(phone) + "@s.whatsapp.net";

        if (imageBuffer) {
          await session.sock.sendMessage(jid, {
            image: imageBuffer,
            mimetype: imageMimetype,
            caption: message,
          });
        } else {
          await session.sock.sendMessage(jid, { text: message });
        }

        results.sent++;
        // Small delay between messages to avoid WhatsApp rate limits
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.error(`[${bakeryId}] Failed to send to ${phone}:`, err.message);
        results.failed++;
        results.errors.push({ phone, error: err.message });
      }
    }

    res.json({ success: true, ...results });
  } catch (err) {
    console.error(`[send-bulk] Error:`, err.message);
    res.status(500).json({ error: "Bulk send failed" });
  }
});

// ── Razorpay Webhook ──────────────────────────────────────────────────────────
// Razorpay calls this when a subscription payment succeeds or fails.
// Set this URL in Razorpay Dashboard → Settings → Webhooks
// URL: https://bakery-ur88.onrender.com/razorpay-webhook
app.post("/razorpay-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    // Verify webhook signature
    if (RAZORPAY_WEBHOOK_SECRET) {
      const signature = req.headers["x-razorpay-signature"];
      const expectedSig = crypto
        .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");
      if (signature !== expectedSig) {
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = JSON.parse(req.body.toString());
    console.log("[webhook] Razorpay event:", event.event);

    if (!supabase) {
      console.warn("[webhook] Supabase not configured — skipping DB update");
      return res.json({ received: true });
    }

    const subscriptionId = event.payload?.subscription?.entity?.id;
    const bakeryId = event.payload?.subscription?.entity?.notes?.bakery_id;

    if (event.event === "subscription.activated" || event.event === "subscription.charged") {
      // Payment succeeded — activate the bakery
      if (bakeryId) {
        await supabase.from("bakeries")
          .update({
            subscription_status: "active",
            razorpay_subscription_id: subscriptionId,
          })
          .eq("id", bakeryId);
        console.log(`[webhook] Bakery ${bakeryId} activated`);
      }
    }

    if (event.event === "subscription.cancelled" || event.event === "subscription.expired") {
      // Subscription ended — mark expired
      if (bakeryId) {
        await supabase.from("bakeries")
          .update({ subscription_status: "expired" })
          .eq("id", bakeryId);
        console.log(`[webhook] Bakery ${bakeryId} expired`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
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
