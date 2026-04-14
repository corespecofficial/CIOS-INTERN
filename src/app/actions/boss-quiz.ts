"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { awardXP } from "@/lib/gamification";
import { getEngagementFeatures } from "@/app/actions/engagement-v2";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface BossAttempt {
  user_id: string; name: string | null; avatar_url: string | null;
  score: number; duration_sec: number; created_at: string; rank: number;
}

/** Can the current user attempt this boss quiz right now? Returns remaining
 *  cooldown in seconds if not. */
export async function getBossCooldown(moduleId: string): Promise<R<{ ready: boolean; secondsLeft: number; lastScore: number | null }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    const cooldownMs = (features.bossQuizCooldownMin || 60) * 60_000;

    const sb = supabaseAdmin();
    const { data: last } = await sb.from("boss_quiz_attempts")
      .select("created_at, score").eq("user_id", me.id).eq("module_id", moduleId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!last) return { ok: true, data: { ready: true, secondsLeft: 0, lastScore: null } };
    const l = last as { created_at: string; score: number };
    const elapsed = Date.now() - new Date(l.created_at).getTime();
    const left = Math.max(0, cooldownMs - elapsed);
    return { ok: true, data: { ready: left === 0, secondsLeft: Math.ceil(left / 1000), lastScore: l.score } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function submitBossAttempt(moduleId: string, score: number, durationSec: number, passed: boolean): Promise<R<{ xp: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const sb = supabaseAdmin();
    const { data: mod } = await sb.from("course_modules")
      .select("course_id, bonus_xp").eq("id", moduleId).maybeSingle();
    if (!mod) return { ok: false, error: "Module not found" };
    const m = mod as { course_id: string; bonus_xp: number };

    await sb.from("boss_quiz_attempts").insert({
      user_id: me.id, module_id: moduleId, course_id: m.course_id,
      score, passed, duration_sec: Math.max(0, durationSec),
    });

    let xp = 0;
    if (passed) {
      xp = (m.bonus_xp || 0) + (score === 100 ? 30 : 0);
      if (xp > 0) {
        const { data: u } = await sb.from("users").select("xp").eq("id", me.id).maybeSingle();
        await sb.from("users").update({ xp: ((u?.xp as number) || 0) + xp }).eq("id", me.id);
      }
      awardXP(me.id, "perfect_quiz", { refType: "boss_quiz", refId: moduleId, force: false }).catch(() => {});
    }
    revalidatePath("/courses");
    return { ok: true, data: { xp } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getBossLeaderboard(moduleId: string, limit = 10): Promise<R<BossAttempt[]>> {
  try {
    const sb = supabaseAdmin();
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data } = await sb.from("boss_quiz_attempts")
      .select("user_id, score, duration_sec, created_at, user:user_id(name, avatar_url)")
      .eq("module_id", moduleId).eq("passed", true)
      .gte("created_at", weekAgo)
      .order("score", { ascending: false })
      .order("duration_sec", { ascending: true })
      .limit(limit);

    const seen = new Set<string>();
    const rows: BossAttempt[] = [];
    let rank = 0;
    for (const r of (data || []) as Array<{ user_id: string; score: number; duration_sec: number; created_at: string; user?: { name: string | null; avatar_url: string | null } | Array<{ name: string | null; avatar_url: string | null }> | null }>) {
      if (seen.has(r.user_id)) continue; // top attempt per user only
      seen.add(r.user_id);
      rank++;
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      rows.push({
        user_id: r.user_id, name: u?.name || null, avatar_url: u?.avatar_url || null,
        score: r.score, duration_sec: r.duration_sec, created_at: r.created_at, rank,
      });
    }
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
