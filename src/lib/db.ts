import { supabase } from "./supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not connected. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
      "in your Replit Secrets panel or .env file."
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
  plan: "starter" | "growth" | "pro";
  whatsapp_connected: boolean;
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
  | "active"       // paid and valid
  | "trial"        // within 7-day trial
  | "trial_ending" // trial ends within 2 days
  | "expired";     // trial over, no payment

export function getSubscriptionState(bakery: Bakery | null): SubscriptionState {
  if (!bakery) return "expired";

  if (bakery.subscription_status === "active") return "active";

  if (bakery.subscription_status === "trial" && bakery.trial_ends_at) {
    const endsAt = new Date(bakery.trial_ends_at);
    const now = new Date();
    const msLeft = endsAt.getTime() - now.getTime();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);

    if (daysLeft <= 0) return "expired";
    if (daysLeft <= 2) return "trial_ending";
    return "trial";
  }

  return "expired";
}

export function getTrialDaysLeft(bakery: Bakery | null): number {
  if (!bakery?.trial_ends_at) return 0;
  const endsAt = new Date(bakery.trial_ends_at);
  const msLeft = endsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

export async function activateSubscription(
  bakeryId: string,
  razorpaySubscriptionId: string
): Promise<void> {
  const db = requireSupabase();
  await db
    .from("bakeries")
    .update({
      subscription_status: "active",
      razorpay_subscription_id: razorpaySubscriptionId,
    })
    .eq("id", bakeryId);
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

export async function updateBakeryWhatsapp(connected: boolean): Promise<void> {
  const db = requireSupabase();
  const { data: bakery } = await db.from("bakeries").select("id").single();
  if (!bakery) return;
  await db.from("bakeries").update({ whatsapp_connected: connected }).eq("id", bakery.id);
}

// ----------------------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------------------

export async function getCustomers(): Promise<Customer[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Customer[];
}

export async function createCustomer(
  input: Omit<Customer, "id" | "bakery_id" | "created_at">
): Promise<Customer> {
  const db = requireSupabase();
  const { data: bakery, error: bakeryError } = await db
    .from("bakeries").select("id").single();
  if (bakeryError) throw bakeryError;

  const { data, error } = await db
    .from("customers")
    .insert({ ...input, bakery_id: bakery.id })
    .select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  id: string,
  updates: Partial<Omit<Customer, "id" | "bakery_id" | "created_at">>
): Promise<Customer> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("customers").update(updates).eq("id", id).select().single();
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
  const { data, error } = await db
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Campaign[];
}

export async function createCampaign(
  input: Omit<Campaign, "id" | "bakery_id" | "send_count" | "open_rate" | "created_at">
): Promise<Campaign> {
  const db = requireSupabase();
  const { data: bakery, error: bakeryError } = await db
    .from("bakeries").select("id").single();
  if (bakeryError) throw bakeryError;

  const { data, error } = await db
    .from("campaigns")
    .insert({ ...input, bakery_id: bakery.id })
    .select().single();
  if (error) throw error;
  return data as Campaign;
}

export async function updateCampaign(
  id: string,
  updates: Partial<Omit<Campaign, "id" | "bakery_id" | "created_at">>
): Promise<Campaign> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("campaigns").update(updates).eq("id", id).select().single();
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
  const { data, error } = await db
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Automation[];
}

export async function updateAutomation(
  id: string,
  updates: Partial<Omit<Automation, "id" | "bakery_id" | "created_at">>
): Promise<Automation> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("automations").update(updates).eq("id", id).select().single();
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
    db.from("messages").select("status")
      .gte("created_at", new Date(today.getFullYear(), today.getMonth(), 1).toISOString()),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const customers = customersResult.data ?? [];
  const messages = messagesResult.data ?? [];

  const upcomingBirthdays = customers.filter((c) => {
    if (!c.birthday) return false;
    const mmdd = c.birthday.slice(5);
    return mmdd >= todayMMDD && mmdd <= in30MMDD;
  }).length;

  const upcomingAnniversaries = customers.filter((c) => {
    if (!c.anniversary) return false;
    const mmdd = c.anniversary.slice(5);
    return mmdd >= todayMMDD && mmdd <= in30MMDD;
  }).length;

  return {
    totalCustomers: customersResult.count ?? 0,
    upcomingBirthdays,
    upcomingAnniversaries,
    sentThisMonth: messages.length,
    deliveredThisMonth: messages.filter((m) => m.status === "delivered").length,
  };
}
