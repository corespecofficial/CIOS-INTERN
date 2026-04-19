"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface KeyResult {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  completed: boolean;
  order_index: number;
}

export interface OKR {
  id: string;
  user_id: string;
  objective: string;
  period: "weekly" | "monthly" | "quarterly";
  period_start: string;
  period_end: string;
  status: "active" | "completed" | "abandoned";
  progress_pct: number;
  created_at: string;
  key_results: KeyResult[];
}

function periodDates(period: "weekly" | "monthly" | "quarterly"): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date;
  if (period === "weekly") {
    const dow = now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() - ((dow + 6) % 7)); // Monday
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 0);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function listMyOkrs(): Promise<R<OKR[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("okrs")
      .select("*, key_results:okr_key_results(*)")
      .eq("user_id", me.id)
      .order("period_end", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Array<OKR & { key_results: KeyResult[] }>;
    return {
      ok: true,
      data: rows.map((r) => ({
        ...r,
        key_results: (r.key_results || []).sort((a, b) => a.order_index - b.order_index),
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createOkr(input: {
  objective: string;
  period: "weekly" | "monthly" | "quarterly";
  key_results: { description: string; target: number; unit?: string }[];
}): Promise<R<OKR>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (input.key_results.length === 0 || input.key_results.length > 5) {
      return { ok: false, error: "1–5 key results required" };
    }
    const sb = supabaseAdmin();
    const { start, end } = periodDates(input.period);

    const { data: okr, error } = await sb
      .from("okrs")
      .insert({
        user_id: me.id,
        objective: input.objective,
        period: input.period,
        period_start: start,
        period_end: end,
        status: "active",
      })
      .select("*")
      .single();
    if (error) throw error;

    const okrId = (okr as OKR).id;
    await sb.from("okr_key_results").insert(
      input.key_results.map((kr, i) => ({
        okr_id: okrId,
        description: kr.description,
        target: kr.target,
        unit: kr.unit ?? "count",
        order_index: i,
      }))
    );
    revalidatePath("/okrs");
    return { ok: true, data: okr as OKR };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateKrProgress(krId: string, current: number): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: kr } = await sb
      .from("okr_key_results")
      .select("id, target, okr:okrs(user_id, id)")
      .eq("id", krId)
      .maybeSingle();
    type KrJoin = { id: string; target: number; okr: { user_id: string; id: string } | null };
    const row = kr as KrJoin | null;
    if (!row || row.okr?.user_id !== me.id) return { ok: false, error: "Not found" };

    const completed = current >= row.target;
    await sb.from("okr_key_results").update({ current, completed }).eq("id", krId);

    const { data: allKrs } = await sb.from("okr_key_results").select("current, target, completed").eq("okr_id", row.okr!.id);
    const krList = (allKrs ?? []) as Array<{ current: number; target: number; completed: boolean }>;
    const totalPct = krList.length === 0 ? 0 : Math.round(krList.reduce((s, k) => s + Math.min(100, (Number(k.current) / Number(k.target || 1)) * 100), 0) / krList.length);
    const allDone = krList.every((k) => k.completed);
    await sb
      .from("okrs")
      .update({ progress_pct: totalPct, status: allDone ? "completed" : "active", updated_at: new Date().toISOString() })
      .eq("id", row.okr!.id);

    revalidatePath("/okrs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteOkr(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    await sb.from("okrs").delete().eq("id", id).eq("user_id", me.id);
    revalidatePath("/okrs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
