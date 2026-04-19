"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface CompanyOrg {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  industry: string | null;
  size_range: string | null;
  owner_id: string;
  hq_city: string | null;
  hq_country: string;
  website: string | null;
  verified: boolean;
  accredited: boolean;
  intern_capacity: number;
  status: "active" | "suspended" | "pending";
}

export interface CompanyPlacement {
  id: string;
  company_id: string;
  intern_id: string;
  intern_name: string;
  intern_avatar: string | null;
  supervisor_id: string | null;
  role_title: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "active" | "completed" | "terminated";
  recommend_hire: boolean | null;
  created_at: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function getMyCompany(): Promise<R<CompanyOrg | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("company_orgs").select("*").eq("owner_id", me.id).maybeSingle();
    return { ok: true, data: (data ?? null) as CompanyOrg | null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createCompany(input: {
  name: string;
  industry?: string;
  size_range?: string;
  hq_city?: string;
  website?: string;
}): Promise<R<CompanyOrg>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: existing } = await sb.from("company_orgs").select("id").eq("owner_id", me.id).maybeSingle();
    if (existing) return { ok: false, error: "You already have a company" };

    let slug = slugify(input.name);
    const { data: slugTaken } = await sb.from("company_orgs").select("id").eq("slug", slug).maybeSingle();
    if (slugTaken) slug = `${slug}-${Math.floor(Math.random() * 9999)}`;

    const { data, error } = await sb
      .from("company_orgs")
      .insert({
        name: input.name,
        slug,
        industry: input.industry ?? null,
        size_range: input.size_range ?? null,
        hq_city: input.hq_city ?? null,
        website: input.website ?? null,
        owner_id: me.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/company-portal");
    return { ok: true, data: data as CompanyOrg };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listCompanyPlacements(companyId: string): Promise<R<CompanyPlacement[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: c } = await sb.from("company_orgs").select("owner_id").eq("id", companyId).maybeSingle();
    if (!c || (c as { owner_id: string }).owner_id !== me.id) return { ok: false, error: "Unauthorized" };

    const { data, error } = await sb
      .from("company_placements")
      .select("*, intern:users!company_placements_intern_id_fkey(name, avatar_url)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    type Row = Omit<CompanyPlacement, "intern_name" | "intern_avatar"> & { intern: { name: string | null; avatar_url: string | null } | null };
    const placements: CompanyPlacement[] = ((data ?? []) as Row[]).map((p) => ({
      ...p,
      intern_name: p.intern?.name ?? "Intern",
      intern_avatar: p.intern?.avatar_url ?? null,
    }));
    return { ok: true, data: placements };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function submitEvaluation(input: {
  placement_id: string;
  stage: "midterm" | "final";
  technical: number;
  punctuality: number;
  communication: number;
  initiative: number;
  teamwork: number;
  professionalism: number;
  comments?: string;
  recommend_hire?: "yes" | "no" | "maybe";
}): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    // Verify permission
    const { data: p } = await sb
      .from("company_placements")
      .select("id, company_id, supervisor_id, company:company_orgs(owner_id)")
      .eq("id", input.placement_id)
      .maybeSingle();
    type PRow = { id: string; company_id: string; supervisor_id: string | null; company: { owner_id: string } | null };
    const pr = p as PRow | null;
    if (!pr) return { ok: false, error: "Placement not found" };
    const isOwner = pr.company?.owner_id === me.id;
    const isSupervisor = pr.supervisor_id === me.id;
    if (!isOwner && !isSupervisor) return { ok: false, error: "Unauthorized" };

    const { error } = await sb.from("supervisor_evaluations").upsert(
      {
        placement_id: input.placement_id,
        evaluator_id: me.id,
        stage: input.stage,
        technical: input.technical,
        punctuality: input.punctuality,
        communication: input.communication,
        initiative: input.initiative,
        teamwork: input.teamwork,
        professionalism: input.professionalism,
        comments: input.comments ?? null,
        recommend_hire: input.recommend_hire ?? null,
      },
      { onConflict: "placement_id,stage" }
    );
    if (error) throw error;

    if (input.stage === "final" && input.recommend_hire) {
      await sb
        .from("company_placements")
        .update({ recommend_hire: input.recommend_hire === "yes" })
        .eq("id", input.placement_id);
    }

    revalidatePath("/company-portal");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
