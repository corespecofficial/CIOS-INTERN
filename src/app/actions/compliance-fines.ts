"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { createFlutterwaveCheckout } from "@/lib/flutterwave";
import { pushNotification } from "@/app/actions/notifications";
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
    const submissionsMap = new Map<string, ComplianceTaskSubmission>();

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

export async function payFine(fineId: string): Promise<R<{ checkoutUrl: string; reference: string }>> {
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
    if (!me.email) return { ok: false, error: "Add an email address before paying this fine" };
    const reference = `CIOS-FINE-${fineId.replace(/-/g, "").slice(0, 10).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";
    const { data: intent, error } = await sb.from("payment_intents").insert({
      user_id: me.id, org_id: null, amount_ngn: fineAmount, currency: "NGN",
      purpose: "fine_payment", description: "CIOS compliance fine payment",
      reference, gateway: "flutterwave", status: "pending",
      product_type: "compliance_fine", product_id: fineId,
      metadata: { fine_id: fineId, customer_email: me.email, workspace: "root" },
    }).select("id").single();
    if (error || !intent) return { ok: false, error: error?.message || "Unable to create payment" };
    const checkoutUrl = await createFlutterwaveCheckout({
      txRef: reference, amount: fineAmount, currency: "NGN",
      redirectUrl: `${appUrl}/compliance?payment_ref=${encodeURIComponent(reference)}`,
      customer: { email: me.email, name: me.name },
      description: "CIOS compliance fine",
      meta: { payment_intent_id: intent.id, purpose: "fine_payment", fine_id: fineId },
    });
    await sb.from("payment_intents").update({ checkout_url: checkoutUrl, updated_at: new Date().toISOString() }).eq("id", intent.id);
    return { ok: true, data: { checkoutUrl, reference } };
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
// ESCALATING FINE SCHEDULE
// Tier 1 (1st offense): ₦500
// Tier 2 (2nd offense): ₦1,000
// Tier 3 (3rd+ offense): ₦1,500
// Late submission track: ₦300 → ₦600 → ₦900
// ─────────────────────────────────────────────────────────────────────────────

const ESCALATING_AMOUNTS = [500, 1000, 1500];
const LATE_ESCALATING_AMOUNTS = [300, 600, 900];

function getEscalatedAmount(offenseNumber: number, isLateSubmission: boolean): number {
  const schedule = isLateSubmission ? LATE_ESCALATING_AMOUNTS : ESCALATING_AMOUNTS;
  const idx = Math.min(offenseNumber - 1, schedule.length - 1);
  return schedule[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// issueFine
// ─────────────────────────────────────────────────────────────────────────────

export async function issueFine(
  userId: string,
  taskId: string | null,
  amount: number,
  reason: string,
  options?: {
    nonMonetaryConsequence?: string;
    consequenceNote?: string;
    useEscalation?: boolean; // if true, override amount with escalating schedule
  }
): Promise<R<{ fineId: string; offenseNumber: number; escalatedAmount: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "moderator"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions to issue fines" };
    }
    if (!userId) return { ok: false, error: "User ID is required" };
    if (!reason?.trim()) return { ok: false, error: "Reason is required" };

    const sb = supabaseAdmin();

    // Count prior non-waived offenses to determine escalation tier
    const { count: priorOffenses } = await sb
      .from("compliance_fines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "waived");

    const offenseNumber = (priorOffenses ?? 0) + 1;
    const isLateSubmission = reason.toLowerCase().includes("late");

    const finalAmount = options?.useEscalation
      ? getEscalatedAmount(offenseNumber, isLateSubmission)
      : amount > 0
      ? amount
      : getEscalatedAmount(offenseNumber, isLateSubmission);

    const { data: fineData, error: fineError } = await sb
      .from("compliance_fines")
      .insert({
        user_id: userId,
        task_id: taskId || null,
        amount: finalAmount,
        reason: reason.trim(),
        status: "unpaid",
        issued_at: new Date().toISOString(),
        offense_number: offenseNumber,
        non_monetary_consequence: options?.nonMonetaryConsequence ?? null,
        consequence_status: options?.nonMonetaryConsequence ? "pending" : null,
        consequence_note: options?.consequenceNote ?? null,
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

    const severity: "minor" | "moderate" | "major" | "critical" =
      offenseNumber >= 4 ? "critical"
      : offenseNumber === 3 ? "major"
      : offenseNumber === 2 ? "moderate"
      : "minor";

    await sb.from("compliance_violations").insert({
      user_id: userId,
      task_id: taskId || null,
      violation_type: violationType,
      severity,
      description: reason.trim(),
      acknowledged: false,
      created_at: new Date().toISOString(),
    });

    // Notify the user immediately so they know they've been fined
    pushNotification({
      userId,
      type: "fine",
      title: `💸 Fine Issued — ₦${finalAmount.toLocaleString()}`,
      message: `Offense #${offenseNumber}: ${reason.trim().slice(0, 120)}. Visit Compliance to review or pay.`,
      actionUrl: "/compliance",
    }).catch(() => {});

    revalidatePath("/admin/compliance");
    return { ok: true, data: { fineId, offenseNumber, escalatedAmount: finalAmount } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateConsequenceStatus — mark a non-monetary consequence fulfilled/waived
// ─────────────────────────────────────────────────────────────────────────────

export async function updateConsequenceStatus(
  fineId: string,
  status: "fulfilled" | "waived",
  note?: string
): Promise<R> {
  try {
    const me = await requireAdmin();
    const { error } = await supabaseAdmin()
      .from("compliance_fines")
      .update({
        consequence_status: status,
        consequence_note: note ?? null,
      })
      .eq("id", fineId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
