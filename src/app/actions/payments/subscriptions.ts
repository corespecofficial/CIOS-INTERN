"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { createFlutterwaveCheckout } from "@/lib/flutterwave";

type SubscriptionScope = "global_membership" | "organization_workspace" | "organization_membership";
type Result = { ok: true; data: { checkoutUrl: string; reference: string } } | { ok: false; error: string };

export async function initiateSubscription(
  scope: SubscriptionScope,
  planCode: string,
  orgSlug?: string,
): Promise<Result> {
  try {
    const me = await getCurrentDbUser();
    if (!me?.email) return { ok: false, error: "Sign in with an email address before subscribing" };
    if (!/^[a-z0-9][a-z0-9_-]{1,49}$/i.test(planCode)) return { ok: false, error: "Invalid plan" };
    const sb = supabaseAdmin();

    const { data: plan } = await sb.from("billing_plans").select("*")
      .eq("scope", scope).eq("code", planCode).eq("active", true).maybeSingle();
    if (!plan) return { ok: false, error: "This subscription plan is not active" };
    if (!plan.flutterwave_plan_id) return { ok: false, error: "The superadmin has not linked this plan to Flutterwave" };

    let orgId: string | null = null;
    if (scope !== "global_membership") {
      if (!orgSlug) return { ok: false, error: "Organization is required" };
      const { data: org } = await sb.from("creative_orgs").select("id, slug").eq("slug", orgSlug).maybeSingle();
      if (!org) return { ok: false, error: "Organization not found" };
      const { data: membership } = await sb.from("org_members").select("role, status")
        .eq("org_id", org.id).eq("user_id", me.id).eq("status", "active").maybeSingle();
      if (!membership) return { ok: false, error: "You are not an active member of this organization" };
      if (scope === "organization_workspace" && !["owner", "org_admin"].includes(membership.role)) {
        return { ok: false, error: "Only organization owners and admins can change workspace billing" };
      }
      orgId = org.id;
    }

    const reference = `CIOS-SUB-${crypto.randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
    const purpose = `${scope}_subscription`;
    const description = `${plan.name} subscription`;
    const { data: intent, error } = await sb.from("payment_intents").insert({
      user_id: me.id, org_id: orgId, amount_ngn: Number(plan.amount), currency: plan.currency,
      purpose, description, reference, gateway: "flutterwave", status: "pending",
      product_type: "billing_plan", product_id: plan.id, payment_plan_id: plan.flutterwave_plan_id,
      metadata: { subscription_scope: scope, plan_code: plan.code, customer_email: me.email },
    }).select("id").single();
    if (error || !intent) return { ok: false, error: error?.message || "Unable to create subscription" };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";
    const returnPath = orgSlug ? `/o/${encodeURIComponent(orgSlug)}/settings` : "/wallet";
    const checkoutUrl = await createFlutterwaveCheckout({
      txRef: reference, amount: Number(plan.amount), currency: plan.currency,
      redirectUrl: `${appUrl}${returnPath}?subscription_ref=${encodeURIComponent(reference)}`,
      customer: { email: me.email, name: me.name }, description,
      paymentPlanId: plan.flutterwave_plan_id,
      meta: { payment_intent_id: intent.id, purpose, scope, plan_code: plan.code, org_id: orgId },
    });
    await sb.from("payment_intents").update({ checkout_url: checkoutUrl, updated_at: new Date().toISOString() }).eq("id", intent.id);
    return { ok: true, data: { checkoutUrl, reference } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to start subscription" };
  }
}
