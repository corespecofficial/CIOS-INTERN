"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { createFlutterwaveCheckout, verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { completeFlutterwavePayment } from "@/lib/payment-service";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };
export type TopupResult = { reference: string; checkoutUrl: string | null; gatewayReady: boolean; amount: number };

const MIN_TOPUP = 500;
const MAX_TOPUP = 5_000_000;

function makeRef(userId: string, purpose = "WALLET"): string {
  const user = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `CIOS-${purpose}-${user}-${nonce}`;
}

export async function initiateTopup(amount: number): Promise<R<TopupResult>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!Number.isFinite(amount) || amount < MIN_TOPUP) return { ok: false, error: `Minimum top-up is ₦${MIN_TOPUP.toLocaleString()}` };
    if (amount > MAX_TOPUP) return { ok: false, error: `Maximum single top-up is ₦${MAX_TOPUP.toLocaleString()}` };
    if (!me.email) return { ok: false, error: "Add an email address before making a payment" };

    const reference = makeRef(me.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";
    const sb = supabaseAdmin();
    const { data: intent, error } = await sb.from("payment_intents").insert({
      user_id: me.id,
      org_id: null,
      amount_ngn: amount,
      currency: "NGN",
      purpose: "wallet_topup",
      description: "CIOS wallet top-up",
      reference,
      gateway: "flutterwave",
      status: "pending",
      metadata: { customer_email: me.email, customer_name: me.name, workspace: "root" },
    }).select("id").single();
    if (error || !intent) return { ok: false, error: error?.message || "Unable to create payment" };

    try {
      const checkoutUrl = await createFlutterwaveCheckout({
        txRef: reference,
        amount,
        currency: "NGN",
        redirectUrl: `${appUrl}/wallet?ref=${encodeURIComponent(reference)}`,
        customer: { email: me.email, name: me.name },
        description: "CIOS wallet top-up",
        meta: { payment_intent_id: intent.id, purpose: "wallet_topup", workspace: "root" },
      });
      await sb.from("payment_intents").update({ checkout_url: checkoutUrl, updated_at: new Date().toISOString() }).eq("id", intent.id);
      revalidatePath("/wallet");
      return { ok: true, data: { reference, checkoutUrl, gatewayReady: true, amount } };
    } catch (gatewayError) {
      await sb.from("payment_intents").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", intent.id);
      return { ok: false, error: gatewayError instanceof Error ? gatewayError.message : "Flutterwave checkout failed" };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected error" };
  }
}

export async function cancelTopup(reference: string): Promise<R> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Not authenticated" };
  await supabaseAdmin().from("payment_intents").update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("reference", reference).eq("user_id", me.id).eq("status", "pending");
  return { ok: true };
}

export async function verifyPayment(reference: string): Promise<R<{ status: string; amount: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: intent } = await sb.from("payment_intents").select("*").eq("reference", reference).eq("user_id", me.id).maybeSingle();
    if (!intent) return { ok: false, error: "Payment not found" };
    if (intent.status === "success" || intent.status !== "pending" || !intent.gateway_transaction_id) {
      return { ok: true, data: { status: intent.status, amount: Number(intent.amount_ngn) } };
    }
    const tx = await verifyFlutterwaveTransaction(intent.gateway_transaction_id);
    if (tx.status === "successful" && tx.tx_ref === intent.reference && tx.currency === intent.currency && Number(tx.amount) >= Number(intent.amount_ngn)) {
      await completeFlutterwavePayment(intent, tx);
      return { ok: true, data: { status: "success", amount: Number(intent.amount_ngn) } };
    }
    return { ok: true, data: { status: "pending", amount: Number(intent.amount_ngn) } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to verify payment" };
  }
}
