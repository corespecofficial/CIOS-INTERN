"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { StartupPitch } from "./startup-types";

export type { StartupPitch } from "./startup-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };
type FounderJoin =
  | { name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }
  | Array<{ name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }>
  | null;
type PitchRow = Record<string, unknown> & { founder?: FounderJoin };

const PITCH_SELECT =
  "*, founder:users!startup_pitches_founder_id_fkey(name, avatar_url, xp, level, role)";

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

export async function listPublicPitches(opts?: { category?: string; stage?: string; limit?: number }): Promise<R<StartupPitch[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb.from("startup_pitches")
      .select(PITCH_SELECT)
      .eq("is_public", true)
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(opts?.limit || 60);
    if (opts?.category) q = q.eq("category", opts.category);
    if (opts?.stage) q = q.eq("stage", opts.stage);
    const { data } = await q;
    return { ok: true, data: ((data || []) as PitchRow[]).map(mapPitch) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getPublicPitch(id: string): Promise<R<StartupPitch>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("startup_pitches")
      .select(PITCH_SELECT)
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle();
    if (!data) return { ok: false, error: "Pitch not found" };
    sb.from("startup_pitches")
      .update({ views: ((data as { views?: number }).views ?? 0) + 1 })
      .eq("id", id)
      .then(() => {});
    return { ok: true, data: mapPitch(data as PitchRow) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyPitch(): Promise<R<StartupPitch | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("startup_pitches")
      .select(PITCH_SELECT)
      .eq("founder_id", me.id).maybeSingle();
    if (!data) return { ok: true, data: null };
    return { ok: true, data: mapPitch(data as PitchRow) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function upsertPitch(input: {
  startup_name: string; tagline: string; description: string; category: string;
  stage: string; looking_for?: string[]; website_url?: string; pitch_deck_url?: string; is_public?: boolean;
  cover_image_url?: string; country?: string; team_size?: number; founded_year?: number;
  monthly_revenue_usd?: number; raising_amount_usd?: number;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.startup_name.trim().length < 2) return { ok: false, error: "Startup name too short" };
    if (input.tagline.trim().length < 10) return { ok: false, error: "Tagline too short (min 10 chars)" };
    if (input.description.trim().length < 50) return { ok: false, error: "Description too short (min 50 chars)" };

    const sb = supabaseAdmin();
    const slug = slugify(input.startup_name);
    const { data, error } = await sb.from("startup_pitches").upsert({
      founder_id: me.id,
      startup_name: input.startup_name.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      category: input.category,
      stage: input.stage,
      looking_for: input.looking_for || [],
      website_url: input.website_url || null,
      pitch_deck_url: input.pitch_deck_url || null,
      is_public: input.is_public ?? true,
      cover_image_url: input.cover_image_url || null,
      country: input.country || null,
      team_size: input.team_size ?? null,
      founded_year: input.founded_year ?? null,
      monthly_revenue_usd: input.monthly_revenue_usd ?? null,
      raising_amount_usd: input.raising_amount_usd ?? null,
      slug,
      updated_at: new Date().toISOString(),
    }, { onConflict: "founder_id" }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    revalidatePath("/startup");
    revalidatePath("/investors");
    revalidatePath("/startups");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function expressInterest(pitchId: string, message?: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { error } = await sb.from("startup_interests").insert({ pitch_id: pitchId, user_id: me.id, message: message || null });
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Already expressed interest" };
      return { ok: false, error: error.message };
    }
    revalidatePath("/startup");
    revalidatePath(`/startups/${pitchId}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getPlatformStats(): Promise<R<{ interns: number; alumni: number; placements: number; countries: number; hackathons: number }>> {
  try {
    const sb = supabaseAdmin();
    const [internsRes, alumniRes, placementsRes, hackathonsRes] = await Promise.all([
      sb.from("users").select("id", { count: "exact", head: true }).eq("role", "intern"),
      sb.from("users").select("id", { count: "exact", head: true }).not("graduated_at", "is", null),
      sb.from("placements").select("id", { count: "exact", head: true }),
      sb.from("hackathons").select("id", { count: "exact", head: true }),
    ]);
    return {
      ok: true,
      data: {
        interns: internsRes.count || 0,
        alumni: alumniRes.count || 0,
        placements: placementsRes.count || 0,
        countries: 5,
        hackathons: hackathonsRes.count || 0,
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) + "-" + Math.random().toString(36).slice(2, 7);
}
