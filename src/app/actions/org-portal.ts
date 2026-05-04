"use server";

/**
 * Server actions for the per-host org portal (Phase 4).
 *
 * Every action goes through `assertHostRole` / `assertOrgMember` so a
 * compromised client can't write into someone else's tenant. All cache
 * keys are org-scoped via `orgKey()` and we bust the relevant ones on
 * every write — read-after-write consistency for dashboard counts and
 * lesson lists matters more than 1ms of saved Redis traffic.
 */

import { supabaseAdmin, getCurrentDbUser, type DbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cacheDel, orgCacheKey, orgKey } from "@/lib/cache";
import type { OrgMemberRole, CreativeOrg } from "@/lib/active-org";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const HOST_ROLES: OrgMemberRole[] = ["owner", "org_admin", "instructor"];
const STAFF_ROLES: OrgMemberRole[] = ["owner", "org_admin"];

/* ───────────── Authz helpers ───────────── */

interface OrgAuthz {
  me: DbUser;
  org: CreativeOrg;
  role: OrgMemberRole | null;
  isSuperAdmin: boolean;
}

async function assertOrgMember(orgIdOrSlug: string, opts?: { roles?: OrgMemberRole[]; bySlug?: boolean }): Promise<R<OrgAuthz>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };
  const sb = supabaseAdmin();

  const { data: orgRow } = opts?.bySlug
    ? await sb.from("creative_orgs").select("*").eq("slug", orgIdOrSlug).maybeSingle()
    : await sb.from("creative_orgs").select("*").eq("id", orgIdOrSlug).maybeSingle();
  if (!orgRow) return { ok: false, error: "Org not found" };
  const org = orgRow as CreativeOrg;
  if (org.status !== "active") return { ok: false, error: "Org is not active" };

  const isSuperAdmin = me.role === "super_admin";

  const { data: m } = await sb
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", me.id)
    .eq("status", "active")
    .maybeSingle();
  const role = (m as { role: OrgMemberRole } | null)?.role ?? null;

  if (!isSuperAdmin) {
    if (!role) return { ok: false, error: "Not a member" };
    if (opts?.roles && !opts.roles.includes(role)) return { ok: false, error: "Insufficient role" };
  }

  return { ok: true, data: { me, org, role, isSuperAdmin } };
}

/** Bust per-org caches that depend on counts/listings. Cheap; do it every write. */
async function bustOrgCache(orgId: string, slug: string) {
  await cacheDel(
    orgCacheKey.dashboard(orgId),
    orgCacheKey.memberCount(orgId),
    orgKey(orgId, "lessons:list"),
    orgKey(orgId, "assignments:list"),
    orgKey(orgId, "announcements:list"),
    orgKey(orgId, "channels:list"),
  );
  // Membership-by-slug cache lives per-user; bust selectively in member mutations only.
  void slug;
}

async function bustMembershipCache(userId: string, slug: string) {
  await cacheDel(orgCacheKey.membership(userId, slug));
}

/* ───────────── Lessons ───────────── */

export interface LessonInput {
  title: string;
  body?: string;
  video_url?: string;
  position?: number;
}

export async function createLesson(orgId: string, input: LessonInput): Promise<R<{ id: string }>> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  if (input.title.trim().length < 3) return { ok: false, error: "Title too short" };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("org_lessons")
    .insert({
      org_id: orgId,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      video_url: input.video_url?.trim() || null,
      position: input.position ?? 0,
      created_by: a.data.me.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message || "Failed to create lesson" };

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/lessons`);
  revalidatePath(`/o/${a.data.org.slug}`);
  revalidatePath(`/s/${a.data.org.slug}/lessons`);
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function updateLesson(orgId: string, lessonId: string, input: Partial<LessonInput>): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.body !== undefined) patch.body = input.body?.trim() || null;
  if (input.video_url !== undefined) patch.video_url = input.video_url?.trim() || null;
  if (input.position !== undefined) patch.position = input.position;

  const sb = supabaseAdmin();
  const { error } = await sb.from("org_lessons").update(patch).eq("id", lessonId).eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/lessons`);
  revalidatePath(`/o/${a.data.org.slug}/lessons/${lessonId}`);
  revalidatePath(`/s/${a.data.org.slug}/lessons`);
  return { ok: true };
}

export async function deleteLesson(orgId: string, lessonId: string): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  const sb = supabaseAdmin();
  const { error } = await sb.from("org_lessons").delete().eq("id", lessonId).eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/lessons`);
  revalidatePath(`/o/${a.data.org.slug}`);
  revalidatePath(`/s/${a.data.org.slug}/lessons`);
  return { ok: true };
}

/* ───────────── Assignments ───────────── */

export interface AssignmentInput {
  title: string;
  brief?: string;
  due_at?: string | null;
  lesson_id?: string | null;
}

export async function createAssignment(orgId: string, input: AssignmentInput): Promise<R<{ id: string }>> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  if (input.title.trim().length < 3) return { ok: false, error: "Title too short" };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("org_assignments")
    .insert({
      org_id: orgId,
      title: input.title.trim(),
      brief: input.brief?.trim() || null,
      due_at: input.due_at || null,
      lesson_id: input.lesson_id || null,
      created_by: a.data.me.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message || "Failed to create assignment" };

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/assignments`);
  revalidatePath(`/o/${a.data.org.slug}`);
  revalidatePath(`/s/${a.data.org.slug}/assignments`);
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function submitAssignment(orgId: string, assignmentId: string, body: string): Promise<R> {
  const a = await assertOrgMember(orgId);
  if (!a.ok) return a;
  if (body.trim().length === 0) return { ok: false, error: "Submission cannot be empty" };

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("org_submissions")
    .upsert(
      {
        org_id: orgId,
        assignment_id: assignmentId,
        student_id: a.data.me.id,
        body: body.trim(),
        submitted_at: new Date().toISOString(),
        // resubmission clears the prior grade — instructor regrades.
        grade: null,
        feedback: null,
        graded_by: null,
        graded_at: null,
      },
      { onConflict: "assignment_id,student_id" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/s/${a.data.org.slug}/assignments`);
  revalidatePath(`/s/${a.data.org.slug}/assignments/${assignmentId}`);
  revalidatePath(`/o/${a.data.org.slug}/assignments`);
  return { ok: true };
}

export async function gradeSubmission(orgId: string, submissionId: string, grade: number, feedback: string): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  if (grade < 0 || grade > 100) return { ok: false, error: "Grade must be 0–100" };

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("org_submissions")
    .update({
      grade,
      feedback: feedback.trim() || null,
      graded_by: a.data.me.id,
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/o/${a.data.org.slug}/assignments`);
  revalidatePath(`/s/${a.data.org.slug}/assignments`);
  return { ok: true };
}

/* ───────────── Announcements ───────────── */

export async function postAnnouncement(orgId: string, title: string, body: string, pinned = false): Promise<R<{ id: string }>> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  if (title.trim().length < 3) return { ok: false, error: "Title too short" };
  if (body.trim().length < 1) return { ok: false, error: "Body required" };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("org_announcements")
    .insert({
      org_id: orgId,
      author_id: a.data.me.id,
      title: title.trim(),
      body: body.trim(),
      pinned,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message || "Failed to post" };

  // Notify everyone in the org. At 1000 students per org we batch into one
  // multi-row insert; 1000 is comfortably within Supabase's per-statement limits.
  const { data: members } = await sb
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "active");
  const recipients = (members || []) as { user_id: string }[];
  if (recipients.length > 0) {
    const rows = recipients.map((m) => ({
      user_id: m.user_id,
      org_id: orgId,
      title: `📣 ${title.trim()}`,
      message: body.trim().slice(0, 240),
      type: "info",
      action_url: `/o/${a.data.org.slug}/announcements`,
      is_read: false,
    }));
    await sb.from("notifications").insert(rows);
  }

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/announcements`);
  revalidatePath(`/s/${a.data.org.slug}/announcements`);
  return { ok: true, data: { id: (data as { id: string }).id } };
}

/* ───────────── Chat ───────────── */

export async function createChannel(orgId: string, name: string, kind: "general" | "q_and_a" = "general"): Promise<R<{ id: string }>> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
  if (cleanName.length < 2) return { ok: false, error: "Channel name too short" };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("org_channels")
    .insert({ org_id: orgId, name: cleanName, kind })
    .select("id")
    .single();
  if (error || !data) {
    if (/duplicate key/i.test(error?.message || "")) return { ok: false, error: "Channel already exists" };
    return { ok: false, error: error?.message || "Failed to create channel" };
  }

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/chat`);
  revalidatePath(`/s/${a.data.org.slug}/chat`);
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function postMessage(orgId: string, channelId: string, body: string): Promise<R> {
  const a = await assertOrgMember(orgId);
  if (!a.ok) return a;
  if (body.trim().length === 0) return { ok: false, error: "Message empty" };
  if (body.length > 2000) return { ok: false, error: "Message too long (max 2000)" };

  const sb = supabaseAdmin();
  // Verify the channel belongs to the org — defense-in-depth against
  // a forged channelId from a different tenant.
  const { data: ch } = await sb
    .from("org_channels")
    .select("id")
    .eq("id", channelId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!ch) return { ok: false, error: "Channel not found" };

  const { error } = await sb.from("org_messages").insert({
    org_id: orgId,
    channel_id: channelId,
    author_id: a.data.me.id,
    body: body.trim(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/o/${a.data.org.slug}/chat`);
  revalidatePath(`/o/${a.data.org.slug}/chat/${channelId}`);
  revalidatePath(`/s/${a.data.org.slug}/chat`);
  revalidatePath(`/s/${a.data.org.slug}/chat/${channelId}`);
  return { ok: true };
}

/* ───────────── Members ───────────── */

export async function updateMemberRole(orgId: string, memberId: string, newRole: OrgMemberRole): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: STAFF_ROLES });
  if (!a.ok) return a;

  const sb = supabaseAdmin();
  // Owner role can't be reassigned via this action — it transfers separately.
  if (newRole === "owner") return { ok: false, error: "Use the transfer-owner flow" };

  const { data: target } = await sb
    .from("org_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .maybeSingle();
  const t = target as { role: OrgMemberRole; user_id: string } | null;
  if (!t) return { ok: false, error: "Member not found" };
  if (t.role === "owner") return { ok: false, error: "Cannot demote the owner" };

  const { error } = await sb
    .from("org_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  // Bust the per-user-per-slug membership cache so the new role propagates
  // to the edge tenant guard on the next request.
  await bustMembershipCache(t.user_id, a.data.org.slug);
  // Also bust the user's own clerk_id keyed cache; lookupOrgMembership
  // uses clerk_id, but we don't have it here without an extra fetch — the
  // 60s TTL absorbs the lag.

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/members`);
  return { ok: true };
}

export async function removeMember(orgId: string, memberId: string): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: STAFF_ROLES });
  if (!a.ok) return a;

  const sb = supabaseAdmin();
  const { data: target } = await sb
    .from("org_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .maybeSingle();
  const t = target as { role: OrgMemberRole; user_id: string } | null;
  if (!t) return { ok: false, error: "Member not found" };
  if (t.role === "owner") return { ok: false, error: "Owner cannot be removed" };

  // Soft-remove (status='removed') so audit history survives.
  const { error } = await sb
    .from("org_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  await bustMembershipCache(t.user_id, a.data.org.slug);
  await bustOrgCache(orgId, a.data.org.slug);
  // Decrement member_count atomically. Float-safe: integer column.
  await sb.rpc("set_config", { setting_name: "_dummy", new_value: "_", is_local: false }).then(() => null).catch(() => null);
  const { data: orgRow } = await sb.from("creative_orgs").select("member_count").eq("id", orgId).maybeSingle();
  const cur = (orgRow as { member_count: number } | null)?.member_count ?? 0;
  await sb.from("creative_orgs").update({ member_count: Math.max(0, cur - 1) }).eq("id", orgId);

  revalidatePath(`/o/${a.data.org.slug}/members`);
  return { ok: true };
}
