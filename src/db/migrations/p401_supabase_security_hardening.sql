-- CIOS Supabase security hardening baseline.
-- Default-deny all public tables, remove unrestricted writes, and restrict
-- privileged helpers to the server-side service role.

DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      table_record.schemaname,
      table_record.tablename
    );
  END LOOP;
END
$$;

-- These policies allowed arbitrary inserts from API callers. CIOS performs
-- these writes through authenticated server actions using the service role.
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
DROP POLICY IF EXISTS chat_room_members_insert ON public.chat_room_members;
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
DROP POLICY IF EXISTS users_insert ON public.users;

-- Ensure the view observes the querying role's permissions and table RLS.
ALTER VIEW IF EXISTS public.user_fine_offense_counts
  SET (security_invoker = true);

-- Pin function lookup to trusted schemas to prevent search-path substitution.
DO $$
DECLARE
  function_record RECORD;
BEGIN
  FOR function_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'active_org_id',
        'auth_user_id',
        'generate_intern_id',
        'is_admin',
        'is_org_member',
        'is_super_admin',
        'provision_creative_org_from_space_with_quota',
        'recount_org_members',
        'refresh_creative_org_counts',
        'set_compliance_tasks_updated_at',
        'tenant_health_snapshot',
        'transfer_org_ownership',
        'update_updated_at',
        'upsert_org_member_with_quota'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
  END LOOP;
END
$$;

-- These administrative RPCs are only called by server-side service-role code.
DO $$
DECLARE
  function_record RECORD;
BEGIN
  FOR function_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'provision_creative_org_from_space_with_quota',
        'recount_org_members',
        'refresh_creative_org_counts',
        'tenant_health_snapshot',
        'upsert_org_member_with_quota'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
  END LOOP;
END
$$;

-- Keep policy helper functions usable during RLS evaluation but not callable
-- by unauthenticated API clients.
REVOKE EXECUTE ON FUNCTION public.auth_user_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO service_role;

-- Supabase recommends extensions outside the exposed public schema.
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION citext SET SCHEMA extensions;
