"use server";

/**
 * Super-admin actions over the creative_orgs table.
 *
 * Status flips (suspend / archive / reactivate) are the *only* mutation
 * super-admin can do here today; deletions are intentionally not exposed
 * because cascade-delete on the org would wipe lessons/assignments/
 * messages forever and there's no undo. Use archive instead — it
 * blocks new activity but keeps the data.
 *
 * Every action writes an audit row so the org's owners can see what
 * happened on /o/<slug>/audit.
 */

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logOrgAudit } from "@/lib/org-audit";
import { cacheDel } from "@/lib/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSuperAdmin() {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false as const, error: "Unauthorized" };
  if (me.role !== "super_admin") return { ok: false as const, error: "Super admin only" };
  return { ok: true as const, me };
}

type OrgStatus = "active" | "suspended" | "archived";
const VALID: OrgStatus[] = ["active", "suspended", "archived"];

const ACTION_FOR: Record<string, "org.suspended" | "org.archived" | "org.unsuspended"> = {
  "active":    "org.unsuspended",
  "suspended": "org.suspended",
  "archived":  "org.archived",
};

export async function setOrgStatus(orgId: string, status: OrgStatus, reason?: string): Promise<R> {
  const sa = await requireSuperAdmin();
  if (!sa.ok) return sa;
  if (!VALID.includes(status)) return { ok: false, error: "Invalid status" };

  const sb = supabaseAdmin();
  const { data: orgRow } = await sb
    .from("creative_orgs")
    .select("id, slug, status")
    .eq("id", orgId)
    .maybeSingle();
  const org = orgRow as { id: string; slug: string; status: OrgStatus } | null;
  if (!org) return { ok: false, error: "Org not found" };
  if (org.status === status) return { ok: false, error: `Org is already ${status}` };

  const { error } = await sb
    .from("creative_orgs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orgId);
  if (error) return { ok: false, error: error.message };

  // Bust the membership cache for this slug so the edge tenant guard
  // re-resolves the org's status on the next request. Without this,
  // suspended orgs stay reachable for up to 60s.
  // We can't easily enumerate every member's cache key (those are
  // user-id-keyed) — relying on the 60s TTL is acceptable. Worst case:
  // a suspended user can still read for ≤60s.
  await cacheDel(`org:${orgId}:dashboard`, `org:${orgId}:member_count`);

  // Owners + members will see the resulting state via getOrgEntryStatus
  // explanatory pages we just shipped — so no inline notification fan-
  // out is needed. The audit row is the source of truth.
  await logOrgAudit({
    orgId, actorId: sa.me.id, action: ACTION_FOR[status],
    target: `org:${orgId}`,
    meta: { from: org.status, to: status, reason: reason ?? null },
  });

  // Notify the org owner so they don't first discover this on their
  // next portal visit. Fan-out beyond the owner would be noisy here;
  // members see the explanation page when they try to enter.
  try {
    const { data: ownerRow } = await sb
      .from("creative_orgs")
      .select("owner_user_id, name")
      .eq("id", orgId)
      .maybeSingle();
    const owner = ownerRow as { owner_user_id: string; name: string } | null;
    if (owner) {
      const titles: Record<OrgStatus, string> = {
        active:    "✅ Your org has been reactivated",
        suspended: "⏸ Your org has been suspended",
        archived:  "🗄 Your org has been archived",
      };
      await sb.from("notifications").insert({
        user_id: owner.owner_user_id,
        org_id: orgId,
        title: titles[status],
        message: reason
          ? `Reason from CIOS: ${reason.slice(0, 200)}`
          : (status === "active" ? `${owner.name} is back online.` : `${owner.name} status changed to ${status}.`),
        type: status === "active" ? "success" : "warning",
        action_url: status === "active" ? `/o/${org.slug}` : `/super-admin/orgs?q=${encodeURIComponent(owner.name)}`,
        is_read: false,
      });
    }
  } catch (e) {
    console.warn("[setOrgStatus] owner notification failed (non-fatal):", e);
  }

  revalidatePath("/super-admin/orgs");
  revalidatePath(`/o/${org.slug}`);
  revalidatePath(`/s/${org.slug}`);
  return { ok: true };
}
