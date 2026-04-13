"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const STREAK_SAVER_COST = 50; // XP
const REFERRAL_REWARD = 200;  // XP per accepted referral

/* ────────────────────────────────────────────────
   STREAK SAVER — pay XP to keep a broken streak
   ──────────────────────────────────────────────── */

export async function buyStreakSaver(): Promise<R<{ newStreak: number; xpRemaining: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if ((me.xp ?? 0) < STREAK_SAVER_COST) return { ok: false, error: `Need ${STREAK_SAVER_COST} XP — you have ${me.xp ?? 0}.` };
    const sb = supabaseAdmin();
    // Re-add yesterday's daily login record so streak math computes correctly
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    await sb.from("daily_logins").upsert({ user_id: me.id, date: yesterday, xp_granted: 0 }, { onConflict: "user_id,date" });
    const newStreak = (me.streak ?? 0) + 1;
    await sb.from("users").update({ xp: (me.xp ?? 0) - STREAK_SAVER_COST, streak: newStreak }).eq("id", me.id);
    pushNotification({ userId: me.id, kind: "achievement", title: "🛟 Streak Saved!", body: `Spent ${STREAK_SAVER_COST} XP — streak preserved at ${newStreak} days.`, url: "/gamification" }).catch(() => {});
    return { ok: true, data: { newStreak, xpRemaining: (me.xp ?? 0) - STREAK_SAVER_COST } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ────────────────────────────────────────────────
   REFERRAL — generate / claim invite
   ──────────────────────────────────────────────── */

export async function getMyReferralCode(): Promise<R<{ code: string; url: string; count: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("users").select("referral_code").eq("id", me.id).maybeSingle();
    let code = (existing as { referral_code?: string } | null)?.referral_code;
    if (!code) {
      // Stable short-code based on user id + name
      code = (me.name || "user").split(/\s+/)[0].slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, "") + me.id.slice(0, 4).toUpperCase();
      await sb.from("users").update({ referral_code: code }).eq("id", me.id);
    }
    const { count } = await sb.from("users").select("*", { count: "exact", head: true }).eq("referred_by", me.id);
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const url = `${base}/sign-up?ref=${code}`;
    return { ok: true, data: { code, url, count: count || 0 } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Called from the sign-up flow once a new user lands with ?ref=CODE. */
export async function claimReferral(refCode: string): Promise<R<{ inviterName: string | null }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    if (me.referred_by) return { ok: false, error: "Already referred" };
    const { data: inviter } = await sb.from("users").select("id, name, xp").eq("referral_code", refCode.toUpperCase()).maybeSingle();
    if (!inviter || inviter.id === me.id) return { ok: false, error: "Invalid code" };
    await sb.from("users").update({ referred_by: inviter.id }).eq("id", me.id);
    await sb.from("users").update({ xp: (inviter.xp ?? 0) + REFERRAL_REWARD }).eq("id", inviter.id);
    pushNotification({ userId: inviter.id, kind: "achievement", title: `🎁 +${REFERRAL_REWARD} XP — Referral accepted!`, body: `${me.name || "Someone"} signed up using your code.`, url: "/gamification" }).catch(() => {});
    return { ok: true, data: { inviterName: inviter.name || null } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ────────────────────────────────────────────────
   WEEKLY DIGEST — progress summary for the past 7 days
   ──────────────────────────────────────────────── */

export interface WeeklyDigest {
  startDate: string;
  endDate: string;
  xpEarned: number;
  tasksCompleted: number;
  classesAttended: number;
  notesCreated: number;
  streak: number;
  rankDelta: number | null;
  topTags: string[];
}

export async function getWeeklyDigest(): Promise<R<WeeklyDigest>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86400_000);
    const startIso = start.toISOString();

    const [logins, tasks] = await Promise.all([
      sb.from("daily_logins").select("xp_granted").eq("user_id", me.id).gte("date", start.toISOString().slice(0, 10)),
      sb.from("tasks").select("id").eq("user_id", me.id).eq("status", "completed").gte("completed_at", startIso),
    ]);

    const xpEarned = ((logins.data || []) as Array<{ xp_granted: number }>).reduce((s, r) => s + (r.xp_granted || 0), 0);
    const tasksCompleted = (tasks.data || []).length;

    return {
      ok: true,
      data: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        xpEarned,
        tasksCompleted,
        classesAttended: 0,
        notesCreated: 0,
        streak: me.streak ?? 0,
        rankDelta: null,
        topTags: [],
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
