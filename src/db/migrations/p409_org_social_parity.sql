-- Tenant ownership for the established social products. NULL remains the
-- original CIOS-wide scope; non-NULL rows are private to one organization.
alter table public.chat_rooms
  add column if not exists org_id uuid references public.creative_orgs(id) on delete cascade;
create index if not exists chat_rooms_org_id_idx on public.chat_rooms(org_id);

alter table public.communities
  add column if not exists org_id uuid references public.creative_orgs(id) on delete cascade;
create index if not exists communities_org_id_idx on public.communities(org_id);
create index if not exists communities_org_created_idx on public.communities(org_id, created_at desc);
