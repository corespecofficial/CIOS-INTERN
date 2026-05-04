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

export type OrgAuditAction =
  | "org.created" | "org.suspended" | "org.archived" | "org.unsuspended"
  | "member.invited" | "member.joined" | "member.role_updated" | "member.removed"
  | "code.created" | "code.revoked"
  | "channel.created" | "announcement.posted"
  | "lesson.created" | "assignment.created" | "submission.graded";

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
    const { error } = await sb.from("org_audit_log").insert({
      org_id: entry.orgId,
      actor_id: entry.actorId,
      action: entry.action,
      target: entry.target ?? null,
      meta: entry.meta ?? {},
    });
    if (error) console.warn("[org-audit] insert failed:", JSON.stringify({
      message: (error as { message?: string }).message,
      code: (error as { code?: string }).code,
      action: entry.action,
      org: entry.orgId,
    }));
  } catch (e) {
    // Never throw from audit — audit must not break the parent action.
    console.warn("[org-audit] threw:", e instanceof Error ? e.message : e);
  }
}
