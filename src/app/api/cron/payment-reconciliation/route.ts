import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { supabaseAdmin } from "@/lib/db";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { completeFlutterwavePayment } from "@/lib/payment-service";
import { operationalAlert } from "@/lib/operational-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data, error } = await sb.from("payment_intents").select("*")
    .in("status", ["pending", "processing"])
    .lt("updated_at", staleBefore)
    .order("updated_at", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let recovered = 0, unresolved = 0, failed = 0;
  for (const intent of data || []) {
    if (!intent.gateway_transaction_id) { unresolved += 1; continue; }
    try {
      const tx = await verifyFlutterwaveTransaction(intent.gateway_transaction_id);
      const valid = tx.status === "successful" && tx.tx_ref === intent.reference
        && tx.currency.toUpperCase() === String(intent.currency).toUpperCase()
        && Number(tx.amount) + 0.001 >= Number(intent.amount_ngn);
      if (!valid) { unresolved += 1; continue; }
      if (intent.status === "processing") {
        await sb.from("payment_intents").update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", intent.id).eq("status", "processing");
        intent.status = "pending";
      }
      await completeFlutterwavePayment(intent, tx);
      recovered += 1;
    } catch { failed += 1; }
  }

  if (failed || unresolved >= 5) {
    await operationalAlert("payment_reconciliation_attention", failed ? "error" : "warning", {
      scanned: (data || []).length, recovered, unresolved, failed,
    });
  }
  return NextResponse.json({ ok: failed === 0, scanned: (data || []).length, recovered, unresolved, failed });
}
