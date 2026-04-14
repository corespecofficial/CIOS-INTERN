"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";

export interface PracticeScorecard {
  id: string;
  skill: string;
  score: number;
  rubric: Record<string, number>;
  strengths: string | null;
  improvements: string | null;
  created_at: string;
}

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

export async function saveScorecard(input: {
  skill: string;
  score: number;
  rubric?: Record<string, number>;
  strengths?: string;
  improvements?: string;
  sessionRef?: string;
}): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.skill) return { ok: false, error: "Skill required" };
    if (input.score < 0 || input.score > 100) return { ok: false, error: "Score 0-100" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("practice_scorecards").insert({
      user_id: me.id, skill: input.skill, score: input.score,
      rubric: input.rubric || {}, strengths: input.strengths || null,
      improvements: input.improvements || null, session_ref: input.sessionRef || null,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    return { ok: true, data: { id: data.id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyScorecards(limit = 30): Promise<R<PracticeScorecard[]>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("practice_scorecards")
      .select("id, skill, score, rubric, strengths, improvements, created_at")
      .eq("user_id", me.id).order("created_at", { ascending: false }).limit(limit);
    return { ok: true, data: (data || []) as PracticeScorecard[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
