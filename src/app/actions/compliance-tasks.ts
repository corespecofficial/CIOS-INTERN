"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";
import type {
  ComplianceTask,
  ComplianceTaskAssignment,
  ComplianceTaskSubmission,
  TaskWithStatus,
} from "@/app/actions/compliance-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const ADMIN_ROLES = ["admin", "super_admin", "moderator", "team_lead", "instructor"];

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function requireAdmin() {
  const me = await requireMe();
  if (!ADMIN_ROLES.includes(me.role)) throw new Error("Insufficient permissions");
  return me;
}

// ─────────────────────────────────────────────────────────────────────────────
// createComplianceTask
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateComplianceTaskInput {
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  deadline: string; // ISO string
  grace_period_minutes: number;
  fine_amount: number;
  late_fine_amount?: number;
  submission_format?: string;
  attachment_instructions?: string;
  auto_reminder: boolean;
  auto_escalate: boolean;
  allow_late_submission: boolean;
  score_penalty_percent: number;
  target_roles: string[];
  assigned_user_ids: string[];
}

export async function createComplianceTask(
  input: CreateComplianceTaskInput
): Promise<R<{ id: string }>> {
  try {
    const me = await requireAdmin();

    if (!input.title?.trim()) return { ok: false, error: "Title is required" };
    if (!input.deadline) return { ok: false, error: "Deadline is required" };
    if (input.assigned_user_ids.length === 0) {
      return { ok: false, error: "At least one assigned user is required" };
    }

    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("compliance_tasks")
      .insert({
        created_by: me.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        task_type: input.task_type,
        priority: input.priority,
        deadline: input.deadline,
        grace_period_minutes: input.grace_period_minutes ?? 0,
        fine_amount: input.fine_amount ?? 0,
        late_fine_amount: input.late_fine_amount ?? null,
        submission_format: input.submission_format || null,
        attachment_instructions: input.attachment_instructions || null,
        auto_reminder: input.auto_reminder ?? false,
        auto_escalate: input.auto_escalate ?? false,
        allow_late_submission: input.allow_late_submission ?? true,
        score_penalty_percent: input.score_penalty_percent ?? 0,
        target_roles: input.target_roles ?? [],
        status: "active",
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    const taskId = (data as { id: string }).id;

    // Bulk insert assignments
    const assignments = input.assigned_user_ids.map((userId) => ({
      task_id: taskId,
      user_id: userId,
      assigned_at: new Date().toISOString(),
    }));

    const { error: assignError } = await sb
      .from("compliance_task_assignments")
      .insert(assignments);

    if (assignError) {
      // Roll back task if assignments fail
      await sb.from("compliance_tasks").delete().eq("id", taskId);
      return { ok: false, error: `Failed to assign task: ${assignError.message}` };
    }

    // Notify each assigned user about their new task
    const deadline = new Date(input.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    for (const userId of input.assigned_user_ids) {
      pushNotification({
        userId,
        type: "task",
        title: `📋 New Task: ${input.title.trim().slice(0, 80)}`,
        message: `You've been assigned a ${input.priority} priority task due ${deadline}. Open Compliance to view details.`,
        actionUrl: "/compliance",
      }).catch(() => {});
    }

    revalidatePath("/admin/compliance");
    return { ok: true, data: { id: taskId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMyAssignedTasks
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyAssignedTasks(): Promise<R<TaskWithStatus[]>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();

    // Fetch assignments joined with tasks (exclude archived)
    const { data: assignments, error } = await sb
      .from("compliance_task_assignments")
      .select(
        `
        id,
        task_id,
        user_id,
        assigned_at,
        notified_at,
        task:compliance_tasks (
          id, created_by, title, description, task_type, priority,
          deadline, grace_period_minutes, fine_amount, late_fine_amount,
          submission_format, attachment_instructions, auto_reminder, auto_escalate,
          allow_late_submission, score_penalty_percent, target_roles,
          status, created_at, updated_at
        )
      `
      )
      .eq("user_id", me.id)
      .neq("task.status", "archived");

    if (error) return { ok: false, error: error.message };

    const taskAssignments = (
      assignments as unknown as Array<ComplianceTaskAssignment & { task: ComplianceTask | null }>
    ).filter((a) => a.task && a.task.status !== "archived");

    // Fetch all submissions for this user in one query
    const taskIds = taskAssignments.map((a) => a.task_id);
    let submissionsMap = new Map<string, ComplianceTaskSubmission>();

    if (taskIds.length > 0) {
      const { data: subs } = await sb
        .from("compliance_task_submissions")
        .select("*")
        .eq("user_id", me.id)
        .in("task_id", taskIds);

      for (const sub of (subs as ComplianceTaskSubmission[]) || []) {
        submissionsMap.set(sub.task_id, sub);
      }
    }

    const now = Date.now();

    const result: TaskWithStatus[] = taskAssignments.map((a) => {
      const task = a.task!;
      const submission = submissionsMap.get(task.id) || null;

      const deadlineMs = new Date(task.deadline).getTime();
      const effectiveDeadlineMs =
        deadlineMs + (task.grace_period_minutes ?? 0) * 60 * 1000;
      const effectiveDeadline = new Date(effectiveDeadlineMs).toISOString();
      const is_overdue = now > effectiveDeadlineMs && !submission;
      const minutes_until_deadline = (deadlineMs - now) / 60000;

      return {
        ...task,
        has_submission: !!submission,
        submission,
        is_overdue,
        effective_deadline: effectiveDeadline,
        minutes_until_deadline,
      };
    });

    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getAdminTasks
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminTasks(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<R<ComplianceTask[]>> {
  try {
    await requireAdmin();
    const sb = supabaseAdmin();

    let query = sb
      .from("compliance_tasks")
      .select(
        `
        *,
        assignment_count:compliance_task_assignments(count),
        submission_count:compliance_task_submissions(count)
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.priority) {
      query = query.eq("priority", filters.priority);
    }
    if (filters?.search?.trim()) {
      query = query.ilike("title", `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    return { ok: true, data: (data as ComplianceTask[]) || [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getTaskDetail
// ─────────────────────────────────────────────────────────────────────────────

export async function getTaskDetail(
  taskId: string
): Promise<
  R<
    ComplianceTask & {
      assignments: ComplianceTaskAssignment[];
      mySubmission: ComplianceTaskSubmission | null;
    }
  >
> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const isAdmin = ADMIN_ROLES.includes(me.role);

    // If intern, verify they are assigned
    if (!isAdmin) {
      const { data: assignment } = await sb
        .from("compliance_task_assignments")
        .select("id")
        .eq("task_id", taskId)
        .eq("user_id", me.id)
        .maybeSingle();

      if (!assignment) return { ok: false, error: "Task not found or not assigned to you" };
    }

    const { data: task, error: taskError } = await sb
      .from("compliance_tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError || !task) return { ok: false, error: "Task not found" };

    const { data: assignments } = await sb
      .from("compliance_task_assignments")
      .select("*")
      .eq("task_id", taskId);

    const { data: mySubmission } = await sb
      .from("compliance_task_submissions")
      .select("*")
      .eq("task_id", taskId)
      .eq("user_id", me.id)
      .maybeSingle();

    return {
      ok: true,
      data: {
        ...(task as ComplianceTask),
        assignments: (assignments as ComplianceTaskAssignment[]) || [],
        mySubmission: (mySubmission as ComplianceTaskSubmission) || null,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// submitTaskWork
// ─────────────────────────────────────────────────────────────────────────────

export async function submitTaskWork(
  taskId: string,
  input: { content?: string; file_url?: string; link_url?: string }
): Promise<R> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();

    // Verify assignment
    const { data: assignment } = await sb
      .from("compliance_task_assignments")
      .select("id")
      .eq("task_id", taskId)
      .eq("user_id", me.id)
      .maybeSingle();

    if (!assignment) return { ok: false, error: "You are not assigned to this task" };

    // Fetch task details
    const { data: task } = await sb
      .from("compliance_tasks")
      .select("deadline, grace_period_minutes, allow_late_submission, auto_escalate, status")
      .eq("id", taskId)
      .maybeSingle();

    if (!task) return { ok: false, error: "Task not found" };
    if (task.status === "archived" || task.status === "cancelled") {
      return { ok: false, error: "This task is no longer active" };
    }

    // Check existing submission
    const { data: existing } = await sb
      .from("compliance_task_submissions")
      .select("id, status")
      .eq("task_id", taskId)
      .eq("user_id", me.id)
      .maybeSingle();

    if (existing && (existing as { status: string }).status === "approved") {
      return { ok: false, error: "Your submission has already been approved" };
    }

    const now = Date.now();
    const deadlineMs = new Date(task.deadline).getTime();
    const effectiveDeadlineMs = deadlineMs + (task.grace_period_minutes ?? 0) * 60 * 1000;
    const is_late = now > effectiveDeadlineMs;
    const minutes_late = is_late ? Math.floor((now - effectiveDeadlineMs) / 60000) : 0;

    if (is_late && !task.allow_late_submission) {
      return { ok: false, error: "Late submissions are not allowed for this task" };
    }

    const submissionPayload = {
      task_id: taskId,
      user_id: me.id,
      content: input.content || null,
      file_url: input.file_url || null,
      link_url: input.link_url || null,
      submitted_at: new Date().toISOString(),
      is_late,
      minutes_late,
      status: is_late ? ("pending" as const) : ("pending" as const),
    };

    if (existing) {
      await sb
        .from("compliance_task_submissions")
        .update(submissionPayload)
        .eq("id", (existing as { id: string }).id);
    } else {
      await sb.from("compliance_task_submissions").insert(submissionPayload);
    }

    // If auto_escalate is on and user had a fine for this task, partially address it
    if (task.auto_escalate) {
      await sb
        .from("compliance_fines")
        .update({ status: "disputed" })
        .eq("task_id", taskId)
        .eq("user_id", me.id)
        .eq("status", "unpaid");
    }

    // Award XP for on-time submission
    if (!is_late) {
      // Try RPC first (increment_xp stored proc), fall back to read-then-write
      try {
        await sb.rpc("increment_xp", { user_id: me.id, amount: 50 });
      } catch {
        const { data: userRow } = await sb
          .from("users")
          .select("xp")
          .eq("id", me.id)
          .maybeSingle();
        if (userRow) {
          await sb
            .from("users")
            .update({ xp: ((userRow as { xp: number }).xp || 0) + 50 })
            .eq("id", me.id);
        }
      }
    }

    revalidatePath("/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminReviewSubmission
// ─────────────────────────────────────────────────────────────────────────────

export async function adminReviewSubmission(
  submissionId: string,
  status: "approved" | "rejected" | "needs_revision",
  feedback?: string
): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "instructor"].includes(me.role)) {
      return { ok: false, error: "Only admins and instructors can review submissions" };
    }

    const sb = supabaseAdmin();

    const { error } = await sb
      .from("compliance_task_submissions")
      .update({
        status,
        admin_feedback: feedback || null,
        reviewed_by: me.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteComplianceTask
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteComplianceTask(taskId: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Only admins can delete tasks" };
    }

    const { error } = await supabaseAdmin()
      .from("compliance_tasks")
      .update({ status: "archived" })
      .eq("id", taskId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
