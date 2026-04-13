import { countUsers, countActiveUsers, countUsersByRole } from "@/lib/db";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [total, dau, wau, mau, byRole] = await Promise.all([
    countUsers(),
    countActiveUsers(1),
    countActiveUsers(7),
    countActiveUsers(30),
    countUsersByRole(),
  ]);

  return (
    <AnalyticsClient
      totalUsers={total}
      dau={dau}
      wau={wau}
      mau={mau}
      roleCounts={byRole}
    />
  );
}
