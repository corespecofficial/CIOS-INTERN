"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";
import { awardVariableXP } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const DAILY_XP = 10;
const STREAK_BONUS_MULTIPLIER = 0.5; // +50% on 7-day streak

/**
 * Award the daily-login bonus once per UTC day.
 * Idempotent: returns already=true if claimed today.
 *
 * Idempotency is enforced by a UNIQUE(user_id, date) constraint on the
 * daily_logins table. We attempt the insert first — if it fails with a
 * unique-violation, we know the user already claimed today and bail out
 * without touching users.xp. This is race-safe across concurrent tabs.
 */
export async function claimDailyLogin(): Promise<R<{ already: boolean; xpGranted: number; streak: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

    // Compute streak — was yesterday claimed?
    const { data: yest } = await sb
      .from("daily_logins")
      .select("date")
      .eq("user_id", me.id)
      .eq("date", yesterday)
      .maybeSingle();
    const newStreak = yest ? ((me.streak ?? 0) + 1) : 1;

    const bonus = newStreak >= 7 ? Math.round(DAILY_XP * (1 + STREAK_BONUS_MULTIPLIER)) : DAILY_XP;

    // Atomic insert — the UNIQUE (user_id, date) constraint is the source of
    // truth for idempotency. Attempting the insert FIRST means a second
    // concurrent request cannot sneak past a stale SELECT and double-award.
    const { error: insertError } = await sb
      .from("daily_logins")
      .insert({ user_id: me.id, date: today, xp_granted: bonus });

    if (insertError) {
      // 23505 = unique_violation → already claimed today → idempotent success
      if (insertError.code === "23505") {
        return { ok: true, data: { already: true, xpGranted: 0, streak: me.streak ?? 0 } };
      }
      // 42P01 = undefined_table → migration p379 not run yet. Fail loud instead
      // of silently falling through and awarding XP every page load (the old bug).
      if (insertError.code === "42P01") {
        return { ok: false, error: "daily_logins table missing — run migration p379_daily_logins.sql" };
      }
      throw insertError;
    }

    // Only reached on a genuine first insert of the day — safe to award XP
    const best = Math.max(me.streak ?? 0, newStreak);
    const { error: streakError } = await sb.from("streaks").upsert({
      user_id: me.id,
      kind: "login",
      current: newStreak,
      best,
      last_day: today,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,kind" });
    if (streakError) throw streakError;

    const { error: userError } = await sb
      .from("users")
      .update({
        streak: newStreak,
        best_streak: best,
        last_seen: new Date().toISOString(),
      })
      .eq("id", me.id);
    if (userError) throw userError;

    const xp = await awardVariableXP(me.id, "login_streak", bonus, {
      refType: "daily_login",
      refId: today,
      metadata: { streak: newStreak },
    });

    pushNotification({
      userId: me.id,
      kind: "achievement",
      title: `🎁 +${bonus} XP — Daily login!`,
      body: newStreak >= 7 ? `🔥 ${newStreak}-day streak — bonus applied!` : `Day ${newStreak} of your streak`,
      url: "/gamification",
    }).catch(() => {});

    revalidatePath("/gamification");
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");

    return { ok: true, data: { already: false, xpGranted: xp.awarded, streak: newStreak } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
