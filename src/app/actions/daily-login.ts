"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const DAILY_XP = 10;
const STREAK_BONUS_MULTIPLIER = 0.5; // +50% on 7-day streak

/**
 * Award the daily-login bonus once per UTC day.
 * Idempotent: returns already=true if claimed today.
 */
export async function claimDailyLogin(): Promise<R<{ already: boolean; xpGranted: number; streak: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await sb.from("daily_logins").select("date").eq("user_id", me.id).eq("date", today).maybeSingle();
    if (existing) return { ok: true, data: { already: true, xpGranted: 0, streak: me.streak ?? 0 } };

    // Compute streak — was yesterday claimed?
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const { data: yest } = await sb.from("daily_logins").select("date").eq("user_id", me.id).eq("date", yesterday).maybeSingle();
    const newStreak = yest ? ((me.streak ?? 0) + 1) : 1;

    const bonus = newStreak >= 7 ? Math.round(DAILY_XP * (1 + STREAK_BONUS_MULTIPLIER)) : DAILY_XP;

    await sb.from("daily_logins").insert({ user_id: me.id, date: today, xp_granted: bonus });
    await sb.from("users").update({ xp: (me.xp ?? 0) + bonus, streak: newStreak, last_seen: new Date().toISOString() }).eq("id", me.id);

    pushNotification({
      userId: me.id, kind: "achievement",
      title: `🎁 +${bonus} XP — Daily login!`,
      body: newStreak >= 7 ? `🔥 ${newStreak}-day streak — bonus applied!` : `Day ${newStreak} of your streak`,
      url: "/gamification",
    }).catch(() => {});

    return { ok: true, data: { already: false, xpGranted: bonus, streak: newStreak } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
