"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };
const ADMIN_ROLES = new Set(["owner", "org_admin", "instructor"]);

async function context(orgSlug: string) {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  const sb = supabaseAdmin();
  const { data: org } = await sb.from("creative_orgs").select("id,slug,module_flags").eq("slug", orgSlug).eq("status", "active").maybeSingle();
  if (!org || !(org.module_flags as Record<string, unknown> | null)?.org_operations) throw new Error("Operations programme is not enabled for this organization");
  const { data: membership } = await sb.from("org_members").select("role,status").eq("org_id", org.id).eq("user_id", me.id).eq("status", "active").maybeSingle();
  if (!membership && me.role !== "super_admin") throw new Error("Not authorized for this organization");
  const { data: programme } = await sb.from("org_programmes").select("*").eq("org_id", org.id).eq("status", "active").maybeSingle();
  if (!programme) throw new Error("No active programme");
  return { sb, me, org, programme, role: membership?.role as string | undefined, isAdmin: me.role === "super_admin" || ADMIN_ROLES.has(String(membership?.role)) };
}

async function audit(c: Awaited<ReturnType<typeof context>>, action: string, recordType: string, recordId: string | null, before?: unknown, after?: unknown, reason?: string) {
  await c.sb.from("org_operations_audit").insert({
    org_id: c.org.id, programme_id: c.programme.id, actor_id: c.me.id,
    actor_role: c.role || c.me.role, action, record_type: recordType, record_id: recordId,
    previous_value: before ?? null, new_value: after ?? null, reason: reason || null,
  });
}

export async function getOperationsDashboard(orgSlug: string) {
  try {
    const c = await context(orgSlug);
    const now = new Date().toISOString();
    const [meetings, myAttendance, sessions, members] = await Promise.all([
      c.sb.from("org_programme_meetings").select("*").eq("programme_id", c.programme.id).gte("ends_at", now).order("starts_at").limit(8),
      c.sb.from("org_meeting_attendance").select("*").eq("programme_id", c.programme.id).eq("user_id", c.me.id).order("created_at", { ascending: false }).limit(20),
      c.isAdmin
        ? c.sb.from("org_work_sessions").select("id,status,submitted_minutes,approved_minutes,user_id,planned_activity,work_summary,output_produced,reviewer_feedback,created_at,users:user_id(name,email)").eq("programme_id", c.programme.id).order("created_at", { ascending: false }).limit(100)
        : c.sb.from("org_work_sessions").select("id,status,submitted_minutes,approved_minutes,user_id,created_at").eq("programme_id", c.programme.id).eq("user_id", c.me.id).order("created_at", { ascending: false }).limit(100),
      c.sb.from("org_programme_members").select("id,user_id,position_title,programme_role,status,department_id").eq("programme_id", c.programme.id).order("created_at"),
    ]);
    return { ok: true as const, data: { programme: c.programme, meetings: meetings.data || [], attendance: myAttendance.data || [], sessions: sessions.data || [], members: members.data || [], isAdmin: c.isAdmin, meId: c.me.id, serverNow: now } };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Unable to load programme" }; }
}

export async function signIntoMeeting(orgSlug: string, meetingId: string): Promise<R> {
  try {
    const c = await context(orgSlug);
    const { data: meeting } = await c.sb.from("org_programme_meetings").select("*").eq("id", meetingId).eq("programme_id", c.programme.id).maybeSingle();
    if (!meeting) return { ok: false, error: "Meeting not found" };
    const now = new Date();
    if (now < new Date(meeting.sign_in_opens_at)) return { ok: false, error: "Sign-in has not opened yet" };
    if (now > new Date(meeting.sign_in_closes_at)) return { ok: false, error: "Sign-in is closed; submit an explanation for review" };
    const provisional = now <= new Date(meeting.punctual_until) ? "punctual" : "late";
    const { data: row, error } = await c.sb.from("org_meeting_attendance").upsert({
      org_id: c.org.id, programme_id: c.programme.id, meeting_id: meetingId, user_id: c.me.id,
      signed_in_at: now.toISOString(), provisional_status: provisional, final_status: "pending", updated_at: now.toISOString(),
    }, { onConflict: "meeting_id,user_id", ignoreDuplicates: true }).select("id,provisional_status,signed_in_at").single();
    if (error || !row) return { ok: false, error: error?.message || "Unable to sign in" };
    await audit(c, "attendance.sign_in", "meeting_attendance", row.id, null, row);
    revalidatePath(`/s/${orgSlug}`); revalidatePath(`/o/${orgSlug}/operations`);
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to sign in" }; }
}

export async function signOutOfMeeting(orgSlug: string, meetingId: string): Promise<R> {
  try {
    const c = await context(orgSlug);
    const { data: meeting } = await c.sb.from("org_programme_meetings").select("sign_out_opens_at,sign_out_closes_at").eq("id", meetingId).eq("programme_id", c.programme.id).maybeSingle();
    if (!meeting) return { ok: false, error: "Meeting not found" };
    const now = new Date();
    if (now < new Date(meeting.sign_out_opens_at) || now > new Date(meeting.sign_out_closes_at)) return { ok: false, error: "Sign-out is not currently open" };
    const { data: before } = await c.sb.from("org_meeting_attendance").select("*").eq("meeting_id", meetingId).eq("user_id", c.me.id).maybeSingle();
    if (!before?.signed_in_at) return { ok: false, error: "You did not sign into this meeting" };
    const { data: row } = await c.sb.from("org_meeting_attendance").update({ signed_out_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", before.id).select("*").single();
    await audit(c, "attendance.sign_out", "meeting_attendance", before.id, before, row);
    revalidatePath(`/s/${orgSlug}`); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to sign out" }; }
}

export async function startWorkSession(orgSlug: string, input: { plannedActivity: string; expectedOutput: string; estimatedMinutes: number; departmentId?: string }): Promise<R<{ id: string }>> {
  try {
    const c = await context(orgSlug);
    const planned = input.plannedActivity.trim(); const output = input.expectedOutput.trim();
    if (planned.length < 10 || output.length < 10) return { ok: false, error: "Describe the planned activity and expected output" };
    if (!Number.isInteger(input.estimatedMinutes) || input.estimatedMinutes < 15 || input.estimatedMinutes > 720) return { ok: false, error: "Estimated duration must be 15–720 minutes" };
    if (input.departmentId) {
      const { data: department } = await c.sb.from("org_departments").select("id").eq("id", input.departmentId).eq("org_id", c.org.id).maybeSingle();
      if (!department) return { ok: false, error: "Department does not belong to this organization" };
    }
    const { count } = await c.sb.from("org_work_sessions").select("id", { count: "exact", head: true }).eq("user_id", c.me.id).eq("programme_id", c.programme.id).in("status", ["running","paused"]);
    if (count) return { ok: false, error: "Finish or submit your current work session first" };
    const { data: row, error } = await c.sb.from("org_work_sessions").insert({
      org_id: c.org.id, programme_id: c.programme.id, user_id: c.me.id, department_id: input.departmentId || null,
      planned_activity: planned, expected_output: output, estimated_minutes: input.estimatedMinutes,
      started_at: new Date().toISOString(), status: "running",
    }).select("id,status,started_at").single();
    if (error || !row) return { ok: false, error: error?.message || "Unable to start session" };
    await audit(c, "work_session.started", "work_session", row.id, null, row);
    revalidatePath(`/s/${orgSlug}/work-sessions`); return { ok: true, data: { id: row.id } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to start session" }; }
}

export async function submitWorkSession(orgSlug: string, sessionId: string, input: { summary: string; output: string; challenges?: string; nextAction: string; evidenceUrl: string }): Promise<R> {
  try {
    const c = await context(orgSlug);
    const { data: session } = await c.sb.from("org_work_sessions").select("*").eq("id", sessionId).eq("programme_id", c.programme.id).eq("user_id", c.me.id).maybeSingle();
    if (!session || !["running","paused","evidence_requested"].includes(session.status)) return { ok: false, error: "Session cannot be submitted" };
    if (input.summary.trim().length < 20 || input.output.trim().length < 10 || input.nextAction.trim().length < 5) return { ok: false, error: "Complete the work summary, output and next action" };
    let evidence: URL; try { evidence = new URL(input.evidenceUrl); } catch { return { ok: false, error: "Provide a valid evidence URL" }; }
    if (!['https:'].includes(evidence.protocol)) return { ok: false, error: "Evidence URL must use HTTPS" };
    const ended = new Date();
    const minutes = Math.max(0, Math.floor((ended.getTime() - new Date(session.started_at).getTime()) / 60000) - Math.floor(Number(session.paused_seconds || 0) / 60));
    const update = { status: "awaiting_review", ended_at: ended.toISOString(), submitted_minutes: minutes, work_summary: input.summary.trim(), output_produced: input.output.trim(), challenges: input.challenges?.trim() || null, next_action: input.nextAction.trim(), updated_at: ended.toISOString() };
    await c.sb.from("org_work_sessions").update(update).eq("id", sessionId);
    await c.sb.from("org_work_session_evidence").insert({ org_id: c.org.id, session_id: sessionId, submitted_by: c.me.id, evidence_type: "link", url: evidence.toString() });
    await audit(c, "work_session.submitted", "work_session", sessionId, session, update);
    revalidatePath(`/s/${orgSlug}/work-sessions`); revalidatePath(`/o/${orgSlug}/operations`); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to submit session" }; }
}

export async function reviewWorkSession(orgSlug: string, sessionId: string, approvedMinutes: number, feedback: string): Promise<R> {
  try {
    const c = await context(orgSlug); if (!c.isAdmin) return { ok: false, error: "Only authorized staff can review hours" };
    const { data: session } = await c.sb.from("org_work_sessions").select("*").eq("id", sessionId).eq("programme_id", c.programme.id).maybeSingle();
    if (!session || !["awaiting_review","submitted","evidence_requested"].includes(session.status)) return { ok: false, error: "Session is not awaiting review" };
    const submitted = Number(session.submitted_minutes || 0);
    if (!Number.isInteger(approvedMinutes) || approvedMinutes < 0 || approvedMinutes > submitted) return { ok: false, error: "Approved minutes must be within submitted time" };
    const status = approvedMinutes === 0 ? "rejected" : approvedMinutes === submitted ? "approved" : "partially_approved";
    const update = { status, approved_minutes: approvedMinutes, reviewer_id: c.me.id, reviewer_feedback: feedback.trim(), reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await c.sb.from("org_work_sessions").update(update).eq("id", sessionId);
    await audit(c, "work_session.reviewed", "work_session", sessionId, session, update, feedback.trim());
    revalidatePath(`/o/${orgSlug}/operations`); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to review session" }; }
}
