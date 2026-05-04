-- p394: atomic org ownership transfer
--
-- Doing this safely in app code requires either Postgres transactions
-- (which supabase-js doesn't expose) or careful ordering with rollback
-- on failure (which is racy under concurrent operations). A SECURITY
-- DEFINER function lets us do both updates in one transaction with
-- a single round-trip.
--
-- The "≥1 active owner" invariant is the contract every other piece
-- of code (updateMemberRole, removeMember, etc.) protects. This
-- function preserves it: it promotes the new owner BEFORE demoting
-- the old one, both within the same transaction. There is never a
-- moment when the org has zero owners.
--
-- Authorization is enforced by the function itself: the caller MUST
-- be the current owner. A super_admin override is intentionally
-- omitted — super_admin can fix things via direct Supabase Studio
-- access if a transfer ever needs to be forced; the public surface
-- shouldn't expose that path.

CREATE OR REPLACE FUNCTION transfer_org_ownership(
  p_org_id        UUID,
  p_new_owner_id  UUID,   -- users.id of the new owner
  p_actor_id      UUID    -- users.id of the user initiating the transfer (must be current owner)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_owner UUID;
  v_target_status TEXT;
BEGIN
  -- Sanity checks under a row lock so two concurrent transfers can't
  -- race each other into a split-owner state.
  SELECT owner_user_id INTO v_current_owner
  FROM creative_orgs
  WHERE id = p_org_id
  FOR UPDATE;

  IF v_current_owner IS NULL THEN
    RAISE EXCEPTION 'org_not_found';
  END IF;

  IF v_current_owner <> p_actor_id THEN
    RAISE EXCEPTION 'not_current_owner';
  END IF;

  IF p_new_owner_id = p_actor_id THEN
    RAISE EXCEPTION 'cannot_transfer_to_self';
  END IF;

  -- The target must already be an active member of the org.
  SELECT status INTO v_target_status
  FROM org_members
  WHERE org_id = p_org_id AND user_id = p_new_owner_id;

  IF v_target_status IS NULL THEN
    RAISE EXCEPTION 'target_not_member';
  END IF;
  IF v_target_status <> 'active' THEN
    RAISE EXCEPTION 'target_not_active';
  END IF;

  -- ORDER MATTERS: promote new owner FIRST, then demote old owner,
  -- then update the pointer. If we did the demote first there'd be a
  -- moment (mid-transaction) where the org has 0 owners. Mid-
  -- transaction state isn't visible to other readers but a CHECK
  -- constraint inside this same TX would still fire — keep the order
  -- safe regardless of future hardening.
  UPDATE org_members
  SET role = 'owner'
  WHERE org_id = p_org_id AND user_id = p_new_owner_id;

  UPDATE org_members
  SET role = 'org_admin'   -- legacy owner keeps elevated access by default
  WHERE org_id = p_org_id AND user_id = p_actor_id;

  UPDATE creative_orgs
  SET owner_user_id = p_new_owner_id, updated_at = NOW()
  WHERE id = p_org_id;
END;
$$;

-- Restrict execution. Service role is the only caller — the action
-- in src/app/actions/org-portal.ts uses supabaseAdmin() (service
-- role) for all org writes already. Revoke from anon/authenticated
-- so a leaked anon key + RPC introspection can't trigger transfers.
REVOKE EXECUTE ON FUNCTION transfer_org_ownership(UUID, UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transfer_org_ownership(UUID, UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION transfer_org_ownership(UUID, UUID, UUID) FROM authenticated;
