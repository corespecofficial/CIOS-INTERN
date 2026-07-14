-- P404: Cospronos Internship Execution Programme.
-- Shared schema is tenant-keyed; seed data and module activation affect only
-- the founder-owned Cospronos organization identified below.

create table if not exists public.org_programmes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  timezone text not null default 'Africa/Lagos',
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  work_minutes_per_day integer not null default 300 check (work_minutes_per_day between 0 and 1440),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, name)
);

create table if not exists public.org_departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  name text not null,
  position_order integer not null default 0,
  daily_targets jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(programme_id, name)
);

create table if not exists public.org_programme_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  department_id uuid references public.org_departments(id) on delete set null,
  position_title text not null,
  programme_role text not null check (programme_role in ('founder','programme_admin','instructor','finance_officer','department_lead','intern','auditor')),
  status text not null default 'active' check (status in ('invited','active','suspended','dismissed','completed')),
  work_minutes_per_day integer check (work_minutes_per_day between 0 and 1440),
  joined_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists org_programme_members_user_unique
  on public.org_programme_members(programme_id,user_id) where user_id is not null;

create table if not exists public.org_programme_meetings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  timezone text not null default 'Africa/Lagos',
  sign_in_opens_at timestamptz not null,
  punctual_until timestamptz not null,
  sign_in_closes_at timestamptz not null,
  sign_out_opens_at timestamptz not null,
  sign_out_closes_at timestamptz not null,
  instructor_id uuid references public.users(id) on delete set null,
  lesson_topic text,
  location text,
  required_preparation text,
  lesson_id uuid references public.org_lessons(id) on delete set null,
  assignment_id uuid references public.org_assignments(id) on delete set null,
  recording_url text,
  instructor_comments text,
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique(programme_id, starts_at)
);
create index if not exists org_programme_meetings_upcoming_idx on public.org_programme_meetings(org_id,starts_at);

create table if not exists public.org_meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  meeting_id uuid not null references public.org_programme_meetings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  signed_in_at timestamptz,
  signed_out_at timestamptz,
  provisional_status text not null default 'not_signed_in' check (provisional_status in ('not_signed_in','punctual','late','absent_pending_review')),
  final_status text not null default 'pending' check (final_status in ('pending','present','late','absent','excused')),
  participation_confirmed boolean,
  participation_score numeric(5,2) check (participation_score between 0 and 100),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(meeting_id,user_id)
);
create index if not exists org_meeting_attendance_user_idx on public.org_meeting_attendance(user_id,meeting_id);

create table if not exists public.org_attendance_excuses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  attendance_id uuid not null references public.org_meeting_attendance(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  explanation text not null check (length(explanation) between 10 and 5000),
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.org_work_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  department_id uuid references public.org_departments(id) on delete set null,
  task_id uuid,
  planned_activity text not null,
  expected_output text not null,
  estimated_minutes integer not null check (estimated_minutes between 1 and 1440),
  related_entity_type text,
  related_entity_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  paused_seconds integer not null default 0 check (paused_seconds >= 0),
  status text not null default 'running' check (status in ('running','paused','submitted','awaiting_review','approved','partially_approved','rejected','evidence_requested')),
  work_summary text,
  output_produced text,
  challenges text,
  next_action text,
  submitted_minutes integer check (submitted_minutes >= 0),
  approved_minutes integer check (approved_minutes >= 0),
  reviewer_id uuid references public.users(id) on delete set null,
  reviewer_feedback text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists org_work_sessions_review_idx on public.org_work_sessions(org_id,status,created_at desc);
create index if not exists org_work_sessions_user_idx on public.org_work_sessions(user_id,created_at desc);

create table if not exists public.org_work_session_evidence (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  session_id uuid not null references public.org_work_sessions(id) on delete cascade,
  submitted_by uuid not null references public.users(id) on delete restrict,
  evidence_type text not null check (evidence_type in ('file','link','note','commit')),
  url text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.org_operations_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid references public.org_programmes(id) on delete set null,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text,
  action text not null,
  record_type text not null,
  record_id uuid,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  session_id text,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index if not exists org_operations_audit_lookup_idx on public.org_operations_audit(org_id,created_at desc);

create or replace function public.prevent_org_operations_audit_mutation()
returns trigger language plpgsql as $$ begin raise exception 'Operations audit records are append-only'; end $$;
drop trigger if exists org_operations_audit_append_only on public.org_operations_audit;
create trigger org_operations_audit_append_only before update or delete on public.org_operations_audit
for each row execute function public.prevent_org_operations_audit_mutation();

alter table public.org_programmes enable row level security;
alter table public.org_departments enable row level security;
alter table public.org_programme_members enable row level security;
alter table public.org_programme_meetings enable row level security;
alter table public.org_meeting_attendance enable row level security;
alter table public.org_attendance_excuses enable row level security;
alter table public.org_work_sessions enable row level security;
alter table public.org_work_session_evidence enable row level security;
alter table public.org_operations_audit enable row level security;

revoke all on public.org_programmes,public.org_departments,public.org_programme_members,
  public.org_programme_meetings,public.org_meeting_attendance,public.org_attendance_excuses,
  public.org_work_sessions,public.org_work_session_evidence,public.org_operations_audit from anon,authenticated;
grant all on public.org_programmes,public.org_departments,public.org_programme_members,
  public.org_programme_meetings,public.org_meeting_attendance,public.org_attendance_excuses,
  public.org_work_sessions,public.org_work_session_evidence,public.org_operations_audit to service_role;

-- Activate and seed only Joshua's Cospronos organization.
do $$
declare
  target_org constant uuid := 'c4614c66-86e8-4d28-96a5-0654477767a3';
  founder constant uuid := 'be9d5b6c-6231-4238-8996-1e8bed96dee9';
  programme uuid;
begin
  update public.creative_orgs
    set module_flags = coalesce(module_flags,'{}'::jsonb) || '{"org_operations":true}'::jsonb,
        updated_at = now()
    where id = target_org;

  insert into public.org_programmes(org_id,name,starts_on,ends_on,timezone,status,work_minutes_per_day,created_by,settings)
  values(target_org,'Cospronos Internship Execution Programme','2026-07-14','2026-10-14','Africa/Lagos','active',300,founder,
    '{"attendance":{"sign_in_opens_minutes":15,"late_after_minutes":1,"sign_in_closes_minutes":15,"sign_out_opens_minutes":10,"sign_out_closes_minutes":15,"lates_per_absence":3},"performance_weights":{"attendance":20,"assignments":20,"approved_hours":15,"role_output":20,"growth":15,"conduct":10},"finance_allocations":{"infrastructure":65,"delivery":20,"tax_admin":10,"performance_reserve":5},"financial_deductions_enabled":false}'::jsonb)
  on conflict(org_id,name) do update set starts_on=excluded.starts_on,ends_on=excluded.ends_on,settings=excluded.settings,updated_at=now()
  returning id into programme;

  insert into public.org_departments(org_id,programme_id,name,position_order,daily_targets) values
    (target_org,programme,'Lead Research and CRM',1,'{"verified_prospects":30,"decision_makers":20,"business_problems":30,"priority_opportunities":5}'::jsonb),
    (target_org,programme,'Outreach and Appointment Setting',2,'{"first_contacts":25,"follow_ups":15,"meaningful_conversations":3,"qualified_appointments":1}'::jsonb),
    (target_org,programme,'Content Creation and Distribution',3,'{"founder_assets":1,"sales_assets":1,"repurposed_outputs":3,"prospect_interactions":10}'::jsonb),
    (target_org,programme,'Web Design and Funnel Development',4,'{"technical_tickets":1,"responsive_test":true,"form_test":true,"evidence":true,"technical_note":true}'::jsonb),
    (target_org,programme,'Mobile Application, QA and Operations',5,'{"product_qa_tickets":1,"reproduction_steps":true,"demo_updated":true,"exceptions_checked":true,"operations_report":true}'::jsonb)
  on conflict(programme_id,name) do update set daily_targets=excluded.daily_targets,position_order=excluded.position_order;

  insert into public.org_programme_members(org_id,programme_id,user_id,position_title,programme_role,status,joined_at)
  values(target_org,programme,founder,'Founder / Super Administrator','founder','active',now())
  on conflict(programme_id,user_id) where user_id is not null do update set programme_role='founder',status='active';

  insert into public.org_programme_members(org_id,programme_id,department_id,position_title,programme_role,status)
  select target_org,programme,d.id,d.name,'intern','invited' from public.org_departments d
  where d.programme_id=programme
    and not exists(select 1 from public.org_programme_members m where m.programme_id=programme and m.department_id=d.id and m.user_id is null);

  insert into public.org_programme_meetings(
    org_id,programme_id,title,starts_at,ends_at,timezone,sign_in_opens_at,punctual_until,
    sign_in_closes_at,sign_out_opens_at,sign_out_closes_at,instructor_id,status)
  select target_org,programme,'Compulsory Intern Class',
    (d::date + time '20:00') at time zone 'Africa/Lagos',
    (d::date + time '22:00') at time zone 'Africa/Lagos','Africa/Lagos',
    (d::date + time '19:45') at time zone 'Africa/Lagos',
    (d::date + time '20:00') at time zone 'Africa/Lagos',
    (d::date + time '20:15') at time zone 'Africa/Lagos',
    (d::date + time '21:50') at time zone 'Africa/Lagos',
    (d::date + time '22:15') at time zone 'Africa/Lagos',founder,'scheduled'
  from generate_series(date '2026-07-14',date '2026-10-14',interval '1 day') d
  where extract(isodow from d) in (2,3,5)
  on conflict(programme_id,starts_at) do nothing;
end $$;
