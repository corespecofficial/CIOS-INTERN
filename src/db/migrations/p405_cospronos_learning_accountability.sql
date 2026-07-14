-- P405: richer assignment accountability and immutable submission versions.
-- Columns are additive; only the Cospronos tenant has this module activated.

alter table public.org_assignments
  add column if not exists programme_id uuid references public.org_programmes(id) on delete set null,
  add column if not exists department_id uuid references public.org_departments(id) on delete set null,
  add column if not exists learning_objective text,
  add column if not exists instructions text,
  add column if not exists example text,
  add column if not exists submission_format text,
  add column if not exists assessment_rubric jsonb not null default '[]'::jsonb,
  add column if not exists maximum_score integer not null default 100 check (maximum_score between 1 and 1000),
  add column if not exists revision_allowance integer not null default 1 check (revision_allowance between 0 and 20),
  add column if not exists evidence_requirement text,
  add column if not exists estimated_minutes integer check (estimated_minutes between 1 and 10080),
  add column if not exists priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  add column if not exists status text not null default 'not_started' check (status in ('not_started','in_progress','blocked','submitted','under_review','revision_required','approved','completed','overdue','cancelled'));

alter table public.org_submissions
  add column if not exists status text not null default 'submitted' check (status in ('submitted','under_review','revision_required','approved')),
  add column if not exists final_grade numeric(8,2),
  add column if not exists revision_count integer not null default 0 check (revision_count >= 0),
  add column if not exists is_late boolean not null default false;

create table if not exists public.org_submission_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.creative_orgs(id) on delete cascade,
  submission_id uuid not null references public.org_submissions(id) on delete cascade,
  assignment_id uuid not null references public.org_assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  body text,
  attachment_key text,
  evidence jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  unique(submission_id,version_number)
);
create index if not exists org_submission_versions_history_idx on public.org_submission_versions(org_id,assignment_id,student_id,version_number desc);
alter table public.org_submission_versions enable row level security;
revoke all on public.org_submission_versions from anon,authenticated;
grant all on public.org_submission_versions to service_role;

update public.creative_orgs
set module_flags=coalesce(module_flags,'{}'::jsonb)||'{"learning_accountability":true}'::jsonb,updated_at=now()
where id='c4614c66-86e8-4d28-96a5-0654477767a3';

update public.org_assignments a set programme_id=p.id
from public.org_programmes p
where a.org_id=p.org_id and a.org_id='c4614c66-86e8-4d28-96a5-0654477767a3' and a.programme_id is null and p.status='active';
