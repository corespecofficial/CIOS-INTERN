"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

/* ── Mentor Profile ── */

export interface MentorProfile {
  user_id: string;
  bio: string | null;
  expertise_tags: string[];
  max_mentees: number;
  is_available: boolean;
  session_rate: number | null;
  rating: number;
  sessions_done: number;
  name: string | null;
  avatar_url: string | null;
  role: string;
}

export async function getMyMentorProfile(): Promise<R<MentorProfile | null>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("mentors").select("*, user:users!mentors_user_id_fkey(name,avatar_url,role)").eq("user_id", me.id).maybeSingle();
    if (!data) return { ok: true, data: null };
    const d = data as unknown as Record<string, unknown>;
    const u = (d.user as { name: string | null; avatar_url: string | null; role: string } | null);
    return { ok: true, data: { ...d, name: u?.name || null, avatar_url: u?.avatar_url || null, role: u?.role || "" } as MentorProfile };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function upsertMentorProfile(patch: Partial<Pick<MentorProfile, "bio" | "expertise_tags" | "max_mentees" | "is_available" | "session_rate">>): Promise<R> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    await sb.from("mentors").upsert({ user_id: me.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    revalidatePath("/mentor");
    revalidatePath("/mentorship");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listAvailableMentors(limit = 30): Promise<R<MentorProfile[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("mentors")
      .select("*, user:users!mentors_user_id_fkey(name,avatar_url,role)")
      .eq("is_available", true)
      .order("rating", { ascending: false })
      .limit(limit);
    const rows = ((data || []) as Array<Record<string, unknown>>).map((d) => {
      const u = d.user as { name: string | null; avatar_url: string | null; role: string } | null;
      return { ...d, name: u?.name || null, avatar_url: u?.avatar_url || null, role: u?.role || "" } as MentorProfile;
    });
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── Mentorship Requests ── */

export interface Mentorship {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  note: string | null;
  started_at: string | null;
  created_at: string;
  mentor_name: string | null;
  mentor_avatar: string | null;
  mentee_name: string | null;
  mentee_avatar: string | null;
}

export async function requestMentorship(mentorId: string, note?: string): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (me.id === mentorId) return { ok: false, error: "Cannot request yourself" };
    const sb = supabaseAdmin();
    // Check mentor exists & is available
    const { data: mentor } = await sb.from("mentors").select("is_available,max_mentees,user_id").eq("user_id", mentorId).maybeSingle();
    if (!mentor) return { ok: false, error: "Mentor not found" };
    const m = mentor as { is_available: boolean; max_mentees: number; user_id: string };
    if (!m.is_available) return { ok: false, error: "This mentor is not currently available" };
    // Check existing mentorship count for this mentor
    const { count } = await sb.from("mentorships").select("id", { count: "exact", head: true }).eq("mentor_id", mentorId).eq("status", "active");
    if ((count || 0) >= m.max_mentees) return { ok: false, error: "This mentor has reached their capacity" };
    const { data, error } = await sb.from("mentorships").insert({ mentor_id: mentorId, mentee_id: me.id, note: note || null }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to send request" };
    const { data: mentorUser } = await sb.from("users").select("name").eq("id", me.id).maybeSingle();
    pushNotification({
      userId: mentorId, title: `New mentorship request from ${(mentorUser as { name: string } | null)?.name || "an intern"}`,
      message: note || "They'd love your guidance. Review the request on your mentor dashboard.",
      type: "achievement", actionUrl: "/mentor",
    }).catch(() => {});
    revalidatePath("/mentorship");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function respondToMentorshipRequest(mentorshipId: string, accept: boolean): Promise<R> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: req } = await sb.from("mentorships").select("mentor_id,mentee_id,status").eq("id", mentorshipId).maybeSingle();
    if (!req) return { ok: false, error: "Request not found" };
    const r = req as { mentor_id: string; mentee_id: string; status: string };
    if (r.mentor_id !== me.id) return { ok: false, error: "Not your request" };
    if (r.status !== "pending") return { ok: false, error: "Already responded" };
    const update = accept
      ? { status: "active", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: "rejected", updated_at: new Date().toISOString() };
    await sb.from("mentorships").update(update).eq("id", mentorshipId);
    const { data: menteeUser } = await sb.from("users").select("name").eq("id", me.id).maybeSingle();
    pushNotification({
      userId: r.mentee_id,
      title: accept ? `${(menteeUser as { name: string } | null)?.name || "Your mentor"} accepted your mentorship request! 🎉` : "Mentorship request update",
      message: accept ? "You now have a mentor. Schedule your first session." : "The mentor couldn't take you on right now. Try another mentor.",
      type: "achievement", actionUrl: "/mentorship",
    }).catch(() => {});
    revalidatePath("/mentor");
    revalidatePath("/mentorship");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyMentorships(): Promise<R<Mentorship[]>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("mentorships")
      .select("id, mentor_id, mentee_id, status, note, started_at, created_at, mentor:users!mentorships_mentor_id_fkey(name,avatar_url), mentee:users!mentorships_mentee_id_fkey(name,avatar_url)")
      .or(`mentor_id.eq.${me.id},mentee_id.eq.${me.id}`)
      .order("created_at", { ascending: false });
    type Row = { id: string; mentor_id: string; mentee_id: string; status: string; note: string | null; started_at: string | null; created_at: string; mentor?: { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }>; mentee?: { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> };
    const out: Mentorship[] = ((data || []) as Row[]).map((r) => {
      const mentor = Array.isArray(r.mentor) ? r.mentor[0] : r.mentor;
      const mentee = Array.isArray(r.mentee) ? r.mentee[0] : r.mentee;
      return { id: r.id, mentor_id: r.mentor_id, mentee_id: r.mentee_id, status: r.status, note: r.note, started_at: r.started_at, created_at: r.created_at, mentor_name: mentor?.name || null, mentor_avatar: mentor?.avatar_url || null, mentee_name: mentee?.name || null, mentee_avatar: mentee?.avatar_url || null };
    });
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── Sessions ── */

export interface MentorSession {
  id: string;
  mentorship_id: string;
  mentor_id: string;
  mentee_id: string;
  scheduled_at: string;
  duration_min: number;
  topic: string | null;
  notes: string | null;
  meeting_link: string | null;
  status: string;
  feedback_rating: number | null;
  feedback_body: string | null;
  mentor_name: string | null;
  mentee_name: string | null;
}

export async function scheduleSession(mentorshipId: string, scheduledAt: string, opts?: { topic?: string; durationMin?: number; meetingLink?: string }): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: ms } = await sb.from("mentorships").select("mentor_id,mentee_id,status").eq("id", mentorshipId).maybeSingle();
    if (!ms) return { ok: false, error: "Mentorship not found" };
    const msr = ms as { mentor_id: string; mentee_id: string; status: string };
    if (msr.status !== "active") return { ok: false, error: "Mentorship is not active" };
    if (msr.mentor_id !== me.id && msr.mentee_id !== me.id) return { ok: false, error: "Not part of this mentorship" };
    const { data, error } = await sb.from("mentor_sessions").insert({
      mentorship_id: mentorshipId, mentor_id: msr.mentor_id, mentee_id: msr.mentee_id,
      scheduled_at: scheduledAt, duration_min: opts?.durationMin || 30,
      topic: opts?.topic || null, meeting_link: opts?.meetingLink || null,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    const notifyId = me.id === msr.mentor_id ? msr.mentee_id : msr.mentor_id;
    pushNotification({ userId: notifyId, title: "New session scheduled!", message: `${opts?.topic || "A session"} on ${new Date(scheduledAt).toLocaleDateString()}`, type: "achievement", actionUrl: "/mentor/sessions" }).catch(() => {});
    revalidatePath("/mentor/sessions");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMySessions(limit = 20): Promise<R<MentorSession[]>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("mentor_sessions")
      .select("*, mentor:users!mentor_sessions_mentor_id_fkey(name), mentee:users!mentor_sessions_mentee_id_fkey(name)")
      .or(`mentor_id.eq.${me.id},mentee_id.eq.${me.id}`)
      .order("scheduled_at", { ascending: false }).limit(limit);
    type SRow = { id: string; mentorship_id: string; mentor_id: string; mentee_id: string; scheduled_at: string; duration_min: number; topic: string | null; notes: string | null; meeting_link: string | null; status: string; feedback_rating: number | null; feedback_body: string | null; mentor?: { name?: string | null } | Array<{ name?: string | null }>; mentee?: { name?: string | null } | Array<{ name?: string | null }> };
    const out: MentorSession[] = ((data || []) as SRow[]).map((r) => {
      const mentor = Array.isArray(r.mentor) ? r.mentor[0] : r.mentor;
      const mentee = Array.isArray(r.mentee) ? r.mentee[0] : r.mentee;
      return { ...r, mentor_name: mentor?.name || null, mentee_name: mentee?.name || null };
    });
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function submitSessionFeedback(sessionId: string, rating: number, body?: string): Promise<R> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    await sb.from("mentor_sessions").update({ feedback_rating: rating, feedback_body: body || null, status: "completed", updated_at: new Date().toISOString() }).eq("id", sessionId).eq("mentee_id", me.id);
    // Update mentor's aggregate rating
    const { data: sessions } = await sb.from("mentor_sessions").select("feedback_rating, mentor_id").eq("mentee_id", me.id).not("feedback_rating", "is", null);
    if (sessions?.length) {
      const rows = sessions as Array<{ feedback_rating: number; mentor_id: string }>;
      const mentorId = rows[0].mentor_id;
      const avg = rows.reduce((s, r) => s + (r.feedback_rating || 0), 0) / rows.length;
      await sb.from("mentors").update({ rating: +avg.toFixed(2), sessions_done: rows.length, updated_at: new Date().toISOString() }).eq("user_id", mentorId);
    }
    revalidatePath("/mentor/sessions");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
