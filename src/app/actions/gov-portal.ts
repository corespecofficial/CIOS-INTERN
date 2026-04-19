"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface GovAgency {
  id: string;
  code: string;
  name: string;
  country: string;
}

export interface GovOfficer {
  id: string;
  user_id: string;
  agency_id: string;
  agency_code: string;
  agency_name: string;
  role_title: string | null;
  region: string | null;
  status: "pending" | "active" | "suspended";
}

export interface NationalStats {
  total_interns: number;
  active_institutions: number;
  active_companies: number;
  certificates_issued: number;
  compliant_percentage: number;
  top_states: { state: string; count: number }[];
}

export async function listAgencies(): Promise<R<GovAgency[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("gov_agencies").select("*").eq("active", true).order("code");
    if (error) throw error;
    return { ok: true, data: (data ?? []) as GovAgency[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getMyOfficerProfile(): Promise<R<GovOfficer | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("gov_officers")
      .select("*, agency:gov_agencies(code, name)")
      .eq("user_id", me.id)
      .maybeSingle();
    if (!data) return { ok: true, data: null };
    type Row = GovOfficer & { agency: { code: string; name: string } | null };
    const r = data as Row;
    return {
      ok: true,
      data: { ...r, agency_code: r.agency?.code ?? "", agency_name: r.agency?.name ?? "" },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function requestOfficerAccess(input: {
  agency_id: string;
  role_title?: string;
  officer_id?: string;
  region?: string;
}): Promise<R<GovOfficer>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("gov_officers")
      .insert({
        user_id: me.id,
        agency_id: input.agency_id,
        role_title: input.role_title ?? null,
        officer_id: input.officer_id ?? null,
        region: input.region ?? null,
        status: "pending",
      })
      .select("*, agency:gov_agencies(code, name)")
      .single();
    if (error) throw error;
    type Row = GovOfficer & { agency: { code: string; name: string } | null };
    const r = data as Row;
    return { ok: true, data: { ...r, agency_code: r.agency?.code ?? "", agency_name: r.agency?.name ?? "" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getNationalStats(): Promise<R<NationalStats>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: officer } = await sb.from("gov_officers").select("status").eq("user_id", me.id).maybeSingle();
    const isAdmin = ["admin", "super_admin"].includes(me.role);
    if (!isAdmin && (!officer || (officer as { status: string }).status !== "active")) {
      return { ok: false, error: "Government officer access required" };
    }

    const [internsRes, instRes, compRes, certsRes, placementsRes] = await Promise.all([
      sb.from("users").select("id", { count: "exact", head: true }).eq("role", "intern"),
      sb.from("institutions").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("company_orgs").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("certificates").select("id", { count: "exact", head: true }),
      sb.from("institution_students").select("siwes_status"),
    ]);

    const placements = (placementsRes.data ?? []) as Array<{ siwes_status: string }>;
    const compliantCount = placements.filter((p) => p.siwes_status === "completed" || p.siwes_status === "in_progress").length;
    const compliantPct = placements.length > 0 ? Math.round((compliantCount / placements.length) * 100) : 0;

    return {
      ok: true,
      data: {
        total_interns: Number(internsRes.count ?? 0),
        active_institutions: Number(instRes.count ?? 0),
        active_companies: Number(compRes.count ?? 0),
        certificates_issued: Number(certsRes.count ?? 0),
        compliant_percentage: compliantPct,
        top_states: [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
