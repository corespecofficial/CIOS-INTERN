"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { awardVariableXP } from "@/lib/gamification";
import { WHEEL_PRIZES, WHEEL_WEIGHTS, type SpinPrize } from "@/lib/spin-wheel-config";
import { revalidatePath } from "next/cache";


function pickPrize(): SpinPrize & { index: number } {
  const r = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < WHEEL_WEIGHTS.length; i++) {
    cumulative += WHEEL_WEIGHTS[i];
    if (r <= cumulative) return { ...WHEEL_PRIZES[i], index: i };
  }
  return { ...WHEEL_PRIZES[0], index: 0 };
}

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextUtcMidnight(from: Date) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1)).toISOString();
}

export type SpinResult =
  | { ok: true; prize: SpinPrize; index: number; bonusAvailable: boolean; xpAwarded: number; walletAwarded: number }
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

    const today = utcDayKey(new Date());
    const todaySpins = (data ?? []).filter((r) => utcDayKey(new Date(r.spun_at)) === today);
    const bonusWonToday = todaySpins.some((r) => r.prize_type === "bonus_spin");

    // 1 free spin + 1 bonus spin per day
    const maxSpins = bonusWonToday ? 2 : 1;
    const canSpin = todaySpins.length < maxSpins;

    let nextSpinAt: string | null = null;
    if (!canSpin) {
      nextSpinAt = nextUtcMidnight(new Date());
    }

    return {
      canSpin,
      nextSpinAt,
      bonusAvailable: bonusWonToday && todaySpins.length === 1,
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
    const { data: spinLog, error: logError } = await sb.from("spin_wheel_logs").insert({
      user_id: me.id,
      prize_label: prize.label,
      prize_type: prize.type,
      prize_amount: prize.amount,
    }).select("id").single();
    if (logError || !spinLog) throw new Error(`Unable to record spin: ${logError?.message || "unknown error"}`);

    // Award the prize
    let xpAwarded = 0;
    let walletAwarded = 0;
    if (prize.type === "xp" && prize.amount > 0) {
      const xp = await awardVariableXP(me.id, "spin_wheel_win", prize.amount, {
        refType: "spin_wheel",
        refId: spinLog.id,
        metadata: { prize: prize.label },
      });
      xpAwarded = xp.awarded;
    }

    if (prize.type === "wallet" && prize.amount > 0) {
      const { data: userRow, error: readError } = await sb.from("users").select("wallet_balance").eq("id", me.id).single();
      if (readError) throw new Error(`Unable to read wallet balance: ${readError.message}`);
      const oldBal = (userRow?.wallet_balance as number) || 0;
      const { error: walletError } = await sb.from("users").update({ wallet_balance: oldBal + prize.amount }).eq("id", me.id);
      if (walletError) throw new Error(`Unable to credit wallet: ${walletError.message}`);
      walletAwarded = prize.amount;
    }

    const { bonusAvailable } = await canSpinToday();
    revalidatePath("/gamification");
    revalidatePath("/wallet");
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");
    return { ok: true, prize, index: prize.index, bonusAvailable, xpAwarded, walletAwarded };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
