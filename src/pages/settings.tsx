import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Eye, EyeOff, Wifi, WifiOff, Upload, Check, CreditCard,
  Bell, Shield, Cake, Heart, Star, Gift, Clock, Loader2,
  Zap, AlertTriangle, CheckCircle2, Camera,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  getAutomations, updateAutomation, getMyBakery, updateBakeryWhatsapp,
  updateBakery, uploadBakeryLogo, getSubscriptionState, getTrialDaysLeft,
  type Automation, type Bakery,
} from "@/lib/db";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

type WAStatus = "idle" | "connecting" | "waiting_qr" | "connected" | "disconnecting" | "error";

interface ProfileFormData {
  bakeryName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
}

interface NotifState {
  campaignUpdates: boolean;
  weeklyReports: boolean;
  systemAlerts: boolean;
}

type AutomationTypeKey = Automation["type"];

const automationMeta: Record<AutomationTypeKey, { icon: React.ElementType; color: string; iconColor: string; label: string; hint: string }> = {
  birthday:    { icon: Cake,  color: "bg-orange-100", iconColor: "text-orange-500",  label: "Birthday Reminder",   hint: "Sends a personalized birthday message to customers before their birthday." },
  anniversary: { icon: Heart, color: "bg-pink-100",   iconColor: "text-pink-500",    label: "Anniversary Reminder",hint: "Wishes customers a happy anniversary and invites them back to celebrate." },
  winback:     { icon: Star,  color: "bg-yellow-100", iconColor: "text-yellow-500",  label: "Win-Back Message",    hint: "Re-engages customers who haven't visited recently with a special offer." },
  welcome:     { icon: Gift,  color: "bg-purple-100", iconColor: "text-purple-500",  label: "Welcome Message",     hint: "Greets new customers with a warm welcome and introductory discount." },
  custom:      { icon: Bell,  color: "bg-blue-100",   iconColor: "text-blue-500",    label: "Custom Automation",   hint: "Custom automation rule configured by you." },
};

const PLAN_FEATURES = [
  "Unlimited customers", "Unlimited WhatsApp campaigns",
  "Birthday & anniversary automations", "Campaign image attachments",
  "Bulk message sending", "Advanced analytics & reports",
  "n8n automation integration", "Priority support",
];

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]          = useState(false);
  const [notifications, setNotifications]  = useState<NotifState>({ campaignUpdates: true, weeklyReports: false, systemAlerts: true });
  const [automations, setAutomations]      = useState<Automation[]>([]);
  const [automationsLoading, setAutomationsLoading] = useState(true);
  const [saved, setSaved]   = useState<string | null>(null);
  const [bakery, setBakery] = useState<Bakery | null>(null);

  // Logo upload state
  const [logoPreview, setLogoPreview]   = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp state
  const [waStatus, setWaStatus]   = useState<WAStatus>("idle");
  const [waPhone, setWaPhone]     = useState<string | null>(null);
  const [waQr, setWaQr]           = useState<string | null>(null);
  const [waError, setWaError]     = useState<string | null>(null);
  const [bakeryId, setBakeryId]   = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [testPhone, setTestPhone]   = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${SERVER_URL}/qr/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.connected) {
          stopPolling();
          setWaStatus("connected");
          setWaPhone(data.phone ?? null);
          setWaQr(null);
          updateBakeryWhatsapp(true).catch(console.error);
        } else if (data.qr) {
          setWaStatus("waiting_qr");
          setWaQr(data.qr);
        }
      } catch { /* server not ready */ }
    }, 2500);
  };

  const handleConnect = async () => {
    if (!bakeryId) return;
    setWaStatus("connecting"); setWaError(null); setWaQr(null);
    try {
      const res  = await fetch(`${SERVER_URL}/connect/${bakeryId}`, { method: "POST" });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      if (data.alreadyConnected) {
        const sr = await fetch(`${SERVER_URL}/status/${bakeryId}`);
        const sd = await sr.json();
        setWaStatus("connected"); setWaPhone(sd.phone ?? null);
      } else {
        setWaStatus("waiting_qr");
        startPolling(bakeryId);
      }
    } catch {
      setWaStatus("error");
      setWaError("Could not reach the WhatsApp server. Make sure it is running.");
    }
  };

  const handleSendTest = async () => {
    if (!bakeryId || !testPhone.trim()) return;
    setTestSending(true); setTestResult(null);
    try {
      const digits = testPhone.trim().replace(/[^0-9]/g, "");
      const phone  = digits.length === 10 ? "91" + digits : digits;
      const res    = await fetch(`${SERVER_URL}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bakeryId, phone, message: "👋 Hello from BakeryPing! Your WhatsApp connection is working perfectly. 🎂" }),
      });
      if (res.ok) {
        setTestResult({ ok: true, msg: "Message sent! Check WhatsApp on the recipient's phone." });
      } else {
        const err = await res.json();
        setTestResult({ ok: false, msg: err.error ?? "Send failed." });
      }
    } catch {
      setTestResult({ ok: false, msg: "Could not reach the server." });
    } finally {
      setTestSending(false);
    }
  };

  const handleDisconnect = async () => {
    if (!bakeryId) return;
    setWaStatus("disconnecting"); stopPolling();
    try {
      await fetch(`${SERVER_URL}/disconnect/${bakeryId}`, { method: "POST" });
      await updateBakeryWhatsapp(false);
    } catch { /* best effort */ }
    setWaStatus("idle"); setWaPhone(null); setWaQr(null);
  };

  useEffect(() => {
    getMyBakery().then((b) => {
      if (!b) return;
      setBakery(b);
      setBakeryId(b.id);
      if (b.logo_url) setLogoPreview(b.logo_url);
      profileForm.reset({
        bakeryName: b.name ?? "",
        ownerName:  "",
        email:      "",
        phone:      b.phone ?? "",
        address:    "",
        bio:        "",
      });
      fetch(`${SERVER_URL}/status/${b.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.connected) { setWaStatus("connected"); setWaPhone(data.phone ?? null); }
          else if (data.exists && data.qr) { setWaStatus("waiting_qr"); setWaQr(data.qr); startPolling(b.id); }
        })
        .catch(() => { /* server offline */ });
    }).catch(console.error);

    return () => stopPolling();
  }, []);

  useEffect(() => {
    getAutomations().then(setAutomations).catch(console.error).finally(() => setAutomationsLoading(false));
  }, []);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: { bakeryName: "", ownerName: "", email: "", phone: "", address: "", bio: "" },
  });

  const handleSaveMeta = (label: string) => {
    setSaved(label);
    setTimeout(() => setSaved(null), 2500);
  };

  const handleSaveProfile = async (values: ProfileFormData) => {
    await updateBakery({ name: values.bakeryName, phone: values.phone });
    setBakery((prev) => prev ? { ...prev, name: values.bakeryName, phone: values.phone } : prev);
    handleSaveMeta("profile");
  };

  // Logo upload
  const handleLogoFile = async (file: File) => {
    if (!bakeryId || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingLogo(true);
    const url = await uploadBakeryLogo(file, bakeryId);
    if (url) {
      await updateBakery({ logo_url: url });
      setBakery((prev) => prev ? { ...prev, logo_url: url } : prev);
    }
    setUploadingLogo(false);
  };

  const toggleNotif = (key: keyof NotifState) => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleAutomation = async (id: string, current: boolean) => {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !current } : a)));
    try {
      await updateAutomation(id, { enabled: !current });
    } catch {
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: current } : a)));
    }
  };

  const subscriptionState = getSubscriptionState(bakery);
  const daysLeft          = getTrialDaysLeft(bakery);
  const trialEndsDate     = bakery?.trial_ends_at
    ? new Date(bakery.trial_ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your bakery profile and account preferences</p>
        </motion.div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="profile"      className="text-xs sm:text-sm">Bakery Profile</TabsTrigger>
            <TabsTrigger value="whatsapp"     className="text-xs sm:text-sm">WhatsApp</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="subscription" className="text-xs sm:text-sm">Subscription</TabsTrigger>
            <TabsTrigger value="account"      className="text-xs sm:text-sm">Account</TabsTrigger>
          </TabsList>

          {/* ── Profile ── */}
          <TabsContent value="profile">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-base mb-5">Bakery Profile</h2>

              {/* Logo upload — actually works */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-2xl text-primary overflow-hidden">
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                      : (bakery?.name?.charAt(0) ?? "B")}
                  </div>
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Bakery Logo</div>
                  <div className="text-xs text-muted-foreground mb-2">PNG, JPG up to 2 MB · Recommended: 256×256 px</div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                  />
                  <Button
                    variant="outline" size="sm"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo
                      ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Uploading…</>
                      : <><Camera className="w-3.5 h-3.5 mr-2" /> Upload logo</>}
                  </Button>
                </div>
              </div>

              <form
                onSubmit={profileForm.handleSubmit(handleSaveProfile)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Bakery Name</Label>
                  <Input {...profileForm.register("bakeryName")} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Owner Name</Label>
                  <Input {...profileForm.register("ownerName")} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Email</Label>
                  <Input type="email" {...profileForm.register("email")} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Phone</Label>
                  <Input {...profileForm.register("phone")} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium mb-1.5 block">Address</Label>
                  <Input {...profileForm.register("address")} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium mb-1.5 block">About your bakery</Label>
                  <Textarea rows={3} {...profileForm.register("bio")} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit">
                    {saved === "profile" ? <><Check className="w-4 h-4 mr-2" /> Saved</> : "Save changes"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </TabsContent>

          {/* ── WhatsApp ── */}
          <TabsContent value="whatsapp">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-base mb-1">WhatsApp Connection</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Connect your WhatsApp account to send automated reminders to your customers.
              </p>

              {waStatus === "connected" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                    <Wifi className="w-5 h-5 text-green-600 shrink-0" />
                    <div><div className="text-sm font-medium text-green-800">Connected</div><div className="text-xs text-green-700">Session active</div></div>
                    <Badge className="ml-auto bg-green-600 text-white text-xs">Live</Badge>
                  </div>
                  {waPhone && (
                    <div>
                      <div className="text-sm font-medium mb-1">Phone Number</div>
                      <div className="text-sm text-muted-foreground p-3 bg-muted/40 rounded-lg">+{waPhone}</div>
                    </div>
                  )}
                  <Separator />
                  <div>
                    <div className="text-sm font-medium mb-1">Send a test message</div>
                    <p className="text-xs text-muted-foreground mb-3">Enter any Indian mobile number to verify sending works.</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. 9876543210"
                        value={testPhone}
                        onChange={(e) => { setTestPhone(e.target.value); setTestResult(null); }}
                        className="max-w-xs"
                      />
                      <Button onClick={handleSendTest} disabled={testSending || !testPhone.trim()} size="sm">
                        {testSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : "Send test"}
                      </Button>
                    </div>
                    {testResult && (
                      <div className={`mt-3 text-xs px-3 py-2 rounded-lg border ${testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-destructive/5 border-destructive/20 text-destructive"}`}>
                        {testResult.ok ? "✓ " : "✗ "}{testResult.msg}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <Button variant="outline" className="text-destructive hover:text-destructive w-fit" onClick={handleDisconnect}>
                    <WifiOff className="w-4 h-4 mr-2" /> Disconnect WhatsApp
                  </Button>
                </div>
              )}

              {(waStatus === "idle" || waStatus === "error") && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                    <WifiOff className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div><div className="text-sm font-medium">Not connected</div><div className="text-xs text-muted-foreground">Connect your WhatsApp to send messages</div></div>
                  </div>
                  {waError && <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">{waError}</div>}
                  <Button onClick={handleConnect} className="w-fit"><Wifi className="w-4 h-4 mr-2" /> Connect WhatsApp</Button>
                </div>
              )}

              {waStatus === "connecting" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                  <div className="text-sm">Connecting to WhatsApp server…</div>
                </div>
              )}

              {waStatus === "waiting_qr" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                    <div><div className="text-sm font-medium text-blue-800">Scan QR code</div><div className="text-xs text-blue-700">Open WhatsApp → Linked Devices → Link a Device</div></div>
                  </div>
                  {waQr ? (
                    <div className="flex flex-col items-center gap-3">
                      <img src={waQr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl border border-border shadow" />
                      <p className="text-xs text-muted-foreground">QR refreshes automatically if it expires</p>
                    </div>
                  ) : (
                    <div className="w-56 h-56 bg-muted/40 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}

              {waStatus === "disconnecting" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
                  <div className="text-sm text-muted-foreground">Disconnecting…</div>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ── Notifications / Automations ── */}
          <TabsContent value="notifications">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-base mb-1">Automation Rules</h2>
                <p className="text-sm text-muted-foreground mb-5">Toggle your WhatsApp automations on or off.</p>
                {automationsLoading ? (
                  <div className="flex flex-col gap-3">{[1,2,3,4].map((i) => <div key={i} className="h-20 bg-muted/40 rounded-2xl animate-pulse" />)}</div>
                ) : automations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-2xl">
                    <Bell className="w-9 h-9 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No automation rules found</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {automations.map((automation, i) => {
                      const meta = automationMeta[automation.type] ?? automationMeta.custom;
                      const Icon = meta.icon;
                      return (
                        <motion.div
                          key={automation.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${automation.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-70"}`}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                            <Icon className={`w-5 h-5 ${meta.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{automation.name}</span>
                              {automation.days_before > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                  <Clock className="w-2.5 h-2.5" />{automation.days_before}d before
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{meta.hint}</p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={`text-xs font-medium hidden sm:block ${automation.enabled ? "text-green-600" : "text-muted-foreground"}`}>
                              {automation.enabled ? "On" : "Off"}
                            </span>
                            <Switch checked={automation.enabled} onCheckedChange={() => toggleAutomation(automation.id, automation.enabled)} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-base mb-1">Alert Preferences</h2>
                <p className="text-sm text-muted-foreground mb-5">Control which platform alerts BakeryPing sends to you.</p>
                <div className="flex flex-col gap-1 divide-y divide-border">
                  {[
                    { key: "campaignUpdates" as const, label: "Campaign Updates",  desc: "Receive delivery reports and campaign summaries" },
                    { key: "weeklyReports"   as const, label: "Weekly Reports",    desc: "A weekly digest of messages sent and delivered" },
                    { key: "systemAlerts"    as const, label: "System Alerts",     desc: "WhatsApp disconnection and critical issue alerts" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <div>
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-xs font-medium hidden sm:block ${notifications[key] ? "text-green-600" : "text-muted-foreground"}`}>
                          {notifications[key] ? "On" : "Off"}
                        </span>
                        <Switch checked={notifications[key]} onCheckedChange={() => toggleNotif(key)} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-5 border-t border-border">
                  <Button onClick={() => handleSaveMeta("notifications")}>
                    {saved === "notifications" ? <><Check className="w-4 h-4 mr-2" /> Saved</> : "Save preferences"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Subscription ── */}
          <TabsContent value="subscription">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
              {subscriptionState === "trial" && (
                <div className="bg-card border border-blue-200 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-2">Free Trial</Badge>
                      <h2 className="text-xl font-bold">BakeryPing Pro</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have <span className="font-semibold text-foreground">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span> remaining.
                        {trialEndsDate && <> Trial ends {trialEndsDate}.</>}
                      </p>
                    </div>
                    <div className="text-right shrink-0"><div className="text-3xl font-extrabold">₹8,000</div><div className="text-xs text-muted-foreground">/month</div></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    {PLAN_FEATURES.map((f) => <div key={f} className="flex items-center gap-2 text-sm"><Check className="w-3.5 h-3.5 text-primary shrink-0" />{f}</div>)}
                  </div>
                  <Button onClick={() => setLocation("/subscribe")}><Zap className="w-4 h-4 mr-2" /> Subscribe — ₹8,000/month</Button>
                </div>
              )}

              {subscriptionState === "trial_ending" && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-amber-800 mb-1">
                        Trial ends in {daysLeft === 0 ? "less than 24 hours" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}!
                      </div>
                      <p className="text-sm text-amber-700">Subscribe now to keep access after your trial ends.</p>
                    </div>
                    <div className="text-right shrink-0"><div className="text-2xl font-extrabold text-amber-800">₹8,000</div><div className="text-xs text-amber-600">/month</div></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    {PLAN_FEATURES.map((f) => <div key={f} className="flex items-center gap-2 text-sm text-amber-800"><Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />{f}</div>)}
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setLocation("/subscribe")}><Zap className="w-4 h-4 mr-2" /> Subscribe — ₹8,000/month</Button>
                </div>
              )}

              {subscriptionState === "active" && (
                <div className="bg-card border border-green-200 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <Badge className="bg-green-100 text-green-700 border-green-200 mb-2">Active</Badge>
                      <h2 className="text-xl font-bold">BakeryPing Pro</h2>
                      <p className="text-sm text-muted-foreground mt-1">Your subscription is active and renews monthly.</p>
                    </div>
                    <div className="text-right shrink-0"><div className="text-3xl font-extrabold">₹8,000</div><div className="text-xs text-muted-foreground">/month</div></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    {PLAN_FEATURES.map((f) => <div key={f} className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />{f}</div>)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 w-fit">
                    <CreditCard className="w-3.5 h-3.5" /> Managed via Razorpay · Cancel anytime
                  </div>
                </div>
              )}

              {subscriptionState === "expired" && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-destructive mb-1">Your trial has expired</div>
                      <p className="text-sm text-muted-foreground">Subscribe to restore access to all BakeryPing features.</p>
                    </div>
                    <div className="text-right shrink-0"><div className="text-2xl font-extrabold">₹8,000</div><div className="text-xs text-muted-foreground">/month</div></div>
                  </div>
                  <Button onClick={() => setLocation("/subscribe")}><Zap className="w-4 h-4 mr-2" /> Subscribe — ₹8,000/month</Button>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ── Account ── */}
          <TabsContent value="account">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5"><Shield className="w-4 h-4 text-muted-foreground" /><h2 className="font-semibold text-base">Change Password</h2></div>
                <div className="flex flex-col gap-4 max-w-sm">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Current password</Label>
                    <div className="relative">
                      <Input type={showCurrentPw ? "text" : "password"} placeholder="Current password" className="pr-10" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">New password</Label>
                    <div className="relative">
                      <Input type={showNewPw ? "text" : "password"} placeholder="Min. 8 characters" className="pr-10" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPw(!showNewPw)}>
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button className="w-fit" onClick={() => handleSaveMeta("password")}>
                    {saved === "password" ? <><Check className="w-4 h-4 mr-2" /> Updated</> : "Update password"}
                  </Button>
                </div>
              </div>
              <div className="bg-card border border-destructive/20 rounded-2xl p-6">
                <h2 className="font-semibold text-base text-destructive mb-2">Danger Zone</h2>
                <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
                <Button variant="destructive">Delete account</Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
