-- P402: Keep every LMS child row in the same tenant as its parent.
-- The trigger is the final line of defence when service-role code bypasses RLS.

create or replace function public.cios_sync_course_child_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_org_id uuid;
begin
  select c.org_id into parent_org_id
  from public.courses c
  where c.id = new.course_id;

  if not found then
    raise exception 'Course % does not exist', new.course_id using errcode = '23503';
  end if;

  if new.org_id is not null and new.org_id is distinct from parent_org_id then
    raise exception 'Tenant mismatch: LMS row org_id must match its course';
  end if;

  new.org_id := parent_org_id;
  return new;
end;
$$;

create or replace function public.cios_sync_module_child_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_org_id uuid;
begin
  select m.org_id into parent_org_id
  from public.course_modules m
  where m.id = new.module_id;

  if not found then
    raise exception 'Module % does not exist', new.module_id using errcode = '23503';
  end if;

  if new.org_id is not null and new.org_id is distinct from parent_org_id then
    raise exception 'Tenant mismatch: LMS row org_id must match its module';
  end if;

  new.org_id := parent_org_id;
  return new;
end;
$$;

-- Repair any historical drift before enforcing the invariant.
update public.course_modules m set org_id = c.org_id from public.courses c where c.id = m.course_id and m.org_id is distinct from c.org_id;
update public.course_enrollments e set org_id = c.org_id from public.courses c where c.id = e.course_id and e.org_id is distinct from c.org_id;
update public.certificates x set org_id = c.org_id from public.courses c where c.id = x.course_id and x.org_id is distinct from c.org_id;
update public.module_submissions s set org_id = m.org_id from public.course_modules m where m.id = s.module_id and s.org_id is distinct from m.org_id;
update public.quiz_attempts q set org_id = m.org_id from public.course_modules m where m.id = q.module_id and q.org_id is distinct from m.org_id;

drop trigger if exists cios_tenant_course_modules on public.course_modules;
create trigger cios_tenant_course_modules before insert or update of course_id, org_id on public.course_modules
for each row execute function public.cios_sync_course_child_org();

drop trigger if exists cios_tenant_course_enrollments on public.course_enrollments;
create trigger cios_tenant_course_enrollments before insert or update of course_id, org_id on public.course_enrollments
for each row execute function public.cios_sync_course_child_org();

drop trigger if exists cios_tenant_certificates on public.certificates;
create trigger cios_tenant_certificates before insert or update of course_id, org_id on public.certificates
for each row execute function public.cios_sync_course_child_org();

drop trigger if exists cios_tenant_module_submissions on public.module_submissions;
create trigger cios_tenant_module_submissions before insert or update of module_id, org_id on public.module_submissions
for each row execute function public.cios_sync_module_child_org();

drop trigger if exists cios_tenant_quiz_attempts on public.quiz_attempts;
create trigger cios_tenant_quiz_attempts before insert or update of module_id, org_id on public.quiz_attempts
for each row execute function public.cios_sync_module_child_org();

revoke all on function public.cios_sync_course_child_org() from public, anon, authenticated;
revoke all on function public.cios_sync_module_child_org() from public, anon, authenticated;

do $$
declare
  trigger_count integer;
  drift_count integer;
begin
  select count(*) into trigger_count
  from pg_trigger
  where not tgisinternal and tgname like 'cios_tenant_%';
  if trigger_count < 5 then
    raise exception 'Expected five LMS tenant triggers, found %', trigger_count;
  end if;

  select
    (select count(*) from public.course_modules m join public.courses c on c.id = m.course_id where m.org_id is distinct from c.org_id) +
    (select count(*) from public.course_enrollments e join public.courses c on c.id = e.course_id where e.org_id is distinct from c.org_id) +
    (select count(*) from public.certificates x join public.courses c on c.id = x.course_id where x.org_id is distinct from c.org_id) +
    (select count(*) from public.module_submissions s join public.course_modules m on m.id = s.module_id where s.org_id is distinct from m.org_id) +
    (select count(*) from public.quiz_attempts q join public.course_modules m on m.id = q.module_id where q.org_id is distinct from m.org_id)
  into drift_count;

  if drift_count <> 0 then
    raise exception 'LMS tenant drift remains in % rows', drift_count;
  end if;
end;
$$;
