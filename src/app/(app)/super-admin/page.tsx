import { countUsers, sumRevenue } from "@/lib/db";
import { getFeatureFlags, getRoleBreakdown } from "@/app/actions/platform-settings";
import { SuperAdminDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const [totalUsers, totalRevenue, featureFlags, roleBreakdown] = await Promise.all([
    countUsers(),
    sumRevenue(),
    getFeatureFlags(),
    getRoleBreakdown(),
  ]);

  return (
    <SuperAdminDashboard
      stats={{
        totalUsers,
        totalRevenue,
        orgs: 1,
        systemHealth: 100,
      }}
      featureFlags={featureFlags}
      roleBreakdown={roleBreakdown}
    />
  );
}
