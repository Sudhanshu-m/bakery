import { useLocation } from "wouter";
import { AlertTriangle, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getSubscriptionState, getTrialDaysLeft } from "@/lib/db";

export function TrialBanner() {
  const { bakery } = useAuth();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const state = getSubscriptionState(bakery);
  const daysLeft = getTrialDaysLeft(bakery);

  // Only show banner when trial is ending (≤ 2 days left)
  if (state !== "trial_ending" || dismissed) return null;

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-4 z-50">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {daysLeft === 0
          ? "Your free trial ends today!"
          : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`}
        {" "}Subscribe now to keep access.
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          className="h-7 bg-white text-amber-600 hover:bg-amber-50 text-xs font-semibold"
          onClick={() => setLocation("/subscribe")}
        >
          <Zap className="w-3 h-3 mr-1" />
          Subscribe — ₹8,000/mo
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
