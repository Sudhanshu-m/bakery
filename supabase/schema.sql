-- ============================================================
-- BakeryPing — Supabase Schema
-- Run this entire file in your Supabase SQL Editor:
--   https://supabase.com/dashboard → your project → SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: bakeries
-- One row per bakery owner. Linked to Supabase Auth user.
-- ============================================================
create table if not exists public.bakeries (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  phone         text,
  plan          text not null default 'starter', -- 'starter' | 'growth' | 'pro'
  whatsapp_connected boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE: customers
-- Each customer belongs to one bakery (bakery_id).
-- ============================================================
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  bakery_id     uuid not null references public.bakeries (id) on delete cascade,
  name          text not null,
  phone         text not null,
  email         text,
  birthday      date,
  anniversary   date,
  notes         text,
  tags          text[] default '{}',
  status        text not null default 'active', -- 'active' | 'inactive'
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE: campaigns
-- Each campaign belongs to one bakery.
-- ============================================================
create table if not exists public.campaigns (
  id               uuid primary key default gen_random_uuid(),
  bakery_id        uuid not null references public.bakeries (id) on delete cascade,
  name             text not null,
  message_template text not null,
  trigger_type     text not null, -- 'birthday' | 'anniversary' | 'manual' | 'scheduled'
  status           text not null default 'draft', -- 'active' | 'draft' | 'paused'
  send_count       integer not null default 0,
  open_rate        numeric(5, 2),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- TABLE: automations
-- Automation rules per bakery.
-- ============================================================
create table if not exists public.automations (
  id            uuid primary key default gen_random_uuid(),
  bakery_id     uuid not null references public.bakeries (id) on delete cascade,
  name          text not null,
  type          text not null, -- 'birthday' | 'anniversary' | 'winback' | 'welcome' | 'custom'
  enabled       boolean not null default true,
  days_before   integer not null default 1,
  message_template text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE: messages
-- Log of every WhatsApp message sent.
-- ============================================================
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  bakery_id     uuid not null references public.bakeries (id) on delete cascade,
  customer_id   uuid references public.customers (id) on delete set null,
  campaign_id   uuid references public.campaigns (id) on delete set null,
  status        text not null default 'pending', -- 'pending' | 'sent' | 'delivered' | 'failed'
  sent_at       timestamptz,
  delivered_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This is what keeps each bakery's data completely separate.
-- Every query is automatically filtered by the logged-in user's bakery.
-- ============================================================

alter table public.bakeries   enable row level security;
alter table public.customers  enable row level security;
alter table public.campaigns  enable row level security;
alter table public.automations enable row level security;
alter table public.messages   enable row level security;

-- Helper: returns the bakery ID for the currently logged-in user
create or replace function public.my_bakery_id()
returns uuid
language sql
stable
as $$
  select id from public.bakeries where owner_id = auth.uid() limit 1;
$$;

-- bakeries: owner can only see/edit their own row
create policy "Owner can manage their bakery"
  on public.bakeries
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- customers: scoped to the logged-in user's bakery
create policy "Bakery owner manages their customers"
  on public.customers
  for all
  using (bakery_id = public.my_bakery_id())
  with check (bakery_id = public.my_bakery_id());

-- campaigns: scoped to the logged-in user's bakery
create policy "Bakery owner manages their campaigns"
  on public.campaigns
  for all
  using (bakery_id = public.my_bakery_id())
  with check (bakery_id = public.my_bakery_id());

-- automations: scoped to the logged-in user's bakery
create policy "Bakery owner manages their automations"
  on public.automations
  for all
  using (bakery_id = public.my_bakery_id())
  with check (bakery_id = public.my_bakery_id());

-- messages: scoped to the logged-in user's bakery
create policy "Bakery owner manages their messages"
  on public.messages
  for all
  using (bakery_id = public.my_bakery_id())
  with check (bakery_id = public.my_bakery_id());

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
create index if not exists idx_customers_bakery_id  on public.customers  (bakery_id);
create index if not exists idx_campaigns_bakery_id  on public.campaigns  (bakery_id);
create index if not exists idx_automations_bakery_id on public.automations (bakery_id);
create index if not exists idx_messages_bakery_id   on public.messages   (bakery_id);
create index if not exists idx_customers_birthday   on public.customers  (birthday);
create index if not exists idx_customers_anniversary on public.customers (anniversary);
