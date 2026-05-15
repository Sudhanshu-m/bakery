import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureBakeryExists } from "@/lib/auth";
import type { Bakery } from "@/lib/db";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  bakery: Bakery | null;
  loading: boolean;
  refreshBakery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  bakery: null,
  loading: true,
  refreshBakery: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bakery, setBakery] = useState<Bakery | null>(null);
  const [loading, setLoading] = useState(true);

  // Load (or auto-create on first login) the bakery for the current user.
  // ensureBakeryExists() handles both the happy path (bakery exists) and the
  // first-login-after-email-confirmation path (creates the row from localStorage).
  async function loadBakery() {
    if (!supabase) return;
    try {
      const b = await ensureBakeryExists();
      setBakery(b);
    } catch {
      setBakery(null);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadBakery().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadBakery();
      } else {
        setBakery(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user, bakery, loading, refreshBakery: loadBakery }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
