"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  CLASS_ATTENDANCE_POLICY,
  getAttendanceWindow,
  isCompulsoryScheduleSlot,
} from "@/lib/class-schedule";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function requireInstructor() {
  const me = await requireMe();
  if (me.role !== "instructor" && me.role !== "admin" && me.role !== "super_admin") {
    throw new Error("Instructor privileges required");
  }
  return me;
}

export interface CreateSessionInput {
  title: string;
  description: string;
  scheduledAt: string;      // ISO
  durationMinutes: number;
  meetingUrl: string;
  maxAttendees?: number | null;
  courseId?: string | null;
  isCompulsory?: boolean;
}

export async function createClassSession(input: CreateSessionInput): Promise<Result<{ id: string }>> {
  try {
    const me = await requireInstructor();
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    if (!input.scheduledAt) return { ok: false, error: "Schedule time required" };
    const sb = supabaseAdmin();
    const scheduledAt = new Date(input.scheduledAt);
    const isCompulsory = input.isCompulsory ?? isCompulsoryScheduleSlot(scheduledAt);
    const window = getAttendanceWindow(input.scheduledAt, Math.max(5, input.durationMinutes || 60));
    const { data, error } = await sb.from("class_sessions").insert({
      title: input.title.trim(),
      description: input.description || "",
      instructor_id: me.id,
      course_id: input.courseId || null,
      scheduled_at: input.scheduledAt,
      duration_minutes: Math.max(5, input.durationMinutes || 60),
      meeting_url: input.meetingUrl || null,
      max_attendees: input.maxAttendees || null,
      status: "scheduled",
      is_compulsory: isCompulsory,
      attendance_opens_at: isCompulsory ? window.opensAt.toISOString() : null,
      attendance_closes_at: isCompulsory ? window.closesAt.toISOString() : null,
      minimum_attendance_minutes: isCompulsory ? CLASS_ATTENDANCE_POLICY.minimumPresentMinutes : 0,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Insert failed" };
    revalidatePath("/classroom");
    revalidatePath("/calendar");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateSessionStatus(sessionId: string, status: "scheduled" | "live" | "completed" | "cancelled"): Promise<Result> {
  try {
    const me = await requireInstructor();
    const sb = supabaseAdmin();
    const { data: s } = await sb.from("class_sessions").select("instructor_id").eq("id", sessionId).single();
    if (!s) return { ok: false, error: "Session not found" };
    if (s.instructor_id !== me.id && me.role !== "admin" && me.role !== "super_admin") {
      return { ok: false, error: "Only the instructor can change session status" };
    }
    const { error } = await sb.from("class_sessions").update({ status, updated_at: new Date().toISOString() }).eq("id", sessionId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/classroom");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteSession(sessionId: string): Promise<Result> {
  try {
    const me = await requireInstructor();
    const sb = supabaseAdmin();
    const { data: s } = await sb.from("class_sessions").select("instructor_id").eq("id", sessionId).single();
    if (!s) return { ok: false, error: "Session not found" };
    if (s.instructor_id !== me.id && me.role !== "admin" && me.role !== "super_admin") {
      return { ok: false, error: "Only the instructor can delete" };
    }
    await sb.from("class_sessions").delete().eq("id", sessionId);
    revalidatePath("/classroom");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** RSVP toggle — inserts attendance row with joined_at if not exists, else removes. */
export async function toggleRsvp(sessionId: string): Promise<Result<{ rsvped: boolean; attendeeCount: number }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();

    const { data: existing } = await sb.from("class_session_rsvps")
      .select("session_id").eq("session_id", sessionId).eq("user_id", me.id).maybeSingle();

    if (existing) {
      await sb.from("class_session_rsvps").delete()
        .eq("session_id", sessionId).eq("user_id", me.id);
    } else {
      // Capacity check
      const { data: session } = await sb.from("class_sessions").select("max_attendees, attendee_count").eq("id", sessionId).single();
      if (session?.max_attendees && session.attendee_count >= session.max_attendees) {
        return { ok: false, error: "Class is full" };
      }
      await sb.from("class_session_rsvps").insert({ session_id: sessionId, user_id: me.id });
    }

    const { count } = await sb.from("class_session_rsvps").select("*", { count: "exact", head: true }).eq("session_id", sessionId);
    await sb.from("class_sessions").update({ attendee_count: count || 0 }).eq("id", sessionId);
    revalidatePath("/classroom");
    return { ok: true, data: { rsvped: !existing, attendeeCount: count || 0 } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Student hit "Join" — stamps left_at = null and joined_at if not already present */
export async function markJoined(sessionId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: session } = await sb.from("class_sessions")
      .select("scheduled_at, duration_minutes, attendance_opens_at, attendance_closes_at, status")
      .eq("id", sessionId).single();
    if (!session) return { ok: false, error: "Class session not found" };
    if (session.status === "cancelled" || session.status === "completed") {
      return { ok: false, error: "Attendance is closed for this class" };
    }
    const now = new Date();
    const fallback = getAttendanceWindow(session.scheduled_at, session.duration_minutes);
    const opensAt = session.attendance_opens_at
      ? new Date(session.attendance_opens_at)
      : fallback.opensAt;
    const closesAt = session.attendance_closes_at
      ? new Date(session.attendance_closes_at)
      : fallback.closesAt;
    if (now < opensAt) return { ok: false, error: "Attendance opens 15 minutes before class" };
    if (now > closesAt) return { ok: false, error: "Attendance has closed for this class" };
    const status = now > fallback.lateAt ? "late" : "present";
    const { error } = await sb.from("attendance").upsert(
      { session_id: sessionId, user_id: me.id, joined_at: now.toISOString(), left_at: null, status, evidence_source: "class_join" },
      { onConflict: "session_id,user_id" }
    );
    if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
    const { count } = await sb.from("attendance").select("*", { count: "exact", head: true }).eq("session_id", sessionId);
    await sb.from("class_sessions").update({ attendee_count: count || 0 }).eq("id", sessionId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
