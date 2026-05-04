"use server";

/**
 * Saves the visitor-welcome carousel answers onto the user's row so
 * the visitor dashboard, super-admin queue and future recommendation
 * surfaces can use them. Stored under signup_signals.visitor_prefs to
 * piggyback on the existing JSONB column from p392 — no new schema.
 */

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";

export interface VisitorPreferences {
  interests: string[];
  tracks: string[];
}

export async function saveVisitorPreferences(prefs: VisitorPreferences): Promise<{ ok: boolean; error?: string }> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const sb = supabaseAdmin();
    const { data: row } = await sb.from("users").select("signup_signals").eq("id", me.id).maybeSingle();
    const current = (row as { signup_signals?: Record<string, unknown> } | null)?.signup_signals ?? {};

    const next = {
      ...current,
      visitor_prefs: {
        interests: prefs.interests.slice(0, 16),
        tracks: prefs.tracks.slice(0, 16),
        completed_at: new Date().toISOString(),
      },
    };

    await sb.from("users").update({ signup_signals: next }).eq("id", me.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
