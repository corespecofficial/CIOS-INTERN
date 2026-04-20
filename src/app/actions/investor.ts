"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { StartupPitch } from "./startup-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface InvestorProfile {
  user_id: string;
  full_name: string;
  headline: string | null;
  country: string | null;
  linkedin_url: string | null;
  accreditation: "individual" | "family_office" | "angel_syndicate" | "fund" | "corporate_vc";
  org_name: string | null;
  cheque_min_usd: number | null;
  cheque_max_usd: number | null;
  thesis: string | null;
  preferred_categories: string[];
  preferred_stages: string[];
  preferred_geos: string[];
  portfolio_count: number;
  notable_investments: string | null;
  intro_email_optin: boolean;
  agreed_to_terms: boolean;
  approval_status: "pending" | "approved" | "suspended" | "rejected";
  onboarded_at: string;
}

const PITCH_SELECT =
  "*, founder:users!startup_pitches_founder_id_fkey(name, avatar_url, xp, level, role)";

type FounderJoin =
  | { name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }
  | Array<{ name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }>
  | null;

type PitchRow = Record<string, unknown> & { founder?: FounderJoin };

function mapPitch(r: PitchRow): StartupPitch {
  const f = Array.isArray(r.founder) ? r.founder[0] : r.founder;
  return {
    ...(r as object),
    founder_name: f?.name ?? null,
    founder_avatar: f?.avatar_url ?? null,
    founder_xp: Number(f?.xp ?? 0),
    founder_level: Number(f?.level ?? 1),
    founder_role: String(f?.role ?? "intern"),
    cover_image_url: (r.cover_image_url as string | null) ?? null,
    slug: (r.slug as string | null) ?? null,
    country: (r.country as string | null) ?? null,
    team_size: r.team_size == null ? null : Number(r.team_size),
    founded_year: r.founded_year == null ? null : Number(r.founded_year),
    monthly_revenue_usd: r.monthly_revenue_usd == null ? null : Number(r.monthly_revenue_usd),
    raising_amount_usd: r.raising_amount_usd == null ? null : Number(r.raising_amount_usd),
    is_featured: Boolean(r.is_featured ?? false),
  } as StartupPitch;
}

/* ─── Investor profile ─────────────────────────────────────────────────── */

export async function getMyInvestorProfile(): Promise<R<InvestorProfile | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("investor_profiles")
      .select("*")
      .eq("user_id", me.id)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data as InvestorProfile | null) ?? null };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function upsertInvestorProfile(input: Omit<InvestorProfile, "user_id" | "approval_status" | "onboarded_at" | "portfolio_count"> & { portfolio_count?: number }): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!input.full_name?.trim()) return { ok: false, error: "Full name required" };
    if (!input.agreed_to_terms) return { ok: false, error: "You must agree to the terms" };

    const sb = supabaseAdmin();
    // CAPTURE the upsert error — silently failing here was the cause of the
    // onboarding loop (form claimed success, layout saw no row, bounced back).
    const { error: upsertError } = await sb.from("investor_profiles").upsert({
      user_id: me.id,
      full_name: input.full_name.trim(),
      headline: input.headline || null,
      country: input.country || null,
      linkedin_url: input.linkedin_url || null,
      accreditation: input.accreditation,
      org_name: input.org_name || null,
      cheque_min_usd: input.cheque_min_usd ?? null,
      cheque_max_usd: input.cheque_max_usd ?? null,
      thesis: input.thesis || null,
      preferred_categories: input.preferred_categories ?? [],
      preferred_stages: input.preferred_stages ?? [],
      preferred_geos: input.preferred_geos ?? [],
      portfolio_count: input.portfolio_count ?? 0,
      notable_investments: input.notable_investments || null,
      intro_email_optin: input.intro_email_optin,
      agreed_to_terms: input.agreed_to_terms,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (upsertError) {
      const msg = upsertError.message || String(upsertError);
      // Most common cause in dev: the p385 migration hasn't been run yet, so
      // investor_profiles doesn't exist. Surface a clear, actionable error.
      if (msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation")) {
        return { ok: false, error: "Database not ready: please run migration p385_investors_v2.sql on Supabase, then try again." };
      }
      return { ok: false, error: msg };
    }

    // Promote the user to investor role. Best-effort — never blocks success.
    try {
      const { data: row } = await sb.from("users").select("role").eq("id", me.id).maybeSingle();
      const currentRole = (row as { role?: string } | null)?.role;
      if (currentRole && currentRole !== "admin" && currentRole !== "super_admin" && currentRole !== "investor") {
        await sb.from("users").update({ role: "investor" }).eq("id", me.id);
      }
    } catch { /* keep onboarding successful even if the role bump fails */ }

    revalidatePath("/investor");
    revalidatePath("/investor/dashboard");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── Deal flow + watchlist ────────────────────────────────────────────── */

/**
 * Investor deal flow: public pitches filtered by the investor's preferences
 * (category, stage, geo). Featured pitches surface first regardless. When the
 * investor has NO preferences, this returns the same set as listPublicPitches.
 */
export async function listInvestorDealflow(opts?: { limit?: number }): Promise<R<StartupPitch[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const sb = supabaseAdmin();
    const { data: profile } = await sb
      .from("investor_profiles")
      .select("preferred_categories, preferred_stages, preferred_geos")
      .eq("user_id", me.id)
      .maybeSingle();
    const prefs = profile as { preferred_categories?: string[]; preferred_stages?: string[]; preferred_geos?: string[] } | null;

    let q = sb.from("startup_pitches")
      .select(PITCH_SELECT)
      .eq("is_public", true)
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(opts?.limit || 60);
    if (prefs?.preferred_categories && prefs.preferred_categories.length > 0) {
      q = q.in("category", prefs.preferred_categories);
    }
    if (prefs?.preferred_stages && prefs.preferred_stages.length > 0) {
      q = q.in("stage", prefs.preferred_stages);
    }
    if (prefs?.preferred_geos && prefs.preferred_geos.length > 0) {
      q = q.in("country", prefs.preferred_geos);
    }
    const { data } = await q;
    return { ok: true, data: ((data || []) as PitchRow[]).map(mapPitch) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function addToWatchlist(pitchId: string, note?: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    await sb.from("investor_watchlist").upsert(
      { investor_id: me.id, pitch_id: pitchId, note: note || null, added_at: new Date().toISOString() },
      { onConflict: "investor_id,pitch_id" }
    );
    revalidatePath("/investor/watchlist");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function removeFromWatchlist(pitchId: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    await sb.from("investor_watchlist").delete().eq("investor_id", me.id).eq("pitch_id", pitchId);
    revalidatePath("/investor/watchlist");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyWatchlist(): Promise<R<StartupPitch[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("investor_watchlist")
      .select(`pitch:startup_pitches!investor_watchlist_pitch_id_fkey(${PITCH_SELECT})`)
      .eq("investor_id", me.id)
      .order("added_at", { ascending: false });
    type WRow = { pitch?: PitchRow | PitchRow[] | null };
    const rows = ((data || []) as WRow[]).flatMap((r) => {
      const p = Array.isArray(r.pitch) ? r.pitch[0] : r.pitch;
      return p ? [mapPitch(p)] : [];
    });
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getInvestorDashboardStats(): Promise<R<{
  watchlist: number;
  active_pitches: number;
  in_my_thesis: number;
  recent_views: number;
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [watchRes, activeRes, viewedRes, thesisRes] = await Promise.all([
      sb.from("investor_watchlist").select("pitch_id", { count: "exact", head: true }).eq("investor_id", me.id),
      sb.from("startup_pitches").select("id", { count: "exact", head: true }).eq("is_public", true).eq("status", "active"),
      sb.from("pitch_views").select("pitch_id", { count: "exact", head: true }).eq("viewer_id", me.id).gt("last_viewed", weekAgo),
      // For "in my thesis": use the dealflow filter; cheap COUNT.
      listInvestorDealflow({ limit: 200 }).then((r) => r.ok ? r.data!.length : 0),
    ]);

    return {
      ok: true,
      data: {
        watchlist: watchRes.count ?? 0,
        active_pitches: activeRes.count ?? 0,
        recent_views: viewedRes.count ?? 0,
        in_my_thesis: typeof thesisRes === "number" ? thesisRes : 0,
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
