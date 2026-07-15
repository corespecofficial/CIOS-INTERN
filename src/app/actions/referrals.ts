"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Generate a random short code like "CIOS-A3X9" */
function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "CIOS-";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Ensure the current user has a referral_code, generate one if missing. */
export async function ensureReferralCode(): Promise<R<{ code: string; referralUrl: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    if (me.referral_code) {
      return { ok: true, data: { code: me.referral_code as string, referralUrl: `/join?ref=${me.referral_code}` } };
    }

    // Generate a unique code
    let code = makeCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await sb.from("users").select("id").eq("referral_code", code).maybeSingle();
      if (!existing) break;
      code = makeCode();
      attempts++;
    }

    await sb.from("users").update({ referral_code: code } as Record<string, unknown>).eq("id", me.id);
    return { ok: true, data: { code, referralUrl: `/join?ref=${code}` } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ReferralStats {
  code: string;
  referralUrl: string;
  total: number;
  joined: number;
  rewarded: number;
  xpEarned: number;
}

export async function getReferralStats(): Promise<R<ReferralStats>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    // Ensure code exists
    const codeRes = await ensureReferralCode();
    if (!codeRes.ok) return { ok: false, error: codeRes.error };
    const { code, referralUrl } = codeRes.data!;

    const { data: rows } = await sb.from("referrals").select("status").eq("referrer_id", me.id);
    const refs = (rows || []) as Array<{ status: string }>;

    return {
      ok: true,
      data: {
        code,
        referralUrl,
        total: refs.length,
        joined: refs.filter((r) => r.status !== "pending").length,
        rewarded: refs.filter((r) => r.status === "rewarded").length,
        xpEarned: refs.filter((r) => r.status === "rewarded").length * 500,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Called during sign-up when ?ref=CODE is in the URL. */
export async function registerReferral(referralCode: string, referredEmail: string): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data: referrer } = await sb.from("users").select("id").eq("referral_code", referralCode).maybeSingle();
    if (!referrer) return;
    await sb.from("referrals").insert({
      referrer_id: (referrer as { id: string }).id,
      referred_email: referredEmail,
      status: "pending",
    });
  } catch { /* non-fatal */ }
}

/** Called when a referred user's account is confirmed — links the referral to the new user. */
export async function linkReferredUser(referredEmail: string, newUserId: string): Promise<void> {
  try {
    const sb = supabaseAdmin();
    await sb.from("referrals")
      .update({ referred_user_id: newUserId, status: "joined", updated_at: new Date().toISOString() })
      .eq("referred_email", referredEmail)
      .eq("status", "pending");
    revalidatePath("/dashboard");
  } catch { /* non-fatal */ }
}

/** Look up who owns a referral code (for the /join welcome page). No auth required. */
export async function getReferrerByCode(code: string): Promise<{ name: string; avatarUrl: string | null } | null> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("users").select("name, avatar_url").eq("referral_code", code).maybeSingle();
    if (!data) return null;
    const row = data as { name: string | null; avatar_url: string | null };
    return { name: row.name || "A CIOS Member", avatarUrl: row.avatar_url };
  } catch {
    return null;
  }
}

/**
 * Called from /post-auth when ?ref=CODE is present.
 * Creates the referral record (status = "joined") and awards 100 XP to the new user.
 * Referrer's 500 XP is awarded separately via rewardReferral() once new user is active.
 */
export async function processReferralJoin(referralCode: string): Promise<{ mainOrgIntern: boolean }> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !me.email) return { mainOrgIntern: false };
    const sb = supabaseAdmin();

    // Look up referrer
    const { data: referrer } = await sb.from("users").select("id,role").eq("referral_code", referralCode).maybeSingle();
    if (!referrer) return { mainOrgIntern: false };
    const referrerId = (referrer as { id: string }).id;
    const isMainOrgReferral = (referrer as { role: string }).role === "super_admin";

    // Prevent self-referral
    if (referrerId === me.id) return { mainOrgIntern: false };

    // Prevent duplicate referrals
    const { data: existing } = await sb.from("referrals").select("id").eq("referred_user_id", me.id).maybeSingle();
    if (existing) {
      if (isMainOrgReferral) {
        await sb.from("users").update({ role: "intern", onboarding_completed_at: new Date().toISOString(), onboarding_intent: "intern" }).eq("id", me.id);
        const client = await clerkClient();
        await client.users.updateUserMetadata(me.clerk_id, { publicMetadata: { role: "intern" } });
      }
      return { mainOrgIntern: isMainOrgReferral };
    }

    // Create referral record as "joined" (user is already confirmed)
    await sb.from("referrals").insert({
      referrer_id: referrerId,
      referred_email: me.email,
      referred_user_id: me.id,
      status: "joined",
    });

    // Award 100 XP welcome bonus to the new user
    await sb.from("users").update({ xp: (me.xp ?? 0) + 100 } as Record<string, unknown>).eq("id", me.id);

    if (isMainOrgReferral) {
      await sb.from("users").update({ role: "intern", onboarding_completed_at: new Date().toISOString(), onboarding_intent: "intern" }).eq("id", me.id);
      const client = await clerkClient();
      await client.users.updateUserMetadata(me.clerk_id, { publicMetadata: { role: "intern" } });
    }

    revalidatePath("/dashboard");
    return { mainOrgIntern: isMainOrgReferral };
  } catch { return { mainOrgIntern: false }; }
}

/** Call when a referred user completes their first active week (streak ≥ 7 or 5+ tasks done). Awards 500 XP to referrer. */
export async function rewardReferral(referredUserId: string): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data: ref } = await sb.from("referrals")
      .select("id, referrer_id")
      .eq("referred_user_id", referredUserId)
      .eq("status", "joined")
      .maybeSingle();
    if (!ref) return;
    const r = ref as { id: string; referrer_id: string };
    // Award 500 XP to referrer
    const { data: u } = await sb.from("users").select("xp").eq("id", r.referrer_id).maybeSingle();
    const newXp = ((u as { xp: number } | null)?.xp || 0) + 500;
    await Promise.all([
      sb.from("users").update({ xp: newXp }).eq("id", r.referrer_id),
      sb.from("referrals").update({ status: "rewarded", xp_awarded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", r.id),
    ]);
    revalidatePath("/dashboard");
  } catch { /* non-fatal */ }
}
