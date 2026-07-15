-- Durable identity denial. Clerk bans a user ID; this table also prevents the
-- same normalized email from creating a replacement account.
create table if not exists public.platform_identity_blacklist (
  email text primary key check (email = lower(trim(email))),
  reason text not null,
  source_user_id uuid references public.users(id) on delete set null,
  blocked_by uuid references public.users(id) on delete set null,
  blocked_at timestamptz not null default now(),
  disabled_at timestamptz,
  disabled_by uuid references public.users(id) on delete set null
);
create index if not exists platform_identity_blacklist_active_idx
  on public.platform_identity_blacklist(email) where disabled_at is null;
alter table public.platform_identity_blacklist enable row level security;
revoke all on public.platform_identity_blacklist from anon, authenticated;

