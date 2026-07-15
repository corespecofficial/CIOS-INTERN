-- Slugless/main CIOS compulsory programme, 14 Jul–14 Oct 2026, Lagos time.
alter table public.attendance alter column joined_at drop not null;
alter table public.class_sessions
  add column if not exists sign_out_opens_at timestamptz,
  add column if not exists sign_out_closes_at timestamptz;

create unique index if not exists class_sessions_compulsory_slot_uniq
  on public.class_sessions(scheduled_at) where is_compulsory = true;

do $$
declare instructor uuid;
begin
  select id into instructor from public.users
  where role in ('super_admin','instructor','admin') and status = 'active'
  order by case role when 'super_admin' then 0 when 'instructor' then 1 else 2 end, created_at
  limit 1;
  if instructor is null then raise notice 'No active instructor; compulsory sessions not seeded'; return; end if;

  insert into public.class_sessions (
    title, description, instructor_id, scheduled_at, duration_minutes, status,
    is_compulsory, attendance_opens_at, attendance_closes_at,
    sign_out_opens_at, sign_out_closes_at, minimum_attendance_minutes
  )
  select
    'Cospronos Compulsory Internship Class',
    'Compulsory Tuesday, Wednesday and Friday class. Participation requires instructor confirmation.',
    instructor, starts_at, 120, 'scheduled', true,
    starts_at - interval '15 minutes', starts_at + interval '15 minutes',
    starts_at + interval '110 minutes', starts_at + interval '135 minutes', 90
  from (
    select ((d::date + time '20:00') at time zone 'Africa/Lagos') as starts_at
    from generate_series(date '2026-07-14', date '2026-10-14', interval '1 day') d
    where extract(isodow from d) in (2,3,5)
  ) slots
  on conflict (scheduled_at) where is_compulsory = true do update set
    attendance_opens_at = excluded.attendance_opens_at,
    attendance_closes_at = excluded.attendance_closes_at,
    sign_out_opens_at = excluded.sign_out_opens_at,
    sign_out_closes_at = excluded.sign_out_closes_at,
    minimum_attendance_minutes = excluded.minimum_attendance_minutes;
end $$;
