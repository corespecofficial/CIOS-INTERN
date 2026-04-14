"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_ENGAGEMENT_FEATURES, type EngagementFeatures,
  QUEST_CATALOGUE, questsForDate, todayUTC,
  type ReactionKind,
} from "@/lib/engagement-shared";
import { awardXP } from "@/lib/gamification";
import { cached, cacheDel, cacheKey, TTL } from "@/lib/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/* ───────────────────────────────────────
   FEATURE FLAGS (admin-controlled)
   ─────────────────────────────────────── */

export async function getEngagementFeatures(): Promise<EngagementFeatures> {
  return cached(cacheKey.engagementFeatures(), TTL.medium, async () => {
    try {
      const { data } = await supabaseAdmin().from("system_settings")
        .select("value").eq("key", "engagement.features").maybeSingle();
      if (!data?.value) return DEFAULT_ENGAGEMENT_FEATURES;
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      return { ...DEFAULT_ENGAGEMENT_FEATURES, ...parsed } as EngagementFeatures;
    } catch { return DEFAULT_ENGAGEMENT_FEATURES; }
  });
}

export async function updateEngagementFeatures(patch: Partial<EngagementFeatures>): Promise<R<EngagementFeatures>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") {
      return { ok: false, error: "Admin only" };
    }
    const current = await getEngagementFeatures();
    const next = { ...current, ...patch };
    const sb = supabaseAdmin();
    await sb.from("system_settings")
      .upsert({ key: "engagement.features", value: JSON.stringify(next) }, { onConflict: "key" });
    await cacheDel(cacheKey.engagementFeatures());
    revalidatePath("/admin/engagement");
    revalidatePath("/dashboard");
    return { ok: true, data: next };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ───────────────────────────────────────
   DAILY QUESTS
   ─────────────────────────────────────── */

export interface QuestState {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  progress: number;
  claimed: boolean;
  bonusXp: number;
}

export async function getMyDailyQuests(): Promise<R<QuestState[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.dailyQuests) return { ok: true, data: [] };

    const date = todayUTC();
    const quests = questsForDate(date);
    const sb = supabaseAdmin();
    const { data: rows } = await sb.from("daily_quest_progress")
      .select("quest_id, progress, target, claimed_at")
      .eq("user_id", me.id).eq("quest_date", date);
    const byId = new Map<string, { progress: number; claimed: boolean }>(
      ((rows || []) as Array<{ quest_id: string; progress: number; claimed_at: string | null }>)
        .map((r) => [r.quest_id, { progress: r.progress, claimed: !!r.claimed_at }]),
    );

    return {
      ok: true,
      data: quests.map((q) => ({
        id: q.id, title: q.title, description: q.description, emoji: q.emoji,
        target: q.target, bonusXp: features.questXpBonus || q.bonusXp,
        progress: byId.get(q.id)?.progress || 0,
        claimed: byId.get(q.id)?.claimed || false,
      })),
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Called from places where an action happens (lesson done, reaction, etc.) to bump quest progress. */
export async function reportQuestProgress(action: "lesson_completed" | "discussion_posted" | "reaction_given" | "login" | "quiz_passed", amount = 1): Promise<void> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return;
    const features = await getEngagementFeatures();
    if (!features.dailyQuests) return;
    const date = todayUTC();
    const quests = questsForDate(date).filter((q) => q.action === action);
    if (quests.length === 0) return;
    const sb = supabaseAdmin();
    for (const q of quests) {
      const { data: existing } = await sb.from("daily_quest_progress")
        .select("id, progress, claimed_at")
        .eq("user_id", me.id).eq("quest_id", q.id).eq("quest_date", date).maybeSingle();
      if (existing?.claimed_at) continue;
      const nextProgress = Math.min(q.target, (existing?.progress || 0) + amount);
      if (existing) {
        await sb.from("daily_quest_progress").update({ progress: nextProgress }).eq("id", existing.id);
      } else {
        await sb.from("daily_quest_progress").insert({
          user_id: me.id, quest_id: q.id, quest_date: date,
          progress: nextProgress, target: q.target,
        });
      }
    }
  } catch { /* non-fatal */ }
}

export async function claimQuest(questId: string): Promise<R<{ xp: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.dailyQuests) return { ok: false, error: "Quests disabled" };

    const date = todayUTC();
    const def = QUEST_CATALOGUE.find((q) => q.id === questId);
    if (!def) return { ok: false, error: "Unknown quest" };
    const sb = supabaseAdmin();
    const { data: row } = await sb.from("daily_quest_progress")
      .select("id, progress, target, claimed_at")
      .eq("user_id", me.id).eq("quest_id", questId).eq("quest_date", date).maybeSingle();
    if (!row) return { ok: false, error: "Quest not started" };
    const r = row as { id: string; progress: number; target: number; claimed_at: string | null };
    if (r.claimed_at) return { ok: false, error: "Already claimed" };
    if (r.progress < r.target) return { ok: false, error: "Not complete yet" };

    const xp = features.questXpBonus || def.bonusXp;
    await sb.from("daily_quest_progress").update({ claimed_at: new Date().toISOString() }).eq("id", r.id);
    await awardXP(me.id, "valuable_post", { refType: "quest", refId: `${date}:${questId}`, force: true, metadata: { xp } });
    // Manual XP top-up so the admin-configured bonus lands exactly, regardless of XP_RULES.
    const { data: u } = await sb.from("users").select("xp, level").eq("id", me.id).maybeSingle();
    const newXp = ((u?.xp as number) || 0) + xp;
    await sb.from("users").update({ xp: newXp }).eq("id", me.id);

    revalidatePath("/dashboard");
    return { ok: true, data: { xp } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ───────────────────────────────────────
   STREAK FREEZES
   ─────────────────────────────────────── */

export async function getMyFreezes(): Promise<R<{ active: number; costXp: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    const sb = supabaseAdmin();
    const { count } = await sb.from("streak_freezes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me.id).is("used_on", null).gt("expires_at", new Date().toISOString());
    return { ok: true, data: { active: count || 0, costXp: features.freezeCostXp } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function buyStreakFreeze(): Promise<R<{ remaining: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.streakFreeze) return { ok: false, error: "Streak freeze disabled" };
    const cost = features.freezeCostXp;
    const sb = supabaseAdmin();
    const { data: u } = await sb.from("users").select("xp").eq("id", me.id).maybeSingle();
    const xp = (u?.xp as number) || 0;
    if (xp < cost) return { ok: false, error: `Need ${cost} XP — you have ${xp}` };

    await sb.from("users").update({ xp: xp - cost }).eq("id", me.id);
    await sb.from("streak_freezes").insert({ user_id: me.id, xp_spent: cost });
    const { count } = await sb.from("streak_freezes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me.id).is("used_on", null).gt("expires_at", new Date().toISOString());
    revalidatePath("/dashboard");
    return { ok: true, data: { remaining: count || 0 } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ───────────────────────────────────────
   LESSON REACTIONS
   ─────────────────────────────────────── */

export interface ReactionSummary { kind: ReactionKind; count: number; reacted: boolean; }

export async function getReactions(moduleId: string): Promise<R<ReactionSummary[]>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data } = await sb.from("lesson_reactions")
      .select("kind, user_id").eq("module_id", moduleId);
    const rows = (data || []) as Array<{ kind: ReactionKind; user_id: string }>;
    const kinds: ReactionKind[] = ["fire","idea","clap","heart","mind-blown"];
    const out = kinds.map((k) => ({
      kind: k,
      count: rows.filter((r) => r.kind === k).length,
      reacted: !!me && rows.some((r) => r.kind === k && r.user_id === me.id),
    }));
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function toggleReaction(moduleId: string, kind: ReactionKind): Promise<R<{ reacted: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.reactions) return { ok: false, error: "Reactions disabled" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("lesson_reactions")
      .select("id").eq("module_id", moduleId).eq("user_id", me.id).eq("kind", kind).maybeSingle();
    if (existing) {
      await sb.from("lesson_reactions").delete().eq("id", (existing as { id: string }).id);
      return { ok: true, data: { reacted: false } };
    }
    await sb.from("lesson_reactions").insert({ module_id: moduleId, user_id: me.id, kind });
    // Progress for "give-3-reactions" quest
    reportQuestProgress("reaction_given").catch(() => {});
    // Reactor gets a tiny XP tickle (capped via existing helpful_comment cooldown/daily cap).
    awardXP(me.id, "helpful_comment", { refType: "reaction", refId: `${moduleId}:${kind}` }).catch(() => {});
    return { ok: true, data: { reacted: true } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ───────────────────────────────────────
   COURSE LEADERBOARDS (weekly)
   ─────────────────────────────────────── */

export interface LeaderRow {
  user_id: string; name: string | null; avatar_url: string | null;
  xp_week: number; rank: number;
}

function startOfWeekUTC(resetDayIso: number): Date {
  // resetDayIso: 1=Mon..7=Sun. Returns the most recent midnight UTC matching that day.
  const now = new Date();
  const day = now.getUTCDay() === 0 ? 7 : now.getUTCDay(); // ISO
  const diff = (day - resetDayIso + 7) % 7;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return d;
}

export async function getCourseLeaderboard(courseId: string, limit = 5): Promise<R<LeaderRow[]>> {
  try {
    const features = await getEngagementFeatures();
    if (!features.leaderboards) return { ok: true, data: [] };
    const rows = await cached<LeaderRow[]>(cacheKey.courseLeaderboard(courseId), TTL.short, async () => {
      const sb = supabaseAdmin();
      const since = startOfWeekUTC(features.leaderboardResetDay || 1).toISOString();
      const { data } = await sb.from("xp_events")
        .select("user_id, amount")
        .eq("ref_type", "course").eq("ref_id", courseId)
        .gte("created_at", since);
      const byUser = new Map<string, number>();
      for (const r of (data || []) as Array<{ user_id: string; amount: number }>) {
        byUser.set(r.user_id, (byUser.get(r.user_id) || 0) + (r.amount || 0));
      }
      const top = [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      if (top.length === 0) return [];
      const { data: users } = await sb.from("users")
        .select("id, name, avatar_url").in("id", top.map((t) => t[0]));
      const uMap = new Map(((users || []) as Array<{ id: string; name: string | null; avatar_url: string | null }>).map((u) => [u.id, u]));
      return top.map(([uid, xp], i) => ({
        user_id: uid, name: uMap.get(uid)?.name || null, avatar_url: uMap.get(uid)?.avatar_url || null,
        xp_week: xp, rank: i + 1,
      }));
    });
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ───────────────────────────────────────
   MINI-BADGES
   ─────────────────────────────────────── */

export interface MiniBadgeRow {
  id: string; name: string; emoji: string; description: string; color: string;
  awarded_at: string | null; // null = locked
}

export async function getMyMiniBadges(userId?: string): Promise<R<MiniBadgeRow[]>> {
  try {
    const me = await getCurrentDbUser();
    const targetId = userId || me?.id;
    if (!targetId) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const [{ data: catalogue }, { data: owned }] = await Promise.all([
      sb.from("mini_badges").select("id, name, emoji, description, color"),
      sb.from("user_mini_badges").select("badge_id, awarded_at").eq("user_id", targetId),
    ]);
    const ownedMap = new Map<string, string>(
      ((owned || []) as Array<{ badge_id: string; awarded_at: string }>)
        .map((r) => [r.badge_id, r.awarded_at]),
    );
    const rows: MiniBadgeRow[] = ((catalogue || []) as Array<{ id: string; name: string; emoji: string; description: string; color: string }>).map((b) => ({
      ...b, awarded_at: ownedMap.get(b.id) || null,
    }));
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Grant a mini-badge if the user doesn't already have it. Safe to call repeatedly. */
export async function grantMiniBadge(userId: string, badgeId: string, refCourse?: string): Promise<void> {
  try {
    const sb = supabaseAdmin();
    await sb.from("user_mini_badges").insert({
      user_id: userId, badge_id: badgeId, ref_course: refCourse || null,
    });
  } catch { /* unique-constraint collision is fine */ }
}
