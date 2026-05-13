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

export interface Bakery {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  plan: "starter" | "growth" | "pro";
  whatsapp_connected: boolean;
  created_at: string;
}

const PENDING_BAKERY_NAME_KEY = "bakeryping_pending_bakery_name";

export async function signUp(
  email: string,
  password: string,
  bakeryName: string
): Promise<{ needsConfirmation: boolean }> {
  const client = requireSupabase();

  const { data: authData, error: authError } = await client.auth.signUp({ email, password });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign-up failed: no user returned.");

  if (authData.session) {
    await createBakeryAndDefaults(client, authData.user.id, bakeryName);
    return { needsConfirmation: false };
  }

  localStorage.setItem(PENDING_BAKERY_NAME_KEY, bakeryName);
  return { needsConfirmation: true };
}

export async function signIn(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function getCurrentBakery(): Promise<Bakery | null> {
  const client = requireSupabase();
  const { data, error } = await client.from("bakeries").select("*").single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Bakery;
}

// Creates the bakery row + seeds 4 default automation rules for a new account.
async function createBakeryAndDefaults(
  client: NonNullable<typeof supabase>,
  userId: string,
  bakeryName: string
): Promise<Bakery> {
  const { data: bakery, error: bakeryError } = await client
    .from("bakeries")
    .insert({ owner_id: userId, name: bakeryName })
    .select()
    .single();
  if (bakeryError) throw bakeryError;

  await client.from("automations").insert([
    { bakery_id: bakery.id, name: "Birthday Reminder", type: "birthday", enabled: true, days_before: 3, message_template: "Hi {name}! Happy Birthday from {bakery}! 🎂 We'd love to celebrate with you. Show this message for 15% off any cake today!" },
    { bakery_id: bakery.id, name: "Anniversary Reminder", type: "anniversary", enabled: true, days_before: 5, message_template: "Hi {name}! Happy Anniversary from {bakery}! 🎉 Celebrate this special day with a custom cake — use code ANNIV10 for 10% off." },
    { bakery_id: bakery.id, name: "Win-Back Message", type: "winback", enabled: false, days_before: 30, message_template: "Hi {name}! We miss you at {bakery}! 🥐 Come back and enjoy a FREE pastry with your next order. See you soon!" },
    { bakery_id: bakery.id, name: "Welcome Message", type: "welcome", enabled: true, days_before: 0, message_template: "Welcome to {bakery}, {name}! 🎉 Thanks for joining us. As a welcome gift, enjoy 10% off your first order — just show this message." },
  ]);

  return bakery as Bakery;
}

// Called by useAuth after login. Creates bakery + seeds defaults on first login after email confirmation.
export async function ensureBakeryExists(): Promise<Bakery | null> {
  const client = requireSupabase();

  const existing = await getCurrentBakery();
  if (existing) return existing;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const pendingName = localStorage.getItem(PENDING_BAKERY_NAME_KEY) || "My Bakery";
  const bakery = await createBakeryAndDefaults(client, user.id, pendingName);
  localStorage.removeItem(PENDING_BAKERY_NAME_KEY);
  return bakery;
}

export async function updateBakery(
  updates: Partial<Omit<Bakery, "id" | "owner_id" | "created_at">>
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("bakeries")
    .update(updates)
    .select()
    .single();
  if (error) throw error;
  return data as Bakery;
}
