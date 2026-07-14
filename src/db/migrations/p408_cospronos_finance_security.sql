-- P408: Fix the Security Advisor warning and add Cospronos bookkeeping.
alter function public.prevent_org_operations_audit_mutation() set search_path = pg_catalog;
revoke all on function public.prevent_org_operations_audit_mutation() from public,anon,authenticated;

create table if not exists public.org_finance_clients(
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.creative_orgs(id) on delete cascade,
 name text not null,email text,telephone text,billing_address text,tax_id text,created_by uuid not null references public.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists org_finance_clients_email_unique on public.org_finance_clients(org_id,lower(email)) where nullif(trim(email),'') is not null;
create table if not exists public.org_invoices(
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.creative_orgs(id) on delete cascade,programme_id uuid references public.org_programmes(id) on delete set null,
 client_id uuid not null references public.org_finance_clients(id) on delete restrict,invoice_number text not null,description text not null,currency text not null default 'NGN',subtotal numeric(14,2) not null check(subtotal>=0),tax_amount numeric(14,2) not null default 0 check(tax_amount>=0),total_amount numeric(14,2) generated always as(subtotal+tax_amount) stored,
 amount_paid numeric(14,2) not null default 0 check(amount_paid>=0),issued_on date not null default current_date,due_on date not null,status text not null default 'issued' check(status in('draft','issued','partially_paid','paid','overdue','void')),created_by uuid not null references public.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(org_id,invoice_number)
);
create index if not exists org_invoices_receivable_idx on public.org_invoices(org_id,status,due_on);
create table if not exists public.org_payments(
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.creative_orgs(id) on delete cascade,programme_id uuid references public.org_programmes(id) on delete set null,invoice_id uuid references public.org_invoices(id) on delete restrict,
 amount numeric(14,2) not null check(amount>0),currency text not null default 'NGN',processor text not null default 'flutterwave',processor_reference text,processing_fee numeric(14,2) not null default 0 check(processing_fee>=0),source text,attributed_to uuid references public.users(id) on delete set null,received_at timestamptz not null default now(),recorded_by uuid not null references public.users(id),notes text,created_at timestamptz not null default now(),unique(org_id,processor_reference)
);
create index if not exists org_payments_date_idx on public.org_payments(org_id,received_at desc);
create table if not exists public.org_payment_allocations(
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.creative_orgs(id) on delete cascade,payment_id uuid not null references public.org_payments(id) on delete cascade,category text not null check(category in('infrastructure','delivery','tax_admin','performance_reserve')),percentage numeric(5,2) not null check(percentage>=0 and percentage<=100),amount numeric(14,2) not null check(amount>=0),unique(payment_id,category)
);
create table if not exists public.org_expenses(
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.creative_orgs(id) on delete cascade,programme_id uuid references public.org_programmes(id) on delete set null,vendor text not null,category text not null,description text not null,amount numeric(14,2) not null check(amount>0),currency text not null default 'NGN',incurred_on date not null,receipt_url text,status text not null default 'recorded' check(status in('recorded','approved','reimbursed','void')),recorded_by uuid not null references public.users(id),created_at timestamptz not null default now()
);
create index if not exists org_expenses_date_idx on public.org_expenses(org_id,incurred_on desc);

alter table public.org_finance_clients enable row level security;alter table public.org_invoices enable row level security;alter table public.org_payments enable row level security;alter table public.org_payment_allocations enable row level security;alter table public.org_expenses enable row level security;
revoke all on public.org_finance_clients,public.org_invoices,public.org_payments,public.org_payment_allocations,public.org_expenses from anon,authenticated;
grant all on public.org_finance_clients,public.org_invoices,public.org_payments,public.org_payment_allocations,public.org_expenses to service_role;
update public.creative_orgs set module_flags=coalesce(module_flags,'{}'::jsonb)||'{"finance_bookkeeping":true}'::jsonb,updated_at=now() where id='c4614c66-86e8-4d28-96a5-0654477767a3';
