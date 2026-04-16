"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { StartupPitch } from "./startup-types";

export type { StartupPitch } from "./startup-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };
type FounderJoin = { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> | null;
type PitchRow = Record<string, unknown> & { founder?: FounderJoin };

function mapPitch(r: PitchRow): StartupPitch {
  const f = Array.isArray(r.founder) ? r.founder[0] : r.founder;
  return { ...r, founder_name: f?.name || null, founder_avatar: f?.avatar_url || null } as StartupPitch;
}

export async function listPublicPitches(opts?: { category?: string; stage?: string; limit?: number }): Promise<R<StartupPitch[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb.from("startup_pitches")
      .select("*, founder:users!startup_pitches_founder_id_fkey(name,avatar_url)")
      .eq("is_public", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(opts?.limit || 50);
    if (opts?.category) q = q.eq("category", opts.category);
    if (opts?.stage) q = q.eq("stage", opts.stage);
    const { data } = await q;
    return { ok: true, data: ((data || []) as PitchRow[]).map(mapPitch) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyPitch(): Promise<R<StartupPitch | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("startup_pitches")
      .select("*, founder:users!startup_pitches_founder_id_fkey(name,avatar_url)")
      .eq("founder_id", me.id).maybeSingle();
    if (!data) return { ok: true, data: null };
    return { ok: true, data: mapPitch(data as PitchRow) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function upsertPitch(input: {
  startup_name: string; tagline: string; description: string; category: string;
  stage: string; looking_for?: string[]; website_url?: string; pitch_deck_url?: string; is_public?: boolean;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.startup_name.trim().length < 2) return { ok: false, error: "Startup name too short" };
    if (input.tagline.trim().length < 10) return { ok: false, error: "Tagline too short (min 10 chars)" };
    if (input.description.trim().length < 50) return { ok: false, error: "Description too short (min 50 chars)" };
    const sb = supabaseAdmin();
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
      updated_at: new Date().toISOString(),
    }, { onConflict: "founder_id" }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    revalidatePath("/startup");
    revalidatePath("/investors");
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
        countries: 5, // static for now — Nigeria, Ghana, Kenya, South Africa, Cameroon
        hackathons: hackathonsRes.count || 0,
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
