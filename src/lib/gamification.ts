import { supabaseAdmin } from "@/lib/db";
import {
  XP_RULES, XP_COOLDOWNS_MS, XP_DAILY_CAPS, levelFromXP,
  type XPEventType,
} from "@/lib/gamification-shared";

export {
  XP_RULES, RANKS, rankFromLevel, levelFromXP, levelProgress, xpForLevel,
  formatXP,
} from "@/lib/gamification-shared";
export type { XPEventType, Rank } from "@/lib/gamification-shared";

type Badge = { id: string; name: string; description: string; icon_url: string; category: string; criteria: Record<string, unknown> };

async function safe<T>(p: PromiseLike<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export interface AwardOptions {
  refType?: string;
  refId?: string;
  metadata?: Record<string, unknown>;
  force?: boolean;
}

export interface AwardResult {
  awarded: number;
  reason: "ok" | "duplicate" | "cooldown" | "daily_cap";
  newLevel?: number;
  leveledUp?: boolean;
  newBadges?: Badge[];
}

async function applyXPToUser(userId: string, amount: number): Promise<{ oldLevel: number; newLevel: number }> {
  const admin = supabaseAdmin();
  const { data: userRow, error: readError } = await admin.from("users").select("xp, level").eq("id", userId).single();
  if (readError) throw new Error(`Unable to read user XP: ${readError.message}`);

  const oldXP = (userRow?.xp as number) || 0;
  const oldLevel = (userRow?.level as number) || 1;
  const newXP = Math.max(0, oldXP + amount);
  const newLevel = levelFromXP(newXP);

  const { error: updateError } = await admin.from("users").update({
    xp: newXP,
    level: newLevel,
    last_xp_at: new Date().toISOString(),
  }).eq("id", userId);
  if (updateError) throw new Error(`Unable to update user XP: ${updateError.message}`);

  return { oldLevel, newLevel };
}

/** Award XP for an event. Handles dedupe (via ref), cooldowns, daily caps, level-up, badge unlocks. */
async function resolveXPRule(event: XPEventType): Promise<number> {
  const base = XP_RULES[event] ?? 0;
  try {
    const { data } = await supabaseAdmin().from("system_settings").select("value").eq("key", "gamification.xp_rules").maybeSingle();
    if (!data?.value) return base;
    const parsed = JSON.parse(data.value) as Partial<Record<string, number>>;
    return parsed[event] ?? base;
  } catch { return base; }
}

export async function awardXP(userId: string, event: XPEventType, opts: AwardOptions = {}): Promise<AwardResult> {
  const admin = supabaseAdmin();
  const baseAmount = await resolveXPRule(event);
  if (baseAmount === 0) return { awarded: 0, reason: "ok" };

  // 1. Dedupe by ref (unique index will also enforce)
  if (opts.refId && !opts.force) {
    const dup = await safe(
      admin.from("xp_events").select("id").eq("user_id", userId).eq("event_type", event).eq("ref_type", opts.refType ?? "").eq("ref_id", opts.refId).maybeSingle(),
      { data: null } as { data: { id: string } | null },
    );
    if (dup.data) return { awarded: 0, reason: "duplicate" };
  }

  // 2. Cooldown
  const cooldown = XP_COOLDOWNS_MS[event];
  if (cooldown && !opts.force) {
    const since = new Date(Date.now() - cooldown).toISOString();
    const recent = await safe(
      admin.from("xp_events").select("id").eq("user_id", userId).eq("event_type", event).gte("created_at", since).limit(1),
      { data: [] } as { data: { id: string }[] },
    );
    if ((recent.data || []).length > 0) return { awarded: 0, reason: "cooldown" };
  }

  // 3. Daily cap
  const cap = XP_DAILY_CAPS[event];
  if (cap && baseAmount > 0 && !opts.force) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const today = await safe(
      admin.from("xp_events").select("amount").eq("user_id", userId).eq("event_type", event).gte("created_at", dayStart.toISOString()),
      { data: [] } as { data: { amount: number }[] },
    );
    const sum = (today.data || []).reduce((s, e) => s + (e.amount || 0), 0);
    if (sum >= cap) return { awarded: 0, reason: "daily_cap" };
  }

  // 4. Insert XP event (unique idx may reject duplicates as safety net)
  const insertRes = await safe(
    admin.from("xp_events").insert({
      user_id: userId, event_type: event, amount: baseAmount,
      ref_type: opts.refType ?? null, ref_id: opts.refId ?? null,
      metadata: opts.metadata ?? {},
    }).select("id").single(),
    { data: null, error: { code: "unknown" } } as { data: { id: string } | null; error: { code?: string } | null },
  );
  if (!insertRes.data) return { awarded: 0, reason: "duplicate" };

  // 5. Update user xp + level
  const { oldLevel, newLevel } = await applyXPToUser(userId, baseAmount);

  // 6. Advance mission progress if any mission maps to this event
  try {
    const { data: missions } = await admin.from("missions").select("id, cadence, target, event_type, xp_reward, coin_reward").eq("event_type", event).eq("active", true);
    if (missions && missions.length > 0) {
      for (const m of missions as Array<{ id: string; cadence: string; target: number; event_type: string }>) {
        const cycleStart = cycleStartFor(m.cadence);
        const up = await admin.from("user_missions").select("id, progress, claimed_at").eq("user_id", userId).eq("mission_id", m.id).eq("cycle_start", cycleStart).maybeSingle();
        if (up.data) {
          const prog = (up.data.progress || 0) + 1;
          await admin.from("user_missions").update({ progress: prog }).eq("id", up.data.id);
        } else {
          await admin.from("user_missions").insert({ user_id: userId, mission_id: m.id, cycle_start: cycleStart, progress: 1 });
        }
      }
    }
  } catch {/* ignore missing table */}

  // 7. Update live challenge standings for any active challenge covering this event
  try {
    const now = new Date().toISOString();
    const { data: chs } = await admin.from("challenges").select("id, event_types").eq("active", true).lte("starts_at", now).gte("ends_at", now);
    for (const c of (chs || []) as Array<{ id: string; event_types: string[] }>) {
      if (!c.event_types || c.event_types.length === 0 || c.event_types.includes(event)) {
        const cur = await safe(admin.from("challenge_entries").select("id, score").eq("challenge_id", c.id).eq("user_id", userId).maybeSingle(), { data: null } as { data: { id: string; score: number } | null });
        if (cur.data) {
          await admin.from("challenge_entries").update({ score: (cur.data.score || 0) + baseAmount, updated_at: new Date().toISOString() }).eq("id", cur.data.id);
        } else {
          await admin.from("challenge_entries").insert({ challenge_id: c.id, user_id: userId, score: baseAmount });
        }
      }
    }
  } catch {/* ignore */}

  // 8. Check badges
  const newBadges = await evaluateBadges(userId);

  return {
    awarded: baseAmount,
    reason: "ok",
    newLevel,
    leveledUp: newLevel > oldLevel,
    newBadges,
  };
}

export async function awardVariableXP(userId: string, event: string, amount: number, opts: AwardOptions = {}): Promise<AwardResult> {
  const admin = supabaseAdmin();
  if (amount === 0) return { awarded: 0, reason: "ok" };

  if (opts.refId && !opts.force) {
    const dup = await safe(
      admin.from("xp_events").select("id").eq("user_id", userId).eq("event_type", event).eq("ref_type", opts.refType ?? "").eq("ref_id", opts.refId).maybeSingle(),
      { data: null } as { data: { id: string } | null },
    );
    if (dup.data) return { awarded: 0, reason: "duplicate" };
  }

  const { data: inserted, error: insertError } = await admin.from("xp_events").insert({
    user_id: userId,
    event_type: event,
    amount,
    ref_type: opts.refType ?? null,
    ref_id: opts.refId ?? null,
    metadata: opts.metadata ?? {},
  }).select("id").single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") return { awarded: 0, reason: "duplicate" };
    throw new Error(`Unable to record XP event: ${insertError?.message || "unknown error"}`);
  }

  const { oldLevel, newLevel } = await applyXPToUser(userId, amount);
  const newBadges = await evaluateBadges(userId);

  return {
    awarded: amount,
    reason: "ok",
    newLevel,
    leveledUp: newLevel > oldLevel,
    newBadges,
  };
}

function cycleStartFor(cadence: string): string {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (cadence === "weekly") {
    const day = d.getDay(); // 0=Sun
    const mondayOffset = (day + 6) % 7;
    d.setDate(d.getDate() - mondayOffset);
  }
  return d.toISOString().slice(0, 10);
}

/** Evaluate and grant badges the user qualifies for. Returns newly earned. */
export async function evaluateBadges(userId: string): Promise<Badge[]> {
  const admin = supabaseAdmin();
  const [badgesRes, ownedRes, userRes] = await Promise.all([
    safe(admin.from("badges").select("id, name, description, icon_url, category, criteria"), { data: [] } as { data: Badge[] }),
    safe(admin.from("user_badges").select("badge_id").eq("user_id", userId), { data: [] } as { data: { badge_id: string }[] }),
    safe(admin.from("users").select("xp, level, streak, reputation").eq("id", userId).single(), { data: null } as { data: { xp: number; level: number; streak: number; reputation: number } | null }),
  ]);
  const owned = new Set((ownedRes.data || []).map((x) => x.badge_id));
  const all = (badgesRes.data || []).filter((b) => !owned.has(b.id));
  const u = userRes.data || { xp: 0, level: 1, streak: 0, reputation: 0 };

  // Precompute some counts lazily
  let tasksCompleted: number | null = null;
  let tasksOnTime: number | null = null;
  let coursesCompleted: number | null = null;
  let brilliantComments: number | null = null;
  let perfectQuizzes: number | null = null;

  const load = async (which: "tasks_completed" | "tasks_on_time" | "courses_completed" | "brilliant_comments" | "perfect_quiz") => {
    if (which === "tasks_completed" && tasksCompleted === null) {
      const r = await safe(admin.from("tasks").select("*", { count: "exact", head: true }).eq("assigned_to", userId).in("status", ["approved", "submitted"]), { count: 0 } as { count: number });
      tasksCompleted = r.count || 0;
    }
    if (which === "tasks_on_time" && tasksOnTime === null) {
      const r = await safe(admin.from("xp_events").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("event_type", "task_on_time"), { count: 0 } as { count: number });
      tasksOnTime = r.count || 0;
    }
    if (which === "courses_completed" && coursesCompleted === null) {
      const r = await safe(admin.from("course_enrollments").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"), { count: 0 } as { count: number });
      coursesCompleted = r.count || 0;
    }
    if (which === "brilliant_comments" && brilliantComments === null) {
      const r = await safe(admin.from("comments").select("*", { count: "exact", head: true }).eq("author_id", userId).not("brilliant_label", "is", null), { count: 0 } as { count: number });
      brilliantComments = r.count || 0;
    }
    if (which === "perfect_quiz" && perfectQuizzes === null) {
      const r = await safe(admin.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("score", 100), { count: 0 } as { count: number });
      perfectQuizzes = r.count || 0;
    }
  };

  const earned: Badge[] = [];
  for (const b of all) {
    const crit = b.criteria as { type?: string; value?: number };
    if (!crit?.type) continue;
    const target = crit.value ?? 1;
    let qualified = false;
    switch (crit.type) {
      case "xp_total":          qualified = u.xp >= target; break;
      case "level":             qualified = u.level >= target; break;
      case "streak":            qualified = u.streak >= target; break;
      case "courses_completed": await load("courses_completed"); qualified = (coursesCompleted || 0) >= target; break;
      case "tasks_completed":   await load("tasks_completed");   qualified = (tasksCompleted || 0) >= target; break;
      case "tasks_on_time":     await load("tasks_on_time");     qualified = (tasksOnTime || 0) >= target; break;
      case "brilliant_comments":await load("brilliant_comments");qualified = (brilliantComments || 0) >= target; break;
      case "perfect_quiz":      await load("perfect_quiz");      qualified = (perfectQuizzes || 0) >= target; break;
    }
    if (qualified) {
      const ins = await safe(admin.from("user_badges").insert({ user_id: userId, badge_id: b.id }).select("id").single(), { data: null } as { data: { id: string } | null });
      if (ins.data) earned.push(b);
    }
  }
  return earned;
}

/** Bump daily login streak; grants login_streak XP if streak extends. */
export async function touchLoginStreak(userId: string): Promise<{ streak: number; best: number; awarded: number }> {
  const admin = supabaseAdmin();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);
  const yesterdayISO = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);

  const row = await safe(
    admin.from("streaks").select("id, current, best, last_day").eq("user_id", userId).eq("kind", "login").maybeSingle(),
    { data: null } as { data: { id: string; current: number; best: number; last_day: string | null } | null },
  );
  const r = row.data;
  let current = 1, best = 1;
  if (r) {
    if (r.last_day === todayISO) return { streak: r.current, best: r.best, awarded: 0 };
    current = r.last_day === yesterdayISO ? r.current + 1 : 1;
    best = Math.max(r.best, current);
    await safe(admin.from("streaks").update({ current, best, last_day: todayISO, updated_at: new Date().toISOString() }).eq("id", r.id), null);
  } else {
    await safe(admin.from("streaks").insert({ user_id: userId, kind: "login", current, best, last_day: todayISO }), null);
  }
  await safe(admin.from("users").update({ streak: current, best_streak: best }).eq("id", userId), null);
  const xp = await awardXP(userId, "login_streak", { refType: "streak", refId: todayISO });
  return { streak: current, best, awarded: xp.awarded };
}

export interface LeaderboardRow {
  id: string; name: string; avatarUrl: string | null; role: string;
  xp: number; level: number; streak: number; reputation: number;
  score: number; // sort value used
  rank: number;
}

export type LeaderboardMode = "xp" | "weekly" | "monthly" | "learners" | "contributors" | "attendance" | "improved";

export async function getLeaderboard(mode: LeaderboardMode, limit = 50): Promise<LeaderboardRow[]> {
  const sb = supabaseAdmin();
  if (mode === "weekly" || mode === "monthly") {
    const since = new Date(); since.setDate(since.getDate() - (mode === "weekly" ? 7 : 30));
    const ev = await safe(
      supabaseAdmin().from("xp_events").select("user_id, amount").gte("created_at", since.toISOString()),
      { data: [] } as { data: { user_id: string; amount: number }[] },
    );
    const sums = new Map<string, number>();
    for (const e of ev.data || []) sums.set(e.user_id, (sums.get(e.user_id) || 0) + (e.amount || 0));
    const ids = Array.from(sums.keys());
    if (ids.length === 0) return [];
    const { data: users } = await sb.from("users").select("id, name, avatar_url, role, xp, level, streak, reputation").in("id", ids);
    const rows = (users || []).map((u) => ({
      id: u.id as string, name: u.name as string, avatarUrl: u.avatar_url as string | null, role: u.role as string,
      xp: u.xp as number, level: levelFromXP(u.xp as number), streak: u.streak as number, reputation: u.reputation as number,
      score: sums.get(u.id as string) || 0, rank: 0,
    }));
    rows.sort((a, b) => b.score - a.score);
    rows.forEach((r, i) => (r.rank = i + 1));
    return rows.slice(0, limit);
  }

  const sortCol = mode === "contributors" ? "reputation" : mode === "attendance" ? "streak" : "xp";
  const { data } = await sb.from("users").select("id, name, avatar_url, role, xp, level, streak, reputation").order(sortCol, { ascending: false }).limit(limit);
  const rows = (data || []).map((u, i) => ({
    id: u.id as string, name: u.name as string, avatarUrl: u.avatar_url as string | null, role: u.role as string,
    xp: u.xp as number, level: levelFromXP(u.xp as number), streak: u.streak as number, reputation: u.reputation as number,
    score: (u[sortCol as "xp" | "reputation" | "streak"] as number) || 0, rank: i + 1,
  }));
  return rows;
}

export async function getUserGamificationSnapshot(userId: string) {
  const admin = supabaseAdmin();
  type SnapshotUser = {
    id: string; name: string; avatar_url: string | null; role: string;
    xp: number; level: number; streak: number; best_streak: number;
    reputation: number; coins: number; wallet_balance: number;
  };
  const [baseUserRes, extraUserRes, badgesRes, eventsRes, streaksRes, missionsRes] = await Promise.all([
    safe(admin.from("users").select("id, name, avatar_url, role, xp, level, streak, reputation, wallet_balance").eq("id", userId).single(),
      { data: null } as { data: (Omit<SnapshotUser, "best_streak" | "coins">) | null }),
    safe(admin.from("users").select("best_streak, coins").eq("id", userId).single(),
      { data: null } as { data: { best_streak: number; coins: number } | null }),
    safe(admin.from("user_badges").select("earned_at, badges(id, name, description, icon_url, category)").eq("user_id", userId).order("earned_at", { ascending: false }),
      { data: [] } as { data: Array<{ earned_at: string; badges: { id: string; name: string; description: string; icon_url: string; category: string } }> }),
    safe(admin.from("xp_events").select("event_type, amount, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      { data: [] } as { data: { event_type: string; amount: number; created_at: string }[] }),
    safe(admin.from("streaks").select("kind, current, best, last_day").eq("user_id", userId),
      { data: [] } as { data: { kind: string; current: number; best: number; last_day: string | null }[] }),
    safe(admin.from("user_missions").select("mission_id, progress, claimed_at, cycle_start, missions(id, key, title, description, cadence, target, xp_reward, coin_reward)").eq("user_id", userId).order("cycle_start", { ascending: false }).limit(20),
      { data: [] } as { data: Array<{ mission_id: string; progress: number; claimed_at: string | null; cycle_start: string; missions: { id: string; key: string; title: string; description: string; cadence: string; target: number; xp_reward: number; coin_reward: number } }> }),
  ]);
  const userRes: { data: SnapshotUser | null } = {
    data: baseUserRes.data ? {
      ...baseUserRes.data,
      best_streak: extraUserRes.data?.best_streak ?? baseUserRes.data.streak ?? 0,
      coins: extraUserRes.data?.coins ?? 0,
      wallet_balance: Number(baseUserRes.data.wallet_balance ?? 0),
    } : null,
  };
  // Heal stale users.level if it drifted from actual XP (e.g. after formula change)
  const u = userRes.data;
  if (u && levelFromXP(u.xp) !== u.level) {
    supabaseAdmin().from("users").update({ level: levelFromXP(u.xp) }).eq("id", userId).then(() => {}).catch(() => {});
    // Return corrected level inline so the page sees the right value immediately
    userRes.data = { ...u, level: levelFromXP(u.xp) };
  }
  return { user: userRes.data, badges: badgesRes.data || [], events: eventsRes.data || [], streaks: streaksRes.data || [], missions: missionsRes.data || [] };
}

export async function getAllBadgesWithOwnership(userId: string) {
  const admin = supabaseAdmin();
  const [badgesRes, ownedRes] = await Promise.all([
    safe(admin.from("badges").select("id, name, description, icon_url, category, criteria").order("category"), { data: [] } as { data: Array<Badge & { criteria: Record<string, unknown> }> }),
    safe(admin.from("user_badges").select("badge_id, earned_at").eq("user_id", userId), { data: [] } as { data: { badge_id: string; earned_at: string }[] }),
  ]);
  const ownedMap = new Map((ownedRes.data || []).map((x) => [x.badge_id, x.earned_at]));
  return (badgesRes.data || []).map((b) => ({ ...b, earnedAt: ownedMap.get(b.id) || null, locked: !ownedMap.has(b.id) }));
}

export async function getActiveMissions(userId: string) {
  const admin = supabaseAdmin();
  const [missionsRes, progressRes] = await Promise.all([
    safe(admin.from("missions").select("id, key, title, description, cadence, target, xp_reward, coin_reward, event_type").eq("active", true), { data: [] } as { data: Array<{ id: string; key: string; title: string; description: string; cadence: string; target: number; xp_reward: number; coin_reward: number; event_type: string | null }> }),
    safe(admin.from("user_missions").select("mission_id, progress, claimed_at, cycle_start").eq("user_id", userId), { data: [] } as { data: { mission_id: string; progress: number; claimed_at: string | null; cycle_start: string }[] }),
  ]);
  const missions = missionsRes.data || [];
  return missions.map((m) => {
    const cycle = cycleStartFor(m.cadence);
    const up = (progressRes.data || []).find((p) => p.mission_id === m.id && p.cycle_start === cycle);
    return {
      ...m,
      progress: up?.progress || 0,
      claimed: !!up?.claimed_at,
      cycleStart: cycle,
      complete: (up?.progress || 0) >= m.target,
    };
  });
}

/** Recompute challenge standings from xp_events in the challenge window. */
export async function scoreChallenge(challengeId: string): Promise<{ ok: boolean; entries: number; error?: string }> {
  const admin = supabaseAdmin();
  const ch = await safe(
    admin.from("challenges").select("id, starts_at, ends_at, event_types").eq("id", challengeId).single(),
    { data: null } as { data: { id: string; starts_at: string; ends_at: string; event_types: string[] } | null },
  );
  if (!ch.data) return { ok: false, entries: 0, error: "challenge not found" };
  const ev = await safe(
    admin.from("xp_events").select("user_id, amount, event_type")
      .gte("created_at", ch.data.starts_at).lte("created_at", ch.data.ends_at),
    { data: [] } as { data: { user_id: string; amount: number; event_type: string }[] },
  );
  const types = ch.data.event_types || [];
  const filtered = types.length === 0 ? (ev.data || []) : (ev.data || []).filter((e) => types.includes(e.event_type));
  const scores = new Map<string, number>();
  for (const e of filtered) scores.set(e.user_id, (scores.get(e.user_id) || 0) + (e.amount || 0));
  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < sorted.length; i++) {
    const [userId, score] = sorted[i];
    await safe(admin.from("challenge_entries").upsert({
      challenge_id: challengeId, user_id: userId, score, rank: i + 1, updated_at: new Date().toISOString(),
    }, { onConflict: "challenge_id,user_id" }), null);
  }
  return { ok: true, entries: sorted.length };
}

/** Finalize a challenge: awards prize XP/coins to top N and marks inactive. */
export async function finalizeChallenge(challengeId: string, topN = 3): Promise<{ ok: boolean; winners: number }> {
  const admin = supabaseAdmin();
  await scoreChallenge(challengeId);
  const ch = await safe(admin.from("challenges").select("id, prize_xp, prize_coins").eq("id", challengeId).single(), { data: null } as { data: { id: string; prize_xp: number; prize_coins: number } | null });
  if (!ch.data) return { ok: false, winners: 0 };
  const winners = await safe(
    admin.from("challenge_entries").select("user_id, rank").eq("challenge_id", challengeId).lte("rank", topN).order("rank"),
    { data: [] } as { data: { user_id: string; rank: number }[] },
  );
  for (const w of winners.data || []) {
    const multiplier = w.rank === 1 ? 1 : w.rank === 2 ? 0.6 : 0.4;
    const xp = Math.round((ch.data.prize_xp || 0) * multiplier);
    const coins = Math.round((ch.data.prize_coins || 0) * multiplier);
    if (xp > 0) {
      await admin.from("xp_events").insert({ user_id: w.user_id, event_type: "challenge_prize", amount: xp, ref_type: "challenge", ref_id: challengeId, metadata: { rank: w.rank } });
      const { data: u } = await admin.from("users").select("xp, coins").eq("id", w.user_id).single();
      const newXP = ((u?.xp as number) || 0) + xp;
      await admin.from("users").update({ xp: newXP, level: levelFromXP(newXP), coins: ((u?.coins as number) || 0) + coins }).eq("id", w.user_id);
    }
    await evaluateBadges(w.user_id);
  }
  await admin.from("challenges").update({ active: false }).eq("id", challengeId);
  return { ok: true, winners: (winners.data || []).length };
}

export async function getChallengeWithStandings(challengeId: string) {
  const admin = supabaseAdmin();
  const [chRes, entriesRes] = await Promise.all([
    safe(admin.from("challenges").select("*").eq("id", challengeId).single(), { data: null } as { data: Record<string, unknown> | null }),
    safe(admin.from("challenge_entries").select("user_id, score, rank, users(id, name, avatar_url, role, level)").eq("challenge_id", challengeId).order("rank", { ascending: true }).limit(100),
      { data: [] } as { data: Array<{ user_id: string; score: number; rank: number; users: { id: string; name: string; avatar_url: string | null; role: string; level: number } }> }),
  ]);
  return { challenge: chRes.data, entries: entriesRes.data || [] };
}

export async function claimMission(userId: string, missionId: string): Promise<{ ok: boolean; xp?: number; coins?: number; error?: string }> {
  const admin = supabaseAdmin();
  const m = await safe(admin.from("missions").select("id, cadence, target, xp_reward, coin_reward").eq("id", missionId).single(), { data: null } as { data: { id: string; cadence: string; target: number; xp_reward: number; coin_reward: number } | null });
  if (!m.data) return { ok: false, error: "mission not found" };
  const cycle = cycleStartFor(m.data.cadence);
  const up = await safe(admin.from("user_missions").select("id, progress, claimed_at").eq("user_id", userId).eq("mission_id", missionId).eq("cycle_start", cycle).maybeSingle(),
    { data: null } as { data: { id: string; progress: number; claimed_at: string | null } | null });
  if (!up.data) return { ok: false, error: "no progress" };
  if (up.data.claimed_at) return { ok: false, error: "already claimed" };
  if (up.data.progress < m.data.target) return { ok: false, error: "not complete" };
  await admin.from("user_missions").update({ claimed_at: new Date().toISOString() }).eq("id", up.data.id);
  // Award XP directly (forced so it bypasses cooldown/cap)
  if (m.data.xp_reward > 0) {
    await admin.from("xp_events").insert({ user_id: userId, event_type: "mission_reward", amount: m.data.xp_reward, ref_type: "mission", ref_id: `${missionId}:${cycle}`, metadata: {} });
    const { data: u } = await admin.from("users").select("xp").eq("id", userId).single();
    const newXP = ((u?.xp as number) || 0) + m.data.xp_reward;
    await admin.from("users").update({ xp: newXP, level: levelFromXP(newXP) }).eq("id", userId);
  }
  if (m.data.coin_reward > 0) {
    const { data: u } = await admin.from("users").select("coins").eq("id", userId).single();
    await admin.from("users").update({ coins: ((u?.coins as number) || 0) + m.data.coin_reward }).eq("id", userId);
  }
  await evaluateBadges(userId);
  return { ok: true, xp: m.data.xp_reward, coins: m.data.coin_reward };
}
