import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import WalletClient, { type WalletTx, type UnpaidFine } from "./wallet-client";

export const dynamic = "force-dynamic";

const CREDIT_TYPES = new Set(["credit", "reward", "payment", "refund", "stipend", "bonus"]);
function isCredit(type: string) { return CREDIT_TYPES.has(type); }

export default async function WalletPage() {
  const dbUser = await getCurrentDbUser();
  const balance = Number(dbUser?.wallet_balance ?? 0);

  let txs: WalletTx[] = [];
  let monthDelta = 0, monthEarnings = 0, monthFines = 0, monthRewards = 0;
  let unpaidFines: UnpaidFine[] = [];

  if (dbUser) {
    const sb = supabaseAdmin();
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const [txRes, fineRes] = await Promise.all([
      sb.from("transactions")
        .select("id, type, amount, description, status, currency, gateway, gateway_ref, balance_after, created_at")
        .eq("user_id", dbUser.id)
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("compliance_fines")
        .select("id, amount, description, issued_at")
        .eq("user_id", dbUser.id)
        .eq("status", "unpaid")
        .order("issued_at", { ascending: false }),
    ]);

    txs = ((txRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      type: r.type as string,
      amount: Number(r.amount),
      description: (r.description as string) || (r.type as string),
      status: (r.status as string) ?? "completed",
      currency: (r.currency as string) ?? "NGN",
      gateway: (r.gateway as string) ?? "internal",
      gateway_ref: r.gateway_ref as string | null,
      created_at: r.created_at as string,
    }));

    // 30-day stats
    const recent = txs.filter((t) => new Date(t.created_at).getTime() >= Date.now() - 30 * 86400 * 1000);
    for (const t of recent) {
      if (t.type === "fine") monthFines += t.amount;
      else if (t.type === "reward") monthRewards += t.amount;
      else if (isCredit(t.type)) monthEarnings += t.amount;
    }
    monthDelta = monthEarnings + monthRewards - monthFines;

    unpaidFines = ((fineRes.data ?? []) as Array<Record<string, unknown>>).map((f) => ({
      id: f.id as string,
      amount: Number(f.amount),
      description: (f.description as string) ?? "Compliance fine",
      issued_at: f.issued_at as string,
    }));
  }

  return (
    <WalletClient
      balance={balance}
      txs={txs}
      monthDelta={monthDelta}
      monthEarnings={monthEarnings}
      monthFines={monthFines}
      monthRewards={monthRewards}
      unpaidFines={unpaidFines}
    />
  );
}
