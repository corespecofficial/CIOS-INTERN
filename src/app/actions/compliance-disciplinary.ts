"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import type {
  DisciplinaryAction,
  DisciplinaryActionType,
  AdminComplianceStats,
} from "@/app/actions/compliance-types";
import { autoSuspendUser } from "@/app/actions/compliance-suspensions";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function requireSuperOrAdmin() {
  const me = await requireMe();
  if (!["admin", "super_admin"].includes(me.role)) {
    throw new Error("Only admins can perform this action");
  }
  return me;
}

// ─────────────────────────────────────────────────────────────────────────────
// evaluateAndActOnUser  (no auth — called from cron/system)
// ─────────────────────────────────────────────────────────────────────────────

export async function evaluateAndActOnUser(
  userId: string
): Promise<R<{ action: DisciplinaryActionType; reason: string }>> {
  try {
    if (!userId) return { ok: false, error: "User ID is required" };

    const sb = supabaseAdmin();
    const now = new Date().toISOString();
    const automaticFinancialPenaltiesEnabled = false;

    // Run parallel queries
    const [violationRes, finesRes, priorActionsRes] = await Promise.all([
      sb
        .from("compliance_violations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),

      sb
        .from("compliance_fines")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "unpaid"),

      sb
        .from("compliance_disciplinary_actions")
        .select("action_type")
        .eq("user_id", userId),
    ]);

    const violations = violationRes.count || 0;
    const unpaidFines = finesRes.data as Array<{ amount: number }> | null;
    const unpaidTotal = (unpaidFines || []).reduce((sum, f) => sum + (f.amount || 0), 0);
    const priorActions = (
      priorActionsRes.data as Array<{ action_type: string }> | null
    ) || [];
    const hasPriorSuspension = priorActions.some((a) => a.action_type === "suspension");
    const priorActionCount = priorActions.length;

    // ── Rule engine ──────────────────────────────────────────────────────────
    let action: DisciplinaryActionType;
    let reason: string;

    if (violations >= 8) {
      action = "other";
      reason = `Termination recommended: ${violations} violations recorded (admin approval required)`;
    } else if (violations >= 6) {
      action = "other"; // final_review
      reason = `Final review required: ${violations} violations recorded`;
    } else if (violations >= 4) {
      action = "other";
      reason = `Suspension review recommended: ${violations} violations recorded (admin approval required)`;
    } else if (automaticFinancialPenaltiesEnabled && unpaidTotal > 0 && violations >= 2) {
      action = "fine";
      reason = `Fine increase applied: unpaid fines of ₦${unpaidTotal} with ${violations} violations`;
      // Multiply each unpaid fine by 1.5
      const { data: fineRows } = await sb
        .from("compliance_fines")
        .select("id, amount")
        .eq("user_id", userId)
        .eq("status", "unpaid");

      if (fineRows && fineRows.length > 0) {
        for (const f of fineRows as Array<{ id: string; amount: number }>) {
          await sb
            .from("compliance_fines")
            .update({ amount: Math.ceil(f.amount * 1.5) })
            .eq("id", f.id);
        }
      }
    } else if (violations >= 2 && violations <= 3 && !hasPriorSuspension) {
      action = "written_notice";
      reason = `Access restriction / written notice: ${violations} violations with no prior suspension`;
    } else {
      action = "warning";
      reason = `Warning issued: ${violations} violation${violations === 1 ? "" : "s"} recorded`;
    }

    // Insert disciplinary action record
    await sb.from("compliance_disciplinary_actions").insert({
      user_id: userId,
      action_type: action,
      reason,
      triggered_by: "auto",
      admin_id: null,
      violation_count: violations,
      overridden: false,
      created_at: now,
    });

    return { ok: true, data: { action, reason } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminApplyDisciplinaryAction
// ─────────────────────────────────────────────────────────────────────────────

export async function adminApplyDisciplinaryAction(
  userId: string,
  actionType: DisciplinaryActionType,
  reason: string
): Promise<R> {
  try {
    const me = await requireSuperOrAdmin();

    if (!userId) return { ok: false, error: "User ID is required" };
    if (!reason?.trim()) return { ok: false, error: "Reason is required" };

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    // Get current violation count
    const { count: violations } = await sb
      .from("compliance_violations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // Insert disciplinary action
    const { error } = await sb.from("compliance_disciplinary_actions").insert({
      user_id: userId,
      action_type: actionType,
      reason: reason.trim(),
      triggered_by: "admin",
      admin_id: me.id,
      violation_count: violations || 0,
      overridden: false,
      created_at: now,
    });

    if (error) return { ok: false, error: error.message };

    // Side-effects based on action type
    if (actionType === "suspension") {
      const suspendResult = await autoSuspendUser(userId, reason.trim(), 0);
      if (!suspendResult.ok) {
        // Non-fatal — suspension may already exist
        console.warn(`Suspension note for ${userId}: ${suspendResult.error}`);
      }
    }

    if (actionType === "ban") {
      const banResult = await adminBanUser(userId, reason.trim(), `Admin action: ${actionType}`);
      if (!banResult.ok) return banResult;
    }

    revalidatePath("/admin/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminGetDisciplinaryHistory
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetDisciplinaryHistory(
  userId: string
): Promise<R<DisciplinaryAction[]>> {
  try {
    await requireSuperOrAdmin();

    if (!userId) return { ok: false, error: "User ID is required" };

    const { data, error } = await supabaseAdmin()
      .from("compliance_disciplinary_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    return { ok: true, data: (data as DisciplinaryAction[]) || [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminBanUser
// ─────────────────────────────────────────────────────────────────────────────

export async function adminBanUser(
  userId: string,
  reason: string,
  violationSummary: string
): Promise<R> {
  try {
    const me = await requireSuperOrAdmin();

    if (!userId) return { ok: false, error: "User ID is required" };
    if (!reason?.trim()) return { ok: false, error: "Reason is required" };

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    // Fetch user record for email and clerk_id
    const { data: user } = await sb
      .from("users")
      .select("id, email, clerk_id, name, role")
      .eq("id", userId)
      .maybeSingle();

    if (!user) return { ok: false, error: "User not found" };

    const userRecord = user as {
      id: string;
      email: string;
      clerk_id: string;
      name: string;
      role: string;
    };

    // Insert banned user record
    const { error: banError } = await sb.from("compliance_banned_users").insert({
      user_id: userId,
      banned_by: me.id,
      reason: reason.trim(),
      violation_summary: violationSummary?.trim() || null,
      banned_at: now,
      email: userRecord.email || null,
      clerk_id: userRecord.clerk_id || null,
      identity_markers: {
        name: userRecord.name,
        role: userRecord.role,
        banned_by_id: me.id,
      },
    });

    if (banError) return { ok: false, error: banError.message };

    // Attempt to update user role to 'banned' (non-fatal)
    try {
      await sb.from("users").update({ role: "banned" }).eq("id", userId);
    } catch (roleErr) {
      console.warn(
        `Could not update user role to banned: ${
          roleErr instanceof Error ? roleErr.message : String(roleErr)
        }`
      );
    }

    // Mark any active suspension as escalated
    await sb
      .from("compliance_suspensions")
      .update({ status: "escalated" } as Record<string, unknown>)
      .eq("user_id", userId)
      .eq("status", "active");

    // Log termination disciplinary action
    const { count: violations } = await sb
      .from("compliance_violations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    await sb.from("compliance_disciplinary_actions").insert({
      user_id: userId,
      action_type: "ban",
      reason: reason.trim(),
      triggered_by: "admin",
      admin_id: me.id,
      violation_count: violations || 0,
      overridden: false,
      created_at: now,
    });

    revalidatePath("/admin/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// checkUserBanned  (no auth — used during sign-in checks)
// ─────────────────────────────────────────────────────────────────────────────

export async function checkUserBanned(email: string): Promise<boolean> {
  try {
    if (!email) return false;

    const { data } = await supabaseAdmin()
      .from("compliance_banned_users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminGetAdminComplianceStats
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetAdminComplianceStats(): Promise<R<AdminComplianceStats>> {
  try {
    await requireSuperOrAdmin();

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all stat queries in parallel
    const [
      totalTasksRes,
      activeTasksRes,
      missedTodayRes,
      unpaidFinesCountRes,
      unpaidFinesAmountRes,
      activeSuspensionsRes,
      pendingAppealsRes,
      atRiskViolationsRes,
    ] = await Promise.all([
      // totalTasks: all non-archived tasks
      sb
        .from("compliance_tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "archived"),

      // activeTasks: active tasks with future deadline
      sb
        .from("compliance_tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("deadline", now),

      // missedToday: violations created today
      sb
        .from("compliance_violations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayIso),

      // totalUnpaidFines: count of unpaid fines
      sb
        .from("compliance_fines")
        .select("id", { count: "exact", head: true })
        .eq("status", "unpaid"),

      // unpaidFineAmount: sum of unpaid fine amounts
      sb
        .from("compliance_fines")
        .select("amount")
        .eq("status", "unpaid"),

      // activeSuspensions: count active suspensions
      sb
        .from("compliance_suspensions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      // pendingAppeals: count pending appeals
      sb
        .from("compliance_appeals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      // atRiskUsers: violations in last 7 days for counting distinct users with 3+
      sb
        .from("compliance_violations")
        .select("user_id")
        .gte("created_at", sevenDaysAgo),
    ]);

    // Compute unpaid fine total amount
    const unpaidFineAmount = (
      (unpaidFinesAmountRes.data as Array<{ amount: number }> | null) || []
    ).reduce((sum, f) => sum + (f.amount || 0), 0);

    // Compute at-risk users: distinct users with 3+ violations in last 7 days
    const violationsByUser = new Map<string, number>();
    for (const v of (atRiskViolationsRes.data as Array<{ user_id: string }> | null) || []) {
      violationsByUser.set(v.user_id, (violationsByUser.get(v.user_id) || 0) + 1);
    }
    const atRiskUsers = Array.from(violationsByUser.values()).filter((count) => count >= 3).length;

    return {
      ok: true,
      data: {
        totalTasks: totalTasksRes.count || 0,
        activeTasks: activeTasksRes.count || 0,
        missedToday: missedTodayRes.count || 0,
        totalUnpaidFines: unpaidFinesCountRes.count || 0,
        unpaidFineAmount,
        activeSuspensions: activeSuspensionsRes.count || 0,
        pendingAppeals: pendingAppealsRes.count || 0,
        atRiskUsers,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
