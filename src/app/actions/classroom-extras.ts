"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

/* ── Materials ── */

export async function addMaterial(input: {
  title: string; fileUrl: string; fileType: string; fileSize: number;
  sessionId?: string | null; courseId?: string | null; moduleId?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    const me = await requireInstructor();
    if (!input.title.trim() || !input.fileUrl) return { ok: false, error: "Title & file required" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("class_materials").insert({
      title: input.title.trim(), file_url: input.fileUrl,
      file_type: input.fileType, file_size: input.fileSize,
      session_id: input.sessionId || null, course_id: input.courseId || null, module_id: input.moduleId || null,
      uploaded_by: me.id,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Insert failed" };
    if (input.sessionId) revalidatePath("/classroom");
    if (input.courseId) revalidatePath(`/courses/${input.courseId}`);
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteMaterial(id: string): Promise<Result> {
  try {
    const me = await requireInstructor();
    const sb = supabaseAdmin();
    const { data } = await sb.from("class_materials").select("uploaded_by").eq("id", id).single();
    if (!data) return { ok: false, error: "Not found" };
    if (data.uploaded_by !== me.id && me.role !== "admin" && me.role !== "super_admin") return { ok: false, error: "Forbidden" };
    await sb.from("class_materials").delete().eq("id", id);
    revalidatePath("/classroom");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setSessionReplay(sessionId: string, youtubeId: string | null): Promise<Result> {
  try {
    const me = await requireInstructor();
    const sb = supabaseAdmin();
    const { data } = await sb.from("class_sessions").select("instructor_id").eq("id", sessionId).single();
    if (!data) return { ok: false, error: "Session not found" };
    if (data.instructor_id !== me.id && me.role !== "admin" && me.role !== "super_admin") return { ok: false, error: "Forbidden" };
    const clean = youtubeId ? extractYouTubeId(youtubeId) : null;
    await sb.from("class_sessions").update({ youtube_replay_id: clean }).eq("id", sessionId);
    revalidatePath("/classroom");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const u = new URL(input);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).slice(0, 11);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v.slice(0, 11);
      const m = u.pathname.match(/\/(embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

/* ── Discussions ── */

export async function addDiscussion(input: {
  courseId: string; moduleId?: string | null; parentId?: string | null; content: string;
}): Promise<Result<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.content.trim()) return { ok: false, error: "Empty post" };
    const sb = supabaseAdmin();
    const { data: course } = await sb.from("courses").select("instructor_id").eq("id", input.courseId).single();
    const isInstructorReply = course?.instructor_id === me.id;
    const { data, error } = await sb.from("course_discussions").insert({
      course_id: input.courseId,
      module_id: input.moduleId || null,
      parent_id: input.parentId || null,
      author_id: me.id,
      content: input.content.trim(),
      is_instructor_reply: isInstructorReply,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Insert failed" };
    revalidatePath(`/courses/${input.courseId}`);
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteDiscussion(id: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("course_discussions").select("author_id, course_id").eq("id", id).single();
    if (!data) return { ok: false, error: "Not found" };
    if (data.author_id !== me.id && me.role !== "admin" && me.role !== "super_admin") return { ok: false, error: "Forbidden" };
    await sb.from("course_discussions").delete().eq("id", id);
    revalidatePath(`/courses/${data.course_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function upvoteDiscussion(id: string): Promise<Result<{ upvotes: number }>> {
  try {
    await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("course_discussions").select("upvotes").eq("id", id).single();
    if (!data) return { ok: false, error: "Not found" };
    const next = (data.upvotes || 0) + 1;
    await sb.from("course_discussions").update({ upvotes: next }).eq("id", id);
    return { ok: true, data: { upvotes: next } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pinDiscussion(id: string, pinned: boolean): Promise<Result> {
  try {
    const me = await requireInstructor();
    const sb = supabaseAdmin();
    const { data } = await sb.from("course_discussions").select("course_id").eq("id", id).single();
    if (!data) return { ok: false, error: "Not found" };
    const { data: course } = await sb.from("courses").select("instructor_id").eq("id", data.course_id).single();
    if (course?.instructor_id !== me.id && me.role !== "admin" && me.role !== "super_admin") return { ok: false, error: "Forbidden" };
    await sb.from("course_discussions").update({ is_pinned: pinned }).eq("id", id);
    revalidatePath(`/courses/${data.course_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
