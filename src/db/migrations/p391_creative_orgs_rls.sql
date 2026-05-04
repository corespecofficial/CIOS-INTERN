-- p391: Creative-Space Host Org Portal — Phase 4 RLS hardening
--
-- All server-side reads in the host portal go through `supabaseAdmin()`
-- (service role key, bypasses RLS), so the application layer is already
-- the primary tenant isolation boundary. RLS here is defense-in-depth:
--
--   * If a future code path mistakenly uses the anon key (e.g. a client
--     component issuing a direct query), this stops it cold.
--   * If a Supabase service-role key ever leaks, RLS isn't a fix — but
--     it makes anon-key abuse harmless until rotation completes.
--
-- Every policy uses `is_org_member(org_id, allowed_roles)`, which itself
-- relies on `auth_user_id()` (clerk_id JWT lookup) and the `(user_id,
-- status, org_id)` composite index from p390. Service-role connections
-- bypass these policies entirely; super_admin override is an explicit
-- `role = 'super_admin'` check inside is_admin() — already supported.

-- ───────────────────────────────────────────────────────────────────
-- Helper: super-admin bypass shorthand. Avoids repeating the role
-- check in every policy. Marked STABLE so the planner caches it
-- per-statement; one users lookup per query, not per row.
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE clerk_id = auth.jwt() ->> 'sub'
      AND role = 'super_admin'
  )
$$;

-- ───────────────────────────────────────────────────────────────────
-- creative_orgs: members can read their own org; staff can update;
-- only super_admin can hard-delete (regular suspend uses status flag).
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE creative_orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY creative_orgs_select ON creative_orgs FOR SELECT
USING (is_super_admin() OR is_org_member(id));

CREATE POLICY creative_orgs_update ON creative_orgs FOR UPDATE
USING (is_super_admin() OR is_org_member(id, ARRAY['owner','org_admin']))
WITH CHECK (is_super_admin() OR is_org_member(id, ARRAY['owner','org_admin']));

CREATE POLICY creative_orgs_insert ON creative_orgs FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY creative_orgs_delete ON creative_orgs FOR DELETE
USING (is_super_admin());

-- ───────────────────────────────────────────────────────────────────
-- org_members: members see their own org's roster; staff edit; owners
-- can remove anyone except themselves (handled in app layer).
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_members_select ON org_members FOR SELECT
USING (is_super_admin() OR is_org_member(org_id));

CREATE POLICY org_members_insert ON org_members FOR INSERT
WITH CHECK (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']));

CREATE POLICY org_members_update ON org_members FOR UPDATE
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']))
WITH CHECK (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']));

CREATE POLICY org_members_delete ON org_members FOR DELETE
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner']));

-- ───────────────────────────────────────────────────────────────────
-- org_invites: only staff can create / read pending invites.
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_invites_select ON org_invites FOR SELECT
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']));

CREATE POLICY org_invites_write ON org_invites FOR ALL
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']))
WITH CHECK (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']));

-- ───────────────────────────────────────────────────────────────────
-- Content tables: read = any active member; write = host roles only.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE org_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_announcements_select ON org_announcements FOR SELECT
USING (is_super_admin() OR is_org_member(org_id));
CREATE POLICY org_announcements_write ON org_announcements FOR ALL
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']))
WITH CHECK (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']));

ALTER TABLE org_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_lessons_select ON org_lessons FOR SELECT
USING (is_super_admin() OR is_org_member(org_id));
CREATE POLICY org_lessons_write ON org_lessons FOR ALL
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']))
WITH CHECK (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']));

ALTER TABLE org_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_assignments_select ON org_assignments FOR SELECT
USING (is_super_admin() OR is_org_member(org_id));
CREATE POLICY org_assignments_write ON org_assignments FOR ALL
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']))
WITH CHECK (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']));

-- Submissions: students see their own; staff see all in their org.
ALTER TABLE org_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_submissions_select ON org_submissions FOR SELECT
USING (
  is_super_admin()
  OR (student_id = auth_user_id())
  OR is_org_member(org_id, ARRAY['owner','org_admin','instructor'])
);
CREATE POLICY org_submissions_insert ON org_submissions FOR INSERT
WITH CHECK (
  is_super_admin()
  OR (student_id = auth_user_id() AND is_org_member(org_id))
);
CREATE POLICY org_submissions_update ON org_submissions FOR UPDATE
USING (
  is_super_admin()
  OR (student_id = auth_user_id() AND is_org_member(org_id))           -- student resubmits
  OR is_org_member(org_id, ARRAY['owner','org_admin','instructor'])    -- staff grades
)
WITH CHECK (
  is_super_admin()
  OR (student_id = auth_user_id() AND is_org_member(org_id))
  OR is_org_member(org_id, ARRAY['owner','org_admin','instructor'])
);
CREATE POLICY org_submissions_delete ON org_submissions FOR DELETE
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']));

ALTER TABLE org_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_channels_select ON org_channels FOR SELECT
USING (is_super_admin() OR is_org_member(org_id));
CREATE POLICY org_channels_write ON org_channels FOR ALL
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']))
WITH CHECK (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin','instructor']));

-- Messages: anyone in the org can post; staff can moderate (delete).
ALTER TABLE org_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_messages_select ON org_messages FOR SELECT
USING (is_super_admin() OR is_org_member(org_id));
CREATE POLICY org_messages_insert ON org_messages FOR INSERT
WITH CHECK (
  is_super_admin()
  OR (author_id = auth_user_id() AND is_org_member(org_id))
);
CREATE POLICY org_messages_delete ON org_messages FOR DELETE
USING (
  is_super_admin()
  OR author_id = auth_user_id()                                        -- author can delete own
  OR is_org_member(org_id, ARRAY['owner','org_admin','instructor'])    -- staff moderate
);
-- No update — messages are immutable; edits are author-delete + repost.

ALTER TABLE org_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_files_select ON org_files FOR SELECT
USING (is_super_admin() OR is_org_member(org_id));
CREATE POLICY org_files_write ON org_files FOR ALL
USING (is_super_admin() OR is_org_member(org_id))
WITH CHECK (is_super_admin() OR is_org_member(org_id));

-- Audit log: read-only for org staff, append-only via app layer (service role).
ALTER TABLE org_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_audit_log_select ON org_audit_log FOR SELECT
USING (is_super_admin() OR is_org_member(org_id, ARRAY['owner','org_admin']));
-- INSERT policy intentionally omitted — only service-role writes audit rows.
