"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface Institution {
  id: string;
  name: string;
  slug: string;
  kind: "university" | "polytechnic" | "college" | "high_school" | "ngo" | "agency";
  country: string;
  state: string | null;
  city: string | null;
  coordinator_id: string;
  seat_limit: number;
  status: "active" | "suspended" | "pending";
  created_at: string;
}

export interface InstitutionStudent {
  id: string;
  institution_id: string;
  user_id: string | null;
  matric_number: string;
  full_name: string;
  email: string | null;
  department: string | null;
  level: string | null;
  year: number | null;
  placement_company: string | null;
  siwes_status: "not_started" | "placed" | "in_progress" | "completed" | "failed";
  compliance_score: number;
  reports_submitted: number;
  hours_logged: number;
  invited_at: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function getMyInstitution(): Promise<R<Institution | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("institutions").select("*").eq("coordinator_id", me.id).maybeSingle();
    return { ok: true, data: (data ?? null) as Institution | null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createInstitution(input: {
  name: string;
  kind: Institution["kind"];
  state?: string;
  city?: string;
}): Promise<R<Institution>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("institutions").select("id").eq("coordinator_id", me.id).maybeSingle();
    if (existing) return { ok: false, error: "You already have an institution" };

    let slug = slugify(input.name);
    const { data: slugTaken } = await sb.from("institutions").select("id").eq("slug", slug).maybeSingle();
    if (slugTaken) slug = `${slug}-${Math.floor(Math.random() * 9999)}`;

    const { data, error } = await sb
      .from("institutions")
      .insert({
        name: input.name,
        slug,
        kind: input.kind,
        country: "NG",
        state: input.state ?? null,
        city: input.city ?? null,
        coordinator_id: me.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/institution");
    return { ok: true, data: data as Institution };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listInstitutionStudents(institutionId: string): Promise<R<InstitutionStudent[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: inst } = await sb.from("institutions").select("coordinator_id").eq("id", institutionId).maybeSingle();
    if (!inst || (inst as { coordinator_id: string }).coordinator_id !== me.id) {
      return { ok: false, error: "Unauthorized" };
    }
    const { data, error } = await sb.from("institution_students").select("*").eq("institution_id", institutionId).order("matric_number");
    if (error) throw error;
    return { ok: true, data: (data ?? []) as InstitutionStudent[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function bulkImportStudents(institutionId: string, rows: Array<{ matric: string; name: string; email?: string; department?: string; level?: string; year?: number }>): Promise<R<{ imported: number; skipped: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: inst } = await sb.from("institutions").select("coordinator_id, seat_limit").eq("id", institutionId).maybeSingle();
    if (!inst || (inst as { coordinator_id: string }).coordinator_id !== me.id) {
      return { ok: false, error: "Unauthorized" };
    }

    const { count } = await sb
      .from("institution_students")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId);
    const remaining = (inst as { seat_limit: number }).seat_limit - (count ?? 0);
    if (rows.length > remaining) {
      return { ok: false, error: `Only ${remaining} seats left (you tried to add ${rows.length}).` };
    }

    let imported = 0, skipped = 0;
    for (const r of rows) {
      if (!r.matric || !r.name) { skipped++; continue; }
      const { error } = await sb.from("institution_students").insert({
        institution_id: institutionId,
        matric_number: r.matric.trim(),
        full_name: r.name.trim(),
        email: r.email?.trim() ?? null,
        department: r.department ?? null,
        level: r.level ?? null,
        year: r.year ?? null,
        siwes_status: "not_started",
      });
      if (error) skipped++;
      else imported++;
    }
    revalidatePath("/institution");
    return { ok: true, data: { imported, skipped } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getInstitutionStats(institutionId: string): Promise<R<{
  total: number;
  placed: number;
  in_progress: number;
  completed: number;
  avg_compliance: number;
  total_reports: number;
  total_hours: number;
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: inst } = await sb.from("institutions").select("coordinator_id").eq("id", institutionId).maybeSingle();
    if (!inst || (inst as { coordinator_id: string }).coordinator_id !== me.id) {
      return { ok: false, error: "Unauthorized" };
    }
    const { data: students } = await sb.from("institution_students").select("siwes_status, compliance_score, reports_submitted, hours_logged").eq("institution_id", institutionId);
    type Row = { siwes_status: string; compliance_score: number; reports_submitted: number; hours_logged: number };
    const rows = (students ?? []) as Row[];
    const total = rows.length;
    const placed = rows.filter((s) => s.siwes_status === "placed" || s.siwes_status === "in_progress").length;
    const in_progress = rows.filter((s) => s.siwes_status === "in_progress").length;
    const completed = rows.filter((s) => s.siwes_status === "completed").length;
    const avg_compliance = total === 0 ? 0 : Math.round(rows.reduce((s, x) => s + x.compliance_score, 0) / total);
    const total_reports = rows.reduce((s, x) => s + x.reports_submitted, 0);
    const total_hours = rows.reduce((s, x) => s + x.hours_logged, 0);
    return { ok: true, data: { total, placed, in_progress, completed, avg_compliance, total_reports, total_hours } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
