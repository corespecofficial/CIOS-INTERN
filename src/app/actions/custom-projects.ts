"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";
import { awardXP } from "@/lib/gamification";
import { callLLM, logAiUsage } from "@/lib/ai-client";
import { heuristicGradeSection } from "@/lib/heuristic-grader";
import { revalidatePath } from "next/cache";
import type {
  Project, ProjectSubmission, ProjectInput,
  ProjectSectionScore, ProjectSubmissionSummary, SectionConfig,
} from "./custom-projects-types";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

// ── INTERN ACTIONS ────────────────────────────────────────────────────────────

export async function getPublishedProjects(): Promise<R<Project[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: projects, error } = await sb
      .from("projects")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    // Fetch my submissions for these projects
    const ids = (projects ?? []).map((p: { id: string }) => p.id);
    let mySubmissions: ProjectSubmissionSummary[] = [];
    if (ids.length > 0) {
      const { data: subs } = await sb
        .from("project_submissions")
        .select("id, project_id, status, total_score, submitted_at")
        .eq("user_id", me.id)
        .in("project_id", ids);
      mySubmissions = (subs ?? []) as ProjectSubmissionSummary[];
    }

    const subMap: Record<string, ProjectSubmissionSummary> = {};
    for (const s of mySubmissions) subMap[(s as unknown as { project_id: string }).project_id] = s;

    const result = (projects ?? []).map((p: Record<string, unknown>) => ({
      ...(p as Project),
      my_submission: subMap[p.id as string] ?? null,
    }));

    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getAllProjectsAdmin(): Promise<R<(Project & { submission_count: number })[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { data: projects, error } = await sb
      .from("projects")
      .select("*, project_submissions(id)")
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    const result = (projects ?? []).map((p: Record<string, unknown>) => {
      const subs = p.project_submissions as { id: string }[] | null;
      const { project_submissions: _s, ...rest } = p;
      void _s;
      return { ...(rest as Project), submission_count: subs?.length ?? 0 };
    });

    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getProjectById(id: string): Promise<R<Project>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const isAdmin = ["admin", "super_admin", "moderator"].includes(me.role);

    const q = sb.from("projects").select("*").eq("id", id);
    // Non-admins can only view published
    const { data, error } = isAdmin ? await q.single() : await q.eq("status", "published").single();

    if (error || !data) return { ok: false, error: "Project not found." };
    return { ok: true, data: data as Project };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getMySubmission(projectId: string): Promise<R<ProjectSubmission | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("project_submissions")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", me.id)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as ProjectSubmission | null };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function saveProjectDraft(
  projectId: string,
  answers: Record<string, unknown>,
): Promise<R<ProjectSubmission>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    // Get existing to merge answers
    const { data: existing } = await sb
      .from("project_submissions")
      .select("id, status, answers")
      .eq("project_id", projectId)
      .eq("user_id", me.id)
      .maybeSingle();

    if (existing?.status === "graded") {
      return { ok: false, error: "Submission already graded." };
    }

    const merged = { ...(existing?.answers ?? {}), ...answers };

    const { data, error } = await sb
      .from("project_submissions")
      .upsert({
        project_id: projectId,
        user_id: me.id,
        answers: merged,
        updated_at: new Date().toISOString(),
      }, { onConflict: "project_id,user_id" })
      .select("*")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as ProjectSubmission };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

const MASTERCLASS_PROJECT_ID = "c7f8e9d0-1a2b-3c4d-5e6f-7a8b9c0d1e2f";
// Section IDs match the `id` field in the project's sections JSONB (set in p359 migration)
const MASTERCLASS_SECTION_EVENTS: Record<string, import("@/lib/gamification-shared").XPEventType> = {
  day1_social:   "masterclass_day1",
  day2_digital:  "masterclass_day2",
  day3_business: "masterclass_day3",
  day4_calendar: "masterclass_day4a",
  day4_posts:    "masterclass_day4b",
};

export async function recordMasterclassSectionProgress(
  projectId: string,
  sectionKey: string,
): Promise<void> {
  if (projectId !== MASTERCLASS_PROJECT_ID) return;
  const event = MASTERCLASS_SECTION_EVENTS[sectionKey];
  if (!event) return;
  try {
    const me = await getCurrentDbUser();
    if (!me) return;
    await awardXP(me.id, event);
  } catch {
    // non-critical — silently ignore
  }
}

export async function submitProject(projectId: string): Promise<R<{ late: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: project, error: pErr } = await sb
      .from("projects")
      .select("id, title, deadline, late_fine_amount, xp_on_submit, status")
      .eq("id", projectId)
      .single();

    if (pErr || !project) return { ok: false, error: "Project not found." };
    if (project.status !== "published") return { ok: false, error: "Project is not open for submissions." };

    const { data: existing } = await sb
      .from("project_submissions")
      .select("id, status, late_fine_applied")
      .eq("project_id", projectId)
      .eq("user_id", me.id)
      .maybeSingle();

    if (existing?.status === "graded") return { ok: false, error: "Already graded." };
    if (existing?.status === "submitted") return { ok: false, error: "Already submitted." };

    const late = project.deadline ? new Date() > new Date(project.deadline) : false;
    const now = new Date().toISOString();

    const { data: submission, error: subErr } = await sb
      .from("project_submissions")
      .upsert({
        project_id: projectId,
        user_id: me.id,
        status: late ? "late" : "submitted",
        submitted_at: now,
        updated_at: now,
      }, { onConflict: "project_id,user_id" })
      .select("id, late_fine_applied")
      .single();

    if (subErr) return { ok: false, error: subErr.message };

    // Late fine
    if (late && !submission.late_fine_applied && project.late_fine_amount > 0) {
      await sb.from("compliance_fines").insert({
        user_id: me.id,
        task_id: null,
        amount: project.late_fine_amount,
        reason: `Late submission: ${project.title}`,
        status: "unpaid",
        issued_at: now,
      });
      await sb.from("project_submissions")
        .update({ late_fine_applied: true })
        .eq("id", submission.id);
    }

    // Award XP directly
    await sb.from("xp_events").insert({
      user_id: me.id,
      event_type: "task_completed",
      amount: late ? Math.floor(project.xp_on_submit / 2) : project.xp_on_submit,
      ref_type: "project_submission",
      ref_id: submission.id,
    }).then(() => {}).catch(() => {});

    // Fire masterclass mission event if this is the masterclass project
    if (projectId === MASTERCLASS_PROJECT_ID) {
      await awardXP(me.id, "masterclass_submitted").catch(() => {});
    }

    await pushNotification({
      userId: me.id,
      title: late ? `${project.title} submitted (late)` : `${project.title} submitted!`,
      message: late
        ? `Your submission was received after the deadline. A ₦${project.late_fine_amount} fine has been applied.`
        : `Great work! Your submission is in. Your coach will grade it soon.`,
      type: late ? "warning" : "success",
      actionUrl: `/projects/${projectId}`,
    });

    return { ok: true, data: { late } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── ADMIN ACTIONS ─────────────────────────────────────────────────────────────

export async function createProject(data: ProjectInput): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { data: row, error } = await sb
      .from("projects")
      .insert({ ...data, status: "draft", created_by: me.id })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    return { ok: true, data: { id: row.id } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateProject(id: string, data: Partial<ProjectInput>): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { error } = await sb
      .from("projects")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .neq("status", "archived");

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function publishProject(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { data: project, error: pErr } = await sb
      .from("projects")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("title")
      .single();

    if (pErr) return { ok: false, error: pErr.message };

    // Notify all active interns + team leads
    const { data: interns } = await sb
      .from("users")
      .select("id")
      .in("role", ["intern", "team_lead"])
      .limit(2000);

    for (const intern of interns ?? []) {
      await pushNotification({
        userId: intern.id,
        title: `New project: ${project.title}`,
        message: "A new assignment has been published. Check your Projects page.",
        type: "info",
        actionUrl: `/projects/${id}`,
      });
    }

    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function archiveProject(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { error } = await sb
      .from("projects")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/projects");
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getProjectSubmissions(
  projectId: string,
  filters?: { status?: string; search?: string },
): Promise<R<Array<ProjectSubmission & {
  submitter: { full_name: string; avatar_url: string | null };
  section_scores_count: number;
}>>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    let q = sb
      .from("project_submissions")
      .select(`*, users!project_submissions_user_id_fkey(name, avatar_url), project_section_scores(id)`)
      .eq("project_id", projectId)
      .order("submitted_at", { ascending: false });

    if (filters?.status) q = q.eq("status", filters.status);

    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };

    let rows = (data ?? []).map((row: Record<string, unknown>) => {
      const user = row.users as { name: string; avatar_url: string | null } | null;
      const scores = row.project_section_scores as { id: string }[] | null;
      const { users: _u, project_section_scores: _s, ...rest } = row;
      void _u; void _s;
      return {
        ...(rest as ProjectSubmission),
        submitter: user
          ? { full_name: user.name, avatar_url: user.avatar_url }
          : { full_name: "Unknown", avatar_url: null },
        section_scores_count: scores?.length ?? 0,
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

export async function getProjectSubmissionById(submissionId: string): Promise<R<ProjectSubmission & {
  section_scores: ProjectSectionScore[];
  submitter: { full_name: string; avatar_url: string | null } | null;
  project: { title: string; sections: SectionConfig[] };
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("project_submissions")
      .select(`*, users!project_submissions_user_id_fkey(name, avatar_url), projects!project_submissions_project_id_fkey(title, sections)`)
      .eq("id", submissionId)
      .single();

    if (error || !data) return { ok: false, error: "Submission not found." };

    const isAdmin = ["admin", "super_admin", "moderator"].includes(me.role);
    if (!isAdmin && data.user_id !== me.id) {
      return { ok: false, error: "Not authorized." };
    }

    const { data: scores } = await sb
      .from("project_section_scores")
      .select("*")
      .eq("submission_id", submissionId);

    const user = data.users as { name: string; avatar_url: string | null } | null;
    const project = data.projects as { title: string; sections: SectionConfig[] } | null;
    const { users: _u, projects: _p, ...rest } = data;
    void _u; void _p;

    return {
      ok: true,
      data: {
        ...(rest as ProjectSubmission),
        section_scores: (scores ?? []) as ProjectSectionScore[],
        submitter: user ? { full_name: user.name, avatar_url: user.avatar_url } : null,
        project: project ?? { title: "Unknown", sections: [] },
      },
    };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function gradeProjectSection(
  submissionId: string,
  sectionId: string,
  maxScore: number,
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

    const clamped = Math.max(0, Math.min(maxScore, score));
    const { data, error } = await sb
      .from("project_section_scores")
      .upsert({
        submission_id: submissionId,
        section_id: sectionId,
        score: clamped,
        max_score: maxScore,
        feedback: feedback.trim() || null,
        graded_at: new Date().toISOString(),
        graded_by: me.id,
      }, { onConflict: "submission_id,section_id" })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { id: data.id } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function finalizeProjectGrading(
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
      .from("project_section_scores")
      .select("score")
      .eq("submission_id", submissionId);

    if (scErr) return { ok: false, error: scErr.message };

    const total = (scores ?? []).reduce((a: number, s: { score: number }) => a + s.score, 0);
    const now = new Date().toISOString();

    // Load submission to get user_id + project for bonus XP
    const { data: sub, error: subErr } = await sb
      .from("project_submissions")
      .update({
        total_score: total,
        overall_feedback: overallFeedback.trim() || null,
        status: "graded",
        graded_at: now,
        graded_by: me.id,
        updated_at: now,
      })
      .eq("id", submissionId)
      .select("user_id, project_id")
      .single();

    if (subErr) return { ok: false, error: subErr.message };

    // Load project for bonus thresholds and title
    const { data: project } = await sb
      .from("projects")
      .select("title, xp_bonus_threshold, xp_bonus_amount")
      .eq("id", sub.project_id)
      .single();

    if (project && total >= project.xp_bonus_threshold) {
      await sb.from("xp_events").insert({
        user_id: sub.user_id,
        event_type: "task_completed",
        amount: project.xp_bonus_amount,
        ref_type: "project_bonus",
        ref_id: submissionId,
      }).then(() => {}).catch(() => {});
    }

    await pushNotification({
      userId: sub.user_id,
      title: `${project?.title ?? "Project"} graded — ${total} pts`,
      message: total >= (project?.xp_bonus_threshold ?? 90)
        ? `Excellent! You scored ${total} points and earned a bonus ${project?.xp_bonus_amount ?? 500} XP!`
        : `Your submission has been graded. You scored ${total} points. Check the feedback.`,
      type: total >= 70 ? "success" : "info",
      actionUrl: `/projects/${sub.project_id}/submissions/${submissionId}`,
    });

    revalidatePath(`/admin/projects/${sub.project_id}`);
    return { ok: true, data: { total_score: total } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── AI AUTO-GRADING ───────────────────────────────────────────────────────────

export interface AiSectionSuggestion {
  section_id: string;
  suggested_score: number;
  max_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  source: "ai" | "heuristic";
}

function stripCodeFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function buildSectionRubricPrompt(
  section: SectionConfig,
  answer: unknown,
): string {
  const rubric: string[] = [];
  rubric.push(`SECTION: ${section.label}`);
  rubric.push(`TYPE: ${section.type}`);
  rubric.push(`MAX POINTS: ${section.points}`);
  if (section.description) rubric.push(`DESCRIPTION: ${section.description}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = (section as any).config ?? {};
  if (section.type === "essay" && Array.isArray(cfg.questions)) {
    rubric.push(`\nPROMPT QUESTIONS:`);
    cfg.questions.forEach((q: { id: string; text: string; wordTarget?: number }, i: number) => {
      rubric.push(`  Q${i + 1}. ${q.text}${q.wordTarget ? ` (target ${q.wordTarget} words)` : ""}`);
    });
  } else if (section.type === "rating_scale" && Array.isArray(cfg.pillars)) {
    rubric.push(`\nPILLARS TO RATE:`);
    cfg.pillars.forEach((p: { id: string; label: string }) => rubric.push(`  • ${p.label}`));
  } else if (section.type === "text_fields" && Array.isArray(cfg.fields)) {
    rubric.push(`\nFIELDS:`);
    cfg.fields.forEach((f: { id: string; label: string }) => rubric.push(`  • ${f.label}`));
  } else if (section.type === "goal_grid" && Array.isArray(cfg.rows)) {
    rubric.push(`\nGOAL GRID ROWS: ${cfg.rows.length}`);
  }

  const answerText = typeof answer === "string" ? answer : JSON.stringify(answer, null, 2);
  rubric.push(`\n─── INTERN'S SUBMISSION ───`);
  rubric.push(answerText || "(empty)");

  rubric.push(`\n─── YOUR TASK ───`);
  rubric.push(
    `Grade this section as an experienced, fair internship coach. Award a score from 0 to ${section.points}. Be rigorous but constructive. An empty/very short/copy-pasted answer should score low. A thoughtful, specific, evidenced answer scores high.\n\nReturn ONLY valid JSON (no prose, no code fences) in this exact shape:\n{\n  "suggested_score": <integer 0-${section.points}>,\n  "strengths": ["<1 short bullet>", "<2nd>", "<3rd>"],\n  "weaknesses": ["<1 short bullet>", "<2nd>", "<3rd>"],\n  "feedback": "<2-4 sentences of direct coach-style feedback>"\n}`,
  );
  return rubric.join("\n");
}

function parseAiSuggestion(
  raw: string,
  sectionId: string,
  maxPoints: number,
): AiSectionSuggestion {
  const cleaned = stripCodeFence(raw);
  // Find the first { ... } block (LLMs sometimes add a greeting)
  const match = cleaned.match(/\{[\s\S]*\}/);
  const json = match ? match[0] : cleaned;
  const parsed = JSON.parse(json) as {
    suggested_score?: number;
    strengths?: unknown;
    weaknesses?: unknown;
    feedback?: unknown;
  };
  const score = Math.max(0, Math.min(maxPoints, Math.round(Number(parsed.suggested_score ?? 0))));
  const asList = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((y) => typeof y === "string" && y.trim()).slice(0, 5) : [];
  return {
    section_id: sectionId,
    suggested_score: score,
    max_score: maxPoints,
    strengths: asList(parsed.strengths),
    weaknesses: asList(parsed.weaknesses),
    feedback: typeof parsed.feedback === "string" ? parsed.feedback.trim() : "",
    source: "ai",
  };
}

export async function aiSuggestProjectSectionScore(
  submissionId: string,
  sectionId: string,
): Promise<R<AiSectionSuggestion>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const { data: sub } = await sb
      .from("project_submissions")
      .select("answers, project_id, projects!project_submissions_project_id_fkey(sections)")
      .eq("id", submissionId)
      .single();
    if (!sub) return { ok: false, error: "Submission not found" };

    const project = (sub as { projects: { sections: SectionConfig[] } | null }).projects;
    const sections = project?.sections ?? [];
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return { ok: false, error: `Section ${sectionId} not found in project` };

    const answer = ((sub as { answers: Record<string, unknown> }).answers ?? {})[sectionId];

    // Try AI first — fall back to local heuristic on ANY failure (no key, rate-limit,
    // network, invalid JSON). Admin never sees a dead button.
    try {
      const prompt = buildSectionRubricPrompt(section, answer);
      const { text, provider } = await callLLM(prompt, {
        system:
          "You are a rigorous but kind internship grading coach. Your job: evaluate one section of a weekend-assignment submission, identify specific strengths and weaknesses, and suggest a score. Always return strict JSON.",
        maxTokens: 700,
        temperature: 0.2,
      });
      const suggestion = parseAiSuggestion(text, sectionId, section.points);
      logAiUsage(me.id, "project_grading", provider).catch(() => {});
      return { ok: true, data: suggestion };
    } catch {
      // AI unavailable — compute deterministically. Still 100% useful.
      const heuristic = heuristicGradeSection(section, answer);
      return { ok: true, data: heuristic };
    }
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function aiGradeAllSections(
  submissionId: string,
): Promise<R<{ suggestions: AiSectionSuggestion[]; saved: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }

    const sb = supabaseAdmin();
    const { data: sub } = await sb
      .from("project_submissions")
      .select("project_id, projects!project_submissions_project_id_fkey(sections)")
      .eq("id", submissionId)
      .single();
    if (!sub) return { ok: false, error: "Submission not found" };

    const project = (sub as { projects: { sections: SectionConfig[] } | null }).projects;
    const sections = project?.sections ?? [];
    if (sections.length === 0) return { ok: false, error: "Project has no sections" };

    // Run sequentially to respect API rate limits and surface errors early
    const suggestions: AiSectionSuggestion[] = [];
    for (const sec of sections) {
      const res = await aiSuggestProjectSectionScore(submissionId, sec.id);
      if (!res.ok) return { ok: false, error: `Failed on section "${sec.label}": ${res.error}` };
      suggestions.push(res.data);
    }

    // Upsert suggestions as draft scores + combined feedback so admin reviews before finalizing
    let saved = 0;
    for (const s of suggestions) {
      const feedbackLines: string[] = [];
      if (s.strengths.length) feedbackLines.push(`✅ Strengths: ${s.strengths.join("; ")}`);
      if (s.weaknesses.length) feedbackLines.push(`⚠️ Weaknesses: ${s.weaknesses.join("; ")}`);
      if (s.feedback) feedbackLines.push(s.feedback);
      const feedback = feedbackLines.join("\n\n");

      const { error } = await sb.from("project_section_scores").upsert(
        {
          submission_id: submissionId,
          section_id: s.section_id,
          score: s.suggested_score,
          max_score: s.max_score,
          feedback,
          graded_at: new Date().toISOString(),
          graded_by: me.id,
        },
        { onConflict: "submission_id,section_id" },
      );
      if (!error) saved++;
    }

    return { ok: true, data: { suggestions, saved } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────

export interface ProjectAnalytics {
  total: number;
  submitted: number;
  graded: number;
  late: number;
  draft: number;
  submission_rate_pct: number;
  avg_score: number | null;
  max_score: number;
  pass_rate_pct: number | null;
  pass_threshold: number;
  section_breakdown: Array<{
    section_id: string;
    label: string;
    max_points: number;
    avg_score: number | null;
    avg_percent: number | null;
    graded_count: number;
  }>;
  weakest_section: string | null;
  strongest_section: string | null;
  top_performers: Array<{
    submission_id: string;
    user_id: string;
    name: string;
    avatar_url: string | null;
    total_score: number;
    percent: number;
  }>;
  submissions_by_day: Array<{ date: string; count: number }>;
}

export async function getProjectAnalytics(
  projectId: string,
): Promise<R<ProjectAnalytics>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Admin access required." };
    }
    const sb = supabaseAdmin();

    const [projRes, subsRes] = await Promise.all([
      sb.from("projects").select("title, sections, xp_bonus_threshold").eq("id", projectId).single(),
      sb
        .from("project_submissions")
        .select(
          `id, user_id, status, total_score, submitted_at,
           users!project_submissions_user_id_fkey(name, avatar_url),
           project_section_scores(section_id, score, max_score)`,
        )
        .eq("project_id", projectId),
    ]);

    if (projRes.error || !projRes.data) return { ok: false, error: "Project not found" };
    const project = projRes.data as {
      title: string;
      sections: SectionConfig[];
      xp_bonus_threshold: number | null;
    };

    type SubRow = {
      id: string;
      user_id: string;
      status: string;
      total_score: number | null;
      submitted_at: string | null;
      users: { name: string | null; avatar_url: string | null } | null;
      project_section_scores: Array<{ section_id: string; score: number; max_score: number }> | null;
    };
    const subs = ((subsRes.data ?? []) as unknown as SubRow[]);

    const sections = project.sections ?? [];
    const maxScore = sections.reduce((s, sec) => s + sec.points, 0);
    const passThreshold = project.xp_bonus_threshold ?? Math.round(maxScore * 0.7);

    const total = subs.length;
    const draft = subs.filter((s) => s.status === "draft").length;
    const submitted = subs.filter((s) => s.status !== "draft").length;
    const graded = subs.filter((s) => s.status === "graded").length;
    const late = subs.filter((s) => s.status === "late").length;
    const submissionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

    const gradedSubs = subs.filter((s) => s.status === "graded" && s.total_score !== null);
    const avgScore =
      gradedSubs.length > 0
        ? Math.round(gradedSubs.reduce((a, s) => a + (s.total_score ?? 0), 0) / gradedSubs.length)
        : null;
    const passCount = gradedSubs.filter((s) => (s.total_score ?? 0) >= passThreshold).length;
    const passRate = gradedSubs.length > 0 ? Math.round((passCount / gradedSubs.length) * 100) : null;

    // Section breakdown: avg actual score per section across graded subs
    const sectionBreakdown = sections.map((sec) => {
      const scores: number[] = [];
      for (const sub of gradedSubs) {
        const match = (sub.project_section_scores ?? []).find((x) => x.section_id === sec.id);
        if (match) scores.push(match.score);
      }
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return {
        section_id: sec.id,
        label: sec.label,
        max_points: sec.points,
        avg_score: avg !== null ? Math.round(avg * 10) / 10 : null,
        avg_percent: avg !== null && sec.points > 0 ? Math.round((avg / sec.points) * 100) : null,
        graded_count: scores.length,
      };
    });

    const sorted = [...sectionBreakdown].filter((x) => x.avg_percent !== null);
    sorted.sort((a, b) => (a.avg_percent ?? 0) - (b.avg_percent ?? 0));
    const weakest = sorted[0]?.label ?? null;
    const strongest = sorted.length > 0 ? sorted[sorted.length - 1].label : null;

    // Top performers
    const topPerformers = gradedSubs
      .slice()
      .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
      .slice(0, 10)
      .map((s) => ({
        submission_id: s.id,
        user_id: s.user_id,
        name: s.users?.name ?? "Unknown",
        avatar_url: s.users?.avatar_url ?? null,
        total_score: s.total_score ?? 0,
        percent: maxScore > 0 ? Math.round(((s.total_score ?? 0) / maxScore) * 100) : 0,
      }));

    // Submission velocity (last 14 days)
    const today = new Date();
    const submissionsByDay: Array<{ date: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = subs.filter((s) => s.submitted_at?.slice(0, 10) === key).length;
      submissionsByDay.push({ date: key, count });
    }

    return {
      ok: true,
      data: {
        total,
        submitted,
        graded,
        late,
        draft,
        submission_rate_pct: submissionRate,
        avg_score: avgScore,
        max_score: maxScore,
        pass_rate_pct: passRate,
        pass_threshold: passThreshold,
        section_breakdown: sectionBreakdown,
        weakest_section: weakest,
        strongest_section: strongest,
        top_performers: topPerformers,
        submissions_by_day: submissionsByDay,
      },
    };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}
