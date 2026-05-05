/**
 * org_audit_log — append-only ops trail per creative_org.
 *
 * Writes are best-effort (failure NEVER blocks the parent action) but
 * loud in dev so missing audit can be caught early. Reads land on
 * /o/<slug>/audit for owners + org admins, and on the super-admin
 * surfaces for cross-org investigation.
 *
 * Action vocabulary — keep stable; queries depend on these strings:
 *
 *   org.created                provisionOrgFromSpace
 *   org.suspended              super-admin status flip (future)
 *   org.archived               super-admin status flip (future)
 *   org.unsuspended            super-admin (future)
 *
 *   member.invited             org_invites insert (per-email)
 *   member.joined              org_members upsert from join flows
 *   member.role_updated        updateMemberRole
 *   member.removed             removeMember (soft)
 *
 *   code.created               createPublicEnrollmentCode
 *   code.revoked               revokePublicEnrollmentCode
 *
 *   channel.created            createChannel
 *   announcement.posted        postAnnouncement
 *   lesson.created             createLesson
 *   assignment.created         createAssignment
 *   submission.graded          gradeSubmission
 */

import "server-only";
import { supabaseAdmin } from "@/lib/db";
import * as Ably from "ably";

let ablyRest: Ably.Rest | null = null;
function getAblyRest(): Ably.Rest | null {
  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  if (!ablyRest) ablyRest = new Ably.Rest({ key });
  return ablyRest;
}

export type OrgAuditAction =
  | "org.created" | "org.suspended" | "org.archived" | "org.unsuspended"
  | "member.invited" | "member.joined" | "member.role_updated" | "member.removed"
  | "code.created" | "code.revoked"
  | "channel.created" | "announcement.posted"
  | "lesson.created" | "assignment.created" | "submission.graded"
  | "file.uploaded" | "file.deleted";

export interface OrgAuditEntry {
  orgId: string;
  /** users.id (Supabase) of who performed the action; null = system action */
  actorId: string | null;
  action: OrgAuditAction;
  /** free-form pointer at the affected entity (e.g. "user:<id>", "lesson:<id>") */
  target?: string | null;
  /** optional structured payload — kept small (< 4 KB) */
  meta?: Record<string, unknown>;
}

export async function logOrgAudit(entry: OrgAuditEntry): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("org_audit_log").insert({
      org_id: entry.orgId,
      actor_id: entry.actorId,
      action: entry.action,
      target: entry.target ?? null,
      meta: entry.meta ?? {},
    })
      .select("id, created_at")
      .single();
    if (error) {
      console.warn("[org-audit] insert failed:", JSON.stringify({
        message: (error as { message?: string }).message,
        code: (error as { code?: string }).code,
        action: entry.action,
        org: entry.orgId,
      }));
      return;
    }

    // Realtime fan-out so the host dashboard activity feed prepends new
    // rows without a refresh. Channel: `org-activity:<orgId>`. We resolve
    // actor_name in-line so subscribers don't need a follow-up query.
    // Failures are non-fatal — the row is already in Postgres and will
    // appear on the next page load.
    const rest = getAblyRest();
    if (rest && data) {
      try {
        let actorName: string | null = null;
        if (entry.actorId) {
          const { data: u } = await sb
            .from("users")
            .select("name")
            .eq("id", entry.actorId)
            .maybeSingle();
          actorName = (u as { name?: string | null } | null)?.name ?? null;
        }
        const ch = rest.channels.get(`org-activity:${entry.orgId}`);
        await ch.publish("event", {
          id: (data as { id: string }).id,
          action: entry.action,
          target: entry.target ?? null,
          meta: entry.meta ?? {},
          created_at: (data as { created_at: string }).created_at,
          actor_name: actorName,
        });
      } catch (e) {
        console.warn("[org-audit] ably publish failed (non-fatal):", e instanceof Error ? e.message : e);
      }
    }
  } catch (e) {
    // Never throw from audit — audit must not break the parent action.
    console.warn("[org-audit] threw:", e instanceof Error ? e.message : e);
  }
}
