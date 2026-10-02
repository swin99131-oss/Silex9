-- Payment layer scaffold (safe, additive, and disabled by default)
-- This migration does not touch live data beyond adding optional columns/tables.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Ensure core payment columns exist on campaigns if that table is present.
create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'disabled' check (provider in ('disabled','zaincash')),
  is_enabled boolean not null default false,
  merchant_id text,
  api_key text,
  currency text not null default 'USD',
  exchange_rate numeric not null default 1,
  webhook_url text,
  payment_status text not null default 'off' check (payment_status in ('off','configured','ready','active')),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid,
  merchant_id uuid,
  provider text not null default 'disabled' check (provider in ('disabled','zaincash')),
  external_id text,
  amount numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','pending_review')),
  metadata jsonb not null default '{}'::jsonb,
  webhook_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_settings_provider_idx on public.payment_settings (provider);
create index if not exists payment_transactions_campaign_idx on public.payment_transactions (campaign_id);
create index if not exists payment_transactions_merchant_idx on public.payment_transactions (merchant_id);
create index if not exists payment_transactions_status_idx on public.payment_transactions (status);

alter table public.payment_settings enable row level security;
alter table public.payment_transactions enable row level security;

create policy if not exists "payment_settings_read_admin_only"
  on public.payment_settings
  for select
  using (public.is_admin());

create policy if not exists "payment_settings_write_admin_only"
  on public.payment_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy if not exists "payment_transactions_read_admin_only"
  on public.payment_transactions
  for select
  using (public.is_admin());

create policy if not exists "payment_transactions_insert_admin_only"
  on public.payment_transactions
  for insert
  with check (public.is_admin());

create policy if not exists "payment_transactions_update_admin_only"
  on public.payment_transactions
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Optional safe columns for campaigns if they exist.
alter table if exists public.campaigns
  add column if not exists payment_status text default 'off' check (payment_status in ('off','pending','paid','failed','cancelled','pending_review')),
  add column if not exists payment_provider text default 'disabled' check (payment_provider in ('disabled','zaincash')),
  add column if not exists payment_ref text,
  add column if not exists pay_txid text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_webhook_payload jsonb,
  add column if not exists payment_verified_at timestamptz;

create index if not exists campaigns_payment_status_idx on public.campaigns (payment_status);
create index if not exists campaigns_payment_provider_idx on public.campaigns (payment_provider);

-- Seed a disabled configuration record if none exists.
insert into public.payment_settings (provider, is_enabled, merchant_id, api_key, currency, exchange_rate, webhook_url, payment_status, updated_by)
select 'disabled', false, null, null, 'USD', 1, null, 'off', null
where not exists (select 1 from public.payment_settings limit 1);
