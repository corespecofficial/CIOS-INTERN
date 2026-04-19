"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface Assessment {
  id: string;
  title: string;
  description: string | null;
  skill_domain: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_min: number;
  passing_score: number;
  max_attempts: number;
  cover_emoji: string;
  tags: string[];
  attempt_count: number;
  pass_count: number;
  status: "draft" | "published" | "archived";
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  kind: "mcq" | "true_false" | "short_text";
  options: { id: string; label: string }[];
  points: number;
}

export interface AttemptResult {
  id: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  time_taken_sec: number;
  breakdown: { question_id: string; correct: boolean; given: string; expected: string; explanation: string | null }[];
}

export async function listAssessments(): Promise<R<Assessment[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("assessments")
      .select("*")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as Assessment[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getAssessmentForAttempt(id: string): Promise<R<{ assessment: Assessment; questions: AssessmentQuestion[] }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const [aRes, qRes] = await Promise.all([
      sb.from("assessments").select("*").eq("id", id).maybeSingle(),
      sb.from("assessment_questions")
        .select("id, prompt, kind, options, points, order_index")
        .eq("assessment_id", id)
        .order("order_index", { ascending: true }),
    ]);
    if (!aRes.data) return { ok: false, error: "Assessment not found" };
    type QRow = { id: string; prompt: string; kind: string; options: unknown; points: number };
    const questions: AssessmentQuestion[] = ((qRes.data ?? []) as QRow[]).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      kind: q.kind as AssessmentQuestion["kind"],
      options: Array.isArray(q.options) ? (q.options as { id: string; label: string }[]) : [],
      points: q.points,
    }));
    return { ok: true, data: { assessment: aRes.data as Assessment, questions } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function submitAttempt(
  assessmentId: string,
  answers: Record<string, string>,
  timeTakenSec: number
): Promise<R<AttemptResult>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const [aRes, qRes] = await Promise.all([
      sb.from("assessments").select("id, passing_score").eq("id", assessmentId).maybeSingle(),
      sb.from("assessment_questions")
        .select("id, correct_answer, points, explanation")
        .eq("assessment_id", assessmentId),
    ]);
    if (!aRes.data) return { ok: false, error: "Assessment not found" };
    type QFull = { id: string; correct_answer: string; points: number; explanation: string | null };
    const questions = (qRes.data ?? []) as QFull[];

    const totalPoints = questions.reduce((s, q) => s + q.points, 0);
    let earned = 0;
    const breakdown: AttemptResult["breakdown"] = [];
    for (const q of questions) {
      const given = (answers[q.id] ?? "").trim();
      const correct = given.toLowerCase() === q.correct_answer.trim().toLowerCase();
      if (correct) earned += q.points;
      breakdown.push({
        question_id: q.id,
        correct,
        given,
        expected: q.correct_answer,
        explanation: q.explanation,
      });
    }
    const percentage = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;
    const passed = percentage >= Number((aRes.data as { passing_score: number }).passing_score);

    const { data: attempt, error } = await sb
      .from("assessment_attempts")
      .insert({
        assessment_id: assessmentId,
        user_id: me.id,
        completed_at: new Date().toISOString(),
        answers,
        score: earned,
        total_points: totalPoints,
        percentage,
        passed,
        time_taken_sec: timeTakenSec,
      })
      .select("id")
      .single();
    if (error) throw error;

    await sb.rpc("increment_assessment_stats", { a_id: assessmentId, did_pass: passed }).then(() => {}).catch(async () => {
      const { data: cur } = await sb.from("assessments").select("attempt_count, pass_count").eq("id", assessmentId).maybeSingle();
      if (cur) {
        await sb.from("assessments").update({
          attempt_count: Number((cur as { attempt_count: number }).attempt_count ?? 0) + 1,
          pass_count: Number((cur as { pass_count: number }).pass_count ?? 0) + (passed ? 1 : 0),
        }).eq("id", assessmentId);
      }
    });

    revalidatePath("/skills-lab");
    return {
      ok: true,
      data: {
        id: (attempt as { id: string }).id,
        score: earned,
        total_points: totalPoints,
        percentage,
        passed,
        time_taken_sec: timeTakenSec,
        breakdown,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getMyAttempts(): Promise<R<Array<{ assessment_title: string; percentage: number; passed: boolean; completed_at: string; id: string }>>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("assessment_attempts")
      .select("id, percentage, passed, completed_at, assessment:assessments(title)")
      .eq("user_id", me.id)
      .order("completed_at", { ascending: false });
    if (error) throw error;
    type Row = { id: string; percentage: number; passed: boolean; completed_at: string; assessment: { title: string } | null };
    return {
      ok: true,
      data: ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        percentage: r.percentage,
        passed: r.passed,
        completed_at: r.completed_at,
        assessment_title: r.assessment?.title ?? "Assessment",
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ── Admin: create assessment + questions ────────────────────────────────────
export async function adminCreateAssessment(input: {
  title: string;
  description?: string;
  skill_domain: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_min: number;
  passing_score?: number;
  cover_emoji?: string;
  questions: Array<{
    prompt: string;
    kind: "mcq" | "true_false" | "short_text";
    options?: { id: string; label: string }[];
    correct_answer: string;
    explanation?: string;
    points?: number;
  }>;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();

    const { data: a, error } = await sb
      .from("assessments")
      .insert({
        creator_id: me.id,
        title: input.title,
        description: input.description ?? null,
        skill_domain: input.skill_domain,
        difficulty: input.difficulty,
        duration_min: input.duration_min,
        passing_score: input.passing_score ?? 70,
        cover_emoji: input.cover_emoji ?? "🧪",
        status: "published",
      })
      .select("id")
      .single();
    if (error) throw error;

    const assessmentId = (a as { id: string }).id;
    if (input.questions.length > 0) {
      await sb.from("assessment_questions").insert(
        input.questions.map((q, i) => ({
          assessment_id: assessmentId,
          prompt: q.prompt,
          kind: q.kind,
          options: q.options ?? [],
          correct_answer: q.correct_answer,
          explanation: q.explanation ?? null,
          points: q.points ?? 10,
          order_index: i,
        }))
      );
    }
    revalidatePath("/skills-lab");
    return { ok: true, data: { id: assessmentId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
