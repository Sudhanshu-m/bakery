import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi, WifiOff, RefreshCw, Clock, Bell, Heart, Cake, Gift,
  Star, Plus, Pencil, Trash2, X, Check,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getAutomations, updateAutomation, getCustomers, type Automation, type Customer } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────
type RuleType = Automation["type"];

interface LocalRule {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  days_before: number;
  message_template: string;
  fromDB: boolean; // true = backed by Supabase row
}

// ── Predefined fallback rules (always shown if DB is empty/unavailable) ───
const PRESET_RULES: LocalRule[] = [
  {
    id: "preset-birthday",
    name: "Birthday Reminder",
    type: "birthday",
    enabled: true,
    days_before: 3,
    message_template: "Hi {name}! 🎂 Happy Birthday from us! Come celebrate with a special treat — show this message for 15% off any cake today!",
    fromDB: false,
  },
  {
    id: "preset-anniversary",
    name: "Anniversary Reminder",
    type: "anniversary",
    enabled: true,
    days_before: 5,
    message_template: "Hi {name}! 🎉 Happy Anniversary! Celebrate this special day with a custom cake — use code ANNIV10 for 10% off.",
    fromDB: false,
  },
  {
    id: "preset-winback",
    name: "Win-Back Message",
    type: "winback",
    enabled: false,
    days_before: 30,
    message_template: "Hi {name}! We miss you! 🥐 Come back and enjoy a FREE pastry with your next order. See you soon!",
    fromDB: false,
  },
  {
    id: "preset-welcome",
    name: "Welcome Message",
    type: "welcome",
    enabled: true,
    days_before: 0,
    message_template: "Welcome, {name}! 🎉 Thanks for joining us. Enjoy 10% off your first order — just show this message.",
    fromDB: false,
  },
];

// ── UI metadata per type ──────────────────────────────────────────
const TYPE_META: Record<RuleType, { icon: React.ElementType; bg: string; fg: string; label: string }> = {
  birthday:    { icon: Cake,    bg: "bg-orange-100", fg: "text-orange-500", label: "Birthday" },
  anniversary: { icon: Heart,   bg: "bg-pink-100",   fg: "text-pink-500",   label: "Anniversary" },
  winback:     { icon: Star,    bg: "bg-yellow-100", fg: "text-yellow-500", label: "Win-Back" },
  welcome:     { icon: Gift,    bg: "bg-purple-100", fg: "text-purple-500", label: "Welcome" },
  custom:      { icon: Bell,    bg: "bg-blue-100",   fg: "text-blue-500",   label: "Custom" },
};

const timelineSteps = [
  { label: "Customer occasion detected",   detail: "System identifies upcoming birthday / anniversary",    active: true },
  { label: "Message template selected",    detail: "Personalized template chosen from your library",       active: true },
  { label: "Scheduling queue",             detail: "Message queued for delivery at the optimal send time", active: true },
  { label: "WhatsApp delivery",            detail: "Message sent from your connected WhatsApp number",     active: false },
  { label: "Delivery confirmed",           detail: "Read receipt tracked and logged in analytics",          active: false },
];

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getUpcoming(customers: Customer[]) {
  const today = new Date();
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const todayMMDD = fmt(today), in30MMDD = fmt(in30);
  const out: { id: string; name: string; occasion: string; date: string; days: number }[] = [];
  customers.forEach((c) => {
    (["birthday","anniversary"] as const).forEach((f) => {
      const v = c[f]; if (!v) return;
      const mmdd = v.slice(5);
      if (mmdd >= todayMMDD && mmdd <= in30MMDD) {
        const d = new Date(`${today.getFullYear()}-${mmdd}`);
        out.push({ id: `${c.id}-${f}`, name: c.name, occasion: f === "birthday" ? "Birthday" : "Anniversary", date: formatDate(v), days: Math.round((d.getTime()-today.getTime())/86400000) });
      }
    });
  });
  return out.sort((a,b)=>a.days-b.days).slice(0,5);
}

// ── Main component ────────────────────────────────────────────────
export default function AutomationsPage() {
  const [rules, setRules] = useState<LocalRule[]>(PRESET_RULES);
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<ReturnType<typeof getUpcoming>>([]);
  const [waConnected] = useState(true);

  // New rule dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<RuleType>("custom");
  const [newDays, setNewDays] = useState("1");
  const [newMsg, setNewMsg] = useState("Hi {name}! ");
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editRule, setEditRule] = useState<LocalRule | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [dbRules, customers] = await Promise.all([
          getAutomations(),
          getCustomers(),
        ]);
        setDbReady(true);
        setUpcoming(getUpcoming(customers));
        if (dbRules.length > 0) {
          setRules(dbRules.map((a) => ({ ...a, fromDB: true })));
        } else {
          // DB tables exist but no rows yet — keep presets, mark as not-from-DB
          setRules(PRESET_RULES);
        }
      } catch {
        // DB not ready → fall back to presets silently
        setRules(PRESET_RULES);
        setDbReady(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Toggle a rule on/off
  const toggleRule = async (id: string, current: boolean) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !current } : r));
    const rule = rules.find((r) => r.id === id);
    if (rule?.fromDB) {
      try { await updateAutomation(id, { enabled: !current }); }
      catch { setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: current } : r)); }
    }
  };

  // Create new rule
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const newRule: LocalRule = {
      id: `local-${Date.now()}`,
      name: newName,
      type: newType,
      enabled: true,
      days_before: parseInt(newDays) || 1,
      message_template: newMsg,
      fromDB: false,
    };
    if (dbReady && supabase) {
      try {
        const { data: bakery } = await supabase.from("bakeries").select("id").single();
        if (bakery) {
          const { data } = await supabase.from("automations").insert({
            bakery_id: bakery.id,
            name: newRule.name, type: newRule.type,
            enabled: newRule.enabled, days_before: newRule.days_before,
            message_template: newRule.message_template,
          }).select().single();
          if (data) { setRules((prev) => [...prev, { ...data, fromDB: true }]); setSaving(false); resetNew(); return; }
        }
      } catch { /* fall through to local */ }
    }
    setRules((prev) => [...prev, newRule]);
    setSaving(false); resetNew();
  };

  const resetNew = () => { setNewName(""); setNewType("custom"); setNewDays("1"); setNewMsg("Hi {name}! "); setNewOpen(false); };

  // Delete rule
  const deleteRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (rule?.fromDB && supabase) {
      try { await supabase.from("automations").delete().eq("id", id); } catch { /* ignore */ }
    }
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Automations</h1>
            <p className="text-muted-foreground text-sm mt-1">Configure your automated WhatsApp reminder workflows</p>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Rule
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: rules ─────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Summary bar */}
            <div className="flex items-center justify-between bg-muted/40 border border-border rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium">{enabledCount} rule{enabledCount !== 1 ? "s" : ""} active</span>
                <span className="text-muted-foreground">· {rules.length - enabledCount} paused</span>
              </div>
              {!dbReady && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                  Local mode — run DB schema to sync
                </span>
              )}
              {dbReady && (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced with Supabase
                </span>
              )}
            </div>

            {/* Rule cards */}
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {(loading ? PRESET_RULES : rules).map((rule, i) => {
                  const meta = TYPE_META[rule.type] ?? TYPE_META.custom;
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: loading ? 0 : i * 0.06 }}
                      className={`bg-card border rounded-2xl p-5 transition-all ${rule.enabled ? "border-border" : "border-border/50 opacity-60"}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${rule.enabled ? meta.bg : "bg-muted"}`}>
                          <Icon className={`w-5 h-5 ${rule.enabled ? meta.fg : "text-muted-foreground"}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{rule.name}</span>
                                <Badge variant="outline" className="text-[10px] capitalize">{meta.label}</Badge>
                                {rule.days_before > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {rule.days_before}d before
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                {rule.message_template.replace("{name}", "Customer")}
                              </p>
                            </div>

                            {/* Toggle + actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs font-medium hidden sm:block ${rule.enabled ? "text-green-600" : "text-muted-foreground"}`}>
                                {rule.enabled ? "On" : "Off"}
                              </span>
                              <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id, rule.enabled)} />
                            </div>
                          </div>

                          {/* Bottom row */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                            <div className="flex items-center gap-3">
                              {!rule.enabled && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">Paused</Badge>
                              )}
                              {rule.fromDB && (
                                <span className="text-[10px] text-muted-foreground">Saved to Supabase</span>
                              )}
                              {!rule.fromDB && (
                                <span className="text-[10px] text-amber-600">Local only</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRule(rule)}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRule(rule.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add rule button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                onClick={() => setNewOpen(true)}
                className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="w-4 h-4" /> Add custom rule
              </motion.button>
            </div>

            {/* Workflow timeline */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-base mb-5">How Automations Work</h2>
              <div className="relative flex flex-col gap-6">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                {timelineSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${step.active ? "bg-primary border-primary" : "bg-background border-border"}`}>
                      <div className={`w-2 h-2 rounded-full ${step.active ? "bg-white" : "bg-border"}`} />
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${step.active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Right column ─────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {/* WhatsApp */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">WhatsApp</h3>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${waConnected ? "text-green-600" : "text-destructive"}`}>
                  {waConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  {waConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {waConnected ? (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Wifi className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-sm font-medium mb-1">Session active</div>
                  <div className="text-xs text-muted-foreground mb-4">Business account connected</div>
                  <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive">Disconnect</Button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-36 h-36 mx-auto mb-3 bg-white rounded-xl border border-border p-2 grid grid-cols-7 gap-0.5">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? "bg-gray-900" : "bg-white"}`} />
                    ))}
                  </div>
                  <div className="text-sm font-medium mb-1">Scan to connect</div>
                  <div className="text-xs text-muted-foreground mb-3">Open WhatsApp → Settings → Linked Devices</div>
                  <Button size="sm" className="w-full"><RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh QR</Button>
                </div>
              )}
            </motion.div>

            {/* Upcoming */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4">Upcoming Automated</h3>
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No upcoming occasions in the next 30 days.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Add customers with birthdays or anniversaries to see them here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcoming.map((r) => {
                    const Icon = r.occasion === "Birthday" ? Cake : Heart;
                    return (
                      <div key={r.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.occasion} · {r.date}</div>
                        </div>
                        <Badge variant="secondary" className={`text-[10px] shrink-0 ${r.days <= 5 ? "bg-orange-100 text-orange-700" : ""}`}>{r.days}d</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── New Rule Dialog ─────────────────────────────── */}
      <Dialog open={newOpen} onOpenChange={(o) => { if (!o) resetNew(); setNewOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Automation Rule</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Rule Name</Label>
              <Input placeholder="e.g. VIP Birthday Bonus" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Trigger Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as RuleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="winback">Win-Back</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Days Before</Label>
                <Input type="number" min="0" max="365" value={newDays} onChange={(e) => setNewDays(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Message Template</Label>
              <Textarea rows={3} placeholder="Hi {name}! ..." value={newMsg} onChange={(e) => setNewMsg(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Use {"{name}"} to personalize the message.</p>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={resetNew}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || saving}>
              {saving ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Rule Dialog ────────────────────────────── */}
      <Dialog open={!!editRule} onOpenChange={(o) => { if (!o) setEditRule(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Edit Rule
              <Button variant="ghost" size="icon" onClick={() => setEditRule(null)}><X className="w-4 h-4" /></Button>
            </DialogTitle>
          </DialogHeader>
          {editRule && (
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Rule Name</Label>
                <Input
                  value={editRule.name}
                  onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Trigger Type</Label>
                  <Select value={editRule.type} onValueChange={(v) => setEditRule({ ...editRule, type: v as RuleType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="winback">Win-Back</SelectItem>
                      <SelectItem value="welcome">Welcome</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Days Before</Label>
                  <Input
                    type="number" min="0" max="365"
                    value={editRule.days_before}
                    onChange={(e) => setEditRule({ ...editRule, days_before: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Message Template</Label>
                <Textarea
                  rows={3}
                  value={editRule.message_template}
                  onChange={(e) => setEditRule({ ...editRule, message_template: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Use {"{name}"} to personalize.</p>
              </div>
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditRule(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editRule) return;
              setRules((prev) => prev.map((r) => r.id === editRule.id ? editRule : r));
              if (editRule.fromDB) {
                try {
                  await updateAutomation(editRule.id, {
                    name: editRule.name, type: editRule.type,
                    days_before: editRule.days_before, message_template: editRule.message_template,
                  });
                } catch { /* ignore */ }
              }
              setEditRule(null);
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
