"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import type { ComplianceSuspension } from "@/app/actions/compliance-types";

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
// adminSuspendUser
// ─────────────────────────────────────────────────────────────────────────────

export async function adminSuspendUser(
  userId: string,
  reason: string,
  suspendedUntil?: string,
  unpaidFineTotal?: number
): Promise<R> {
  try {
    const me = await requireSuperOrAdmin();

    if (!userId) return { ok: false, error: "User ID is required" };
    if (!reason?.trim()) return { ok: false, error: "Reason is required" };

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    // Get violation count for this user
    const { count: violationCount } = await sb
      .from("compliance_violations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // Upsert suspension — update if one already exists for this user
    const { error: suspError } = await sb.from("compliance_suspensions").upsert(
      {
        user_id: userId,
        reason: reason.trim(),
        unpaid_fine_total: unpaidFineTotal ?? 0,
        suspended_at: now,
        suspended_until: suspendedUntil || null,
        suspended_by: me.id,
        lifted_at: null,
        lifted_by: null,
        status: "active",
      },
      { onConflict: "user_id" }
    );

    if (suspError) return { ok: false, error: suspError.message };

    // Record disciplinary action
    await sb.from("compliance_disciplinary_actions").insert({
      user_id: userId,
      action_type: "suspension",
      reason: reason.trim(),
      triggered_by: "admin",
      admin_id: me.id,
      violation_count: violationCount || 0,
      overridden: false,
      created_at: now,
    });

    // Record violation
    await sb.from("compliance_violations").insert({
      user_id: userId,
      task_id: null,
      violation_type: "repeated_absence",
      severity: "severe",
      description: `Suspended: ${reason.trim()}`,
      acknowledged: false,
      created_at: now,
    });

    revalidatePath("/admin/compliance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// autoSuspendUser  (no auth — called from cron/system)
// ─────────────────────────────────────────────────────────────────────────────

export async function autoSuspendUser(
  userId: string,
  reason: string,
  unpaidFineTotal: number
): Promise<R> {
  try {
    if (!userId) return { ok: false, error: "User ID is required" };
    if (!reason?.trim()) return { ok: false, error: "Reason is required" };

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    // Only insert if no active suspension already exists
    const { data: existing } = await sb
      .from("compliance_suspensions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return { ok: false, error: "User already has an active suspension" };
    }

    const { count: violationCount } = await sb
      .from("compliance_violations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { error: suspError } = await sb.from("compliance_suspensions").insert({
      user_id: userId,
      reason: reason.trim(),
      unpaid_fine_total: unpaidFineTotal,
      suspended_at: now,
      suspended_until: null,
      suspended_by: null,
      lifted_at: null,
      lifted_by: null,
      status: "active",
    });

    if (suspError) return { ok: false, error: suspError.message };

    // Record disciplinary action with triggered_by='auto'
    await sb.from("compliance_disciplinary_actions").insert({
      user_id: userId,
      action_type: "suspension",
      reason: reason.trim(),
      triggered_by: "auto",
      admin_id: null,
      violation_count: violationCount || 0,
      overridden: false,
      created_at: now,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminLiftSuspension
// ─────────────────────────────────────────────────────────────────────────────

export async function adminLiftSuspension(userId: string): Promise<R> {
  try {
    const me = await requireSuperOrAdmin();

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    const { error } = await sb
      .from("compliance_suspensions")
      .update({
        status: "lifted",
        lifted_at: now,
        lifted_by: me.id,
      })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) return { ok: false, error: error.message };

    // Log disciplinary action noting the lift
    await sb.from("compliance_disciplinary_actions").insert({
      user_id: userId,
      action_type: "other",
      reason: "Suspension lifted by admin",
      triggered_by: "admin",
      admin_id: me.id,
      violation_count: 0,
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
// getActiveSuspension
// ─────────────────────────────────────────────────────────────────────────────

export async function getActiveSuspension(
  userId?: string
): Promise<R<ComplianceSuspension | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    // If userId provided, require admin
    if (userId && !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Only admins can view other users' suspensions" };
    }

    const targetUserId = userId || me.id;

    const { data, error } = await supabaseAdmin()
      .from("compliance_suspensions")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("status", "active")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };

    return { ok: true, data: (data as ComplianceSuspension) || null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminGetActiveSuspensions
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetActiveSuspensions(): Promise<R<ComplianceSuspension[]>> {
  try {
    const me = await requireSuperOrAdmin();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("compliance_suspensions")
      .select(
        `
        *,
        user:users(name, avatar_url)
      `
      )
      .eq("status", "active")
      .order("suspended_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    // Fetch violation counts for each suspended user
    const userIds = (
      (data || []) as Array<{ user_id: string }>
    ).map((s) => s.user_id);

    let violationCountMap = new Map<string, number>();
    if (userIds.length > 0) {
      const { data: violations } = await sb
        .from("compliance_violations")
        .select("user_id")
        .in("user_id", userIds);

      for (const v of (violations as Array<{ user_id: string }>) || []) {
        violationCountMap.set(
          v.user_id,
          (violationCountMap.get(v.user_id) || 0) + 1
        );
      }
    }

    const suspensions = (data || []).map((s) => ({
      ...(s as ComplianceSuspension),
      user_name: (s as { user?: { name?: string } }).user?.name || null,
      user_avatar: (s as { user?: { avatar_url?: string } }).user?.avatar_url || null,
      violation_count: violationCountMap.get((s as { user_id: string }).user_id) || 0,
    })) as ComplianceSuspension[];

    return { ok: true, data: suspensions };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
