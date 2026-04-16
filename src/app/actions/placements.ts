"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Placement, PlacementStats } from "./placement-types";
import { FLAT_FEE_NGN, PERCENTAGE_FEE } from "./placement-types";

export type { Placement, PlacementStats } from "./placement-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function calcFee(salary: number | null, feeType: "percentage" | "flat"): number {
  if (feeType === "flat") return FLAT_FEE_NGN;
  if (!salary || salary <= 0) return FLAT_FEE_NGN;
  // 5% of first month salary
  const monthly = salary / 12;
  const fee = monthly * PERCENTAGE_FEE;
  return Math.max(fee, FLAT_FEE_NGN); // minimum flat fee
}

export async function confirmHireAndCreatePlacement(
  interviewId: string,
  opts: { startingSalary?: number; feeType?: "percentage" | "flat"; notes?: string }
): Promise<R<{ id: string; fee: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["recruiter", "admin", "super_admin"].includes(me.role)) return { ok: false, error: "Recruiters only" };

    const sb = supabaseAdmin();
    // Get interview + candidate info
    const { data: interview } = await sb.from("interviews")
      .select("id, application_id, status")
      .eq("id", interviewId).maybeSingle();
    if (!interview) return { ok: false, error: "Interview not found" };
    const iv = interview as { id: string; application_id: string; status: string };

    // Get application to find candidate
    const { data: app } = await sb.from("opportunity_applications")
      .select("user_id, opportunity_id")
      .eq("id", iv.application_id).maybeSingle();
    if (!app) return { ok: false, error: "Application not found" };
    const a = app as { user_id: string; opportunity_id: string };

    // Get opportunity title/company for job_title
    const { data: opp } = await sb.from("opportunities")
      .select("title, company").eq("id", a.opportunity_id).maybeSingle();
    void opp;

    const feeType = opts.feeType || "percentage";
    const fee = calcFee(opts.startingSalary || null, feeType);
    const now = new Date().toISOString();

    // Mark interview as hire confirmed
    await sb.from("interviews").update({
      hire_confirmed_at: now,
      starting_salary: opts.startingSalary || null,
      placement_note: opts.notes || null,
    }).eq("id", interviewId);

    // Update application status to hired
    await sb.from("opportunity_applications").update({ status: "hired" }).eq("id", iv.application_id);

    // Create placement record
    const { data: placement, error } = await sb.from("placements").insert({
      interview_id: interviewId,
      recruiter_id: me.id,
      candidate_id: a.user_id,
      starting_salary: opts.startingSalary || null,
      hire_confirmed_at: now,
      placement_fee: fee,
      fee_type: feeType,
      notes: opts.notes || null,
    }).select("id").single();

    if (error || !placement) return { ok: false, error: error?.message || "Failed to create placement" };

    revalidatePath("/recruiter/placements");
    revalidatePath("/recruiter/interviews");
    return { ok: true, data: { id: (placement as { id: string }).id, fee } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyPlacements(): Promise<R<Placement[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data } = await sb.from("placements")
      .select(`
        *,
        candidate:users!placements_candidate_id_fkey(name, avatar_url),
        interview:interviews!placements_interview_id_fkey(
          application_id,
          application:opportunity_applications!interviews_application_id_fkey(
            opportunity:opportunities!opportunity_applications_opportunity_id_fkey(title, company)
          )
        )
      `)
      .eq("recruiter_id", me.id)
      .order("hire_confirmed_at", { ascending: false });

    type Row = Record<string, unknown>;
    const rows: Placement[] = ((data || []) as Row[]).map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate as { name?: string | null; avatar_url?: string | null } | null;
      const iv = Array.isArray(r.interview) ? r.interview[0] : r.interview as Record<string, unknown> | null;
      const appRow = iv ? (Array.isArray(iv.application) ? iv.application[0] : iv.application) as Record<string, unknown> | null : null;
      const oppRow = appRow ? (Array.isArray(appRow.opportunity) ? appRow.opportunity[0] : appRow.opportunity) as { title?: string; company?: string } | null : null;
      return {
        ...r,
        candidate_name: c?.name || null,
        candidate_avatar: c?.avatar_url || null,
        job_title: oppRow?.title || null,
        company_name: oppRow?.company || null,
      } as Placement;
    });

    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getPlacementStats(): Promise<R<PlacementStats>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("placements").select("placement_fee, fee_status, starting_salary").eq("recruiter_id", me.id);
    const rows = (data || []) as Array<{ placement_fee: number | null; fee_status: string; starting_salary: number | null }>;
    const stats: PlacementStats = {
      total_placements: rows.length,
      total_fees_pending: rows.filter((r) => r.fee_status === "pending" || r.fee_status === "invoiced").reduce((s, r) => s + (r.placement_fee || 0), 0),
      total_fees_paid: rows.filter((r) => r.fee_status === "paid").reduce((s, r) => s + (r.placement_fee || 0), 0),
      avg_salary: rows.length > 0 ? rows.reduce((s, r) => s + (r.starting_salary || 0), 0) / rows.filter(r => r.starting_salary).length || 0 : 0,
    };
    return { ok: true, data: stats };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updatePlacementFeeStatus(
  placementId: string,
  status: "pending" | "invoiced" | "paid" | "waived"
): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("placements").select("recruiter_id").eq("id", placementId).maybeSingle();
    if (!existing) return { ok: false, error: "Placement not found" };
    if ((existing as { recruiter_id: string }).recruiter_id !== me.id && !["admin","super_admin","finance"].includes(me.role))
      return { ok: false, error: "Not authorized" };
    await sb.from("placements").update({ fee_status: status, updated_at: new Date().toISOString() }).eq("id", placementId);
    revalidatePath("/recruiter/placements");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function adminListAllPlacements(): Promise<R<Placement[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin","super_admin","finance"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("placements")
      .select("*, candidate:users!placements_candidate_id_fkey(name,avatar_url)")
      .order("hire_confirmed_at", { ascending: false })
      .limit(100);
    type Row = Record<string, unknown>;
    const rows: Placement[] = ((data || []) as Row[]).map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate as { name?: string | null; avatar_url?: string | null } | null;
      return { ...r, candidate_name: c?.name || null, candidate_avatar: c?.avatar_url || null, job_title: null, company_name: null } as Placement;
    });
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
