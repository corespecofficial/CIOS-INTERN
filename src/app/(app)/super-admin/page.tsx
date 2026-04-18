import { sumRevenue } from "@/lib/db";
import { getFeatureFlags } from "@/app/actions/platform-settings";
import { listUsers } from "@/app/actions/users";
import { SuperAdminDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  let totalUsers = 0;
  let roleBreakdown: Record<string, number> = {};

  const usersRes = await listUsers();
  if (usersRes.ok) {
    totalUsers = usersRes.users.length;
    for (const u of usersRes.users) {
      roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
    }
  } else {
    console.error("[SuperAdmin] listUsers failed:", usersRes.error);
  }

  const [totalRevenue, featureFlags] = await Promise.all([
    sumRevenue(),
    getFeatureFlags(),
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
