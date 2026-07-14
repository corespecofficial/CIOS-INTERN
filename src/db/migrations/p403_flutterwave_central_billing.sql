-- P403: Central Flutterwave billing ledger.
-- NULL org_id means the legacy root CIOS workspace (/classroom).

alter table public.payment_intents
  add column if not exists org_id uuid references public.creative_orgs(id) on delete set null,
  add column if not exists gateway text not null default 'flutterwave',
  add column if not exists gateway_transaction_id text,
  add column if not exists gateway_ref text,
  add column if not exists currency text not null default 'NGN',
  add column if not exists description text,
  add column if not exists receipt_number text,
  add column if not exists product_type text,
  add column if not exists product_id uuid,
  add column if not exists payment_plan_id text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists payment_intents_gateway_transaction_unique
  on public.payment_intents(gateway, gateway_transaction_id)
  where gateway_transaction_id is not null;
create unique index if not exists payment_intents_receipt_unique
  on public.payment_intents(receipt_number) where receipt_number is not null;
create index if not exists payment_intents_org_created_idx
  on public.payment_intents(org_id, created_at desc);

alter table public.transactions
  add column if not exists org_id uuid references public.creative_orgs(id) on delete set null,
  add column if not exists payment_intent_id uuid references public.payment_intents(id) on delete set null,
  add column if not exists purpose text,
  add column if not exists receipt_number text;
create index if not exists transactions_org_created_idx on public.transactions(org_id, created_at desc);

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  payment_intent_id uuid not null unique references public.payment_intents(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  org_id uuid references public.creative_orgs(id) on delete set null,
  purpose text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',
  gateway text not null default 'flutterwave',
  gateway_transaction_id text not null,
  gateway_ref text,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now()
);
create index if not exists payment_receipts_user_issued_idx on public.payment_receipts(user_id, issued_at desc);
create index if not exists payment_receipts_org_issued_idx on public.payment_receipts(org_id, issued_at desc);
alter table public.payment_receipts enable row level security;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  org_id uuid references public.creative_orgs(id) on delete cascade,
  scope text not null check (scope in ('global_membership','organization_workspace','organization_membership','course','marketplace')),
  plan_code text not null,
  flutterwave_plan_id text,
  customer_email citext not null,
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  last_payment_intent_id uuid references public.payment_intents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists billing_subscriptions_org_status_idx on public.billing_subscriptions(org_id, status);
create unique index if not exists billing_subscriptions_tenant_unique
  on public.billing_subscriptions(user_id, org_id, scope, plan_code) where org_id is not null;
create unique index if not exists billing_subscriptions_root_unique
  on public.billing_subscriptions(user_id, scope, plan_code) where org_id is null;
alter table public.billing_subscriptions enable row level security;

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global_membership','organization_workspace','organization_membership','course','marketplace')),
  code text not null,
  name text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',
  billing_interval text not null check (billing_interval in ('one_time','daily','weekly','monthly','quarterly','yearly')),
  flutterwave_plan_id text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, code)
);
alter table public.billing_plans enable row level security;

alter table public.creative_orgs
  add column if not exists billing_plan text not null default 'free',
  add column if not exists billing_status text not null default 'inactive',
  add column if not exists billing_owner_user_id uuid references public.users(id) on delete set null;

alter table public.creative_orgs drop constraint if exists creative_orgs_org_type_check;
alter table public.creative_orgs add constraint creative_orgs_org_type_check
  check (org_type in ('creative_space','company','institution','government','partner','startup','creator'));

alter table public.institutions add column if not exists org_id uuid unique references public.creative_orgs(id) on delete cascade;
alter table public.company_orgs add column if not exists org_id uuid unique references public.creative_orgs(id) on delete cascade;
alter table public.gov_agencies add column if not exists org_id uuid unique references public.creative_orgs(id) on delete cascade;
alter table public.partners add column if not exists org_id uuid unique references public.creative_orgs(id) on delete cascade;
alter table public.partners drop constraint if exists partners_owner_id_key;
create index if not exists partners_owner_idx on public.partners(owner_id);

alter table public.library_purchases drop constraint if exists library_purchases_payment_method_check;
alter table public.library_purchases alter column payment_method set default 'flutterwave';
alter table public.library_purchases add constraint library_purchases_payment_method_check
  check (payment_method in ('flutterwave','manual','reward'));

-- Service-role-only access matches the existing Clerk-backed DAL model.
revoke all on public.payment_receipts from anon, authenticated;
revoke all on public.billing_subscriptions from anon, authenticated;
revoke all on public.billing_plans from anon, authenticated;
grant all on public.payment_receipts to service_role;
grant all on public.billing_subscriptions to service_role;
grant all on public.billing_plans to service_role;
