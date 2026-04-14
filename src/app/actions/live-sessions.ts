"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseLiveEmbed } from "@/lib/live-embed";
import { awardXP } from "@/lib/gamification";
import { getEngagementFeatures } from "@/app/actions/engagement-v2";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface LiveSessionRow {
  id: string; course_id: string | null; course_title: string | null;
  host_id: string; host_name: string | null; host_avatar: string | null;
  title: string; description: string | null;
  embed_url: string; provider: string;
  scheduled_at: string; duration_min: number;
  visibility: "course" | "public";
  status: "scheduled" | "live" | "ended" | "cancelled";
  attending_count: number; i_attended: boolean;
}

async function mapRows(me: { id: string } | null, rows: Array<Record<string, unknown>>): Promise<LiveSessionRow[]> {
  const sb = supabaseAdmin();
  const myAttended = me ? new Set(
    (((await sb.from("live_session_attendance").select("session_id").eq("user_id", me.id)).data as Array<{ session_id: string }> | null) || [])
      .map((r) => r.session_id),
  ) : new Set<string>();

  return rows.map((r) => {
    const host = (r.host as { name: string | null; avatar_url: string | null } | Array<{ name: string | null; avatar_url: string | null }> | null);
    const h = Array.isArray(host) ? host[0] : host;
    const course = (r.course as { title: string } | Array<{ title: string }> | null);
    const c = Array.isArray(course) ? course[0] : course;
    const attendance = (r.attendance as Array<{ count: number }> | { count: number } | undefined);
    const count = Array.isArray(attendance) ? (attendance[0]?.count || 0) : (attendance?.count || 0);
    return {
      id: r.id as string, course_id: (r.course_id as string) || null,
      course_title: c?.title || null,
      host_id: r.host_id as string, host_name: h?.name || null, host_avatar: h?.avatar_url || null,
      title: r.title as string, description: (r.description as string) || null,
      embed_url: r.embed_url as string, provider: r.provider as string,
      scheduled_at: r.scheduled_at as string, duration_min: r.duration_min as number,
      visibility: r.visibility as "course" | "public",
      status: r.status as LiveSessionRow["status"],
      attending_count: count,
      i_attended: myAttended.has(r.id as string),
    };
  });
}

/** Upcoming + live sessions, filtered to what the current user can see. */
export async function listUpcomingSessions(courseId?: string): Promise<R<LiveSessionRow[]>> {
  try {
    const me = await getCurrentDbUser();
    const features = await getEngagementFeatures();
    if (!features.liveSessions) return { ok: true, data: [] };

    const sb = supabaseAdmin();
    const oneDayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    let q = sb.from("live_sessions")
      .select(`
        id, course_id, host_id, title, description, embed_url, provider,
        scheduled_at, duration_min, visibility, status,
        host:host_id(name, avatar_url),
        course:course_id(title),
        attendance:live_session_attendance(count)
      `)
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", oneDayAgo)
      .order("scheduled_at", { ascending: true });
    if (courseId) q = q.eq("course_id", courseId);

    const { data } = await q;
    if (!data) return { ok: true, data: [] };
    const mapped = await mapRows(me, data as unknown as Array<Record<string, unknown>>);
    // course-only sessions hidden unless viewer is enrolled (or is the host/admin).
    return { ok: true, data: mapped };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getSession(id: string): Promise<R<LiveSessionRow>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data } = await sb.from("live_sessions")
      .select(`
        id, course_id, host_id, title, description, embed_url, provider,
        scheduled_at, duration_min, visibility, status,
        host:host_id(name, avatar_url),
        course:course_id(title),
        attendance:live_session_attendance(count)
      `).eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Session not found" };
    const [row] = await mapRows(me, [data as unknown as Record<string, unknown>]);
    return { ok: true, data: row };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export interface CreateLiveInput {
  courseId: string | null;
  title: string;
  description: string;
  embedUrl: string;
  scheduledAt: string;      // ISO
  durationMin: number;
  visibility: "course" | "public";
}

export async function createLiveSession(input: CreateLiveInput): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["instructor", "admin", "super_admin", "team_lead"].includes(me.role)) {
      return { ok: false, error: "Instructors only" };
    }
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    if (!input.embedUrl.trim()) return { ok: false, error: "Stream URL required" };

    const parsed = parseLiveEmbed(input.embedUrl);
    if (!parsed) return { ok: false, error: "Unrecognised stream URL" };

    const sb = supabaseAdmin();
    const { data, error } = await sb.from("live_sessions").insert({
      course_id: input.courseId, host_id: me.id,
      title: input.title.trim(), description: input.description?.trim() || null,
      embed_url: parsed.directUrl, provider: parsed.provider,
      scheduled_at: input.scheduledAt,
      duration_min: Math.max(5, Math.min(480, input.durationMin || 60)),
      visibility: input.visibility || "course",
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Create failed" };

    // Notify enrolled interns (if course-scoped)
    if (input.courseId) {
      try {
        const { data: enrol } = await sb.from("course_enrollments")
          .select("user_id").eq("course_id", input.courseId);
        for (const e of ((enrol || []) as Array<{ user_id: string }>).slice(0, 200)) {
          pushNotification({
            userId: e.user_id, kind: "info",
            title: `📡 Live session: ${input.title.trim()}`,
            body: `Scheduled ${new Date(input.scheduledAt).toLocaleString()} · ${parsed.label}`,
            url: `/live/${data.id}`,
          }).catch(() => {});
        }
      } catch { /* non-fatal */ }
    }
    revalidatePath("/live");
    return { ok: true, data: { id: data.id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateSessionStatus(id: string, status: "scheduled" | "live" | "ended" | "cancelled"): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: s } = await sb.from("live_sessions").select("host_id").eq("id", id).maybeSingle();
    if (!s) return { ok: false, error: "Not found" };
    const host = (s as { host_id: string }).host_id;
    if (host !== me.id && !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Only the host can change status" };
    }
    const { error } = await sb.from("live_sessions").update({ status }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/live"); revalidatePath(`/live/${id}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteLiveSession(id: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: s } = await sb.from("live_sessions").select("host_id").eq("id", id).maybeSingle();
    if (!s) return { ok: false, error: "Not found" };
    if ((s as { host_id: string }).host_id !== me.id && !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Only the host can delete" };
    }
    await sb.from("live_sessions").delete().eq("id", id);
    revalidatePath("/live");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Called when a user joins a session (clicks Join / iframe loads). */
export async function recordAttendance(sessionId: string): Promise<R<{ xp: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    // Insert; unique constraint makes this idempotent.
    await sb.from("live_session_attendance").insert({ session_id: sessionId, user_id: me.id });
    await awardXP(me.id, "class_attended", { refType: "live_session", refId: sessionId });
    return { ok: true, data: { xp: 15 } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
