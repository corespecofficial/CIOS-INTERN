"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { levelFromXP, type XPEventType } from "@/lib/gamification-shared";
import { finalizeChallenge, scoreChallenge } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSuperAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const claimsMeta = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claimsMeta.role === "super_admin") return userId;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.publicMetadata?.role !== "super_admin") throw new Error("Super admin only");
  return userId;
}

export async function getXPRulesOverride(): Promise<Partial<Record<XPEventType, number>>> {
  try {
    const { data } = await supabaseAdmin().from("system_settings").select("value").eq("key", "gamification.xp_rules").maybeSingle();
    if (!data?.value) return {};
    return JSON.parse(data.value) as Partial<Record<XPEventType, number>>;
  } catch { return {}; }
}

export async function saveXPRules(overrides: Partial<Record<XPEventType, number>>): Promise<R> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "user missing" };
    await supabaseAdmin().from("system_settings").upsert({
      key: "gamification.xp_rules",
      value: JSON.stringify(overrides),
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    });
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: "XP rules updated",
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "setting", entityId: "gamification.xp_rules",
      metadata: { overrides },
    });
    revalidatePath("/super-admin/xp-rules");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createChallenge(input: {
  title: string; description: string;
  startsAt: string; endsAt: string;
  eventTypes: XPEventType[]; prizeXP: number; prizeCoins: number;
}): Promise<R<{ id: string }>> {
  try {
    await requireSuperAdmin();
    if (!input.title.trim()) return { ok: false, error: "title required" };
    if (new Date(input.endsAt) <= new Date(input.startsAt)) return { ok: false, error: "end must be after start" };
    const { data, error } = await supabaseAdmin().from("challenges").insert({
      title: input.title,
      description: input.description,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      event_types: input.eventTypes,
      prize_xp: input.prizeXP,
      prize_coins: input.prizeCoins,
      active: true,
    }).select("id").single();
    if (error) return { ok: false, error: error.message };
    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "admin.challenge_created", category: "admin",
      summary: `Launched challenge "${input.title}"`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "challenge", entityId: (data as { id: string }).id,
      metadata: { startsAt: input.startsAt, endsAt: input.endsAt, prizeXP: input.prizeXP },
    });
    revalidatePath("/challenges");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function scoreChallengeAction(id: string): Promise<R<{ entries: number }>> {
  try {
    await requireSuperAdmin();
    const r = await scoreChallenge(id);
    if (!r.ok) return { ok: false, error: r.error || "failed" };
    return { ok: true, data: { entries: r.entries } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function finalizeChallengeAction(id: string): Promise<R<{ winners: number }>> {
  try {
    await requireSuperAdmin();
    const r = await finalizeChallenge(id, 3);
    return { ok: true, data: { winners: r.winners } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function adjustUserXP(userId: string, amount: number, reason: string): Promise<R> {
  try {
    const actor = await requireSuperAdmin();
    const admin = supabaseAdmin();
    await admin.from("xp_events").insert({
      user_id: userId, event_type: amount >= 0 ? "admin_grant" : "admin_penalty", amount,
      ref_type: "admin", ref_id: `${actor}:${Date.now()}`, metadata: { reason, actor },
    });
    const { data: u } = await admin.from("users").select("xp").eq("id", userId).single();
    const newXP = Math.max(0, ((u?.xp as number) || 0) + amount);
    await admin.from("users").update({ xp: newXP, level: levelFromXP(newXP) }).eq("id", userId);
    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "admin.xp_adjusted", category: "admin",
      summary: `${amount >= 0 ? "Granted" : "Deducted"} ${Math.abs(amount)} XP — ${reason}`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "user", entityId: userId,
      metadata: { amount, reason }, severity: "notice",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

