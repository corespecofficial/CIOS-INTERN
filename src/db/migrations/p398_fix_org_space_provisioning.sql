-- p398: Hotfix stale tenant health RPC + org provisioning ambiguity
-- Safe to run more than once.

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
REVOKE ALL ON FUNCTION provision_creative_org_from_space_with_quota(UUID, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION provision_creative_org_from_space_with_quota(UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;

DO $$
DECLARE
  r RECORD;
  v_slug TEXT;
BEGIN
  FOR r IN
    SELECT id, title, slug
    FROM creative_spaces
    WHERE org_id IS NULL
    ORDER BY created_at ASC
  LOOP
    v_slug := COALESCE(NULLIF(r.slug, ''), regexp_replace(lower(r.title), '[^a-z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    IF v_slug = '' THEN
      v_slug := 'org-space';
    END IF;
    v_slug := left(v_slug, 52) || '-' || left(r.id::TEXT, 6);

    BEGIN
      PERFORM provision_creative_org_from_space_with_quota(r.id, v_slug, 'free', 50, 'creative_space');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not provision creative space %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
