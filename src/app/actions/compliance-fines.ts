"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { atomicWalletDebit } from "@/app/actions/payments/wallet-debit";
import type {
  ComplianceFine,
  ComplianceSuspension,
  MyComplianceStatus,
  TaskWithStatus,
  ComplianceTask,
  ComplianceTaskSubmission,
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
// getMyComplianceStatus
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyComplianceStatus(): Promise<R<MyComplianceStatus>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const now = Date.now();

    // Run all queries in parallel
    const [assignmentsRes, finesRes, suspensionRes, violationRes] = await Promise.all([
      sb
        .from("compliance_task_assignments")
        .select(
          `
          id, task_id, user_id, assigned_at, notified_at,
          task:compliance_tasks (
            id, created_by, title, description, task_type, priority,
            deadline, grace_period_minutes, fine_amount, late_fine_amount,
            submission_format, attachment_instructions, auto_reminder, auto_escalate,
            allow_late_submission, score_penalty_percent, target_roles,
            status, created_at, updated_at
          )
        `
        )
        .eq("user_id", me.id),

      sb
        .from("compliance_fines")
        .select("*, task:compliance_tasks(title)")
        .eq("user_id", me.id)
        .eq("status", "unpaid"),

      sb
        .from("compliance_suspensions")
        .select("*")
        .eq("user_id", me.id)
        .eq("status", "active")
        .maybeSingle(),

      sb
        .from("compliance_violations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", me.id),
    ]);

    // Resolve submissions for assigned tasks
    const taskAssignments = (
      (assignmentsRes.data || []) as unknown as Array<{
        task_id: string;
        task: ComplianceTask | null;
      }>
    ).filter((a) => a.task && a.task.status !== "archived");

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

    const pendingTasks: TaskWithStatus[] = taskAssignments
      .map((a) => {
        const task = a.task!;
        const submission = submissionsMap.get(task.id) || null;
        const deadlineMs = new Date(task.deadline).getTime();
        const effectiveDeadlineMs =
          deadlineMs + (task.grace_period_minutes ?? 0) * 60 * 1000;
        const is_overdue = now > effectiveDeadlineMs && !submission;
        const minutes_until_deadline = (deadlineMs - now) / 60000;

        return {
          ...task,
          has_submission: !!submission,
          submission,
          is_overdue,
          effective_deadline: new Date(effectiveDeadlineMs).toISOString(),
          minutes_until_deadline,
        };
      })
      .filter((t) => !t.has_submission);

    const unpaidFines = (finesRes.data || []).map((f) => ({
      ...(f as ComplianceFine),
      task_title: (f as { task?: { title?: string } }).task?.title || null,
    })) as ComplianceFine[];

    const totalUnpaidAmount = unpaidFines.reduce((sum, f) => sum + (f.amount || 0), 0);
    const activeSuspension = (suspensionRes.data as ComplianceSuspension) || null;
    const violationCount = violationRes.count || 0;

    const isBlocked = !!activeSuspension || unpaidFines.length > 0;
    const blockReason: MyComplianceStatus["blockReason"] = activeSuspension
      ? "suspended"
      : unpaidFines.length > 0
      ? "unpaid_fine"
      : null;

    return {
      ok: true,
      data: {
        pendingTasks,
        unpaidFines,
        totalUnpaidAmount,
        activeSuspension,
        violationCount,
        isBlocked,
        blockReason,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMyFines
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyFines(limit = 20): Promise<R<ComplianceFine[]>> {
  try {
    const me = await requireMe();

    const { data, error } = await supabaseAdmin()
      .from("compliance_fines")
      .select("*, task:compliance_tasks(title)")
      .eq("user_id", me.id)
      .order("issued_at", { ascending: false })
      .limit(limit);

    if (error) return { ok: false, error: error.message };

    const fines = (data || []).map((f) => ({
      ...(f as ComplianceFine),
      task_title: (f as { task?: { title?: string } }).task?.title || null,
    })) as ComplianceFine[];

    return { ok: true, data: fines };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// payFine
// ─────────────────────────────────────────────────────────────────────────────

export async function payFine(fineId: string, paymentRef?: string): Promise<R> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();

    // Verify ownership + fetch fine amount
    const { data: fine } = await sb
      .from("compliance_fines")
      .select("id, user_id, status, amount, task_id")
      .eq("id", fineId)
      .maybeSingle();

    if (!fine) return { ok: false, error: "Fine not found" };
    if ((fine as { user_id: string }).user_id !== me.id) {
      return { ok: false, error: "You can only pay your own fines" };
    }
    if ((fine as { status: string }).status === "paid") {
      return { ok: false, error: "This fine has already been paid" };
    }
    if ((fine as { status: string }).status === "waived") {
      return { ok: false, error: "This fine has been waived" };
    }

    const fineAmount = Number((fine as { amount: number }).amount);

    // Debit wallet atomically
    const debit = await atomicWalletDebit({
      userId: me.id,
      amount: fineAmount,
      type: "fine",
      description: `Compliance fine payment`,
      idempotencyKey: `fine-${fineId}`,
      gateway: "internal",
      metadata: { fine_id: fineId },
    });
    if (!debit.ok) return { ok: false, error: debit.error };

    const ref = paymentRef ?? `FINE-${fineId.slice(0, 8).toUpperCase()}`;

    // Mark fine as paid
    const { error } = await sb
      .from("compliance_fines")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_ref: ref,
      })
      .eq("id", fineId);

    if (error) return { ok: false, error: error.message };

    // Check remaining unpaid fines
    const { count: remainingFines } = await sb
      .from("compliance_fines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me.id)
      .eq("status", "unpaid");

    // If no more unpaid fines, check and update suspension if it was solely fine-related
    if (!remainingFines || remainingFines === 0) {
      const { data: suspension } = await sb
        .from("compliance_suspensions")
        .select("id, reason")
        .eq("user_id", me.id)
        .eq("status", "active")
        .maybeSingle();

      if (
        suspension &&
        (suspension as { reason: string }).reason?.toLowerCase().includes("unpaid fine")
      ) {
        await sb
          .from("compliance_suspensions")
          .update({ status: "lifted", lifted_at: new Date().toISOString() })
          .eq("id", (suspension as { id: string }).id);
      }
    }

    revalidatePath("/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminWaiveFine
// ─────────────────────────────────────────────────────────────────────────────

export async function adminWaiveFine(fineId: string, reason: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Only admins can waive fines" };
    }
    if (!reason?.trim()) return { ok: false, error: "Waive reason is required" };

    const { error } = await supabaseAdmin()
      .from("compliance_fines")
      .update({
        status: "waived",
        waived_by: me.id,
        waived_reason: reason.trim(),
      })
      .eq("id", fineId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminGetAllFines
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetAllFines(filters?: {
  status?: string;
  userId?: string;
}): Promise<R<ComplianceFine[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "finance"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }

    const sb = supabaseAdmin();

    let query = sb
      .from("compliance_fines")
      .select(
        `
        *,
        user:users(name),
        task:compliance_tasks(title)
      `
      )
      .order("issued_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.userId) query = query.eq("user_id", filters.userId);

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    const fines = (data || []).map((f) => ({
      ...(f as ComplianceFine),
      user_name: (f as { user?: { name?: string } }).user?.name || null,
      task_title: (f as { task?: { title?: string } }).task?.title || null,
    })) as ComplianceFine[];

    return { ok: true, data: fines };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// issueFine
// ─────────────────────────────────────────────────────────────────────────────

export async function issueFine(
  userId: string,
  taskId: string | null,
  amount: number,
  reason: string
): Promise<R<{ fineId: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions to issue fines" };
    }
    if (!userId) return { ok: false, error: "User ID is required" };
    if (amount <= 0) return { ok: false, error: "Fine amount must be greater than 0" };
    if (!reason?.trim()) return { ok: false, error: "Reason is required" };

    const sb = supabaseAdmin();

    const { data: fineData, error: fineError } = await sb
      .from("compliance_fines")
      .insert({
        user_id: userId,
        task_id: taskId || null,
        amount,
        reason: reason.trim(),
        status: "unpaid",
        issued_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (fineError) return { ok: false, error: fineError.message };

    const fineId = (fineData as { id: string }).id;

    // Determine violation type from reason
    const violationType = reason.toLowerCase().includes("missed")
      ? "missed_task"
      : reason.toLowerCase().includes("late")
      ? "late_submission"
      : reason.toLowerCase().includes("plagiar")
      ? "plagiarism"
      : reason.toLowerCase().includes("absence")
      ? "repeated_absence"
      : "other";

    // Insert corresponding violation record
    await sb.from("compliance_violations").insert({
      user_id: userId,
      task_id: taskId || null,
      violation_type: violationType,
      severity: "moderate",
      description: reason.trim(),
      acknowledged: false,
      created_at: new Date().toISOString(),
    });

    revalidatePath("/admin/compliance");
    return { ok: true, data: { fineId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
