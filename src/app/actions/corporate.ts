"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface CorporateOrg {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  industry: string | null;
  size_range: string | null;
  owner_id: string;
  subscription_tier: "trial" | "starter" | "pro" | "enterprise";
  subscription_status: "trialing" | "active" | "past_due" | "cancelled";
  seat_limit: number;
  monthly_fee_ngn: number;
  trial_ends_at: string | null;
  created_at: string;
}

export interface CorporateEmployee {
  id: string;
  org_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: "employee" | "manager" | "admin";
  department: string | null;
  status: "invited" | "active" | "suspended" | "removed";
  invited_at: string;
  joined_at: string | null;
}

export interface CorporateProgram {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  course_ids: string[];
  is_mandatory: boolean;
  deadline_at: string | null;
  created_at: string;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function getMyOrg(): Promise<R<CorporateOrg | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("corporate_orgs").select("*").eq("owner_id", me.id).maybeSingle();
    return { ok: true, data: (data ?? null) as CorporateOrg | null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createOrg(input: {
  name: string;
  industry?: string;
  size_range?: string;
  logo_url?: string;
}): Promise<R<CorporateOrg>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: existing } = await sb.from("corporate_orgs").select("id").eq("owner_id", me.id).maybeSingle();
    if (existing) return { ok: false, error: "You already have an organization" };

    let slug = slugify(input.name);
    let attempts = 0;
    while (attempts < 5) {
      const { data: slugTaken } = await sb.from("corporate_orgs").select("id").eq("slug", slug).maybeSingle();
      if (!slugTaken) break;
      slug = `${slugify(input.name)}-${Math.floor(Math.random() * 9999)}`;
      attempts++;
    }

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    const { data, error } = await sb
      .from("corporate_orgs")
      .insert({
        name: input.name,
        slug,
        industry: input.industry ?? null,
        size_range: input.size_range ?? null,
        logo_url: input.logo_url ?? null,
        owner_id: me.id,
        subscription_tier: "trial",
        subscription_status: "trialing",
        seat_limit: 10,
        trial_ends_at: trialEnds.toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/corporate");
    return { ok: true, data: data as CorporateOrg };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listEmployees(orgId: string): Promise<R<CorporateEmployee[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: org } = await sb.from("corporate_orgs").select("owner_id").eq("id", orgId).maybeSingle();
    if (!org || (org as { owner_id: string }).owner_id !== me.id) {
      return { ok: false, error: "Unauthorized" };
    }

    const { data, error } = await sb
      .from("corporate_employees")
      .select("*")
      .eq("org_id", orgId)
      .order("invited_at", { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as CorporateEmployee[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function inviteEmployee(orgId: string, input: {
  email: string;
  full_name?: string;
  department?: string;
  role?: "employee" | "manager";
}): Promise<R<CorporateEmployee>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: org } = await sb.from("corporate_orgs").select("owner_id, seat_limit").eq("id", orgId).maybeSingle();
    if (!org || (org as { owner_id: string }).owner_id !== me.id) {
      return { ok: false, error: "Unauthorized" };
    }

    const { count } = await sb
      .from("corporate_employees")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("status", "eq", "removed");
    if ((count ?? 0) >= (org as { seat_limit: number }).seat_limit) {
      return { ok: false, error: `Seat limit reached (${(org as { seat_limit: number }).seat_limit}). Upgrade your plan.` };
    }

    const { data, error } = await sb
      .from("corporate_employees")
      .insert({
        org_id: orgId,
        email: input.email.toLowerCase().trim(),
        full_name: input.full_name ?? null,
        department: input.department ?? null,
        role: input.role ?? "employee",
        status: "invited",
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/corporate");
    return { ok: true, data: data as CorporateEmployee };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listPrograms(orgId: string): Promise<R<CorporateProgram[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: org } = await sb.from("corporate_orgs").select("owner_id").eq("id", orgId).maybeSingle();
    if (!org || (org as { owner_id: string }).owner_id !== me.id) {
      return { ok: false, error: "Unauthorized" };
    }
    const { data, error } = await sb
      .from("corporate_programs")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as CorporateProgram[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createProgram(orgId: string, input: {
  title: string;
  description?: string;
  course_ids: string[];
  is_mandatory?: boolean;
  deadline_at?: string;
}): Promise<R<CorporateProgram>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: org } = await sb.from("corporate_orgs").select("owner_id").eq("id", orgId).maybeSingle();
    if (!org || (org as { owner_id: string }).owner_id !== me.id) {
      return { ok: false, error: "Unauthorized" };
    }
    const { data, error } = await sb
      .from("corporate_programs")
      .insert({
        org_id: orgId,
        title: input.title,
        description: input.description ?? null,
        course_ids: input.course_ids,
        is_mandatory: input.is_mandatory ?? false,
        deadline_at: input.deadline_at ?? null,
        created_by: me.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/corporate");
    return { ok: true, data: data as CorporateProgram };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
