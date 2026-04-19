"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface Partner {
  id: string;
  agency_name: string;
  slug: string;
  subdomain: string | null;
  brand_color: string;
  contact_email: string | null;
  website: string | null;
  revenue_share_pct: number;
  status: "pending" | "active" | "suspended";
}

export interface PartnerClient {
  id: string;
  partner_id: string;
  client_org_name: string;
  client_contact: string | null;
  tier: "starter" | "pro" | "growth" | "enterprise";
  monthly_mrr_ngn: number;
  status: "active" | "churned" | "paused";
  signed_at: string;
}

export interface PartnerPayout {
  id: string;
  period_start: string;
  period_end: string;
  total_gross_ngn: number;
  share_ngn: number;
  status: "pending" | "paid" | "failed";
  paid_at: string | null;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function getMyPartner(): Promise<R<Partner | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("partners").select("*").eq("owner_id", me.id).maybeSingle();
    return { ok: true, data: (data ?? null) as Partner | null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function applyAsPartner(input: { agency_name: string; contact_email: string; website?: string }): Promise<R<Partner>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: exists } = await sb.from("partners").select("id").eq("owner_id", me.id).maybeSingle();
    if (exists) return { ok: false, error: "You already have a partner application" };

    let slug = slugify(input.agency_name);
    const { data: slugTaken } = await sb.from("partners").select("id").eq("slug", slug).maybeSingle();
    if (slugTaken) slug = `${slug}-${Math.floor(Math.random() * 9999)}`;

    const { data, error } = await sb
      .from("partners")
      .insert({
        owner_id: me.id,
        agency_name: input.agency_name,
        slug,
        contact_email: input.contact_email,
        website: input.website ?? null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/partners");
    return { ok: true, data: data as Partner };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listPartnerClients(partnerId: string): Promise<R<PartnerClient[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("partners").select("owner_id").eq("id", partnerId).maybeSingle();
    if (!p || (p as { owner_id: string }).owner_id !== me.id) return { ok: false, error: "Unauthorized" };
    const { data, error } = await sb.from("partner_clients").select("*").eq("partner_id", partnerId).order("signed_at", { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as PartnerClient[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function addClient(partnerId: string, input: { client_org_name: string; client_contact?: string; tier: PartnerClient["tier"]; monthly_mrr_ngn: number }): Promise<R<PartnerClient>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("partners").select("owner_id, status").eq("id", partnerId).maybeSingle();
    if (!p || (p as { owner_id: string }).owner_id !== me.id) return { ok: false, error: "Unauthorized" };
    if ((p as { status: string }).status !== "active") return { ok: false, error: "Your partner account must be active before adding clients" };

    const { data, error } = await sb
      .from("partner_clients")
      .insert({
        partner_id: partnerId,
        client_org_name: input.client_org_name,
        client_contact: input.client_contact ?? null,
        tier: input.tier,
        monthly_mrr_ngn: input.monthly_mrr_ngn,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/partners");
    return { ok: true, data: data as PartnerClient };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listPartnerPayouts(partnerId: string): Promise<R<PartnerPayout[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("partners").select("owner_id").eq("id", partnerId).maybeSingle();
    if (!p || (p as { owner_id: string }).owner_id !== me.id) return { ok: false, error: "Unauthorized" };
    const { data, error } = await sb.from("partner_payouts").select("*").eq("partner_id", partnerId).order("period_end", { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as PartnerPayout[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
