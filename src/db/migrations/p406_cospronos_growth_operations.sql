-- P406: Tenant-isolated CRM, outreach and content operations.
-- Enabled only for the founder's Cospronos organization.

create table if not exists public.org_leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  prospect_name text not null,
  business_name text not null,
  industry text,
  location text,
  website text,
  decision_maker text,
  position text,
  email text,
  telephone text,
  social_url text,
  source text,
  assigned_to uuid references public.users(id) on delete set null,
  business_problem text,
  personalization_note text,
  recommended_offer text,
  estimated_deal_value numeric(14,2) not null default 0 check (estimated_deal_value >= 0),
  currency text not null default 'NGN',
  stage text not null default 'new' check (stage in ('new','researched','ready_for_outreach','contacted','follow_up_required','responded','qualified','meeting_booked','discovery_completed','proposal_sent','negotiation','won','lost','not_suitable','future_opportunity')),
  next_follow_up_at timestamptz,
  founder_notes text,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists org_leads_pipeline_idx on public.org_leads(org_id,programme_id,stage,updated_at desc);
create index if not exists org_leads_assignee_idx on public.org_leads(org_id,assigned_to,next_follow_up_at);
create unique index if not exists org_leads_email_unique on public.org_leads(org_id,lower(email)) where nullif(trim(email),'') is not null;
create unique index if not exists org_leads_phone_unique on public.org_leads(org_id,regexp_replace(telephone,'\D','','g')) where nullif(regexp_replace(telephone,'\D','','g'),'') is not null;
create unique index if not exists org_leads_website_unique on public.org_leads(org_id,lower(trim(trailing '/' from website))) where nullif(trim(website),'') is not null;

create table if not exists public.org_outreach_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  lead_id uuid not null references public.org_leads(id) on delete cascade,
  intern_id uuid not null references public.users(id) on delete restrict,
  channel text not null check (channel in ('email','telephone','whatsapp','linkedin','instagram','facebook','x','other')),
  message_type text not null check (message_type in ('first_contact','follow_up','response','meeting','proposal','other')),
  personalized_message text not null,
  response text,
  outcome text,
  evidence_url text,
  follow_up_at timestamptz,
  supervisor_review text,
  created_at timestamptz not null default now()
);
create index if not exists org_outreach_lead_idx on public.org_outreach_activities(org_id,lead_id,created_at desc);
create index if not exists org_outreach_intern_idx on public.org_outreach_activities(org_id,intern_id,created_at desc);

create table if not exists public.org_content_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  brand text not null default 'Cospronos',
  campaign text,
  content_pillar text,
  content_type text not null,
  topic text not null,
  caption text,
  script text,
  assigned_to uuid references public.users(id) on delete set null,
  approver_id uuid references public.users(id) on delete set null,
  due_at timestamptz,
  status text not null default 'idea' check (status in ('idea','assigned','writing','designing','editing','awaiting_approval','approved','scheduled','published','performance_review','archived')),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists org_content_status_idx on public.org_content_items(org_id,programme_id,status,due_at);

create table if not exists public.org_content_platform_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  content_id uuid not null references public.org_content_items(id) on delete cascade,
  platform text not null check (platform in ('linkedin','instagram','facebook','tiktok','youtube','youtube_shorts','x','threads','whatsapp_status')),
  platform_caption text,
  scheduled_at timestamptz,
  published_at timestamptz,
  published_url text,
  reach bigint not null default 0 check (reach >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  comments bigint not null default 0 check (comments >= 0),
  shares bigint not null default 0 check (shares >= 0),
  saves bigint not null default 0 check (saves >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  enquiries bigint not null default 0 check (enquiries >= 0),
  qualified_leads bigint not null default 0 check (qualified_leads >= 0),
  sales_attributed numeric(14,2) not null default 0 check (sales_attributed >= 0),
  evidence_url text,
  lessons_learned text,
  unique(content_id,platform)
);
create index if not exists org_content_platform_idx on public.org_content_platform_versions(org_id,platform,published_at desc);

alter table public.org_leads enable row level security;
alter table public.org_outreach_activities enable row level security;
alter table public.org_content_items enable row level security;
alter table public.org_content_platform_versions enable row level security;
revoke all on public.org_leads,public.org_outreach_activities,public.org_content_items,public.org_content_platform_versions from anon,authenticated;
grant all on public.org_leads,public.org_outreach_activities,public.org_content_items,public.org_content_platform_versions to service_role;

update public.creative_orgs
set module_flags = coalesce(module_flags,'{}'::jsonb) || '{"growth_operations":true}'::jsonb,
    updated_at = now()
where id = 'c4614c66-86e8-4d28-96a5-0654477767a3';
