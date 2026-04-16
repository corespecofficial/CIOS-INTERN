/**
 * Monnify Webhook Handler
 *
 * Monnify sends a POST to this endpoint on every transaction event.
 * We verify the HMAC-SHA512 signature before trusting the payload.
 *
 * Supported events:
 *   SUCCESSFUL_TRANSACTION  → credit user wallet (top-up)
 *   FAILED_TRANSACTION      → mark payment_intent as failed
 *   SUCCESSFUL_DISBURSEMENT → mark withdrawal_request as paid
 *
 * Configure in Monnify Dashboard → Settings → Webhook:
 *   URL: https://yourdomain.com/api/webhooks/monnify
 *
 * ⚠️  MONNIFY_SECRET_KEY must be set in env vars for signature verification.
 *     Until then, webhook will return 200 without processing (to avoid Monnify retries).
 */

import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/db";
import { atomicWalletCredit } from "@/app/actions/payments/wallet-debit";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Signature verification
// ─────────────────────────────────────────────────────────────────────────────
function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha512", secret).update(body).digest("hex");
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/monnify
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("monnify-signature") ?? "";
  const secret = process.env.MONNIFY_SECRET_KEY ?? "";

  // If secret not yet configured, acknowledge without processing
  if (!secret) {
    console.warn("[monnify-webhook] MONNIFY_SECRET_KEY not set — skipping verification");
    return new Response("OK", { status: 200 });
  }

  if (!verifySignature(body, signature, secret)) {
    console.error("[monnify-webhook] Signature mismatch — rejecting request");
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const eventType = event.eventType as string;
  const eventData = event.eventData as Record<string, unknown> | undefined;

  try {
    if (eventType === "SUCCESSFUL_TRANSACTION") {
      await handleSuccessfulTransaction(eventData ?? {});
    } else if (eventType === "FAILED_TRANSACTION") {
      await handleFailedTransaction(eventData ?? {});
    } else if (eventType === "SUCCESSFUL_DISBURSEMENT") {
      await handleSuccessfulDisbursement(eventData ?? {});
    }
  } catch (err) {
    console.error("[monnify-webhook] Handler error:", err);
    // Return 200 so Monnify doesn't retry — we log the error for manual review
    return new Response("Error logged", { status: 200 });
  }

  return new Response("OK", { status: 200 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleSuccessfulTransaction(data: Record<string, unknown>) {
  const paymentRef = data.paymentReference as string;
  const monnifyRef = data.transactionReference as string;
  const paidAmount = Number(data.amountPaid ?? data.amount ?? 0);

  if (!paymentRef || paidAmount <= 0) {
    console.error("[monnify-webhook] Missing paymentReference or amount");
    return;
  }

  const sb = supabaseAdmin();

  // Find the payment intent
  const { data: intent } = await sb
    .from("payment_intents")
    .select("*")
    .eq("reference", paymentRef)
    .maybeSingle();

  if (!intent) {
    console.error("[monnify-webhook] payment_intent not found for ref:", paymentRef);
    return;
  }

  if (intent.status === "success") {
    console.log("[monnify-webhook] Already processed:", paymentRef);
    return; // idempotent
  }

  // Credit the wallet
  const idempotencyKey = `monnify-topup-${monnifyRef}`;
  const credit = await atomicWalletCredit({
    userId: intent.user_id,
    amount: paidAmount,
    type: "credit",
    description: `Wallet top-up via Monnify`,
    idempotencyKey,
    gatewayRef: monnifyRef,
    gateway: "monnify",
    metadata: { payment_intent_id: intent.id, payment_ref: paymentRef },
  });

  if (!credit.ok) {
    console.error("[monnify-webhook] Credit failed:", credit.error);
    return;
  }

  // Mark intent as success
  await sb.from("payment_intents").update({
    status: "success",
    monnify_ref: monnifyRef,
    resolved_at: new Date().toISOString(),
  }).eq("reference", paymentRef);

  console.log(`[monnify-webhook] Credited ₦${paidAmount} to user ${intent.user_id}`);
}

async function handleFailedTransaction(data: Record<string, unknown>) {
  const paymentRef = data.paymentReference as string;
  if (!paymentRef) return;

  const sb = supabaseAdmin();
  await sb.from("payment_intents")
    .update({ status: "failed", resolved_at: new Date().toISOString() })
    .eq("reference", paymentRef)
    .eq("status", "pending");

  console.log("[monnify-webhook] Payment failed:", paymentRef);
}

async function handleSuccessfulDisbursement(data: Record<string, unknown>) {
  const monnifyRef = data.transactionReference as string;
  if (!monnifyRef) return;

  const sb = supabaseAdmin();
  await sb.from("withdrawal_requests")
    .update({
      status: "paid",
      monnify_ref: monnifyRef,
    })
    .eq("monnify_ref", monnifyRef);

  console.log("[monnify-webhook] Disbursement confirmed:", monnifyRef);
}
