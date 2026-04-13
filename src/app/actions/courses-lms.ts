"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";
import { sendEmail, wrapEmail } from "@/lib/email";
import { awardXP } from "@/lib/gamification";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function requireInstructorOrSuperAdmin(courseId?: string) {
  const me = await requireMe();
  const can = me.role === "instructor" || me.role === "admin" || me.role === "super_admin";
  if (!can) throw new Error("Instructor privileges required");
  if (courseId) {
    const { data } = await supabaseAdmin().from("courses").select("instructor_id").eq("id", courseId).single();
    if (!data) throw new Error("Course not found");
    if (data.instructor_id !== me.id && me.role !== "admin" && me.role !== "super_admin") {
      throw new Error("You can only edit your own courses");
    }
  }
  return me;
}

export interface CreateCourseInput {
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  language?: string;
  durationHours: number;
  priceNaira: number;
  discountNaira?: number | null;
  thumbnailUrl?: string | null;
  promoVideoUrl?: string | null;
  tags?: string[];
}

export async function createCourse(input: CreateCourseInput): Promise<Result<{ id: string }>> {
  try {
    const me = await requireInstructorOrSuperAdmin();
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("courses").insert({
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      description: input.description || "",
      instructor_id: me.id,
      category: input.category || "General",
      difficulty: input.difficulty,
      language: input.language || "English",
      duration_hours: input.durationHours || 0,
      price_naira: input.priceNaira || 0,
      discount_naira: input.discountNaira ?? null,
      thumbnail_url: input.thumbnailUrl || null,
      promo_video_url: input.promoVideoUrl || null,
      tags: input.tags || [],
      status: "draft",
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Insert failed" };
    revalidatePath("/instructor");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateCourse(courseId: string, patch: Partial<CreateCourseInput> & { status?: "draft" | "published" | "archived" }): Promise<Result> {
  try {
    await requireInstructorOrSuperAdmin(courseId);
    const sb = supabaseAdmin();
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title.trim();
    if (patch.subtitle !== undefined) dbPatch.subtitle = patch.subtitle?.trim() || null;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.difficulty !== undefined) dbPatch.difficulty = patch.difficulty;
    if (patch.language !== undefined) dbPatch.language = patch.language;
    if (patch.durationHours !== undefined) dbPatch.duration_hours = patch.durationHours;
    if (patch.priceNaira !== undefined) dbPatch.price_naira = patch.priceNaira;
    if (patch.discountNaira !== undefined) dbPatch.discount_naira = patch.discountNaira;
    if (patch.thumbnailUrl !== undefined) dbPatch.thumbnail_url = patch.thumbnailUrl;
    if (patch.promoVideoUrl !== undefined) dbPatch.promo_video_url = patch.promoVideoUrl;
    if (patch.tags !== undefined) dbPatch.tags = patch.tags;
    if (patch.status !== undefined) {
      dbPatch.status = patch.status;
      if (patch.status === "published") dbPatch.published_at = new Date().toISOString();
    }
    dbPatch.updated_at = new Date().toISOString();
    const { error } = await sb.from("courses").update(dbPatch).eq("id", courseId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/instructor");
    revalidatePath(`/courses/${courseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteCourse(courseId: string): Promise<Result> {
  try {
    await requireInstructorOrSuperAdmin(courseId);
    const sb = supabaseAdmin();
    await sb.from("courses").delete().eq("id", courseId);
    revalidatePath("/instructor");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ── Modules ── */

export interface CreateModuleInput {
  courseId: string;
  title: string;
  description?: string;
  contentType: "video" | "article" | "quiz" | "assignment";
  youtubeId?: string | null;
  contentUrl?: string | null;
  summary?: string;
  durationMinutes?: number;
  isFreePreview?: boolean;
}

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  // already an ID
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
  } catch { /* not a URL */ }
  return null;
}

export async function addModule(input: CreateModuleInput): Promise<Result<{ id: string }>> {
  try {
    await requireInstructorOrSuperAdmin(input.courseId);
    const sb = supabaseAdmin();
    const ytId = input.youtubeId ? extractYouTubeId(input.youtubeId) : null;
    const { data: maxRow } = await sb.from("course_modules")
      .select("order_index").eq("course_id", input.courseId)
      .order("order_index", { ascending: false }).limit(1).maybeSingle();
    const nextOrder = (maxRow?.order_index ?? -1) + 1;

    const { data, error } = await sb.from("course_modules").insert({
      course_id: input.courseId,
      title: input.title.trim() || "Untitled lesson",
      description: input.description || "",
      content_type: input.contentType,
      youtube_id: ytId,
      content_url: input.contentUrl || null,
      summary: input.summary || "",
      duration_minutes: input.durationMinutes || 0,
      order_index: nextOrder,
      is_free_preview: !!input.isFreePreview,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Insert failed" };

    // Update total_modules count
    const { count } = await sb.from("course_modules").select("*", { count: "exact", head: true }).eq("course_id", input.courseId);
    await sb.from("courses").update({ total_modules: count || 0, updated_at: new Date().toISOString() }).eq("id", input.courseId);

    revalidatePath(`/instructor/course-builder/${input.courseId}`);
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface QuizQuestionInput {
  id: string;
  text: string;
  options: { id: string; text: string; correct: boolean }[];
  points: number;
}

export async function saveQuiz(moduleId: string, questions: QuizQuestionInput[], passScore: number): Promise<Result> {
  try {
    const sb = supabaseAdmin();
    const { data: mod } = await sb.from("course_modules").select("course_id").eq("id", moduleId).single();
    if (!mod) return { ok: false, error: "Module not found" };
    await requireInstructorOrSuperAdmin(mod.course_id);
    // Validate
    for (const q of questions) {
      if (!q.text.trim()) return { ok: false, error: "Every question needs text" };
      if (q.options.length < 2) return { ok: false, error: `"${q.text.slice(0, 30)}" needs at least 2 options` };
      if (!q.options.some((o) => o.correct)) return { ok: false, error: `"${q.text.slice(0, 30)}" needs at least one correct answer` };
    }
    const { error } = await sb.from("course_modules").update({
      quiz_questions: questions,
      pass_score: Math.max(0, Math.min(100, passScore || 60)),
    }).eq("id", moduleId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveAssignment(moduleId: string, prompt: string, maxScore: number): Promise<Result> {
  try {
    const sb = supabaseAdmin();
    const { data: mod } = await sb.from("course_modules").select("course_id").eq("id", moduleId).single();
    if (!mod) return { ok: false, error: "Module not found" };
    await requireInstructorOrSuperAdmin(mod.course_id);
    const { error } = await sb.from("course_modules").update({
      assignment_prompt: prompt,
      assignment_max_score: Math.max(1, maxScore || 100),
    }).eq("id", moduleId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function submitQuizAttempt(moduleId: string, answers: { questionId: string; optionIds: string[] }[]): Promise<Result<{ score: number; maxScore: number; passed: boolean; per: Record<string, boolean> }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: mod } = await sb.from("course_modules").select("course_id, quiz_questions, pass_score").eq("id", moduleId).single();
    if (!mod) return { ok: false, error: "Module not found" };
    type Q = { id: string; text: string; options: { id: string; correct: boolean }[]; points: number };
    const questions: Q[] = (mod.quiz_questions || []) as Q[];
    if (questions.length === 0) return { ok: false, error: "No quiz questions yet" };

    let score = 0;
    let maxScore = 0;
    const per: Record<string, boolean> = {};
    for (const q of questions) {
      maxScore += q.points || 1;
      const given = answers.find((a) => a.questionId === q.id)?.optionIds || [];
      const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
      const isCorrect = given.length === correctIds.length && given.every((id) => correctIds.includes(id));
      per[q.id] = isCorrect;
      if (isCorrect) score += q.points || 1;
    }
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percent >= (mod.pass_score || 60);

    await sb.from("quiz_attempts").insert({
      user_id: me.id, module_id: moduleId,
      answers, score: percent, max_score: 100, passed,
    });

    // Auto-complete the module if passed
    if (passed) {
      const { data: enroll } = await sb.from("course_enrollments")
        .select("id, completed_modules").eq("user_id", me.id).eq("course_id", mod.course_id).maybeSingle();
      if (enroll) {
        const completed = new Set<string>(enroll.completed_modules || []);
        completed.add(moduleId);
        const { count: total } = await sb.from("course_modules").select("*", { count: "exact", head: true }).eq("course_id", mod.course_id);
        const progress = Math.min(100, Math.round((completed.size / (total || 1)) * 100));
        await sb.from("course_enrollments").update({
          completed_modules: Array.from(completed),
          progress,
          ...(progress === 100 ? { status: "completed", completed_at: new Date().toISOString() } : {}),
        }).eq("id", enroll.id);
        // XP: quiz passed (+ perfect bonus) + module completion if newly 100%
        await awardXP(me.id, percent === 100 ? "perfect_quiz" : "quiz_passed", { refType: "module", refId: moduleId });
        await awardXP(me.id, "module_completed", { refType: "module", refId: moduleId });
        if (progress === 100) await awardXP(me.id, "course_completed", { refType: "course", refId: mod.course_id });
      }
    }

    return { ok: true, data: { score: percent, maxScore: 100, passed, per } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function submitAssignment(moduleId: string, content: string, fileUrl: string | null): Promise<Result<{ submissionId: string }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    if (!content.trim() && !fileUrl) return { ok: false, error: "Write something or attach a file" };
    const { data, error } = await sb.from("module_submissions").upsert(
      { user_id: me.id, module_id: moduleId, content, file_url: fileUrl, status: "submitted", submitted_at: new Date().toISOString() },
      { onConflict: "user_id,module_id" }
    ).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Submit failed" };
    return { ok: true, data: { submissionId: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function gradeSubmission(submissionId: string, grade: number, feedback: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: s } = await sb.from("module_submissions")
      .select("module:course_modules!module_submissions_module_id_fkey(course_id, assignment_max_score), user_id")
      .eq("id", submissionId).single();
    if (!s) return { ok: false, error: "Submission not found" };
    const mod = Array.isArray(s.module) ? s.module[0] : s.module;
    if (!mod) return { ok: false, error: "Module missing" };
    await requireInstructorOrSuperAdmin(mod.course_id);
    const maxScore = mod.assignment_max_score || 100;
    const clamped = Math.max(0, Math.min(maxScore, grade));
    const { error } = await sb.from("module_submissions").update({
      grade: clamped, feedback, status: "graded",
      graded_at: new Date().toISOString(), graded_by: me.id,
    }).eq("id", submissionId);
    if (error) return { ok: false, error: error.message };

    // Notify student (in-app + email if configured)
    try {
      const { data: sub } = await sb.from("module_submissions")
        .select("user_id, module:course_modules!module_submissions_module_id_fkey(title, course:courses!course_modules_course_id_fkey(id, title)), user:users!module_submissions_user_id_fkey(name, email)")
        .eq("id", submissionId).single();
      type S = { user_id: string; module?: { title?: string; course?: { id: string; title: string } | { id: string; title: string }[] | null } | { title?: string; course?: { id: string; title: string } | { id: string; title: string }[] | null }[] | null; user?: { name?: string; email?: string } | { name?: string; email?: string }[] | null };
      const d = sub as unknown as S;
      const mod = Array.isArray(d?.module) ? d?.module[0] : d?.module;
      const course = mod?.course ? (Array.isArray(mod.course) ? mod.course[0] : mod.course) : null;
      const user = Array.isArray(d?.user) ? d?.user[0] : d?.user;
      if (d?.user_id) {
        await pushNotification({
          userId: d.user_id,
          title: "Your assignment was graded",
          message: `${mod?.title || "Assignment"} · ${clamped}/${maxScore}`,
          type: "achievement",
          actionUrl: course?.id ? `/courses/${course.id}` : "/courses",
        });
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: `📝 Your assignment was graded: ${clamped}/${maxScore}`,
            html: wrapEmail(
              `<h2 style="margin:0 0 10px 0;font-size:20px;color:#E8EDF5;">Hi ${user.name || "there"},</h2>
               <p>Your submission for <strong>${mod?.title || "an assignment"}</strong>${course?.title ? ` in <strong>${course.title}</strong>` : ""} has been graded.</p>
               <p style="font-size:32px;font-weight:800;color:#66BB6A;margin:18px 0;">${clamped} / ${maxScore}</p>
               ${feedback ? `<p style="background:#0A0E1A;padding:14px;border-radius:10px;border-left:3px solid #1E88E5;"><strong>Instructor feedback:</strong><br>${feedback.replace(/\n/g, "<br>")}</p>` : ""}
               <p style="margin-top:20px;"><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.netlify.app"}/courses/${course?.id || ""}" style="background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:700;">View feedback →</a></p>`,
              { preheader: `Graded: ${clamped}/${maxScore}` }
            ),
          }).catch((e) => console.warn("[email] grade:", e));
        }
      }
    } catch (e) { console.warn("[notif] grade push:", e); }

    revalidatePath("/instructor/submissions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateModule(moduleId: string, patch: Partial<CreateModuleInput>): Promise<Result> {
  try {
    const sb = supabaseAdmin();
    const { data: mod } = await sb.from("course_modules").select("course_id").eq("id", moduleId).single();
    if (!mod) return { ok: false, error: "Module not found" };
    await requireInstructorOrSuperAdmin(mod.course_id);
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title.trim();
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.contentType !== undefined) dbPatch.content_type = patch.contentType;
    if (patch.youtubeId !== undefined) dbPatch.youtube_id = extractYouTubeId(patch.youtubeId || "") || null;
    if (patch.contentUrl !== undefined) dbPatch.content_url = patch.contentUrl;
    if (patch.summary !== undefined) dbPatch.summary = patch.summary;
    if (patch.durationMinutes !== undefined) dbPatch.duration_minutes = patch.durationMinutes;
    if (patch.isFreePreview !== undefined) dbPatch.is_free_preview = patch.isFreePreview;
    const { error } = await sb.from("course_modules").update(dbPatch).eq("id", moduleId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/instructor/course-builder/${mod.course_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteModule(moduleId: string): Promise<Result> {
  try {
    const sb = supabaseAdmin();
    const { data: mod } = await sb.from("course_modules").select("course_id").eq("id", moduleId).single();
    if (!mod) return { ok: false, error: "Module not found" };
    await requireInstructorOrSuperAdmin(mod.course_id);
    await sb.from("course_modules").delete().eq("id", moduleId);
    const { count } = await sb.from("course_modules").select("*", { count: "exact", head: true }).eq("course_id", mod.course_id);
    await sb.from("courses").update({ total_modules: count || 0 }).eq("id", mod.course_id);
    revalidatePath(`/instructor/course-builder/${mod.course_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function reorderModules(courseId: string, orderedIds: string[]): Promise<Result> {
  try {
    await requireInstructorOrSuperAdmin(courseId);
    const sb = supabaseAdmin();
    for (let i = 0; i < orderedIds.length; i++) {
      await sb.from("course_modules").update({ order_index: i }).eq("id", orderedIds[i]).eq("course_id", courseId);
    }
    revalidatePath(`/instructor/course-builder/${courseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ── Enrollment + progress ── */

export async function enrollInCourse(courseId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { error } = await sb.from("course_enrollments").upsert(
      { user_id: me.id, course_id: courseId, status: "active", progress: 0 },
      { onConflict: "user_id,course_id" }
    );
    if (error) return { ok: false, error: error.message };
    // Bump total_enrolled
    const { count } = await sb.from("course_enrollments").select("*", { count: "exact", head: true }).eq("course_id", courseId);
    await sb.from("courses").update({ total_enrolled: count || 0 }).eq("id", courseId);
    revalidatePath("/courses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function unenrollFromCourse(courseId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    await sb.from("course_enrollments").delete().eq("user_id", me.id).eq("course_id", courseId);
    const { count } = await sb.from("course_enrollments").select("*", { count: "exact", head: true }).eq("course_id", courseId);
    await sb.from("courses").update({ total_enrolled: count || 0 }).eq("id", courseId);
    revalidatePath("/courses");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markModuleComplete(courseId: string, moduleId: string): Promise<Result<{ progress: number; completed: boolean }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: enroll } = await sb.from("course_enrollments")
      .select("id, completed_modules").eq("user_id", me.id).eq("course_id", courseId).maybeSingle();
    if (!enroll) return { ok: false, error: "Not enrolled" };

    const completed = new Set<string>(enroll.completed_modules || []);
    completed.add(moduleId);

    const { count: totalModules } = await sb.from("course_modules").select("*", { count: "exact", head: true }).eq("course_id", courseId);
    const total = totalModules || 1;
    const progress = Math.min(100, Math.round((completed.size / total) * 100));
    const isFullyComplete = completed.size >= total;

    const update: Record<string, unknown> = {
      completed_modules: Array.from(completed),
      progress,
    };
    if (isFullyComplete) {
      update.status = "completed";
      update.completed_at = new Date().toISOString();
    }
    await sb.from("course_enrollments").update(update).eq("id", enroll.id);

    await awardXP(me.id, "module_completed", { refType: "module", refId: moduleId });
    if (isFullyComplete) await awardXP(me.id, "course_completed", { refType: "course", refId: courseId });

    revalidatePath(`/courses/${courseId}`);
    return { ok: true, data: { progress, completed: isFullyComplete } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ── Certificate issuance ── */

function generateCertNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CIOS-${y}${m}-${rand}`;
}

export async function issueCertificate(courseId: string): Promise<Result<{ certificateNumber: string }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    // Verify completion
    const { data: enroll } = await sb.from("course_enrollments")
      .select("status, progress").eq("user_id", me.id).eq("course_id", courseId).maybeSingle();
    if (!enroll || enroll.progress < 100) return { ok: false, error: "Course not yet completed" };

    // Return existing if any
    const { data: existing } = await sb.from("certificates")
      .select("certificate_number").eq("user_id", me.id).eq("course_id", courseId).maybeSingle();
    if (existing) return { ok: true, data: { certificateNumber: existing.certificate_number } };

    const certificateNumber = generateCertNumber();
    const { error } = await sb.from("certificates").insert({
      user_id: me.id, course_id: courseId, certificate_number: certificateNumber,
    });
    if (error) return { ok: false, error: error.message };
    await pushNotification({
      userId: me.id, title: "🏆 Certificate ready!",
      message: `You completed a course. Download your certificate ${certificateNumber}.`,
      type: "achievement", actionUrl: "/certificates",
    });

    // Email the student
    try {
      const { data: cData } = await sb.from("courses").select("title").eq("id", courseId).single();
      if (me.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.netlify.app";
        await sendEmail({
          to: me.email,
          subject: `🏆 You've earned a CIOS certificate!`,
          html: wrapEmail(
            `<h2 style="margin:0 0 10px 0;font-size:22px;color:#E8EDF5;">Congratulations, ${me.name || "graduate"}!</h2>
             <p>You completed <strong>${cData?.title || "your course"}</strong> on CIOS. Your certificate is ready.</p>
             <div style="background:linear-gradient(135deg,rgba(255,193,7,0.15),rgba(30,136,229,0.08));border:2px solid rgba(255,193,7,0.3);border-radius:14px;padding:20px;margin:18px 0;text-align:center;">
               <div style="font-size:36px;margin-bottom:8px;">🏆</div>
               <div style="font-size:11px;font-weight:700;color:#FFC107;letter-spacing:1.5px;">CERTIFICATE OF COMPLETION</div>
               <div style="font-size:14px;font-family:monospace;color:#8892A4;margin-top:8px;">${certificateNumber}</div>
             </div>
             <p><a href="${appUrl}/certificates" style="background:linear-gradient(135deg,#FFC107,#F57C00);color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;">🎓 Download certificate →</a></p>
             <p style="color:#8892A4;font-size:12px;margin-top:18px;">Verify anywhere: <a href="${appUrl}/verify?id=${certificateNumber}" style="color:#1E88E5;">${appUrl}/verify?id=${certificateNumber}</a></p>`,
            { preheader: `Your ${cData?.title || "course"} certificate is ready` }
          ),
        }).catch((e) => console.warn("[email] cert:", e));
      }
    } catch (e) { console.warn("[email] cert outer:", e); }

    return { ok: true, data: { certificateNumber } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
