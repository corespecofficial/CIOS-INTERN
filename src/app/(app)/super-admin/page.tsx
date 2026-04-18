import { sumRevenue, supabaseAdmin } from "@/lib/db";
import { getFeatureFlags } from "@/app/actions/platform-settings";
import { SuperAdminDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  let totalUsers = 0;
  let roleBreakdown: Record<string, number> = {};

  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("users").select("id, role");
    if (error) {
      console.error("[SuperAdmin] Supabase users fetch failed:", error.message);
    } else if (data) {
      totalUsers = data.length;
      for (const u of data) {
        const role = u.role || "intern";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      }
    }
    console.log("[SuperAdmin] totalUsers from DB:", totalUsers);
  } catch (e) {
    console.error("[SuperAdmin] Unexpected error:", e);
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
