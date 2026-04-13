import { countUsers, sumRevenue } from "@/lib/db";
import { SuperAdminDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const [totalUsers, totalRevenue] = await Promise.all([
    countUsers(),
    sumRevenue(),
  ]);

  return (
    <SuperAdminDashboard
      stats={{
        totalUsers,
        totalRevenue,
        orgs: 1, // hook to an `organizations` table when multi-tenant ships
        systemHealth: 100,
      }}
    />
  );
}
