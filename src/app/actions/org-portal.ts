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
import { logOrgAudit } from "@/lib/org-audit";
import { bulkPushNotifications } from "@/app/actions/notifications";
import * as Ably from "ably";

let ablyRest: Ably.Rest | null = null;
function getAblyRest(): Ably.Rest | null {
  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  if (!ablyRest) ablyRest = new Ably.Rest({ key });
  return ablyRest;
}

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

/**
 * Bust the edge tenant-guard's membership cache for a user.
 *
 * Critical detail: the middleware writes the cache key using the user's
 * **Clerk** ID (it only has Clerk auth at the edge). If we invalidate
 * using the Supabase users.id we wrote into orgCacheKey.membership the
 * key never matches and the stale role lingers for the full TTL. We
 * therefore look up clerk_id from Supabase before busting. Caller passes
 * the Supabase user_id (what's available in our DB context).
 */
async function bustMembershipCache(supabaseUserId: string, slug: string) {
  const sb = supabaseAdmin();
  const { data } = await sb.from("users").select("clerk_id").eq("id", supabaseUserId).maybeSingle();
  const clerkId = (data as { clerk_id?: string | null } | null)?.clerk_id;
  if (clerkId) await cacheDel(orgCacheKey.membership(clerkId, slug));
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
  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "lesson.created",
    target: `lesson:${(data as { id: string }).id}`,
    meta: { title: input.title.trim() },
  });
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

/**
 * Bulk-reorder lessons. Takes the desired order as an array of lesson IDs
 * and writes position = index back to each row. Wrapped in a single
 * postgres transaction at the SQL level wouldn't help here (Supabase JS
 * client batches into separate statements), but contention is naturally
 * low — only hosts touch this, and the operation is idempotent.
 *
 * Verifies every id belongs to the org first so a malicious client
 * can't reposition another tenant's lessons by id-guessing.
 */
export async function reorderLessons(orgId: string, orderedIds: string[]): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: HOST_ROLES });
  if (!a.ok) return a;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "No lessons to reorder" };
  }

  const sb = supabaseAdmin();
  const { data: owned } = await sb
    .from("org_lessons")
    .select("id")
    .eq("org_id", orgId)
    .in("id", orderedIds);
  const ownedSet = new Set(((owned || []) as { id: string }[]).map((r) => r.id));
  if (ownedSet.size !== orderedIds.length) {
    return { ok: false, error: "Some lessons don't belong to this org" };
  }

  // Sequential per-row update is fine for typical class sizes (<200
  // lessons). If it ever gets hot, swap to a single UPDATE … FROM unnest.
  const now = new Date().toISOString();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await sb
      .from("org_lessons")
      .update({ position: i + 1, updated_at: now })
      .eq("id", orderedIds[i])
      .eq("org_id", orgId);
    if (error) return { ok: false, error: error.message };
  }

  await bustOrgCache(orgId, a.data.org.slug);
  revalidatePath(`/o/${a.data.org.slug}/lessons`);
  revalidatePath(`/s/${a.data.org.slug}/lessons`);
  return { ok: true };
}

/**
 * Mark a lesson as complete for the current user. Idempotent — calling
 * it twice has the same effect as once thanks to the (lesson_id, user_id)
 * UNIQUE on org_lesson_completions. Anyone in the org (including hosts
 * previewing the student view) can mark.
 */
export async function markLessonComplete(orgId: string, lessonId: string): Promise<R> {
  const a = await assertOrgMember(orgId);
  if (!a.ok) return a;

  const sb = supabaseAdmin();
  // Verify the lesson really belongs to this org — defends against
  // id-guessing across tenants.
  const { data: l } = await sb.from("org_lessons").select("id").eq("id", lessonId).eq("org_id", orgId).maybeSingle();
  if (!l) return { ok: false, error: "Lesson not found" };

  const { error } = await sb
    .from("org_lesson_completions")
    .upsert({ org_id: orgId, lesson_id: lessonId, user_id: a.data.me.id }, { onConflict: "lesson_id,user_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/s/${a.data.org.slug}`);
  revalidatePath(`/s/${a.data.org.slug}/lessons`);
  revalidatePath(`/s/${a.data.org.slug}/lessons/${lessonId}`);
  return { ok: true };
}

export async function unmarkLessonComplete(orgId: string, lessonId: string): Promise<R> {
  const a = await assertOrgMember(orgId);
  if (!a.ok) return a;
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("org_lesson_completions")
    .delete()
    .eq("org_id", orgId)
    .eq("lesson_id", lessonId)
    .eq("user_id", a.data.me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/s/${a.data.org.slug}`);
  revalidatePath(`/s/${a.data.org.slug}/lessons`);
  revalidatePath(`/s/${a.data.org.slug}/lessons/${lessonId}`);
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
  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "assignment.created",
    target: `assignment:${(data as { id: string }).id}`,
    meta: { title: input.title.trim(), due_at: input.due_at ?? null },
  });
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

  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "submission.graded",
    target: `submission:${submissionId}`,
    meta: { grade },
  });
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

  // Notify everyone in the org. Chunked to keep per-statement size sane:
  // a single insert with 5000+ rows hits Supabase's payload limits and
  // also blocks for the full insert duration. 500-row chunks process
  // sequentially in milliseconds each and never block other writes.
  // Fan-out via bulkPushNotifications so every recipient gets:
  //   1. notifications row (in-app bell)
  //   2. Ably realtime publish (live toast / sound on the open tab)
  //   3. web-push payload (phone notification bar even if app is closed)
  // Previously we did a raw INSERT which silently dropped 2 and 3.
  // Filter out the author — they don't need a notification about
  // their own post — and split routing by role.
  const { data: members } = await sb
    .from("org_members")
    .select("user_id, role, users:user_id(clerk_id)")
    .eq("org_id", orgId)
    .eq("status", "active");
  type MemberRow = { user_id: string; role: string; users: { clerk_id: string | null } | null };
  const HOST_LINK = `/o/${a.data.org.slug}/announcements`;
  const STUDENT_LINK = `/s/${a.data.org.slug}/announcements`;
  const hostRoles = new Set(["owner", "org_admin", "instructor"]);
  const recipients = ((members || []) as unknown as MemberRow[])
    .filter((m) => m.user_id !== a.data.me.id)
    .map((m) => ({ userId: m.user_id, userClerkId: m.users?.clerk_id ?? null, _role: m.role }));

  let fanout = 0;
  if (recipients.length > 0) {
    const result = await bulkPushNotifications({
      recipients,
      title: `📣 ${title.trim()}`,
      message: body.trim().slice(0, 240),
      type: "info",
      orgId,
      actionUrl: (r) => {
        const role = (r as typeof r & { _role: string })._role;
        return hostRoles.has(role) ? HOST_LINK : STUDENT_LINK;
      },
    });
    fanout = result.inserted;
  }

  await bustOrgCache(orgId, a.data.org.slug);
  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "announcement.posted",
    target: `announcement:${(data as { id: string }).id}`,
    meta: { title: title.trim(), pinned, fanout_count: fanout },
  });
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
  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "channel.created",
    target: `channel:${(data as { id: string }).id}`,
    meta: { name: cleanName, kind },
  });
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

  const { data: inserted, error } = await sb.from("org_messages").insert({
    org_id: orgId,
    channel_id: channelId,
    author_id: a.data.me.id,
    body: body.trim(),
  })
    .select("id, body, created_at")
    .single();
  if (error || !inserted) return { ok: false, error: error?.message || "Failed to post" };

  // Realtime fan-out via Ably. Channel keying: `org-chat:<orgId>:<channelId>`.
  // Org-id (not slug) keeps the channel name stable across slug renames.
  // If Ably isn't configured this is a no-op — clients fall through to
  // the existing `revalidate = 5` polling on the page.
  const rest = getAblyRest();
  if (rest) {
    try {
      const realtimeChannel = rest.channels.get(`org-chat:${orgId}:${channelId}`);
      const row = inserted as { id: string; body: string; created_at: string };
      await realtimeChannel.publish("message", {
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        author: {
          id: a.data.me.id,
          name: a.data.me.name,
          avatar_url: a.data.me.avatar_url,
        },
      });
    } catch (e) {
      // DB is the source of truth — Ably failures don't lose the message.
      console.warn("[postMessage] ably publish failed (non-fatal):", e);
    }
  }

  revalidatePath(`/o/${a.data.org.slug}/chat`);
  revalidatePath(`/o/${a.data.org.slug}/chat/${channelId}`);
  revalidatePath(`/s/${a.data.org.slug}/chat`);
  revalidatePath(`/s/${a.data.org.slug}/chat/${channelId}`);
  return { ok: true };
}

/* ───────────── Members ───────────── */

/**
 * Transfer org ownership to another active member.
 *
 * The current owner is the only caller (super_admin doesn't get a
 * shortcut here — they can fix via Studio if needed). The target gets
 * promoted to `owner` and the previous owner is demoted to `org_admin`
 * so they keep elevated access. All inside a single SQL transaction
 * via the p394 transfer_org_ownership SECURITY DEFINER function so
 * the org never enters a zero-owner state, even mid-flight.
 *
 * UI calls this with `confirmSlug` matching the org's slug — defense
 * against accidental clicks on a destructive button. The check is
 * server-side; client UI also requires typing the slug to enable.
 */
export async function transferOrgOwnership(
  orgId: string,
  newOwnerUserId: string,
  confirmSlug: string,
): Promise<R> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  const sb = supabaseAdmin();
  const { data: orgRow } = await sb
    .from("creative_orgs")
    .select("id, slug, name, owner_user_id, status")
    .eq("id", orgId)
    .maybeSingle();
  type Org = { id: string; slug: string; name: string; owner_user_id: string; status: string };
  const org = orgRow as Org | null;
  if (!org) return { ok: false, error: "Org not found" };
  if (org.status !== "active") return { ok: false, error: `Org is ${org.status} — reactivate before transferring` };
  if (org.owner_user_id !== me.id) return { ok: false, error: "Only the current owner can transfer ownership" };
  if (confirmSlug.trim().toLowerCase() !== org.slug.toLowerCase()) return { ok: false, error: "Confirmation didn't match the org slug" };
  if (newOwnerUserId === me.id) return { ok: false, error: "You're already the owner" };

  // Look up the target's name for the audit + notification copy
  // BEFORE the transfer so the message is well-formed even if a
  // downstream read misbehaves.
  const { data: targetRow } = await sb
    .from("users")
    .select("id, name, clerk_id")
    .eq("id", newOwnerUserId)
    .maybeSingle();
  const target = targetRow as { id: string; name: string; clerk_id: string | null } | null;
  if (!target) return { ok: false, error: "Target user not found" };

  // The atomic switch lives in SQL. Errors come back as exceptions
  // tagged with the labels we raise inside the function ('not_current_owner',
  // 'target_not_member', etc.) — surface them with friendlier copy.
  // @ts-expect-error supabase-js doesn't have generic types for our custom RPCs
  const { error } = await sb.rpc("transfer_org_ownership", {
    p_org_id: orgId,
    p_new_owner_id: newOwnerUserId,
    p_actor_id: me.id,
  });
  if (error) {
    const msg = error.message || "";
    if (/not_current_owner/.test(msg)) return { ok: false, error: "You're not the current owner anymore" };
    if (/target_not_member/.test(msg)) return { ok: false, error: "Target isn't a member of this org" };
    if (/target_not_active/.test(msg)) return { ok: false, error: "Target's membership isn't active" };
    if (/cannot_transfer_to_self/.test(msg)) return { ok: false, error: "You're already the owner" };
    if (/org_not_found/.test(msg)) return { ok: false, error: "Org not found" };
    return { ok: false, error: msg || "Transfer failed" };
  }

  // Cache busts: both users' membership cache (the edge tenant guard
  // returns the cached role; without busting they'd see stale roles
  // for up to 60s after the transfer).
  await bustMembershipCache(me.id, org.slug);
  await bustMembershipCache(newOwnerUserId, org.slug);
  await bustOrgCache(orgId, org.slug);

  // Notify both the new owner (welcome) and the previous owner
  // (confirmation receipt + sanity check that THEY initiated the
  // transfer — if they didn't, this is the moment to call support).
  try {
    await sb.from("notifications").insert([
      {
        user_id: newOwnerUserId,
        org_id: orgId,
        title: `🔑 You're now the owner of ${org.name}`,
        message: `${me.name || "The previous owner"} transferred ownership to you. You now control billing, settings, members, and can transfer ownership again if needed.`,
        type: "success",
        action_url: `/o/${org.slug}/settings`,
        is_read: false,
      },
      {
        user_id: me.id,
        org_id: orgId,
        title: `Ownership of ${org.name} transferred`,
        message: `You handed ${org.name} to ${target.name}. You remain an org admin. If this wasn't you, contact CIOS support immediately.`,
        type: "info",
        action_url: `/o/${org.slug}/settings`,
        is_read: false,
      },
    ]);
  } catch (e) {
    console.warn("[transferOrgOwnership] notification fan-out failed (non-fatal):", e);
  }

  await logOrgAudit({
    orgId, actorId: me.id, action: "member.role_updated",
    target: `user:${newOwnerUserId}`,
    meta: { kind: "ownership_transfer", from_user: me.id, to_user: newOwnerUserId, previous_owner_demoted_to: "org_admin" },
  });

  revalidatePath(`/o/${org.slug}/members`);
  revalidatePath(`/o/${org.slug}/settings`);
  revalidatePath("/super-admin/orgs");
  return { ok: true };
}

export async function updateMemberRole(orgId: string, memberId: string, newRole: OrgMemberRole): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: STAFF_ROLES });
  if (!a.ok) return a;

  const sb = supabaseAdmin();
  // INVARIANT: every active org has ≥1 active owner. The two blocks
  // below enforce it together — owner role can't be assigned (only
  // provision/transfer set it) and existing owners can't be demoted.
  // If a transfer-ownership action is added later it MUST promote the
  // new owner BEFORE demoting the old one (or do both atomically),
  // otherwise this gate keeps an org from becoming ownerless.
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
  // to the edge tenant guard on the next request. Membership cache is
  // keyed by Clerk ID — bustMembershipCache resolves the lookup.
  await bustMembershipCache(t.user_id, a.data.org.slug);

  await bustOrgCache(orgId, a.data.org.slug);
  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "member.role_updated",
    target: `user:${t.user_id}`,
    meta: { from: t.role, to: newRole },
  });
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
  // Atomic SQL-side recount — drift-proof against concurrent removes
  // and against the soft-remove → rejoin double-count case. See p393.
  await sb.rpc("recount_org_members", { p_org_id: orgId });

  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "member.removed",
    target: `user:${t.user_id}`,
    meta: { previous_role: t.role },
  });
  revalidatePath(`/o/${a.data.org.slug}/members`);
  return { ok: true };
}
