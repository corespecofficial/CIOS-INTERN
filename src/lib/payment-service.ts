import "server-only";

import { supabaseAdmin } from "@/lib/db";
import { atomicWalletCredit } from "@/app/actions/payments/wallet-debit";
import type { VerifiedFlutterwaveTransaction } from "@/lib/flutterwave";

type PaymentIntent = {
  id: string;
  user_id: string;
  org_id: string | null;
  reference: string;
  purpose: string;
  amount_ngn: number;
  currency: string;
  description: string | null;
  product_type: string | null;
  product_id: string | null;
  payment_plan_id: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
};

function receiptNumber(intent: PaymentIntent): string {
  return `CIOS-RCP-${intent.reference.replace(/[^A-Za-z0-9]/g, "").slice(-18).toUpperCase()}`;
}

async function settleFine(intent: PaymentIntent, gatewayRef: string) {
  const fineId = intent.product_id || String(intent.metadata?.fine_id || "");
  if (!fineId) throw new Error("Fine payment is missing its fine ID");
  const sb = supabaseAdmin();
  const { data: fine } = await sb.from("compliance_fines")
    .select("id, user_id, status, amount").eq("id", fineId).maybeSingle();
  if (!fine || fine.user_id !== intent.user_id) throw new Error("Fine ownership mismatch");
  if (fine.status === "paid") return;
  if (fine.status !== "unpaid" || Math.abs(Number(fine.amount) - Number(intent.amount_ngn)) > 0.01) {
    throw new Error("Fine state or amount changed before settlement");
  }
  await sb.from("compliance_fines").update({
    status: "paid", paid_at: new Date().toISOString(), payment_ref: gatewayRef,
  }).eq("id", fineId).eq("status", "unpaid");
  const { count: remaining } = await sb.from("compliance_fines").select("id", { count: "exact", head: true })
    .eq("user_id", intent.user_id).eq("status", "unpaid");
  if (!remaining) {
    const { data: suspension } = await sb.from("compliance_suspensions").select("id, reason")
      .eq("user_id", intent.user_id).eq("status", "active").maybeSingle();
    if (suspension?.reason?.toLowerCase().includes("unpaid fine")) {
      await sb.from("compliance_suspensions").update({ status: "lifted", lifted_at: new Date().toISOString() }).eq("id", suspension.id);
    }
  }
}

async function activateSubscription(intent: PaymentIntent) {
  const scope = String(intent.metadata?.subscription_scope || "");
  const planCode = String(intent.metadata?.plan_code || "");
  const email = String(intent.metadata?.customer_email || "");
  if (!scope || !planCode || !email) throw new Error("Subscription metadata is incomplete");
  const sb = supabaseAdmin();
  let existingQuery = sb.from("billing_subscriptions").select("id")
    .eq("user_id", intent.user_id).eq("scope", scope).eq("plan_code", planCode);
  existingQuery = intent.org_id ? existingQuery.eq("org_id", intent.org_id) : existingQuery.is("org_id", null);
  const { data: existing } = await existingQuery.maybeSingle();
  const subscription = {
    user_id: intent.user_id,
    org_id: intent.org_id,
    scope,
    plan_code: planCode,
    flutterwave_plan_id: intent.payment_plan_id,
    customer_email: email,
    status: "active",
    current_period_start: new Date().toISOString(),
    last_payment_intent_id: intent.id,
    metadata: intent.metadata || {},
    updated_at: new Date().toISOString(),
  };
  if (existing) await sb.from("billing_subscriptions").update(subscription).eq("id", existing.id);
  else await sb.from("billing_subscriptions").insert(subscription);
  if (scope === "organization_workspace" && intent.org_id) {
    await sb.from("creative_orgs").update({ billing_plan: planCode, billing_status: "active", billing_owner_user_id: intent.user_id }).eq("id", intent.org_id);
  }
}

export async function completeFlutterwavePayment(intent: PaymentIntent, tx: VerifiedFlutterwaveTransaction): Promise<void> {
  const sb = supabaseAdmin();
  if (intent.status === "success") return;
  const { data: claimed } = await sb.from("payment_intents").update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", intent.id).eq("status", "pending").select("id").maybeSingle();
  if (!claimed) return;

  try {
    if (intent.purpose === "wallet_topup") {
      const credit = await atomicWalletCredit({
        userId: intent.user_id,
        amount: Number(intent.amount_ngn),
        type: "credit",
        description: intent.description || "CIOS wallet top-up",
        idempotencyKey: `flutterwave-${tx.id}`,
        gatewayRef: tx.flw_ref,
        gateway: "flutterwave",
        metadata: { payment_intent_id: intent.id, org_id: intent.org_id, purpose: intent.purpose },
      });
      if (!credit.ok) throw new Error(credit.error);
    } else if (intent.purpose === "fine_payment") {
      await settleFine(intent, tx.flw_ref);
    } else if (intent.purpose.endsWith("subscription")) {
      await activateSubscription(intent);
    }

    const receipt = receiptNumber(intent);
    await sb.from("payment_receipts").upsert({
      receipt_number: receipt,
      payment_intent_id: intent.id,
      user_id: intent.user_id,
      org_id: intent.org_id,
      purpose: intent.purpose,
      description: intent.description || intent.purpose,
      amount: Number(intent.amount_ngn),
      currency: intent.currency,
      gateway: "flutterwave",
      gateway_transaction_id: String(tx.id),
      gateway_ref: tx.flw_ref,
      metadata: { ...(intent.metadata || {}), payment_type: tx.payment_type || null },
    }, { onConflict: "payment_intent_id" });
    await sb.from("payment_intents").update({
      status: "success",
      gateway_transaction_id: String(tx.id),
      gateway_ref: tx.flw_ref,
      receipt_number: receipt,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", intent.id);
  } catch (error) {
    await sb.from("payment_intents").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", intent.id).eq("status", "processing");
    throw error;
  }
}
