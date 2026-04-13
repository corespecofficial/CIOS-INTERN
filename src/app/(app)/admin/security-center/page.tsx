import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listOpenIncidents, listAuditLogs, getActivityStats } from "@/lib/audit";
import { SecurityCenterClient } from "./security-center-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SecurityCenterPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const [incidents, criticals, stats] = await Promise.all([
    listOpenIncidents(50),
    listAuditLogs({ severity: "critical", limit: 30 }).then((r) => r.rows),
    getActivityStats(),
  ]);

  return <SecurityCenterClient incidents={incidents} criticals={criticals} stats={stats} />;
}
