import { sumRevenue, supabaseAdmin } from "@/lib/db";
import { getFeatureFlags } from "@/app/actions/platform-settings";
import { SuperAdminDashboard } from "@/app/(app)/dashboard/portal-dashboards";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  let totalUsers = 0;
  let roleBreakdown: Record<string, number> = {};

  // Try Supabase first (service role key bypasses RLS)
  try {
    const sb = supabaseAdmin();
    const { data, error, count } = await sb
      .from("users")
      .select("id, role", { count: "exact" });

    console.log("[SuperAdmin] Supabase result — data:", data?.length, "count:", count, "error:", error?.message ?? "none");

    if (!error && data && data.length > 0) {
      totalUsers = data.length;
      for (const u of data) {
        const role = (u.role as string) || "intern";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      }
    }
  } catch (e) {
    console.error("[SuperAdmin] Supabase exception:", e);
  }

  // If Supabase returned 0, fall back to Clerk (the definitive source)
  if (totalUsers === 0) {
    try {
      const client = await clerkClient();
      const res = await client.users.getUserList({ limit: 200, offset: 0 });
      console.log("[SuperAdmin] Clerk fallback — data.length:", res.data.length, "totalCount:", res.totalCount);
      if (res.data.length > 0) {
        totalUsers = res.data.length;
        for (const u of res.data) {
          const role = (u.publicMetadata?.role as string) || "intern";
          roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
        }
      }
    } catch (e) {
      console.error("[SuperAdmin] Clerk exception:", e);
    }
  }

  console.log("[SuperAdmin] Final totalUsers:", totalUsers);

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
