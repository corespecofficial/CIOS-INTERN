"use server";

/**
 * Captures spam-detection signals from the actual signup browser the
 * first time the user lands on /onboarding/intent. The Clerk webhook
 * can't see these headers (it's invoked from Clerk's infra, not the
 * user's browser), so this is the right place.
 *
 * Idempotent: if signup_ip_hash is already set, this is a no-op.
 */

import { headers } from "next/headers";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { assessSignupRisk } from "@/lib/spam-detection";

export async function recordSignupSignals(): Promise<{ ok: boolean; risk: number; verdict: string }> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, risk: 0, verdict: "ok" };

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("signup_ip_hash, signup_risk_score")
    .eq("id", me.id)
    .maybeSingle();
  const row = data as { signup_ip_hash: string | null; signup_risk_score: number } | null;
  if (row?.signup_ip_hash) {
    // Already captured — return what's stored, don't recompute.
    return { ok: true, risk: row.signup_risk_score, verdict: row.signup_risk_score >= 90 ? "block" : row.signup_risk_score >= 50 ? "review" : "ok" };
  }

  const h = await headers();
  const reqHeaders = new Headers();
  // next/headers exposes a ReadonlyHeaders, but the iterator works.
  h.forEach((v, k) => reqHeaders.set(k, v));

  const assessment = await assessSignupRisk(me.email, reqHeaders);

  const patch: Record<string, unknown> = {
    signup_ip_hash: assessment.signals.ip_hash,
    signup_ua_hash: assessment.signals.ua_hash,
    signup_risk_score: assessment.score,
    signup_signals: assessment.signals,
  };

  // Hard-block path: auto-suspend with audit trail. Super-admin gets a ping.
  if (assessment.verdict === "block") {
    patch.suspended_at = new Date().toISOString();
    patch.suspended_reason = `auto: signup risk ${assessment.score} (${assessment.signals.flags.join(", ")})`;
    patch.status = "suspended";
  }

  await sb.from("users").update(patch).eq("id", me.id);

  if (assessment.verdict !== "ok") {
    const { data: admins } = await sb.from("users").select("id").eq("role", "super_admin");
    for (const a of (admins || []) as { id: string }[]) {
      await sb.from("notifications").insert({
        user_id: a.id,
        title: assessment.verdict === "block" ? "🚨 Auto-suspended (high spam score)" : "⚠️ Flagged signup for review",
        message: `${me.email} · score ${assessment.score} · flags: ${assessment.signals.flags.join(", ") || "none"}`,
        type: assessment.verdict === "block" ? "error" : "warning",
        action_url: "/super-admin/visitors",
        is_read: false,
      });
    }
  }

  return { ok: true, risk: assessment.score, verdict: assessment.verdict };
}
