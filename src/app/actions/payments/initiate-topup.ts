"use server";

/**
 * Initiates a Monnify wallet top-up.
 *
 * Flow:
 *  1. Validate amount
 *  2. Create payment_intent record (status=pending)
 *  3. Call Monnify API to get a hosted checkout URL
 *  4. Return { checkoutUrl, reference } to the client
 *
 * ⚠️  MONNIFY API KEYS NOT YET CONFIGURED
 *     Set these env vars when your Monnify account is approved:
 *       MONNIFY_API_KEY=
 *       MONNIFY_SECRET_KEY=
 *       MONNIFY_CONTRACT_CODE=
 *       MONNIFY_BASE_URL=https://api.monnify.com   (or https://sandbox.monnify.com for testing)
 *
 *     Until keys are set, the action returns a "pending_gateway" status and
 *     the wallet UI shows the bank transfer details the user provided manually.
 */

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type TopupResult = {
  reference: string;
  checkoutUrl: string | null;
  gatewayReady: boolean;
  amount: number;
};

const MIN_TOPUP = 500;
const MAX_TOPUP = 5_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// Generate unique reference
// ─────────────────────────────────────────────────────────────────────────────
function makeRef(userId: string): string {
  const short = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `CIOS-${short}-${ts}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// getMonnifyToken — Basic auth to get Bearer token (Monnify OAuth2)
// TODO: cache this token (expires in 1h) — replace with Redis or in-memory cache
// ─────────────────────────────────────────────────────────────────────────────
async function getMonnifyToken(): Promise<string | null> {
  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  if (!apiKey || !secretKey) return null;

  const base = process.env.MONNIFY_BASE_URL ?? "https://api.monnify.com";
  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

  try {
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const json = await res.json();
    return json?.responseBody?.accessToken ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// initiateTopup — main server action
// ─────────────────────────────────────────────────────────────────────────────
export async function initiateTopup(amount: number): Promise<R<TopupResult>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
      return { ok: false, error: `Minimum top-up is ₦${MIN_TOPUP.toLocaleString()}` };
    }
    if (amount > MAX_TOPUP) {
      return { ok: false, error: `Maximum single top-up is ₦${MAX_TOPUP.toLocaleString()}` };
    }

    const reference = makeRef(me.id);
    const sb = supabaseAdmin();

    // Create pending payment intent
    await sb.from("payment_intents").insert({
      user_id: me.id,
      amount_ngn: amount,
      purpose: "wallet_topup",
      reference,
      status: "pending",
      metadata: { email: me.email, name: me.name },
    });

    // Try Monnify if keys are configured
    const token = await getMonnifyToken();
    let checkoutUrl: string | null = null;

    if (token) {
      const base = process.env.MONNIFY_BASE_URL ?? "https://api.monnify.com";
      const contractCode = process.env.MONNIFY_CONTRACT_CODE ?? "";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cios.io";

      const body = {
        amount,
        customerName: me.name ?? "CIOS Intern",
        customerEmail: me.email,
        paymentReference: reference,
        paymentDescription: "CIOS Wallet Top-Up",
        currencyCode: "NGN",
        contractCode,
        redirectUrl: `${appUrl}/wallet?ref=${reference}&status=`,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
      };

      const res = await fetch(`${base}/api/v1/merchant/transactions/init-transaction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const json = await res.json();

      if (json?.requestSuccessful && json?.responseBody?.checkoutUrl) {
        checkoutUrl = json.responseBody.checkoutUrl;
        // Update payment intent with checkout URL and Monnify's reference
        await sb.from("payment_intents")
          .update({ checkout_url: checkoutUrl, monnify_ref: json.responseBody.transactionReference })
          .eq("reference", reference);
      }
    }

    revalidatePath("/wallet");
    return {
      ok: true,
      data: {
        reference,
        checkoutUrl,
        gatewayReady: !!checkoutUrl,
        amount,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelTopup — user cancels a pending intent
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelTopup(reference: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    await sb.from("payment_intents")
      .update({ status: "cancelled" })
      .eq("reference", reference)
      .eq("user_id", me.id)
      .eq("status", "pending");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyPayment — manual fallback if webhook is delayed; polls Monnify status
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyPayment(reference: string): Promise<R<{ status: string; amount: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    const sb = supabaseAdmin();
    const { data: intent } = await sb
      .from("payment_intents")
      .select("*")
      .eq("reference", reference)
      .eq("user_id", me.id)
      .maybeSingle();

    if (!intent) return { ok: false, error: "Payment not found" };
    if (intent.status === "success") return { ok: true, data: { status: "success", amount: Number(intent.amount_ngn) } };
    if (intent.status !== "pending") return { ok: true, data: { status: intent.status, amount: Number(intent.amount_ngn) } };

    // Poll Monnify
    const token = await getMonnifyToken();
    if (!token) return { ok: true, data: { status: "pending", amount: Number(intent.amount_ngn) } };

    const base = process.env.MONNIFY_BASE_URL ?? "https://api.monnify.com";
    const encodedRef = encodeURIComponent(reference);
    const res = await fetch(`${base}/api/v2/transactions/${encodedRef}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await res.json();
    const txStatus = json?.responseBody?.paymentStatus;

    if (txStatus === "PAID") {
      // Credit will be handled by the webhook — just report status here
      return { ok: true, data: { status: "success", amount: Number(intent.amount_ngn) } };
    }

    return { ok: true, data: { status: txStatus?.toLowerCase() ?? "pending", amount: Number(intent.amount_ngn) } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
