import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Cake, MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// ── Supabase auth ──────────────────────────────────────────
// FILE TO EDIT: src/lib/auth.ts  → signIn() function
// ──────────────────────────────────────────────────────────
import { signIn } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      await signIn(data.email, data.password);
      setLocation("/dashboard");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — illustration */}
      <div className="hidden lg:flex flex-col w-2/5 bg-sidebar text-sidebar-foreground p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-primary blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3 mb-auto">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Cake className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">BakeryPing</span>
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold mb-4 leading-tight">
              Your customers miss you —<br />remind them you're here.
            </h2>
            <p className="text-sidebar-foreground/70 text-base leading-relaxed">
              Over 1,200 bakeries use BakeryPing to send automated WhatsApp reminders that bring customers back for every occasion.
            </p>
          </motion.div>

          {/* Floating notification mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10"
          >
            <div className="bg-sidebar-accent border border-sidebar-border rounded-2xl p-5 max-w-xs">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-sidebar-foreground">WhatsApp Reminder Sent</div>
                  <div className="text-xs text-sidebar-foreground/60 mt-0.5">Just now</div>
                </div>
              </div>
              <div className="bg-sidebar-border/50 rounded-xl p-3 text-xs text-sidebar-foreground/80 leading-relaxed">
                "Hi Alice! Happy Birthday! Sweet Crumbs Bakery would love to celebrate with you. Show this message for 15% off any cake this week!"
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative mt-auto text-xs text-sidebar-foreground/40">
          Trusted by bakeries in 40+ countries.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Cake className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">BakeryPing</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Log in to your bakery account</p>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button variant="outline" type="button" className="h-10 text-sm" data-testid="button-google-login">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
            <Button variant="outline" type="button" className="h-10 text-sm" data-testid="button-facebook-login">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </Button>
          </div>

          <div className="relative flex items-center mb-6">
            <Separator className="flex-1" />
            <span className="mx-3 text-xs text-muted-foreground">or continue with email</span>
            <Separator className="flex-1" />
          </div>

          {/* Auth error */}
          {authError && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="hello@mybakery.com"
                data-testid="input-email"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  data-testid="input-password"
                  {...register("password")}
                  className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="h-11 mt-2" disabled={isSubmitting} data-testid="button-login-submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Start free trial
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
