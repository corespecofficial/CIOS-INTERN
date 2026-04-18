"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { awardXP } from "@/lib/gamification";

type R<T = void> = { ok: true; data: T } | { ok: false; error: string };

const ADMIN_ROLES = ["admin", "super_admin"];

// ─────────────────────────────────────────────────────────────────────────────
// Tier thresholds
// ─────────────────────────────────────────────────────────────────────────────
const TIER_THRESHOLDS = [
  { tier: "diamond", min: 96 },
  { tier: "gold",    min: 88 },
  { tier: "silver",  min: 75 },
  { tier: "bronze",  min: 60 },
  { tier: "none",    min: 0  },
] as const;

function scoreToTier(score: number): string {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) return t.tier;
  }
  return "none";
}

// ─────────────────────────────────────────────────────────────────────────────
// computeFaithfulnessScore — based on last 30 days task + attendance data
// Returns 0–100
// ─────────────────────────────────────────────────────────────────────────────

async function computeFaithfulnessScore(userId: string): Promise<number> {
  const sb = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceISO = since.toISOString();

  const [assignmentsRes, submissionsRes] = await Promise.all([
    // Total tasks assigned in last 30 days
    sb.from("compliance_task_assignments")
      .select("task_id", { count: "exact", head: false })
      .eq("user_id", userId)
      .gte("assigned_at", sinceISO),

    // On-time submissions in last 30 days
    sb.from("compliance_task_submissions")
      .select("id, is_late", { count: "exact", head: false })
      .eq("user_id", userId)
      .gte("submitted_at", sinceISO),
  ]);

  const totalAssigned = assignmentsRes.data?.length ?? 0;
  const submissions = submissionsRes.data ?? [];
  const totalSubmitted = submissions.length;
  const onTimeSubmitted = submissions.filter((s) => !s.is_late).length;

  if (totalAssigned === 0) return 0;

  // Score = (submitted / assigned) * 70 + (on_time / submitted) * 30
  const submissionRate = totalSubmitted / totalAssigned;
  const onTimeRate = totalSubmitted > 0 ? onTimeSubmitted / totalSubmitted : 0;
  const score = submissionRate * 70 + onTimeRate * 30;

  return Math.min(100, Math.round(score * 100) / 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// recomputeAllFaithfulnessTiers — batch update all intern scores + tier badges
// Run this from a cron job weekly (e.g. Monday 6 AM)
// ─────────────────────────────────────────────────────────────────────────────

export async function recomputeAllFaithfulnessTiers(): Promise<R<{ updated: number }>> {
  try {
    const sb = supabaseAdmin();

    const { data: interns } = await sb
      .from("users")
      .select("id")
      .in("role", ["intern", "team_lead"]);

    if (!interns?.length) return { ok: true, data: { updated: 0 } };

    let updated = 0;

    // Process in parallel batches of 20
    const batchSize = 20;
    for (let i = 0; i < interns.length; i += batchSize) {
      const batch = interns.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (u) => {
          const score = await computeFaithfulnessScore(u.id);
          const tier = scoreToTier(score);
          await sb
            .from("users")
            .update({ faithfulness_score: score, faithfulness_tier: tier })
            .eq("id", u.id);
          updated++;
        })
      );
    }

    return { ok: true, data: { updated } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getFaithfulLeaderboard — top 20 by faithfulness_score (No Public Shaming: cap at 20)
// ─────────────────────────────────────────────────────────────────────────────

export interface FaithfulRow {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  faithfulnessScore: number;
  faithfulnessTier: string;
  streak: number;
  rank: number;
}

export async function getFaithfulLeaderboard(): Promise<FaithfulRow[]> {
  try {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("id, name, avatar_url, role, faithfulness_score, faithfulness_tier, streak")
      .in("role", ["intern", "team_lead"])
      .order("faithfulness_score", { ascending: false })
      .limit(20); // Hard cap — no public shaming of lower ranks

    return (data ?? []).map((u, i) => ({
      id: u.id as string,
      name: u.name as string,
      avatarUrl: u.avatar_url as string | null,
      role: u.role as string,
      faithfulnessScore: Number(u.faithfulness_score ?? 0),
      faithfulnessTier: (u.faithfulness_tier as string) || "none",
      streak: Number(u.streak ?? 0),
      rank: i + 1,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// nominateEagleOfWeek — admin nominates an intern as Eagle of the Week
// ─────────────────────────────────────────────────────────────────────────────

export async function nominateEagleOfWeek(
  userId: string,
  reason: string
): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!ADMIN_ROLES.includes(me.role)) return { ok: false, error: "Admins only" };

    // Get Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToMon);
    const weekOf = monday.toISOString().slice(0, 10); // YYYY-MM-DD

    const sb = supabaseAdmin();

    // Check if already awarded this week
    const { data: existing } = await sb
      .from("eagle_of_week")
      .select("id")
      .eq("week_of", weekOf)
      .maybeSingle();

    if (existing) return { ok: false, error: "Eagle of the Week already awarded for this week" };

    const { data, error } = await sb
      .from("eagle_of_week")
      .insert({
        user_id: userId,
        week_of: weekOf,
        xp_awarded: 300,
        nominated_by: me.id,
        reason: reason.trim(),
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    // Award XP
    await awardXP(userId, "eagle_of_week", {
      refType: "eagle_of_week",
      refId: (data as { id: string }).id,
    });

    revalidatePath("/leaderboard");
    revalidatePath("/admin");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getEagleOfWeekHistory — list recent winners (last 8 weeks)
// ─────────────────────────────────────────────────────────────────────────────

export interface EagleOfWeekEntry {
  id: string;
  weekOf: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  track: string | null;
  reason: string | null;
  xpAwarded: number;
}

export async function getEagleOfWeekHistory(limit = 8): Promise<EagleOfWeekEntry[]> {
  try {
    const { data } = await supabaseAdmin()
      .from("eagle_of_week")
      .select("id, week_of, user_id, reason, xp_awarded, user:users(name, avatar_url, track)")
      .order("week_of", { ascending: false })
      .limit(limit);

    return (data ?? []).map((e) => {
      const u = (e as { user?: { name?: string; avatar_url?: string | null; track?: string | null } }).user;
      return {
        id: e.id as string,
        weekOf: e.week_of as string,
        userId: e.user_id as string,
        userName: u?.name ?? "Unknown",
        avatarUrl: u?.avatar_url ?? null,
        track: u?.track ?? null,
        reason: e.reason as string | null,
        xpAwarded: e.xp_awarded as number,
      };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getCurrentEagleOfWeek — for dashboard banner
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentEagleOfWeek(): Promise<EagleOfWeekEntry | null> {
  const history = await getEagleOfWeekHistory(1);
  return history[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getMyFaithfulnessData — intern sees their own tier + score
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyFaithfulnessData(): Promise<R<{
  score: number;
  tier: string;
  isEagleThisWeek: boolean;
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToMon);
    const weekOf = monday.toISOString().slice(0, 10);

    const [userRes, eagleRes] = await Promise.all([
      supabaseAdmin()
        .from("users")
        .select("faithfulness_score, faithfulness_tier")
        .eq("id", me.id)
        .single(),
      supabaseAdmin()
        .from("eagle_of_week")
        .select("id")
        .eq("week_of", weekOf)
        .eq("user_id", me.id)
        .maybeSingle(),
    ]);

    return {
      ok: true,
      data: {
        score: Number(userRes.data?.faithfulness_score ?? 0),
        tier: (userRes.data?.faithfulness_tier as string) || "none",
        isEagleThisWeek: !!eagleRes.data,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
