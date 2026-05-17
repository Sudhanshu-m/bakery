import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, Zap, Tag, Cake, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getSubscriptionState, getTrialDaysLeft, activateSubscription } from "@/lib/db";
import { supabase } from "@/lib/supabase";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID ?? "";

const FEATURES = [
  "Unlimited WhatsApp campaigns",
  "Birthday & anniversary automations",
  "Unlimited customers",
  "Campaign image attachments",
  "n8n automation integration",
  "Priority support",
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscribePage() {
  const { user, bakery, refreshBakery } = useAuth();
  const [, setLocation] = useLocation();
  const [coupon, setCoupon] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = getSubscriptionState(bakery);
  const daysLeft = getTrialDaysLeft(bakery);

  // Already subscribed — go to dashboard
  useEffect(() => {
    if (state === "active") setLocation("/dashboard");
  }, [state, setLocation]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    setLocation("/login");
  };

  const handleSubscribe = async () => {
    if (!bakery || !user) return;
    setError(null);
    setPaying(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway. Please try again.");

      // Step 1: Create a Razorpay subscription server-side to get sub_xxx ID
      const serverUrl = import.meta.env.VITE_SERVER_URL ?? "https://bakery-ur88.onrender.com";
      const subRes = await fetch(`${serverUrl}/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bakery_id: bakery.id }),
      });
      if (!subRes.ok) {
        const err = await subRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not create subscription. Please try again.");
      }
      const { subscription_id } = await subRes.json();

      // Step 2: Open Razorpay checkout with the subscription ID
      // NOTE: When using subscription_id, do NOT pass amount/currency — Razorpay uses the plan amount.
      const options = {
        key: RAZORPAY_KEY_ID,
        subscription_id,           // sub_xxx from server — enables auto-recurring monthly billing
        name: "BakeryPing",
        description: "Monthly Subscription — ₹8,000/month",
        prefill: {
          email: user.email,
          name: bakery.name,
        },
        notes: {
          bakery_id: bakery.id,
        },
        ...(coupon.trim() ? { offer_id: coupon.trim() } : {}),
        theme: { color: "#7c3aed" },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id?: string }) => {
          // First payment done — activate in Supabase immediately.
          // Renewals are handled automatically via the Razorpay webhook on the server.
          try {
            await activateSubscription(
              bakery.id,
              response.razorpay_subscription_id ?? response.razorpay_payment_id
            );
            await refreshBakery();
            setLocation("/dashboard");
          } catch {
            setError("Payment received but activation failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Cake className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base">BakeryPing</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground text-xs">
          <LogOut className="w-3.5 h-3.5 mr-1.5" /> Log out
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Trial expired notice */}
          {state === "expired" && (
            <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
              {daysLeft === 0
                ? "Your free trial has ended."
                : `Your free trial expired.`}{" "}
              Subscribe to continue using BakeryPing.
            </div>
          )}

          {/* Trial ending notice */}
          {state === "trial_ending" && (
            <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 text-center">
              {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`} in your free trial.
              Subscribe now to avoid losing access.
            </div>
          )}

          {/* Plan card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-primary px-6 py-5 text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium opacity-80">BakeryPing Pro</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Monthly</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">₹8,000</span>
                <span className="text-sm opacity-70">/month</span>
              </div>
              <p className="text-xs opacity-70 mt-1">Auto-renews monthly. Cancel anytime.</p>
            </div>

            {/* Features */}
            <div className="px-6 py-5 border-b border-border">
              <div className="flex flex-col gap-2.5">
                {FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon + checkout */}
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Coupon code */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Coupon code (optional)
                </Label>
                <Input
                  placeholder="e.g. LAUNCH50"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a coupon code for a discount before paying.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              <Button
                className="h-11 w-full"
                onClick={handleSubscribe}
                disabled={paying || !RAZORPAY_KEY_ID}
              >
                {paying ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Opening payment…</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Pay ₹8,000 via UPI / Card / QR</>
                )}
              </Button>

              {!RAZORPAY_KEY_ID && (
                <p className="text-xs text-amber-600 text-center">
                  Add VITE_RAZORPAY_KEY_ID to your environment variables to enable payments.
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Secured by Razorpay · UPI, Cards, Net Banking, QR accepted
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

