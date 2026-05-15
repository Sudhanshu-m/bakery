import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getSubscriptionState } from "@/lib/db";

interface ProtectedRouteProps {
  component: React.ComponentType;
}

export function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { user, bakery, loading } = useAuth();
  const [, setLocation] = useLocation();

  const subscriptionState = getSubscriptionState(bakery);

  useEffect(() => {
    if (loading) return;

    // Not logged in → go to login
    if (!user) {
      setLocation("/login");
      return;
    }

    // Trial/subscription expired → go to payment wall
    if (bakery && subscriptionState === "expired") {
      setLocation("/subscribe");
    }
  }, [user, bakery, loading, subscriptionState, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Expired: show a brief lock screen while redirecting
  if (bakery && subscriptionState === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <Component />;
}
