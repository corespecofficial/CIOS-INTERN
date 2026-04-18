"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { levelFromXP } from "@/lib/gamification-shared";
import { WHEEL_PRIZES, WHEEL_WEIGHTS, type SpinPrize } from "@/lib/spin-wheel-config";


function pickPrize(): SpinPrize & { index: number } {
  const r = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < WHEEL_WEIGHTS.length; i++) {
    cumulative += WHEEL_WEIGHTS[i];
    if (r <= cumulative) return { ...WHEEL_PRIZES[i], index: i };
  }
  return { ...WHEEL_PRIZES[0], index: 0 };
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export type SpinResult =
  | { ok: true; prize: SpinPrize; index: number; bonusAvailable: boolean }
  | { ok: false; error: string; nextSpinAt?: string };

export async function canSpinToday(): Promise<{ canSpin: boolean; nextSpinAt: string | null; bonusAvailable: boolean }> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { canSpin: false, nextSpinAt: null, bonusAvailable: false };

    const sb = supabaseAdmin();
    const { data } = await sb
      .from("spin_wheel_logs")
      .select("spun_at, prize_type")
      .eq("user_id", me.id)
      .order("spun_at", { ascending: false })
      .limit(5);

    const today = new Date();
    const todaySpins = (data ?? []).filter(r => isSameDay(new Date(r.spun_at), today));
    const bonusSpins = (data ?? []).filter(r => isSameDay(new Date(r.spun_at), today) && r.prize_type === "bonus_spin");

    // 1 free spin + 1 bonus spin per day
    const maxSpins = 1 + bonusSpins.length;
    const canSpin = todaySpins.length < maxSpins;

    let nextSpinAt: string | null = null;
    if (!canSpin) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      nextSpinAt = tomorrow.toISOString();
    }

    return {
      canSpin,
      nextSpinAt,
      bonusAvailable: bonusSpins.length > 0 && todaySpins.length === 1,
    };
  } catch {
    return { canSpin: true, nextSpinAt: null, bonusAvailable: false };
  }
}

export async function spinWheel(): Promise<SpinResult> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not logged in" };

    const { canSpin, nextSpinAt } = await canSpinToday();
    if (!canSpin) {
      return { ok: false, error: "Already spun today — come back tomorrow!", nextSpinAt: nextSpinAt ?? undefined };
    }

    const prize = pickPrize();
    const sb = supabaseAdmin();

    // Log the spin
    await sb.from("spin_wheel_logs").insert({
      user_id: me.id,
      prize_label: prize.label,
      prize_type: prize.type,
      prize_amount: prize.amount,
    });

    // Award the prize
    if (prize.type === "xp" && prize.amount > 0) {
      await sb.from("xp_events").insert({
        user_id: me.id,
        event_type: "spin_wheel_win",
        amount: prize.amount,
        ref_type: "spin",
        metadata: { prize: prize.label },
      });
      const { data: userRow } = await sb.from("users").select("xp").eq("id", me.id).single();
      const oldXP = (userRow?.xp as number) || 0;
      const newXP = oldXP + prize.amount;
      await sb.from("users").update({
        xp: newXP,
        level: levelFromXP(newXP),
        last_xp_at: new Date().toISOString(),
      }).eq("id", me.id);
    }

    if (prize.type === "wallet" && prize.amount > 0) {
      const { data: userRow } = await sb.from("users").select("wallet_balance").eq("id", me.id).single();
      const oldBal = (userRow?.wallet_balance as number) || 0;
      await sb.from("users").update({ wallet_balance: oldBal + prize.amount }).eq("id", me.id);
    }

    const { bonusAvailable } = await canSpinToday();
    return { ok: true, prize, index: prize.index, bonusAvailable };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
