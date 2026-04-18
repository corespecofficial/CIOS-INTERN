import { clerkClient } from "@clerk/nextjs/server";
import { sumRevenue } from "@/lib/db";
import { getFeatureFlags } from "@/app/actions/platform-settings";
import { SuperAdminDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  let totalUsers = 0;
  let roleBreakdown: Record<string, number> = {};

  try {
    const client = await clerkClient();

    // Fetch all users (up to 500) — totalCount is the real total from Clerk API
    const allUsers = await client.users.getUserList({ limit: 500, offset: 0 });

    // Log so we can debug in terminal if still 0
    console.log("[SuperAdmin] Clerk users:", allUsers.data.length, "totalCount:", allUsers.totalCount);

    // Use totalCount if valid, fall back to actual array length
    totalUsers = (allUsers.totalCount ?? allUsers.data.length) || allUsers.data.length;

    // Role breakdown from publicMetadata
    for (const u of allUsers.data) {
      const role = (u.publicMetadata?.role as string) || "intern";
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    }
  } catch (e) {
    console.error("[SuperAdmin] Clerk fetch failed:", e);
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
