import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  MessageCircle, Bell, Users, BarChart3, Check, Star,
  ChevronDown, Menu, X, ArrowRight, Zap, Shield,
  Cake, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTestimonials, mockFaqs } from "@/lib/mock-data";

const features = [
  {
    icon: Bell,
    title: "Smart Occasion Reminders",
    description: "Automatically send WhatsApp messages before birthdays, anniversaries, and special occasions — customized for every customer.",
  },
  {
    icon: Users,
    title: "Customer Management",
    description: "Import, organize, and track all your customers in one place. Search, filter, and segment by occasion type.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Native",
    description: "Messages arrive from your own WhatsApp Business number. Customers respond directly — building genuine relationships.",
  },
  {
    icon: BarChart3,
    title: "Campaign Analytics",
    description: "Track delivery rates, open rates, and customer responses. Understand what works and optimize your outreach.",
  },
  {
    icon: Zap,
    title: "Automation Workflows",
    description: "Set it and forget it. Configure when reminders go out, what they say, and let BakeryPing handle the rest.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Your customer data is encrypted and secure. We handle reliability so you can focus on baking.",
  },
];

const steps = [
  {
    step: "01",
    title: "Connect your WhatsApp",
    description: "Scan a QR code to link your WhatsApp Business account. It takes under 60 seconds.",
  },
  {
    step: "02",
    title: "Import your customers",
    description: "Add customers manually or import via CSV. Tag each with their occasion type and reminder date.",
  },
  {
    step: "03",
    title: "Reminders go out automatically",
    description: "BakeryPing sends personalized WhatsApp messages at exactly the right time — every time.",
  },
];

const stats = [
  { label: "Bakeries using BakeryPing", value: "1,200+" },
  { label: "WhatsApp messages sent", value: "2.4M+" },
  { label: "Average delivery rate", value: "94.7%" },
  { label: "Avg. revenue increase", value: "38%" },
];

const planFeatures = [
  "Unlimited customers",
  "Unlimited WhatsApp campaigns",
  "Birthday & anniversary automations",
  "Campaign image attachments",
  "Bulk message sending",
  "Advanced analytics & reports",
  "n8n automation integration",
  "Priority support",
  "7-day free trial included",
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  } as const;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Cake className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">BakeryPing</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start free trial</Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-4"
          >
            {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Link href="/login">
                <Button variant="outline" className="w-full" size="sm">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button className="w-full" size="sm">Start free trial</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary/6 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border-primary/20">
                Trusted by 1,200+ bakeries
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-foreground mb-6"
            >
              Automate Bakery Customer{" "}
              <span className="text-primary">Reminders on WhatsApp</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Send personalized birthday, anniversary, and occasion reminders directly from your WhatsApp — automatically. Keep customers coming back, without lifting a finger.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12">
                  Start free 7-day trial <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-12">
                  Log in to your account
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="mt-20 mx-auto max-w-5xl relative"
          >
            <div className="relative rounded-2xl border border-border shadow-2xl overflow-hidden bg-card">
              <div className="h-10 bg-muted/60 border-b border-border flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-5 rounded bg-background/60 text-xs text-muted-foreground flex items-center px-3">
                    app.bakerying.com/dashboard
                  </div>
                </div>
              </div>
              <div className="flex h-72 sm:h-96">
                <div className="w-14 sm:w-48 bg-sidebar border-r border-sidebar-border flex flex-col">
                  <div className="p-3 sm:p-4 border-b border-sidebar-border flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0">
                      <Cake className="w-3 h-3 text-white" />
                    </div>
                    <span className="hidden sm:block text-xs font-semibold text-sidebar-foreground truncate">BakeryPing</span>
                  </div>
                  {["Dashboard", "Customers", "Campaigns", "Automations"].map((item, i) => (
                    <div
                      key={item}
                      className={`flex items-center gap-2 px-3 py-2 mx-2 my-0.5 rounded-md text-xs cursor-pointer ${i === 0 ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`}
                    >
                      <div className={`w-3 h-3 rounded-sm ${i === 0 ? "bg-primary" : "bg-sidebar-foreground/20"}`} />
                      <span className="hidden sm:block">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-4 sm:p-6 bg-background overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Customers", value: "284" },
                      { label: "Birthdays", value: "12" },
                      { label: "Sent", value: "1,847" },
                      { label: "Delivered", value: "94%" },
                    ].map((card) => (
                      <div key={card.label} className="bg-card border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
                        <div className="text-lg font-bold text-foreground">{card.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-28 sm:h-40 bg-card border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-3">Messages Sent (6 months)</div>
                    <div className="flex items-end gap-2 h-20 sm:h-28">
                      {[40, 55, 70, 90, 80, 100].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end">
                          <div
                            className="rounded-t-sm"
                            style={{
                              height: `${h}%`,
                              background: i === 5 ? "hsl(32 96% 44%)" : "hsl(32 96% 44% / 0.25)",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 sm:-right-8 top-1/3 bg-card border border-border rounded-xl shadow-lg p-3 sm:p-4 hidden sm:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">Reminder sent!</div>
                  <div className="text-xs text-muted-foreground">Priya — Birthday today</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -left-4 sm:-left-8 bottom-1/3 bg-card border border-border rounded-xl shadow-lg p-3 sm:p-4 hidden sm:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">+38% revenue</div>
                  <div className="text-xs text-muted-foreground">This month vs last</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything your bakery needs</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built specifically for bakeries, patisseries, and confectioneries — not generic CRM software.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">How it works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Up and running in 5 minutes</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              No technical setup required. No coding. Just scan, import, and go.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="text-center relative"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-xl font-bold text-primary">{step.step}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-2/3 w-1/3 h-px border-t-2 border-dashed border-primary/20" />
                )}
                <h3 className="font-semibold text-lg mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by bakers everywhere</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockTestimonials.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex gap-1">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.business}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — single ₹8,000/month plan */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, honest pricing</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              One plan, everything included. 7-day free trial — no credit card required.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-md mx-auto"
          >
            <div className="rounded-2xl border-2 border-primary shadow-xl overflow-hidden">
              {/* Plan header */}
              <div className="bg-primary px-8 py-8 text-white text-center">
                <div className="text-sm font-medium opacity-80 mb-2">BakeryPing Pro</div>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-5xl font-extrabold">₹8,000</span>
                  <span className="text-lg opacity-70">/month</span>
                </div>
                <p className="text-sm opacity-70 mt-2">
                  Auto-renews monthly · Cancel anytime
                </p>
              </div>

              {/* Features list */}
              <div className="bg-card px-8 py-6">
                <div className="flex flex-col gap-3 mb-8">
                  {planFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <Link href="/signup">
                  <Button className="w-full h-12 text-base font-semibold">
                    Start 7-day free trial <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  No credit card required for trial · Pay via UPI, Card, or QR
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Questions & answers</h2>
          </motion.div>
          <div className="flex flex-col gap-3">
            {mockFaqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 ml-4 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="px-5 pb-5"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-primary rounded-3xl p-10 sm:p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white blur-3xl -translate-x-1/2 translate-y-1/2" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to bring customers back?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Start your free 7-day trial today. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base px-8 h-12 text-foreground">
                    Get started free <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-12 text-white border-white/30 hover:bg-white/10">
                    Log in
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Cake className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm">BakeryPing</span>
          </div>
          <p className="text-xs text-muted-foreground">
            2025 BakeryPing. Built with love for bakers.
          </p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((item) => (
              <a key={item} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
