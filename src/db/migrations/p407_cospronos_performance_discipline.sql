-- P407: Human-reviewed performance and disciplinary workflow, Cospronos only.
-- Compatibility view keeps scoring queries explicit without exposing submissions.
create or replace view public.org_assignment_submissions with (security_invoker=true) as
select id,org_id,assignment_id,student_id as user_id,submitted_at,final_grade from public.org_submissions;
revoke all on public.org_assignment_submissions from anon,authenticated;
grant select on public.org_assignment_submissions to service_role;

create table if not exists public.org_performance_reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  attendance_score numeric(5,2) not null check (attendance_score between 0 and 100),
  assignment_score numeric(5,2) not null check (assignment_score between 0 and 100),
  work_hours_score numeric(5,2) not null check (work_hours_score between 0 and 100),
  role_output_score numeric(5,2) not null check (role_output_score between 0 and 100),
  growth_score numeric(5,2) not null check (growth_score between 0 and 100),
  conduct_score numeric(5,2) not null check (conduct_score between 0 and 100),
  total_score numeric(5,2) not null check (total_score between 0 and 100),
  performance_level text not null check (performance_level in ('distinguished','strong','satisfactory','performance_concern','formal_intervention')),
  reviewer_id uuid not null references public.users(id) on delete restrict,
  reviewer_feedback text,
  status text not null default 'published' check (status in ('draft','published','acknowledged')),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique(programme_id,user_id,period_start,period_end)
);
create index if not exists org_performance_user_idx on public.org_performance_reviews(org_id,user_id,period_end desc);

create table if not exists public.org_disciplinary_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  stage text not null check (stage in ('coaching_notice','written_warning','performance_improvement_plan','final_warning','suspension_review','suspension','reinstatement','dismissal_review','dismissal')),
  incident_date date not null,
  reported_by uuid not null references public.users(id) on delete restrict,
  related_policy text not null,
  incident_summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  intern_explanation text,
  explanation_submitted_at timestamptz,
  reviewer_findings text,
  decision text,
  corrective_action text,
  action_deadline date,
  follow_up text,
  final_outcome text,
  appeal_notes text,
  status text not null default 'awaiting_explanation' check (status in ('awaiting_explanation','under_review','action_required','resolved','closed')),
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists org_discipline_user_idx on public.org_disciplinary_cases(org_id,user_id,status,created_at desc);

create table if not exists public.org_improvement_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  programme_id uuid not null references public.org_programmes(id) on delete cascade,
  case_id uuid not null references public.org_disciplinary_cases(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  objectives jsonb not null default '[]'::jsonb,
  support_provided text,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  review_notes text,
  outcome text,
  status text not null default 'active' check (status in ('draft','active','completed','unsuccessful','cancelled')),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists org_improvement_user_idx on public.org_improvement_plans(org_id,user_id,status);

alter table public.org_performance_reviews enable row level security;
alter table public.org_disciplinary_cases enable row level security;
alter table public.org_improvement_plans enable row level security;
revoke all on public.org_performance_reviews,public.org_disciplinary_cases,public.org_improvement_plans from anon,authenticated;
grant all on public.org_performance_reviews,public.org_disciplinary_cases,public.org_improvement_plans to service_role;

update public.creative_orgs set module_flags=coalesce(module_flags,'{}'::jsonb)||'{"performance_discipline":true}'::jsonb,updated_at=now()
where id='c4614c66-86e8-4d28-96a5-0654477767a3';
