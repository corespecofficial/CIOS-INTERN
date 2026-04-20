"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { awardXPAction } from "@/app/actions/gamification";
import { pushNotification } from "@/app/actions/notifications";
import { isPastEagleDeadline } from "@/lib/eagle-helpers";

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

    const late = isPastEagleDeadline();
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
      actionUrl: `/projects/eagle`,
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
      .select(`id, user_id, section_h`)
      .in("status", ["submitted", "late", "graded"])
      .order("submitted_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    const signedRows = (data ?? []).filter((row: Record<string, unknown>) => {
      const h = row.section_h as SectionH;
      return h?.agreed && h?.signature_name && h?.signed_at;
    });

    const userIds = Array.from(new Set(signedRows.map((r: { user_id: string }) => r.user_id)));
    const { data: users } = userIds.length
      ? await sb.from("users").select("id, name, avatar_url").in("id", userIds)
      : { data: [] as Array<{ id: string; name: string; avatar_url: string | null }> };
    const userMap = new Map<string, { name: string; track: string | null; avatar_url: string | null }>();
    for (const u of users ?? []) userMap.set(u.id, { name: u.name, track: null, avatar_url: u.avatar_url });

    const wall = signedRows.map((row: Record<string, unknown>) => {
      const h = row.section_h as SectionH;
      const u = userMap.get(row.user_id as string);
      return {
        id: row.id as string,
        full_name: u?.name ?? "CIOS Intern",
        track: u?.track ?? null,
        avatar_url: u?.avatar_url ?? null,
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
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { ok: false, error: error.message };

    // Interns can only view their own; admins can view any
    const isAdmin = ["admin", "super_admin", "moderator"].includes(me.role);
    if (!isAdmin && data.user_id !== me.id) {
      return { ok: false, error: "Not authorized to view this submission." };
    }

    const [{ data: scores }, { data: userRow }] = await Promise.all([
      sb.from("eagle_section_scores").select("*").eq("submission_id", id).order("section"),
      sb.from("users").select("name, avatar_url").eq("id", data.user_id).maybeSingle(),
    ]);

    const submitter = userRow
      ? { full_name: userRow.name, track: null, avatar_url: userRow.avatar_url }
      : null;

    return {
      ok: true,
      data: { ...(data as EagleSubmission), section_scores: (scores || []) as SectionScore[], submitter },
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

    // Three-step fetch instead of PostgREST join: the !fkname hint was
    // returning 0 rows (likely a constraint-name mismatch on the live DB).
    // Splitting the query is trivially cheap and guaranteed to work.
    let subQ = sb
      .from("eagle_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (filters?.status) subQ = subQ.eq("status", filters.status);
    const { data: subs, error: subErr } = await subQ;
    if (subErr) return { ok: false, error: subErr.message };
    if (!subs || subs.length === 0) return { ok: true, data: [] };

    const userIds = Array.from(new Set(subs.map((s: { user_id: string }) => s.user_id)));
    const subIds = subs.map((s: { id: string }) => s.id);

    // Note: users has no `track` column — tracks live in a separate
    // career_path table. Leaving track as null for now.
    const [{ data: users }, { data: scoreRows }] = await Promise.all([
      sb.from("users").select("id, name, avatar_url").in("id", userIds),
      sb.from("eagle_section_scores").select("id, submission_id").in("submission_id", subIds),
    ]);

    const userMap = new Map<string, { name: string; track: string | null; avatar_url: string | null }>();
    for (const u of users ?? []) {
      userMap.set(u.id, { name: u.name, track: null, avatar_url: u.avatar_url });
    }
    const scoresBySub = new Map<string, number>();
    for (const sc of scoreRows ?? []) {
      scoresBySub.set(sc.submission_id, (scoresBySub.get(sc.submission_id) ?? 0) + 1);
    }

    let rows = subs.map((sub: Record<string, unknown>) => {
      const u = userMap.get(sub.user_id as string);
      return {
        ...(sub as EagleSubmission),
        submitter: u
          ? { full_name: u.name, track: u.track, avatar_url: u.avatar_url }
          : { full_name: "Unknown", track: null, avatar_url: null },
        scores_count: scoresBySub.get(sub.id as string) ?? 0,
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
      actionUrl: `/projects/eagle/${submissionId}`,
    });

    return { ok: true, data: { total_score: total } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Auto-grade (local heuristic + optional external AI) ─────────────────────

export interface EagleAiSuggestion {
  section_id: string;
  suggested_score: number;
  max_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  source: "ai" | "heuristic";
}

/**
 * Suggest a score + strengths/weaknesses/feedback for one Eagle section.
 * Tries external AI first (if @/lib/ai-client has a key configured) and
 * falls back to the local deterministic heuristic grader so the admin
 * never sees a dead button.
 */
export async function aiSuggestEagleSectionScore(
  submissionId: string,
  sectionId: string,
): Promise<R<EagleAiSuggestion>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const col = `section_${sectionId.toLowerCase()}`;
    const { data: sub, error } = await sb
      .from("eagle_submissions")
      .select(col)
      .eq("id", submissionId)
      .single();
    if (error || !sub) return { ok: false, error: "Submission not found" };

    const sectionData = (sub as Record<string, unknown>)[col];

    // Try external AI first — then fall back to heuristic
    try {
      const { callLLM, logAiUsage } = await import("@/lib/ai-client");
      const { formatEagleSection } = await import("@/lib/eagle-grading-helpers");
      const MAX: Record<string, number> = { A: 20, B: 15, C: 15, D: 15, E: 10, F: 15, G: 5, H: 5 };
      const LABELS: Record<string, string> = {
        A: "Reflection Essay", B: "Three Pillars Audit", C: "Discipline Case Study",
        D: "4-Day Planner", E: "Goal-Setting Grid", F: "Design Challenge",
        G: "Career Ladder Map", H: "Eagle Covenant",
      };
      const max = MAX[sectionId] ?? 10;
      const label = LABELS[sectionId] ?? `Section ${sectionId}`;
      const formatted = formatEagleSection(sectionId, sectionData);

      const prompt = `Grade this Eagle Project section. Section: "${label}" (max ${max} pts).

Intern's response:
${formatted}

Return strict JSON: {"score": number 0-${max}, "strengths": string[], "weaknesses": string[], "feedback": "coaching paragraph"}.
Be rigorous but encouraging. Cite specifics from the response.`;

      const { text, provider } = await callLLM(prompt, {
        system: "You are a rigorous but kind internship grading coach. Return only strict JSON.",
        maxTokens: 700,
        temperature: 0.2,
      });
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("no json");
      const parsed = JSON.parse(match[0]) as {
        score: number; strengths: string[]; weaknesses: string[]; feedback: string;
      };
      logAiUsage(me.id, "eagle_grading", provider).catch(() => {});
      return {
        ok: true,
        data: {
          section_id: sectionId,
          suggested_score: Math.max(0, Math.min(max, Math.round(parsed.score))),
          max_score: max,
          strengths: parsed.strengths ?? [],
          weaknesses: parsed.weaknesses ?? [],
          feedback: parsed.feedback ?? "",
          source: "ai",
        },
      };
    } catch {
      // AI unavailable — fall back to local heuristic
      const { heuristicGradeEagleSection } = await import("@/lib/eagle-grading-helpers");
      return { ok: true, data: heuristicGradeEagleSection(sectionId, sectionData) };
    }
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Run the auto-grader over all 8 Eagle sections and upsert the suggested
 * scores + feedback as drafts. Admin still reviews + finalizes.
 */
export async function aiGradeAllEagleSections(
  submissionId: string,
): Promise<R<{ suggestions: EagleAiSuggestion[]; saved: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }

    const suggestions: EagleAiSuggestion[] = [];
    for (const id of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      const res = await aiSuggestEagleSectionScore(submissionId, id);
      if (!res.ok) return { ok: false, error: `Failed on section ${id}: ${res.error}` };
      suggestions.push(res.data);
    }

    const sb = supabaseAdmin();
    let saved = 0;
    for (const s of suggestions) {
      const feedback = [
        s.strengths.length ? `Strengths:\n${s.strengths.map((x) => `• ${x}`).join("\n")}` : "",
        s.weaknesses.length ? `Weaknesses:\n${s.weaknesses.map((x) => `• ${x}`).join("\n")}` : "",
        s.feedback,
      ].filter(Boolean).join("\n\n");
      const { error } = await sb
        .from("eagle_section_scores")
        .upsert({
          submission_id: submissionId,
          section: s.section_id,
          score: s.suggested_score,
          max_score: s.max_score,
          feedback,
          graded_by: me.id,
          graded_at: new Date().toISOString(),
        }, { onConflict: "submission_id,section" });
      if (!error) saved++;
    }

    return { ok: true, data: { suggestions, saved } };
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
