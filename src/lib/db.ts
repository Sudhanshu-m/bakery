import { supabase } from "./supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not connected. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }
  return supabase;
}

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface Customer {
  id: string;
  bakery_id: string;
  name: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  anniversary: string | null;
  notes: string | null;
  tags: string[];
  status: "active" | "inactive";
  created_at: string;
}

export interface Campaign {
  id: string;
  bakery_id: string;
  name: string;
  message_template: string;
  trigger_type: "birthday" | "anniversary" | "manual" | "scheduled";
  status: "active" | "draft" | "paused";
  send_count: number;
  open_rate: number | null;
  banner_url: string | null;
  created_at: string;
}

export interface Automation {
  id: string;
  bakery_id: string;
  name: string;
  type: "birthday" | "anniversary" | "winback" | "welcome" | "custom";
  enabled: boolean;
  days_before: number;
  message_template: string | null;
  created_at: string;
}

export interface Bakery {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  plan: string;
  whatsapp_connected: boolean;
  logo_url: string | null;
  created_at: string;
  trial_ends_at: string | null;
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  razorpay_subscription_id: string | null;
}

export interface DashboardStats {
  totalCustomers: number;
  upcomingBirthdays: number;
  upcomingAnniversaries: number;
  deliveredThisMonth: number;
  sentThisMonth: number;
}

// ----------------------------------------------------------------
// SUBSCRIPTION HELPERS
// ----------------------------------------------------------------

export type SubscriptionState =
  | "active"
  | "trial"
  | "trial_ending"
  | "expired";

export function getSubscriptionState(bakery: Bakery | null): SubscriptionState {
  if (!bakery) return "expired";
  if (bakery.subscription_status === "active") return "active";
  if (bakery.subscription_status === "trial" && bakery.trial_ends_at) {
    const daysLeft = (new Date(bakery.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 0) return "expired";
    if (daysLeft <= 2) return "trial_ending";
    return "trial";
  }
  return "expired";
}

export function getTrialDaysLeft(bakery: Bakery | null): number {
  if (!bakery?.trial_ends_at) return 0;
  return Math.max(0, Math.ceil((new Date(bakery.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export async function activateSubscription(bakeryId: string, razorpaySubscriptionId: string): Promise<void> {
  const db = requireSupabase();
  await db.from("bakeries").update({ subscription_status: "active", razorpay_subscription_id: razorpaySubscriptionId }).eq("id", bakeryId);
}

// ----------------------------------------------------------------
// BAKERY
// ----------------------------------------------------------------

export async function getMyBakery(): Promise<Bakery | null> {
  const db = requireSupabase();
  const { data, error } = await db.from("bakeries").select("*").single();
  if (error) return null;
  return data as Bakery;
}

export async function updateBakery(updates: Partial<Pick<Bakery, "name" | "phone" | "logo_url">>): Promise<void> {
  const db = requireSupabase();
  const { data: bakery } = await db.from("bakeries").select("id").single();
  if (!bakery) return;
  await db.from("bakeries").update(updates).eq("id", bakery.id);
}

export async function updateBakeryWhatsapp(connected: boolean): Promise<void> {
  const db = requireSupabase();
  const { data: bakery } = await db.from("bakeries").select("id").single();
  if (!bakery) return;
  await db.from("bakeries").update({ whatsapp_connected: connected }).eq("id", bakery.id);
}

// ----------------------------------------------------------------
// LOGO UPLOAD
// ----------------------------------------------------------------

export async function uploadBakeryLogo(file: File, bakeryId: string): Promise<string | null> {
  const db = requireSupabase();
  try {
    const ext = file.name.split(".").pop() ?? "jpg";
    const filePath = `${bakeryId}/logo.${ext}`;
    const { error } = await db.storage.from("bakery-logos").upload(filePath, file, { upsert: true, contentType: file.type });
    if (error) { console.error("Logo upload:", error.message); return null; }
    const { data } = db.storage.from("bakery-logos").getPublicUrl(filePath);
    return data.publicUrl;
  } catch (e) {
    console.error("Logo upload error:", e);
    return null;
  }
}

// ----------------------------------------------------------------
// CAMPAIGN BANNER UPLOAD
// ----------------------------------------------------------------

export async function uploadCampaignBanner(file: File, campaignId: string): Promise<string | null> {
  const db = requireSupabase();
  const ext = file.name.split(".").pop() ?? "jpg";
  const filePath = `${campaignId}.${ext}`;

  // Try the bucket name — must be a PUBLIC bucket named "campaigns" in Supabase Storage
  const { error } = await db.storage.from("campaigns").upload(filePath, file, { upsert: true, contentType: file.type });
  if (error) {
    // Surface the exact error so it can be caught and shown to the user
    throw new Error(`Image upload failed: ${error.message}`);
  }
  const { data } = db.storage.from("campaigns").getPublicUrl(filePath);
  return data.publicUrl;
}

// ----------------------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------------------

export async function getCustomers(): Promise<Customer[]> {
  const db = requireSupabase();
  const { data, error } = await db.from("customers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Customer[];
}

export async function createCustomer(input: Omit<Customer, "id" | "bakery_id" | "created_at">): Promise<Customer> {
  const db = requireSupabase();
  const { data: bakery, error: be } = await db.from("bakeries").select("id").single();
  if (be) throw be;
  const { data, error } = await db.from("customers").insert({ ...input, bakery_id: bakery.id }).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: string, updates: Partial<Omit<Customer, "id" | "bakery_id" | "created_at">>): Promise<Customer> {
  const db = requireSupabase();
  const { data, error } = await db.from("customers").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from("customers").delete().eq("id", id);
  if (error) throw error;
}

// ----------------------------------------------------------------
// CAMPAIGNS
// ----------------------------------------------------------------

export async function getCampaigns(): Promise<Campaign[]> {
  const db = requireSupabase();
  const { data, error } = await db.from("campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Campaign[];
}

// banner_url intentionally excluded from required fields — added separately after upload
export async function createCampaign(
  input: Omit<Campaign, "id" | "bakery_id" | "send_count" | "open_rate" | "banner_url" | "created_at">
): Promise<Campaign> {
  const db = requireSupabase();
  const { data: bakery, error: be } = await db.from("bakeries").select("id").single();
  if (be) throw be;
  // Do NOT include banner_url here — avoids failure if column doesn't exist yet
  const { data, error } = await db.from("campaigns").insert({ ...input, bakery_id: bakery.id }).select().single();
  if (error) throw error;
  return data as Campaign;
}

export async function updateCampaign(id: string, updates: Partial<Omit<Campaign, "id" | "bakery_id" | "created_at">>): Promise<Campaign> {
  const db = requireSupabase();
  const { data, error } = await db.from("campaigns").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Campaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

// ----------------------------------------------------------------
// AUTOMATIONS
// ----------------------------------------------------------------

export async function getAutomations(): Promise<Automation[]> {
  const db = requireSupabase();
  const { data, error } = await db.from("automations").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Automation[];
}

export async function updateAutomation(id: string, updates: Partial<Omit<Automation, "id" | "bakery_id" | "created_at">>): Promise<Automation> {
  const db = requireSupabase();
  const { data, error } = await db.from("automations").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Automation;
}

// ----------------------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------------------

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = requireSupabase();
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);
  const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const in30MMDD = `${String(in30Days.getMonth() + 1).padStart(2, "0")}-${String(in30Days.getDate()).padStart(2, "0")}`;

  const [customersResult, messagesResult] = await Promise.all([
    db.from("customers").select("id, birthday, anniversary", { count: "exact" }),
    db.from("messages").select("status").gte("created_at", new Date(today.getFullYear(), today.getMonth(), 1).toISOString()),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const customers = (customersResult.data ?? []) as Array<{ id: string; birthday: string | null; anniversary: string | null }>;
  const messages = (messagesResult.data ?? []) as Array<{ status: string }>;

  return {
    totalCustomers: customersResult.count ?? 0,
    upcomingBirthdays: customers.filter((c) => c.birthday && c.birthday.slice(5) >= todayMMDD && c.birthday.slice(5) <= in30MMDD).length,
    upcomingAnniversaries: customers.filter((c) => c.anniversary && c.anniversary.slice(5) >= todayMMDD && c.anniversary.slice(5) <= in30MMDD).length,
    sentThisMonth: messages.length,
    deliveredThisMonth: messages.filter((m) => m.status === "delivered").length,
  };
}
