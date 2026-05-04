-- p393: Drift-proof member_count + status-gate helper
--
-- Replaces the read-modify-write pattern in app code:
--   SELECT member_count → cur+1 in JS → UPDATE
-- which races on concurrent writes and double-counts re-adds (a member
-- who was soft-removed and rejoins via an enrollment code). Recomputing
-- from org_members in a single SQL statement is race-proof, idempotent,
-- and correct regardless of how the row got there.
--
-- COUNT(*) on org_members for one org is O(N_org) using the
-- (org_id, role, status) index from p390 — essentially free.

CREATE OR REPLACE FUNCTION recount_org_members(p_org_id UUID)
RETURNS INT
LANGUAGE sql AS $$
  WITH n AS (
    SELECT COUNT(*)::int AS c
    FROM org_members
    WHERE org_id = p_org_id AND status = 'active'
  )
  UPDATE creative_orgs
  SET member_count = (SELECT c FROM n),
      updated_at   = NOW()
  WHERE id = p_org_id
  RETURNING member_count
$$;

-- Convenience: ensure member_count never drifts below 0 even if RPC
-- isn't used (defence-in-depth).
ALTER TABLE creative_orgs
  DROP CONSTRAINT IF EXISTS creative_orgs_member_count_nonneg;
ALTER TABLE creative_orgs
  ADD CONSTRAINT creative_orgs_member_count_nonneg
  CHECK (member_count >= 0);

-- One-shot reconcile for whatever drift already exists in the table.
-- Safe to re-run; idempotent.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM creative_orgs LOOP
    PERFORM recount_org_members(r.id);
  END LOOP;
END $$;
