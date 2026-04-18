"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";
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
      .select(`*, users!project_submissions_user_id_fkey(full_name, avatar_url), project_section_scores(id)`)
      .eq("project_id", projectId)
      .order("submitted_at", { ascending: false });

    if (filters?.status) q = q.eq("status", filters.status);

    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };

    let rows = (data ?? []).map((row: Record<string, unknown>) => {
      const user = row.users as { full_name: string; avatar_url: string | null } | null;
      const scores = row.project_section_scores as { id: string }[] | null;
      const { users: _u, project_section_scores: _s, ...rest } = row;
      void _u; void _s;
      return {
        ...(rest as ProjectSubmission),
        submitter: user ?? { full_name: "Unknown", avatar_url: null },
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
      .select(`*, users!project_submissions_user_id_fkey(full_name, avatar_url), projects!project_submissions_project_id_fkey(title, sections)`)
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

    const user = data.users as { full_name: string; avatar_url: string | null } | null;
    const project = data.projects as { title: string; sections: SectionConfig[] } | null;
    const { users: _u, projects: _p, ...rest } = data;
    void _u; void _p;

    return {
      ok: true,
      data: {
        ...(rest as ProjectSubmission),
        section_scores: (scores ?? []) as ProjectSectionScore[],
        submitter: user,
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
