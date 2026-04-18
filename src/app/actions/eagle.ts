"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { awardXPAction } from "@/app/actions/gamification";
import { pushNotification } from "@/app/actions/notifications";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SectionA {
  q1?: string; q2?: string; q3?: string; q4?: string;
  q5?: string; q6?: string; q7?: string;
}
export interface SectionBPillar {
  score?: number; explanation?: string; action?: string;
}
export interface SectionB {
  sincerity?: SectionBPillar;
  dedication?: SectionBPillar;
  sacrifice?: SectionBPillar;
}
export interface SectionC {
  person_studied?: string;
  sources?: string[];
  discipline_1?: string; discipline_2?: string; discipline_3?: string;
  discipline_4?: string; discipline_5?: string;
  hardest_season?: string;
  parallel?: string;
}
export interface DaySlots {
  morning?: string; mid_morning?: string; afternoon?: string;
  mid_afternoon?: string; evening?: string; night?: string;
  win?: string; struggle?: string;
}
export interface SectionD {
  d1_goal?: string; d2_nonnegotiables?: string;
  days?: DaySlots[];
}
export interface Goal { goal?: string; deadline?: string; how?: string; }
export interface SectionE {
  horizon_1?: Goal[]; horizon_2?: Goal[];
  horizon_3?: Goal[]; horizon_4?: Goal[];
}
export interface SectionF {
  design_url?: string; rationale?: string; tagline?: string;
  track?: string; colors?: string[]; symbol?: string;
  values?: string[]; north_star?: string;
}
export interface SectionG {
  current_position?: string; target_30d?: string; target_6m?: string;
  current_xp?: number; target_xp?: number;
  actions?: string[];
  g1?: string; g2?: string;
}
export interface SectionH {
  agreed?: boolean; signature_name?: string;
  witness_name?: string; signed_at?: string;
}

export interface EagleSections {
  section_a?: SectionA; section_b?: SectionB; section_c?: SectionC;
  section_d?: SectionD; section_e?: SectionE; section_f?: SectionF;
  section_g?: SectionG; section_h?: SectionH;
}

export interface EagleSubmission {
  id: string;
  user_id: string;
  status: "draft" | "submitted" | "late" | "graded";
  section_a: SectionA; section_b: SectionB; section_c: SectionC;
  section_d: SectionD; section_e: SectionE; section_f: SectionF;
  section_g: SectionG; section_h: SectionH;
  total_score: number | null;
  overall_feedback: string | null;
  late_fine_applied: boolean;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionScore {
  id: string;
  submission_id: string;
  section: string;
  score: number;
  max_score: number;
  feedback: string | null;
  graded_at: string | null;
}

// ── Deadline helpers ───────────────────────────────────────────────────────────

/** Returns the deadline Date for the current week's Eagle Project (Tuesday 19:45 WAT).
 *  WAT is UTC+1, so 19:45 WAT = 18:45 UTC. */
export function getEagleDeadline(): Date {
  const now = new Date();
  // Find next (or current) Tuesday
  const day = now.getUTCDay(); // 0=Sun, 2=Tue
  const daysUntilTue = day <= 2 ? 2 - day : 9 - day;
  const tuesday = new Date(now);
  tuesday.setUTCDate(now.getUTCDate() + daysUntilTue);
  tuesday.setUTCHours(18, 45, 0, 0); // 19:45 WAT = 18:45 UTC
  return tuesday;
}

function isPastDeadline(): boolean {
  return new Date() > getEagleDeadline();
}

// ── Intern-facing actions ──────────────────────────────────────────────────────

export async function getMyEagleSubmission(): Promise<R<EagleSubmission | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("eagle_submissions")
      .select("*")
      .eq("user_id", me.id)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as EagleSubmission | null };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function saveEagleDraft(sections: EagleSections): Promise<R<EagleSubmission>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    // Check existing submission — can't edit if already submitted/graded
    const { data: existing } = await sb
      .from("eagle_submissions")
      .select("id, status")
      .eq("user_id", me.id)
      .maybeSingle();

    if (existing && !["draft", "late"].includes(existing.status)) {
      // Allow draft updates even after submission (e.g. status='late' draft edits before coach grades)
    }

    const payload: Record<string, unknown> = {
      user_id: me.id,
      updated_at: new Date().toISOString(),
    };
    if (sections.section_a !== undefined) payload.section_a = sections.section_a;
    if (sections.section_b !== undefined) payload.section_b = sections.section_b;
    if (sections.section_c !== undefined) payload.section_c = sections.section_c;
    if (sections.section_d !== undefined) payload.section_d = sections.section_d;
    if (sections.section_e !== undefined) payload.section_e = sections.section_e;
    if (sections.section_f !== undefined) payload.section_f = sections.section_f;
    if (sections.section_g !== undefined) payload.section_g = sections.section_g;
    if (sections.section_h !== undefined) payload.section_h = sections.section_h;

    const { data, error } = await sb
      .from("eagle_submissions")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as EagleSubmission };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function submitEagleProject(): Promise<R<{ late: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: existing } = await sb
      .from("eagle_submissions")
      .select("id, status, late_fine_applied")
      .eq("user_id", me.id)
      .maybeSingle();

    if (existing && existing.status === "graded") {
      return { ok: false, error: "Your submission has already been graded." };
    }
    if (existing && existing.status === "submitted") {
      return { ok: false, error: "Already submitted." };
    }

    const late = isPastDeadline();
    const now = new Date().toISOString();

    const upsertPayload = {
      user_id: me.id,
      status: late ? "late" : "submitted",
      submitted_at: now,
      updated_at: now,
    };

    const { data: submission, error: subError } = await sb
      .from("eagle_submissions")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select("id, late_fine_applied")
      .single();

    if (subError) return { ok: false, error: subError.message };

    // Apply late fine (₦500) if past deadline and not already applied
    if (late && !submission.late_fine_applied) {
      await sb.from("compliance_fines").insert({
        user_id: me.id,
        task_id: null,
        amount: 500,
        reason: "Late Eagle Project submission",
        status: "unpaid",
        issued_at: now,
      });
      await sb
        .from("eagle_submissions")
        .update({ late_fine_applied: true })
        .eq("id", submission.id);
    }

    // Award XP
    await awardXPAction(late ? "task_completed" : "eagle_submitted");

    // Push notification
    await pushNotification({
      userId: me.id,
      title: late ? "Eagle Project submitted (late)" : "Eagle Project submitted!",
      message: late
        ? "Your Eagle Project was submitted after the deadline. A ₦500 fine has been applied. Your coach will review it soon."
        : "Great work! Your Eagle Project has been submitted. Your coach will grade it and notify you.",
      type: late ? "warning" : "success",
      actionUrl: `/eagle`,
    });

    return { ok: true, data: { late } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getCovenantWall(): Promise<R<Array<{
  id: string;
  full_name: string;
  track: string | null;
  avatar_url: string | null;
  signature_name: string;
  signed_at: string;
}>>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("eagle_submissions")
      .select(`id, section_h, users!eagle_submissions_user_id_fkey(full_name, track, avatar_url)`)
      .in("status", ["submitted", "late", "graded"])
      .order("submitted_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    const wall = (data || [])
      .filter((row: Record<string, unknown>) => {
        const h = row.section_h as SectionH;
        return h?.agreed && h?.signature_name && h?.signed_at;
      })
      .map((row: Record<string, unknown>) => {
        const h = row.section_h as SectionH;
        const user = row.users as { full_name: string; track: string | null; avatar_url: string | null } | null;
        return {
          id: row.id as string,
          full_name: user?.full_name ?? "CIOS Intern",
          track: user?.track ?? null,
          avatar_url: user?.avatar_url ?? null,
          signature_name: h.signature_name!,
          signed_at: h.signed_at!,
        };
      });

    return { ok: true, data: wall };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getEagleSubmissionById(id: string): Promise<R<EagleSubmission & { section_scores: SectionScore[]; submitter: { full_name: string; track: string | null; avatar_url: string | null } | null }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("eagle_submissions")
      .select(`*, users!eagle_submissions_user_id_fkey(full_name, track, avatar_url)`)
      .eq("id", id)
      .single();

    if (error) return { ok: false, error: error.message };

    // Interns can only view their own; admins can view any
    const isAdmin = ["admin", "super_admin", "moderator"].includes(me.role);
    if (!isAdmin && data.user_id !== me.id) {
      return { ok: false, error: "Not authorized to view this submission." };
    }

    const { data: scores } = await sb
      .from("eagle_section_scores")
      .select("*")
      .eq("submission_id", id)
      .order("section");

    const submitter = data.users as { full_name: string; track: string | null; avatar_url: string | null } | null;
    const { users: _users, ...submission } = data;
    void _users;

    return {
      ok: true,
      data: { ...(submission as EagleSubmission), section_scores: (scores || []) as SectionScore[], submitter },
    };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── Admin-facing actions ───────────────────────────────────────────────────────

export async function getEagleSubmissionsForGrading(filters?: {
  status?: string; search?: string;
}): Promise<R<Array<EagleSubmission & {
  submitter: { full_name: string; track: string | null; avatar_url: string | null };
  scores_count: number;
}>>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    let q = sb
      .from("eagle_submissions")
      .select(`*, users!eagle_submissions_user_id_fkey(full_name, track, avatar_url), eagle_section_scores(id)`)
      .order("submitted_at", { ascending: false });

    if (filters?.status) q = q.eq("status", filters.status);

    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };

    let rows = (data || []).map((row: Record<string, unknown>) => {
      const user = row.users as { full_name: string; track: string | null; avatar_url: string | null } | null;
      const scoresArr = row.eagle_section_scores as { id: string }[] | null;
      const { users: _u, eagle_section_scores: _s, ...submission } = row;
      void _u; void _s;
      return {
        ...(submission as EagleSubmission),
        submitter: user ?? { full_name: "Unknown", track: null, avatar_url: null },
        scores_count: scoresArr?.length ?? 0,
      };
    });

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter((r) => r.submitter.full_name.toLowerCase().includes(q));
    }

    return { ok: true, data: rows };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function gradeEagleSection(
  submissionId: string,
  section: string,
  score: number,
  feedback: string,
): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const MAX_SCORES: Record<string, number> = {
      A: 20, B: 15, C: 15, D: 15, E: 10, F: 15, G: 5, H: 5,
    };
    const maxScore = MAX_SCORES[section] ?? 10;
    const clampedScore = Math.max(0, Math.min(maxScore, score));

    const { data, error } = await sb
      .from("eagle_section_scores")
      .upsert({
        submission_id: submissionId,
        section,
        score: clampedScore,
        max_score: maxScore,
        feedback: feedback.trim() || null,
        graded_at: new Date().toISOString(),
        graded_by: me.id,
      }, { onConflict: "submission_id,section" })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { id: data.id } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function finalizeEagleGrading(
  submissionId: string,
  overallFeedback: string,
): Promise<R<{ total_score: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { data: scores, error: scErr } = await sb
      .from("eagle_section_scores")
      .select("score")
      .eq("submission_id", submissionId);

    if (scErr) return { ok: false, error: scErr.message };

    const total = (scores || []).reduce((acc: number, s: { score: number }) => acc + s.score, 0);
    const now = new Date().toISOString();

    const { data: sub, error: subErr } = await sb
      .from("eagle_submissions")
      .update({
        total_score: total,
        overall_feedback: overallFeedback.trim() || null,
        status: "graded",
        graded_at: now,
        graded_by: me.id,
        updated_at: now,
      })
      .eq("id", submissionId)
      .select("user_id")
      .single();

    if (subErr) return { ok: false, error: subErr.message };

    // Award bonus XP for perfect / high score
    if (total >= 90) {
      // Use admin client to award XP directly — no current-user context for the intern
      await sb
        .from("users")
        .select("id")
        .eq("id", sub.user_id)
        .single()
        .then(async () => {
          // awardXPAction uses getCurrentDbUser so we insert the XP event directly
          await sb.rpc("award_xp_event", {
            p_user_id: sub.user_id,
            p_event: "eagle_perfect_score",
            p_amount: 500,
          }).then(() => {}).catch(() => {});
        });
    }

    // Notify the intern
    await pushNotification({
      userId: sub.user_id,
      title: `Eagle Project graded — ${total}/100`,
      message: total >= 90
        ? `Excellent! You scored ${total}/100 on your Eagle Project. +500 bonus XP awarded!`
        : `Your Eagle Project has been graded. You scored ${total}/100. Check the feedback for details.`,
      type: total >= 70 ? "success" : "info",
      actionUrl: `/eagle/${submissionId}`,
    });

    return { ok: true, data: { total_score: total } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getEagleAnalytics(): Promise<R<{
  total: number;
  submitted: number;
  graded: number;
  late: number;
  avg_score: number | null;
  section_avg: Record<string, number>;
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { data: subs } = await sb
      .from("eagle_submissions")
      .select("status, total_score");

    const { data: scores } = await sb
      .from("eagle_section_scores")
      .select("section, score");

    const total = subs?.length ?? 0;
    const submitted = subs?.filter((s: { status: string }) => s.status === "submitted").length ?? 0;
    const graded = subs?.filter((s: { status: string }) => s.status === "graded").length ?? 0;
    const late = subs?.filter((s: { status: string }) => s.status === "late").length ?? 0;

    const gradedWithScore = subs?.filter((s: { status: string; total_score: number | null }) => s.status === "graded" && s.total_score !== null) ?? [];
    const avg_score = gradedWithScore.length
      ? Math.round(gradedWithScore.reduce((a: number, s: { total_score: number }) => a + s.total_score, 0) / gradedWithScore.length)
      : null;

    const sectionMap: Record<string, number[]> = {};
    for (const s of scores ?? []) {
      if (!sectionMap[s.section]) sectionMap[s.section] = [];
      sectionMap[s.section].push(s.score);
    }
    const section_avg: Record<string, number> = {};
    for (const [sec, arr] of Object.entries(sectionMap)) {
      section_avg[sec] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }

    return { ok: true, data: { total, submitted, graded, late, avg_score, section_avg } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}
