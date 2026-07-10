-- p397: Multi-tenant organization spaces safety layer
-- Additive and safe to run more than once.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Platform-wide guardrails for the current free-tier rollout.
CREATE TABLE IF NOT EXISTS org_platform_limits (
  key TEXT PRIMARY KEY DEFAULT 'default',
  max_active_orgs INTEGER NOT NULL DEFAULT 100,
  max_active_intern_memberships INTEGER NOT NULL DEFAULT 1000,
  reserved_org_seats INTEGER NOT NULL DEFAULT 0,
  reserved_intern_seats INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_platform_limits ADD COLUMN IF NOT EXISTS reserved_org_seats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE org_platform_limits ADD COLUMN IF NOT EXISTS reserved_intern_seats INTEGER NOT NULL DEFAULT 0;

INSERT INTO org_platform_limits (key, max_active_orgs, max_active_intern_memberships)
VALUES ('default', 100, 1000)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE org_platform_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_platform_limits'
      AND policyname = 'org_platform_limits_super_admin_select'
  ) THEN
    CREATE POLICY org_platform_limits_super_admin_select
      ON org_platform_limits
      FOR SELECT
      USING (is_super_admin());
  END IF;
END $$;

-- Organization metadata. creative_orgs remains the tenant root.
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'creative_space';
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS brand_color TEXT;
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS active_intern_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS staff_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS intern_limit INTEGER NOT NULL DEFAULT 50;
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS module_flags JSONB NOT NULL DEFAULT '{
  "lessons": true,
  "assignments": true,
  "chat": true,
  "files": true,
  "announcements": true,
  "analytics": true,
  "finance": false,
  "moderation": false,
  "support": false
}'::jsonb;
ALTER TABLE creative_orgs ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE creative_orgs
  DROP CONSTRAINT IF EXISTS creative_orgs_intern_limit_nonneg;
ALTER TABLE creative_orgs
  ADD CONSTRAINT creative_orgs_intern_limit_nonneg CHECK (intern_limit >= 0);

ALTER TABLE creative_orgs
  DROP CONSTRAINT IF EXISTS creative_orgs_active_intern_count_nonneg;
ALTER TABLE creative_orgs
  ADD CONSTRAINT creative_orgs_active_intern_count_nonneg CHECK (active_intern_count >= 0);

ALTER TABLE creative_orgs
  DROP CONSTRAINT IF EXISTS creative_orgs_staff_count_nonneg;
ALTER TABLE creative_orgs
  ADD CONSTRAINT creative_orgs_staff_count_nonneg CHECK (staff_count >= 0);

CREATE INDEX IF NOT EXISTS creative_orgs_org_type_idx ON creative_orgs(org_type);
CREATE INDEX IF NOT EXISTS creative_orgs_last_activity_idx ON creative_orgs(last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS creative_orgs_active_intern_count_idx ON creative_orgs(active_intern_count DESC);

-- Extend per-org roles without renaming the existing student role. UI can label it as Intern.
ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE org_members
  ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('owner','org_admin','instructor','student','moderator','finance','support','mentor'));

ALTER TABLE org_invites DROP CONSTRAINT IF EXISTS org_invites_role_check;
ALTER TABLE org_invites
  ADD CONSTRAINT org_invites_role_check
  CHECK (role IN ('org_admin','instructor','student','moderator','finance','support','mentor'));

CREATE INDEX IF NOT EXISTS org_members_org_status_idx ON org_members(org_id, status);
CREATE INDEX IF NOT EXISTS org_members_org_role_status_idx ON org_members(org_id, role, status);
CREATE INDEX IF NOT EXISTS org_members_active_students_idx ON org_members(org_id, user_id)
  WHERE status = 'active' AND role = 'student';

CREATE INDEX IF NOT EXISTS org_audit_log_recent_idx ON org_audit_log(created_at DESC);

-- Durable platform event stream. Ably is the live transport; this table is the fallback/history.
CREATE TABLE IF NOT EXISTS platform_org_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES creative_orgs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_org_events_recent_idx ON platform_org_events(created_at DESC);
CREATE INDEX IF NOT EXISTS platform_org_events_org_idx ON platform_org_events(org_id, created_at DESC);

ALTER TABLE platform_org_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_org_events'
      AND policyname = 'platform_org_events_super_admin_select'
  ) THEN
    CREATE POLICY platform_org_events_super_admin_select
      ON platform_org_events
      FOR SELECT
      USING (is_super_admin());
  END IF;
END $$;

-- Recompute denormalized org counters from org_members.
CREATE OR REPLACE FUNCTION refresh_creative_org_counts(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count INTEGER;
  v_intern_count INTEGER;
  v_staff_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
    INTO v_member_count
  FROM org_members
  WHERE org_id = p_org_id AND status = 'active';

  SELECT COUNT(*)::INTEGER
    INTO v_intern_count
  FROM org_members
  WHERE org_id = p_org_id AND status = 'active' AND role = 'student';

  SELECT COUNT(*)::INTEGER
    INTO v_staff_count
  FROM org_members
  WHERE org_id = p_org_id AND status = 'active' AND role <> 'student';

  UPDATE creative_orgs
  SET
    member_count = COALESCE(v_member_count, 0),
    active_intern_count = COALESCE(v_intern_count, 0),
    staff_count = COALESCE(v_staff_count, 0),
    last_activity_at = COALESCE(last_activity_at, NOW()),
    updated_at = NOW()
  WHERE id = p_org_id;
END;
$$;

-- Keep the old helper name compatible while filling the new counters too.
CREATE OR REPLACE FUNCTION recount_org_members(p_org_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count INTEGER;
BEGIN
  PERFORM refresh_creative_org_counts(p_org_id);
  SELECT member_count INTO v_member_count FROM creative_orgs WHERE id = p_org_id;
  RETURN COALESCE(v_member_count, 0);
END;
$$;

-- Quota-safe member join/upsert for invite redemption and public codes.
CREATE OR REPLACE FUNCTION upsert_org_member_with_quota(
  p_org_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_status TEXT DEFAULT 'active',
  p_invited_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org creative_orgs%ROWTYPE;
  v_existing org_members%ROWTYPE;
  v_limits org_platform_limits%ROWTYPE;
  v_platform_interns INTEGER;
  v_new_active_student BOOLEAN := FALSE;
BEGIN
  IF p_role NOT IN ('owner','org_admin','instructor','student','moderator','finance','support','mentor') THEN
    RAISE EXCEPTION 'Invalid org role: %', p_role;
  END IF;

  IF p_status NOT IN ('active','invited','suspended','removed') THEN
    RAISE EXCEPTION 'Invalid member status: %', p_status;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('org_member_quota'));
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id::TEXT));

  SELECT * INTO v_org FROM creative_orgs WHERE id = p_org_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Org not found';
  END IF;
  IF v_org.status <> 'active' THEN
    RAISE EXCEPTION 'Org is not active';
  END IF;

  SELECT * INTO v_existing
  FROM org_members
  WHERE org_id = p_org_id AND user_id = p_user_id
  FOR UPDATE;

  v_new_active_student :=
    p_status = 'active'
    AND p_role = 'student'
    AND (
      v_existing.id IS NULL
      OR v_existing.status <> 'active'
      OR v_existing.role <> 'student'
    );

  IF v_new_active_student THEN
    IF (
      SELECT COUNT(*) FROM org_members
      WHERE org_id = p_org_id AND role = 'student' AND status = 'active'
    ) >= v_org.intern_limit THEN
      RAISE EXCEPTION 'Org intern limit reached';
    END IF;

    SELECT * INTO v_limits
    FROM org_platform_limits
    WHERE key = 'default'
    FOR UPDATE;

    SELECT COUNT(*)::INTEGER INTO v_platform_interns
    FROM org_members om
    JOIN creative_orgs co ON co.id = om.org_id
    WHERE om.role = 'student'
      AND om.status = 'active'
      AND co.status = 'active';

    IF v_platform_interns >= GREATEST(0, v_limits.max_active_intern_memberships - v_limits.reserved_intern_seats) THEN
      RAISE EXCEPTION 'Platform intern limit reached';
    END IF;
  END IF;

  INSERT INTO org_members (org_id, user_id, role, status, invited_by)
  VALUES (p_org_id, p_user_id, p_role, p_status, p_invited_by)
  ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    invited_by = COALESCE(EXCLUDED.invited_by, org_members.invited_by),
    joined_at = CASE
      WHEN org_members.status <> 'active' AND EXCLUDED.status = 'active' THEN NOW()
      ELSE org_members.joined_at
    END;

  PERFORM refresh_creative_org_counts(p_org_id);
END;
$$;

-- Quota-safe org provisioning core. App code still handles Clerk promotion,
-- notifications, and audit enrichment after this transaction succeeds.
CREATE OR REPLACE FUNCTION provision_creative_org_from_space_with_quota(
  p_space_id UUID,
  p_slug TEXT,
  p_plan TEXT DEFAULT 'free',
  p_intern_limit INTEGER DEFAULT 50,
  p_org_type TEXT DEFAULT 'creative_space'
)
RETURNS TABLE(org_id UUID, created BOOLEAN, final_slug TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_space RECORD;
  v_existing creative_orgs%ROWTYPE;
  v_limits org_platform_limits%ROWTYPE;
  v_active_orgs INTEGER;
  v_org_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('creative_orgs_quota'));

  SELECT * INTO v_existing FROM creative_orgs WHERE space_id = p_space_id;
  IF FOUND THEN
    org_id := v_existing.id;
    created := FALSE;
    final_slug := v_existing.slug::TEXT;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id, owner_id, title
    INTO v_space
  FROM creative_spaces
  WHERE id = p_space_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Space not found';
  END IF;

  SELECT * INTO v_limits
  FROM org_platform_limits
  WHERE key = 'default'
  FOR UPDATE;

  SELECT COUNT(*)::INTEGER
    INTO v_active_orgs
  FROM creative_orgs
  WHERE status = 'active';

  IF v_active_orgs >= GREATEST(0, v_limits.max_active_orgs - v_limits.reserved_org_seats) THEN
    RAISE EXCEPTION 'Platform organization limit reached';
  END IF;

  INSERT INTO creative_orgs (
    space_id,
    slug,
    name,
    owner_user_id,
    status,
    plan,
    storage_prefix,
    org_type,
    intern_limit,
    last_activity_at
  )
  VALUES (
    v_space.id,
    p_slug,
    v_space.title,
    v_space.owner_id,
    'active',
    COALESCE(NULLIF(p_plan, ''), 'free'),
    'orgs/space-' || v_space.id || '/',
    COALESCE(NULLIF(p_org_type, ''), 'creative_space'),
    GREATEST(0, LEAST(COALESCE(p_intern_limit, 50), 1000)),
    NOW()
  )
  RETURNING id INTO v_org_id;

  UPDATE creative_orgs
  SET storage_prefix = 'orgs/' || v_org_id || '/'
  WHERE id = v_org_id;

  UPDATE creative_spaces cs
  SET org_id = v_org_id
  WHERE cs.id = v_space.id;

  INSERT INTO org_members (org_id, user_id, role, status)
  SELECT v_org_id, v_space.owner_id, 'owner', 'active'
  WHERE NOT EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = v_org_id AND om.user_id = v_space.owner_id
  );

  INSERT INTO org_channels (org_id, name, kind)
  SELECT v_org_id, seed.name, seed.kind
  FROM (
    VALUES
      ('general', 'general'),
      ('announcements', 'announcements')
  ) AS seed(name, kind)
  WHERE NOT EXISTS (
    SELECT 1 FROM org_channels oc
    WHERE oc.org_id = v_org_id AND oc.name = seed.name
  );

  INSERT INTO org_announcements (org_id, author_id, title, body, pinned)
  VALUES (
    v_org_id,
    v_space.owner_id,
    'Welcome to ' || v_space.title,
    'Your organization space is live. Add your first lesson, invite interns, and configure your workspace.',
    TRUE
  );

  INSERT INTO org_members (org_id, user_id, role, status)
  SELECT v_org_id, ce.student_id, 'student', 'active'
  FROM creative_enrollments ce
  WHERE ce.space_id = v_space.id
    AND NOT EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = v_org_id AND om.user_id = ce.student_id
    );

  PERFORM refresh_creative_org_counts(v_org_id);

  org_id := v_org_id;
  created := TRUE;
  final_slug := p_slug;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION tenant_health_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'creative_orgs',
    'org_members',
    'org_invites',
    'org_channels',
    'org_announcements',
    'org_lessons',
    'org_assignments',
    'org_submissions',
    'org_files',
    'org_messages',
    'org_audit_log',
    'org_lesson_completions',
    'platform_org_events',
    'org_platform_limits'
  ];
  v_table TEXT;
  v_table_checks JSONB := '[]'::jsonb;
  v_function_checks JSONB := '[]'::jsonb;
  v_rls_checks JSONB := '[]'::jsonb;
  v_orphan_spaces INTEGER := 0;
  v_orphan_orgs INTEGER := 0;
  v_count_drift INTEGER := 0;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    v_table_checks := v_table_checks || jsonb_build_array(jsonb_build_object(
      'name', v_table,
      'exists', to_regclass('public.' || v_table) IS NOT NULL
    ));

    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      SELECT v_rls_checks || jsonb_build_array(jsonb_build_object(
        'name', v_table,
        'enabled', c.relrowsecurity,
        'policies', (
          SELECT COUNT(*)::INTEGER
          FROM pg_policies p
          WHERE p.schemaname = 'public' AND p.tablename = v_table
        )
      ))
      INTO v_rls_checks
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_table;
    END IF;
  END LOOP;

  v_function_checks := jsonb_build_array(
    jsonb_build_object('name', 'is_super_admin()', 'exists', to_regprocedure('is_super_admin()') IS NOT NULL),
    jsonb_build_object('name', 'recount_org_members(uuid)', 'exists', to_regprocedure('recount_org_members(uuid)') IS NOT NULL),
    jsonb_build_object('name', 'transfer_org_ownership(uuid,uuid,uuid)', 'exists', to_regprocedure('transfer_org_ownership(uuid,uuid,uuid)') IS NOT NULL),
    jsonb_build_object('name', 'upsert_org_member_with_quota(uuid,uuid,text,text,uuid)', 'exists', to_regprocedure('upsert_org_member_with_quota(uuid,uuid,text,text,uuid)') IS NOT NULL),
    jsonb_build_object('name', 'provision_creative_org_from_space_with_quota(uuid,text,text,integer,text)', 'exists', to_regprocedure('provision_creative_org_from_space_with_quota(uuid,text,text,integer,text)') IS NOT NULL)
  );

  IF to_regclass('public.creative_spaces') IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_orphan_spaces
    FROM creative_spaces
    WHERE org_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM creative_orgs co WHERE co.id = creative_spaces.org_id);
  END IF;

  IF to_regclass('public.creative_orgs') IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_orphan_orgs
    FROM creative_orgs
    WHERE space_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM creative_spaces cs WHERE cs.id = creative_orgs.space_id);

    SELECT COUNT(*)::INTEGER INTO v_count_drift
    FROM creative_orgs co
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::INTEGER AS members,
        COUNT(*) FILTER (WHERE role = 'student')::INTEGER AS interns,
        COUNT(*) FILTER (WHERE role <> 'student')::INTEGER AS staff
      FROM org_members om
      WHERE om.org_id = co.id AND om.status = 'active'
    ) counts ON TRUE
    WHERE COALESCE(co.member_count, 0) <> COALESCE(counts.members, 0)
       OR COALESCE(co.active_intern_count, 0) <> COALESCE(counts.interns, 0)
       OR COALESCE(co.staff_count, 0) <> COALESCE(counts.staff, 0);
  END IF;

  RETURN jsonb_build_object(
    'tables', v_table_checks,
    'rls', v_rls_checks,
    'functions', v_function_checks,
    'orphans', jsonb_build_object(
      'spaces_with_missing_org', v_orphan_spaces,
      'orgs_with_missing_space', v_orphan_orgs
    ),
    'count_drift', v_count_drift,
    'checked_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION tenant_health_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tenant_health_snapshot() TO service_role;

REVOKE ALL ON FUNCTION refresh_creative_org_counts(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION recount_org_members(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION upsert_org_member_with_quota(UUID, UUID, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION provision_creative_org_from_space_with_quota(UUID, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_creative_org_counts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION recount_org_members(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION upsert_org_member_with_quota(UUID, UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION provision_creative_org_from_space_with_quota(UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;

-- Backfill new counters and sane defaults for existing orgs.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM creative_orgs LOOP
    PERFORM refresh_creative_org_counts(r.id);
  END LOOP;
END $$;
