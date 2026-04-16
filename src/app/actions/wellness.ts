"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { WellnessCheckin, WellnessAggregate } from "./wellness-types";

export type { WellnessCheckin, WellnessAggregate } from "./wellness-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function getWeekOf(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export async function submitCheckin(input: { mood: number; stress: number; energy: number; notes?: string }): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.mood < 1 || input.mood > 5) return { ok: false, error: "Mood must be 1–5" };
    if (input.stress < 1 || input.stress > 5) return { ok: false, error: "Stress must be 1–5" };
    if (input.energy < 1 || input.energy > 5) return { ok: false, error: "Energy must be 1–5" };
    const week_of = getWeekOf();
    const sb = supabaseAdmin();
    const { error } = await sb.from("wellness_checkins").upsert(
      { user_id: me.id, week_of, mood: input.mood, stress: input.stress, energy: input.energy, notes: input.notes || null },
      { onConflict: "user_id,week_of" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/wellness");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyCheckins(limit = 12): Promise<R<WellnessCheckin[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("wellness_checkins")
      .select("*").eq("user_id", me.id)
      .order("week_of", { ascending: false }).limit(limit);
    return { ok: true, data: (data || []) as WellnessCheckin[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function hasCheckedInThisWeek(): Promise<boolean> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return false;
    const week_of = getWeekOf();
    const sb = supabaseAdmin();
    const { count } = await sb.from("wellness_checkins").select("id", { count: "exact", head: true }).eq("user_id", me.id).eq("week_of", week_of);
    return (count || 0) > 0;
  } catch { return false; }
}

export async function adminGetWellnessAggregates(weeks = 12): Promise<R<WellnessAggregate[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin","super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);
    const { data } = await sb.from("wellness_checkins")
      .select("week_of, mood, stress, energy")
      .gte("week_of", cutoff.toISOString().slice(0, 10))
      .order("week_of", { ascending: true });
    if (!data || data.length === 0) return { ok: true, data: [] };
    type Row = { week_of: string; mood: number; stress: number; energy: number };
    const byWeek = new Map<string, Row[]>();
    for (const r of data as Row[]) {
      if (!byWeek.has(r.week_of)) byWeek.set(r.week_of, []);
      byWeek.get(r.week_of)!.push(r);
    }
    const aggs: WellnessAggregate[] = [...byWeek.entries()].map(([week_of, rows]) => ({
      week_of,
      avg_mood: +(rows.reduce((s, r) => s + r.mood, 0) / rows.length).toFixed(1),
      avg_stress: +(rows.reduce((s, r) => s + r.stress, 0) / rows.length).toFixed(1),
      avg_energy: +(rows.reduce((s, r) => s + r.energy, 0) / rows.length).toFixed(1),
      count: rows.length,
    }));
    return { ok: true, data: aggs };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
