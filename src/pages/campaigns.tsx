import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Check, Clock, FileText, Megaphone, Loader2,
  Rocket, UploadCloud, ImageIcon, X, CheckCircle2, AlertCircle,
  Pencil, Trash2, MoreHorizontal,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
  uploadCampaignBanner, getCustomers, getMyBakery,
  type Campaign, type Customer,
} from "@/lib/db";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length === 10 ? "91" + digits : digits;
}

function buildRecipients(campaign: Campaign, customers: Customer[]) {
  let targets: Customer[] = [];
  if (campaign.trigger_type === "birthday") {
    targets = customers.filter((c) => c.birthday && c.phone && c.status === "active");
  } else if (campaign.trigger_type === "anniversary") {
    targets = customers.filter((c) => c.anniversary && c.phone && c.status === "active");
  } else {
    targets = customers.filter((c) => c.phone && c.status === "active");
  }
  return targets.map((c) => ({
    phone: normalizePhone(c.phone),
    message: campaign.message_template.replace(/\{name\}/g, c.name),
    name: c.name,
  }));
}

function getPreviewCustomer(campaign: Campaign | null, customers: Customer[]) {
  if (!campaign || !customers.length) return null;
  if (campaign.trigger_type === "birthday")    return customers.find((c) => !!c.birthday)    ?? customers[0];
  if (campaign.trigger_type === "anniversary") return customers.find((c) => !!c.anniversary) ?? customers[0];
  return customers[0];
}

const STATUS_COLORS: Record<Campaign["status"], string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  draft:  "bg-gray-100 text-gray-600 border-gray-200",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
};
const STATUS_ICONS: Record<Campaign["status"], React.ElementType> = {
  active: Send,
  draft:  FileText,
  paused: Clock,
};
const STATUS_LABEL: Record<Campaign["status"], string> = {
  active: "Active",
  draft:  "Draft",
  paused: "Paused",
};

interface PublishResult {
  campaignId: string;
  sent: number;
  failed: number;
  total: number;
}

// ─── Campaign Form Modal (used for both create and edit) ─────────────────────
interface CampaignFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    message: string;
    trigger: Campaign["trigger_type"];
    bannerFile: File | null;
    existingBannerUrl?: string | null;
  }) => Promise<void>;
  initial?: Campaign | null;
  saving: boolean;
  uploadingBanner: boolean;
}

function CampaignFormModal({ open, onClose, onSave, initial, saving, uploadingBanner }: CampaignFormModalProps) {
  const [name, setName]         = useState(initial?.name ?? "");
  const [message, setMessage]   = useState(initial?.message_template ?? "Hi {name}! 🎂 ");
  const [trigger, setTrigger]   = useState<Campaign["trigger_type"]>(initial?.trigger_type ?? "manual");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens with new initial values
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMessage(initial?.message_template ?? "Hi {name}! 🎂 ");
      setTrigger(initial?.trigger_type ?? "manual");
      setBannerFile(null);
      setBannerPreview(null);
    }
  }, [open, initial]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setBannerPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const displayBanner = bannerPreview ?? initial?.banner_url ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Campaign" : "New Campaign"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Campaign Name</Label>
            <Input placeholder="e.g. Birthday Special" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Who receives this?</Label>
            <Select value={trigger} onValueChange={(v) => setTrigger(v as Campaign["trigger_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="birthday">🎂 Customers with a birthday</SelectItem>
                <SelectItem value="anniversary">🎉 Customers with an anniversary</SelectItem>
                <SelectItem value="manual">📢 Send to all customers</SelectItem>
                <SelectItem value="scheduled">🕒 All customers (scheduled)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Message</Label>
            <Textarea
              rows={4}
              placeholder="Hi {name}! ..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">{"{name}"}</code> — replaced with each customer's name when sent.
            </p>
          </div>

          {/* Banner upload */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Campaign Image{" "}
              <span className="font-normal text-muted-foreground">(optional — sent as WhatsApp image)</span>
            </Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
              }`}
            >
              <input
                ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {displayBanner ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={displayBanner} alt="banner" className="max-h-20 rounded-lg object-contain mx-auto" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="w-3 h-3" />
                    {bannerFile ? bannerFile.name : "Current banner"}
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setBannerFile(null); setBannerPreview(null); }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">Drop an image or <span className="text-primary underline">browse</span></p>
                  <p className="text-xs text-muted-foreground">PNG, JPG · up to 5 MB</p>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ name, message, trigger, bannerFile, existingBannerUrl: initial?.banner_url })}
            disabled={!name.trim() || saving}
          >
            {uploadingBanner
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading image…</>
              : saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              : initial ? "Save Changes" : "Save as Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bakeryId, setBakeryId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const [createOpen, setCreateOpen]   = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const [saving, setSaving]               = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [publishing, setPublishing]   = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState<{ sent: number; total: number } | null>(null);
  const [publishResult, setPublishResult]     = useState<PublishResult | null>(null);

  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    Promise.all([getCampaigns(), getCustomers(), getMyBakery()])
      .then(([camps, custs, bakery]) => {
        setCampaigns(camps);
        setCustomers(custs);
        if (bakery) setBakeryId(bakery.id);
        if (camps.length > 0) setPreviewCampaign(camps[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Save handler (used by both create and edit) ──────────────────────────
  const handleSave = async (data: {
    name: string;
    message: string;
    trigger: Campaign["trigger_type"];
    bannerFile: File | null;
    existingBannerUrl?: string | null;
  }, campaignToEdit?: Campaign | null) => {
    if (!data.name.trim()) return;
    setSaving(true);
    try {
      let finalCampaign: Campaign;

      if (campaignToEdit) {
        // UPDATE existing campaign
        finalCampaign = await updateCampaign(campaignToEdit.id, {
          name: data.name,
          message_template: data.message,
          trigger_type: data.trigger,
          // Keep existing banner_url unless a new file is being uploaded
          ...(data.bannerFile ? {} : { banner_url: data.existingBannerUrl ?? null }),
        });
      } else {
        // CREATE new campaign — do NOT include banner_url (column may not exist yet)
        finalCampaign = await createCampaign({
          name: data.name,
          message_template: data.message,
          trigger_type: data.trigger,
          status: "draft",
        });
      }

      // Upload banner if a new file was provided
      if (data.bannerFile) {
        setUploadingBanner(true);
        const imageUrl = await uploadCampaignBanner(data.bannerFile, finalCampaign.id);
        setUploadingBanner(false);
        if (imageUrl) {
          try {
            finalCampaign = await updateCampaign(finalCampaign.id, { banner_url: imageUrl });
          } catch {
            // banner_url column may not exist yet — campaign still saved without image
          }
        }
      }

      setCampaigns((prev) =>
        campaignToEdit
          ? prev.map((c) => (c.id === finalCampaign.id ? finalCampaign : c))
          : [finalCampaign, ...prev]
      );
      setPreviewCampaign(finalCampaign);
      setCreateOpen(false);
      setEditCampaign(null);
    } catch (err) {
      console.error("Failed to save campaign:", err);
    } finally {
      setSaving(false);
      setUploadingBanner(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (campaign: Campaign) => {
    try {
      await deleteCampaign(campaign.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      if (previewCampaign?.id === campaign.id) {
        const remaining = campaigns.filter((c) => c.id !== campaign.id);
        setPreviewCampaign(remaining[0] ?? null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Publish ──────────────────────────────────────────────────────────────
  const handlePublish = async (campaign: Campaign) => {
    if (!bakeryId) {
      alert("Connect WhatsApp in Settings first.");
      return;
    }
    const recipients = buildRecipients(campaign, customers);
    if (recipients.length === 0) {
      alert("No matching customers found. Add customers with phone numbers first.");
      return;
    }

    setPublishing(campaign.id);
    setPublishProgress({ sent: 0, total: recipients.length });
    setPublishResult(null);

    try {
      const updated = await updateCampaign(campaign.id, { status: "active" });
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (previewCampaign?.id === updated.id) setPreviewCampaign(updated);

      const body: Record<string, unknown> = { bakeryId, recipients };
      if (campaign.banner_url) body.imageUrl = campaign.banner_url;

      const res = await fetch(`${SERVER_URL}/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? "Bulk send failed");
      const data = await res.json();
      setPublishResult({ campaignId: campaign.id, sent: data.sent, failed: data.failed, total: recipients.length });
    } catch (err) {
      console.error("Publish error:", err);
      setPublishResult({ campaignId: campaign.id, sent: 0, failed: recipients.length, total: recipients.length });
    } finally {
      setPublishing(null);
      setPublishProgress(null);
    }
  };

  const previewCustomer = getPreviewCustomer(previewCampaign, customers);
  const previewText = previewCampaign
    ? previewCampaign.message_template.replace(/\{name\}/g, previewCustomer?.name ?? "Customer")
    : "Select a campaign to preview your message here.";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground text-sm mt-1">Create and manage your WhatsApp marketing campaigns</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign list */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {loading ? (
              [1, 2].map((i) => <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />)
            ) : campaigns.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-2xl"
              >
                <Megaphone className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">No campaigns yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first campaign to start sending WhatsApp messages.</p>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Campaign
                </Button>
              </motion.div>
            ) : (
              campaigns.map((campaign, i) => {
                const Icon = STATUS_ICONS[campaign.status];
                const isPublishing = publishing === campaign.id;
                const result = publishResult?.campaignId === campaign.id ? publishResult : null;

                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    className={`bg-card border border-border rounded-2xl p-5 hover:shadow-sm transition-all cursor-pointer ${
                      previewCampaign?.id === campaign.id ? "ring-1 ring-primary border-primary/40" : ""
                    }`}
                    onClick={() => setPreviewCampaign(campaign)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {campaign.banner_url ? (
                          <img src={campaign.banner_url} alt="banner" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{campaign.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {campaign.trigger_type === "manual"
                              ? "📢 All customers"
                              : campaign.trigger_type === "birthday"
                              ? "🎂 Birthday"
                              : campaign.trigger_type === "anniversary"
                              ? "🎉 Anniversary"
                              : "🕒 Scheduled"}
                            {campaign.banner_url && (
                              <span className="text-primary flex items-center gap-0.5">
                                <ImageIcon className="w-2.5 h-2.5" /> image
                              </span>
                            )}
                            · {new Date(campaign.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[campaign.status]}`}>
                          {STATUS_LABEL[campaign.status]}
                        </Badge>

                        {campaign.status === "draft" && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                            disabled={isPublishing}
                            onClick={(e) => { e.stopPropagation(); handlePublish(campaign); }}
                          >
                            {isPublishing
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <><Rocket className="w-3 h-3 mr-1" /> Publish</>}
                          </Button>
                        )}

                        {/* Three-dot menu — now actually works */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setEditCampaign(campaign)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            {campaign.status !== "active" && (
                              <DropdownMenuItem
                                className="text-green-700"
                                onClick={() => handlePublish(campaign)}
                              >
                                <Rocket className="w-3.5 h-3.5 mr-2" /> Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(campaign)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isPublishing && publishProgress && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-border"
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending to {publishProgress.total} customers…
                          </div>
                          <Progress value={(publishProgress.sent / publishProgress.total) * 100} className="h-1.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 pt-4 border-t border-border"
                        >
                          {result.failed === 0 ? (
                            <div className="flex items-center gap-2 text-xs text-green-700">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              Sent to {result.sent} customer{result.sent !== 1 ? "s" : ""}
                              {campaign.banner_url ? " with image" : ""} via WhatsApp.
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-amber-700">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              {result.sent} sent, {result.failed} failed.{" "}
                              {result.sent === 0 ? "Make sure WhatsApp is connected." : "Check server logs."}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {campaign.send_count > 0 && !result && (
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                        <div>
                          <div className="text-sm font-semibold">{campaign.send_count.toLocaleString("en-IN")}</div>
                          <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">—</div>
                          <div className="text-xs text-muted-foreground">Delivered</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-green-600">
                            {campaign.open_rate != null ? `${campaign.open_rate}%` : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">Open rate</div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* WhatsApp Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:sticky lg:top-24 h-fit"
          >
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4">WhatsApp Preview</h3>
              <div className="bg-[#0a1628] rounded-2xl p-4">
                <div className="w-20 h-5 bg-black rounded-full mx-auto mb-4" />
                <div className="rounded-xl p-3 min-h-52" style={{ background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%231a2744'/%3E%3C/svg%3E\")" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">B</span>
                    </div>
                    <div>
                      <div className="text-white text-xs font-medium">Your Bakery</div>
                      <div className="text-green-400 text-[10px]">online</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
                    {previewCampaign?.banner_url && (
                      <img src={previewCampaign.banner_url} alt="banner" className="w-full rounded-lg mb-2 object-cover max-h-24" />
                    )}
                    <p className="text-xs text-gray-800 leading-relaxed">{previewText}</p>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <span className="text-[10px] text-gray-400">
                        {new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      <Check className="w-3 h-3 text-blue-500" />
                      <Check className="w-3 h-3 text-blue-500 -ml-1.5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 bg-white/10 rounded-full px-3 py-2">
                    <div className="flex-1 text-[10px] text-white/40">Type a message</div>
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Send className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-muted-foreground text-center">
                {previewCampaign ? (
                  <><span className="font-medium text-foreground">{previewCampaign.name}</span>{previewCustomer && <> · {previewCustomer.name}</>}</>
                ) : "Select a campaign to preview"}
              </div>

              {previewCampaign && (
                <div className="mt-3 pt-3 border-t border-border text-xs text-center">
                  {(() => {
                    const count = buildRecipients(previewCampaign, customers).length;
                    return count > 0
                      ? <span className="text-green-700 font-medium">Will send to {count} customer{count !== 1 ? "s" : ""}</span>
                      : <span className="text-amber-600">No matching customers yet</span>;
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Create Modal */}
      <CampaignFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(data) => handleSave(data, null)}
        saving={saving}
        uploadingBanner={uploadingBanner}
      />

      {/* Edit Modal */}
      <CampaignFormModal
        open={!!editCampaign}
        onClose={() => setEditCampaign(null)}
        onSave={(data) => handleSave(data, editCampaign)}
        initial={editCampaign}
        saving={saving}
        uploadingBanner={uploadingBanner}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
