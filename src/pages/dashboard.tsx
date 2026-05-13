import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, Cake, Heart, Send, CheckCircle2, Clock, Wifi } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats, getCustomers, type DashboardStats, type Customer } from "@/lib/db";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  color: string;
  delay?: number;
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return <>{count.toLocaleString()}{suffix}</>;
}

function StatCard({ label, value, icon: Icon, suffix = "", color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">
          <AnimatedCounter target={value} suffix={suffix} />
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      </div>
    </motion.div>
  );
}

function getUpcomingCustomers(customers: Customer[]) {
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);
  const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const in30MMDD = `${String(in30Days.getMonth() + 1).padStart(2, "0")}-${String(in30Days.getDate()).padStart(2, "0")}`;

  const upcoming: { id: string; customerName: string; occasion: string; date: string; daysUntil: number }[] = [];

  customers.forEach((c) => {
    ["birthday", "anniversary"].forEach((field) => {
      const dateVal = c[field as keyof Customer] as string | null;
      if (!dateVal) return;
      const mmdd = dateVal.slice(5);
      if (mmdd >= todayMMDD && mmdd <= in30MMDD) {
        const thisYear = new Date(`${today.getFullYear()}-${mmdd}`);
        const diffDays = Math.round((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        upcoming.push({
          id: `${c.id}-${field}`,
          customerName: c.name,
          occasion: field === "birthday" ? "Birthday" : "Anniversary",
          date: thisYear.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          daysUntil: diffDays,
        });
      }
    });
  });

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 6);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingReminders, setUpcomingReminders] = useState<ReturnType<typeof getUpcomingCustomers>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, customers] = await Promise.all([getDashboardStats(), getCustomers()]);
        setStats(s);
        setUpcomingReminders(getUpcomingCustomers(customers));
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const deliveryRate = stats && stats.sentThisMonth > 0
    ? Math.round((stats.deliveredThisMonth / stats.sentThisMonth) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your bakery.</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
            <Wifi className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700">WhatsApp Connected</span>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Customers" value={loading ? 0 : (stats?.totalCustomers ?? 0)} icon={Users} color="bg-primary/10 text-primary" delay={0} />
          <StatCard label="Upcoming Birthdays" value={loading ? 0 : (stats?.upcomingBirthdays ?? 0)} icon={Cake} color="bg-orange-100 text-orange-600" delay={0.08} />
          <StatCard label="Upcoming Anniversaries" value={loading ? 0 : (stats?.upcomingAnniversaries ?? 0)} icon={Heart} color="bg-pink-100 text-pink-600" delay={0.16} />
          <StatCard label="Messages Delivered" value={deliveryRate} suffix="%" icon={CheckCircle2} color="bg-green-100 text-green-600" delay={0.24} />
        </div>

        {/* Chart + Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-base">Campaign Performance</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Messages sent vs delivered (last 6 months)</p>
              </div>
              <Badge variant="secondary" className="text-xs">{new Date().getFullYear()}</Badge>
            </div>
            {stats && (stats.sentThisMonth > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{ name: "This month", sent: stats.sentThisMonth, delivered: stats.deliveredThisMonth }]} barGap={4} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="sent" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Sent" />
                  <Bar dataKey="delivered" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Delivered" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-56 text-center">
                <Send className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No messages sent yet</p>
                <p className="text-xs text-muted-foreground mt-1">Campaign data will appear here once you start sending.</p>
              </div>
            )}
          </motion.div>

          {/* Upcoming Reminders panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-6"
          >
            <h2 className="font-semibold text-base mb-4">Upcoming Reminders</h2>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-muted/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcomingReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No reminders in the next 30 days</p>
                <p className="text-xs text-muted-foreground mt-1">Add customers with birthdays or anniversaries.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingReminders.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {r.occasion === "Birthday" ? <Cake className="w-3.5 h-3.5 text-primary" /> : <Heart className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{r.customerName}</div>
                      <div className="text-[10px] text-muted-foreground">{r.occasion} · {r.date}</div>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${r.daysUntil <= 5 ? "bg-orange-100 text-orange-700" : ""}`}>
                      {r.daysUntil}d
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Full-width Upcoming Reminders table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-base">Next 30 Days</h2>
            <span className="text-xs text-muted-foreground">{upcomingReminders.length} upcoming</span>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />)}
            </div>
          ) : upcomingReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No upcoming occasions</p>
              <p className="text-xs text-muted-foreground mt-1">Add customers with birthday or anniversary dates to see reminders here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{reminder.customerName}</div>
                    <div className="text-xs text-muted-foreground">{reminder.occasion} · {reminder.date}</div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${reminder.daysUntil <= 5 ? "bg-orange-100 text-orange-700 border-orange-200" : ""}`}
                  >
                    {reminder.daysUntil}d away
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
