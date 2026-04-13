import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import WalletClient, { type WalletTx } from "./wallet-client";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const dbUser = await getCurrentDbUser();
  const balance = dbUser?.wallet_balance ?? 0;
  let txs: WalletTx[] = [];
  let monthDelta = 0;
  if (dbUser) {
    const { data } = await supabaseAdmin()
      .from("transactions")
      .select("id, type, amount, description, created_at")
      .eq("user_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(30);
    txs = ((data || []) as Array<{ id: string; type: string; amount: number | string; description: string | null; created_at: string }>).map((r) => ({
      id: r.id, type: r.type, amount: Number(r.amount), description: r.description || r.type, created_at: r.created_at,
    }));
    const since = Date.now() - 30 * 86400 * 1000;
    monthDelta = txs
      .filter((t) => new Date(t.created_at).getTime() >= since)
      .reduce((s, t) => s + (isCredit(t.type) ? t.amount : -t.amount), 0);
  }
  return <WalletClient balance={balance} txs={txs} monthDelta={monthDelta} />;
}

function isCredit(type: string) {
  return type === "credit" || type === "reward" || type === "payment" || type === "refund" || type === "stipend" || type === "bonus";
}
