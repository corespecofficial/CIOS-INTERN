"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import type { ComplianceAppeal } from "@/app/actions/compliance-types";
import { adminLiftSuspension } from "@/app/actions/compliance-suspensions";

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
// submitAppeal
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitAppealInput {
  intern_name: string;
  intern_id_number?: string;
  reason: string;
  explanation: string;
  evidence_url?: string;
  emergency_details?: string;
  promise_statement?: string;
  suspension_id?: string;
  violation_id?: string;
}

export async function submitAppeal(
  input: SubmitAppealInput
): Promise<R<{ appealId: string }>> {
  try {
    const me = await requireMe();

    // Validate required fields
    if (!input.reason?.trim()) return { ok: false, error: "Reason is required" };
    if (!input.explanation?.trim()) return { ok: false, error: "Explanation is required" };
    if (!input.intern_name?.trim()) return { ok: false, error: "Intern name is required" };

    const sb = supabaseAdmin();

    // Check for existing pending appeal
    const { data: existingAppeal } = await sb
      .from("compliance_appeals")
      .select("id")
      .eq("user_id", me.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingAppeal) {
      return { ok: false, error: "You already have a pending appeal" };
    }

    const { data, error } = await sb
      .from("compliance_appeals")
      .insert({
        user_id: me.id,
        suspension_id: input.suspension_id || null,
        violation_id: input.violation_id || null,
        intern_name: input.intern_name.trim(),
        intern_id_number: input.intern_id_number?.trim() || null,
        reason: input.reason.trim(),
        explanation: input.explanation.trim(),
        evidence_url: input.evidence_url || null,
        emergency_details: input.emergency_details?.trim() || null,
        promise_statement: input.promise_statement?.trim() || null,
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        admin_notes: null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    const appealId = (data as { id: string }).id;

    revalidatePath("/appeals");
    return { ok: true, data: { appealId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMyAppeals
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyAppeals(): Promise<R<ComplianceAppeal[]>> {
  try {
    const me = await requireMe();

    const { data, error } = await supabaseAdmin()
      .from("compliance_appeals")
      .select("*")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    return { ok: true, data: (data as ComplianceAppeal[]) || [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminGetAppeals
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetAppeals(filters?: {
  status?: string;
  search?: string;
}): Promise<R<ComplianceAppeal[]>> {
  try {
    await requireSuperOrAdmin();

    const sb = supabaseAdmin();

    let query = sb
      .from("compliance_appeals")
      .select(
        `
        *,
        reviewer:reviewed_by(name)
      `
      )
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.search?.trim()) {
      query = query.ilike("intern_name", `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    const appeals = (data || []).map((a) => ({
      ...(a as ComplianceAppeal),
      reviewer_name:
        (a as { reviewer?: { name?: string } }).reviewer?.name || null,
    })) as ComplianceAppeal[];

    return { ok: true, data: appeals };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminReviewAppeal
// ─────────────────────────────────────────────────────────────────────────────

export async function adminReviewAppeal(
  appealId: string,
  decision: "approved" | "rejected" | "extended" | "escalated",
  adminNotes: string
): Promise<R> {
  try {
    const me = await requireSuperOrAdmin();

    if (!adminNotes?.trim()) return { ok: false, error: "Admin notes are required" };

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    // Fetch appeal to get user_id and suspension_id
    const { data: appeal } = await sb
      .from("compliance_appeals")
      .select("id, user_id, suspension_id, status")
      .eq("id", appealId)
      .maybeSingle();

    if (!appeal) return { ok: false, error: "Appeal not found" };
    if ((appeal as { status: string }).status !== "pending") {
      return { ok: false, error: "This appeal has already been reviewed" };
    }

    // Update appeal record
    const { error } = await sb
      .from("compliance_appeals")
      .update({
        status: decision,
        reviewed_by: me.id,
        reviewed_at: now,
        admin_notes: adminNotes.trim(),
      })
      .eq("id", appealId);

    if (error) return { ok: false, error: error.message };

    // If approved, lift any associated suspension
    if (decision === "approved") {
      const targetUserId = (appeal as { user_id: string }).user_id;
      const liftResult = await adminLiftSuspension(targetUserId);
      // Non-fatal: suspension may have already been lifted or not exist
      if (!liftResult.ok) {
        console.warn(`Could not lift suspension for user ${targetUserId}: ${liftResult.error}`);
      }
    }

    // Log disciplinary action for the review
    await sb.from("compliance_disciplinary_actions").insert({
      user_id: (appeal as { user_id: string }).user_id,
      action_type: "other",
      reason: `Appeal ${decision}: ${adminNotes.trim()}`,
      triggered_by: "admin",
      admin_id: me.id,
      violation_count: 0,
      overridden: false,
      created_at: now,
    });

    revalidatePath("/admin/appeals");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminGetAppealStats
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetAppealStats(): Promise<
  R<{ pending: number; approvedToday: number; rejectedToday: number; total: number }>
> {
  try {
    await requireSuperOrAdmin();

    const sb = supabaseAdmin();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const [pendingRes, approvedTodayRes, rejectedTodayRes, totalRes] = await Promise.all([
      sb
        .from("compliance_appeals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      sb
        .from("compliance_appeals")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("reviewed_at", todayIso),

      sb
        .from("compliance_appeals")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected")
        .gte("reviewed_at", todayIso),

      sb
        .from("compliance_appeals")
        .select("id", { count: "exact", head: true }),
    ]);

    return {
      ok: true,
      data: {
        pending: pendingRes.count || 0,
        approvedToday: approvedTodayRes.count || 0,
        rejectedToday: rejectedTodayRes.count || 0,
        total: totalRes.count || 0,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
