import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listRecentTransactions, financeTotals } from "@/lib/db";
import { FinanceDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

const ALLOWED = ["admin", "super_admin", "finance"];

export default async function AdminFinancePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!ALLOWED.includes(me.role)) redirect("/dashboard");

  const [totals, txs] = await Promise.all([financeTotals(), listRecentTransactions(20)]);
  return (
    <FinanceDashboard
      stats={totals}
      transactions={txs.map((t) => ({
        id: t.id,
        date: new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        user: t.user_name || "Unknown",
        type: t.type,
        amount: t.amount,
      }))}
    />
  );
}
