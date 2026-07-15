import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { completeFlutterwavePayment } from "@/lib/payment-service";
import { operationalAlert } from "@/lib/operational-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(raw: string, supplied: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.FLW_SECRET_HASH;
  if (!secret) return NextResponse.json({ error: "Webhook verification unavailable" }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("flutterwave-signature") || "";
  if (!validSignature(raw, signature, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let payload: { type?: string; event?: string; data?: { id?: string | number; status?: string } };
  try { payload = JSON.parse(raw) as typeof payload; }
  catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  const eventType = payload.type || payload.event;
  if (eventType !== "charge.completed" || !payload.data?.id) return NextResponse.json({ received: true });

  try {
    const tx = await verifyFlutterwaveTransaction(payload.data.id);
    const { data: intent } = await supabaseAdmin().from("payment_intents").select("*").eq("reference", tx.tx_ref).maybeSingle();
    if (!intent) return NextResponse.json({ received: true });
    const amount = Number(intent.amount_ngn);
    const currency = String(intent.currency || "NGN").toUpperCase();
    if (tx.status !== "successful" || tx.tx_ref !== intent.reference || tx.currency.toUpperCase() !== currency || Number(tx.amount) + 0.001 < amount) {
      return NextResponse.json({ error: "Transaction verification failed" }, { status: 400 });
    }
    await completeFlutterwavePayment(intent, tx);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[flutterwave-webhook] settlement failed:", error instanceof Error ? error.message : String(error));
    await operationalAlert("flutterwave_webhook_settlement_failed", "error", {
      event: eventType,
      transactionId: payload.data?.id ? String(payload.data.id) : null,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Settlement failed" }, { status: 500 });
  }
}
