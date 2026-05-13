import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// FILE: src/lib/supabase.ts
//
// HOW TO CONNECT YOUR SUPABASE PROJECT:
//
// 1. Go to https://supabase.com/dashboard → your project → Settings → API
// 2. Copy "Project URL"  → paste as VITE_SUPABASE_URL
// 3. Copy "anon public"  → paste as VITE_SUPABASE_ANON_KEY
//
// On Replit: add both as Secrets (the lock icon in the left sidebar).
// Locally:   create a .env file (copy .env.example and fill in the values).
//
// Until these are set, the app runs with mock data and auth is disabled.
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[BakeryPing] Supabase is not connected. " +
      "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Replit Secrets " +
      "or .env file to enable auth and live data."
    );
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// `supabase` will be null until you add your credentials.
// All functions in auth.ts and db.ts check for this before making calls.
export const supabase = createSupabaseClient();

export function isSupabaseConnected(): boolean {
  return supabase !== null;
}
