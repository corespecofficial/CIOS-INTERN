"use server";

import { getCurrentDbUser } from "@/lib/db";
import { awardXP, claimMission as claimMissionSvc, touchLoginStreak, type AwardOptions } from "@/lib/gamification";
import type { XPEventType } from "@/lib/gamification-shared";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function awardXPAction(event: XPEventType, opts: AwardOptions = {}): Promise<R<{ awarded: number; leveledUp?: boolean; newLevel?: number; newBadges?: unknown[]; reason: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "unauthorized" };
    const res = await awardXP(me.id, event, opts);
    return { ok: true, data: { awarded: res.awarded, leveledUp: res.leveledUp, newLevel: res.newLevel, newBadges: res.newBadges, reason: res.reason } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function claimMissionAction(missionId: string): Promise<R<{ xp?: number; coins?: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "unauthorized" };
    const res = await claimMissionSvc(me.id, missionId);
    if (!res.ok) return { ok: false, error: res.error || "failed" };
    return { ok: true, data: { xp: res.xp, coins: res.coins } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pingLoginStreak(): Promise<R<{ streak: number; awarded: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "unauthorized" };
    const r = await touchLoginStreak(me.id);
    return { ok: true, data: { streak: r.streak, awarded: r.awarded } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
