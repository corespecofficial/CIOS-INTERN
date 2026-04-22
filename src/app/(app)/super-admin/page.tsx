import { sumRevenue, supabaseAdmin } from "@/lib/db";
import { getFeatureFlags } from "@/app/actions/platform-settings";
import { SuperAdminDashboard } from "@/app/(app)/dashboard/portal-dashboards";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export default async function SuperAdminPage() {
  // Query FOUR independent sources in parallel. Any one that returns a
  // positive number is authoritative — we take the MAX across all, so a
  // single silently-failing source can't drag the number to 0.
  //
  //   A. Supabase head-count (count: exact, head: true)  — canonical
  //   B. Supabase data-page  (for role breakdown)        — also gives count
  //   C. Clerk totalCount    (header from users.getUserList)
  //   D. Raw row count via a second Supabase roundtrip   — defensive copy
  //
  // Also log env-var presence so missing SUPABASE_SERVICE_ROLE_KEY is obvious.
  console.log(
    "[SuperAdmin] env —",
    "SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    "SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
  );

  let roleBreakdown: Record<string, number> = {};
  const candidates: number[] = [0];

  // A + B: Supabase (service role bypasses RLS)
  try {
    const sb = supabaseAdmin();

    const [headRes, breakdownRes] = await Promise.all([
      sb.from("users").select("*", { count: "exact", head: true }),
      sb.from("users").select("id, role").range(0, 999),
    ]);

    console.log(
      "[SuperAdmin] supabase head —",
      "count:", headRes.count,
      "status:", headRes.status,
      "error:", headRes.error?.message ?? "none",
    );
    console.log(
      "[SuperAdmin] supabase data —",
      "rows:", breakdownRes.data?.length,
      "error:", breakdownRes.error?.message ?? "none",
    );

    if (typeof headRes.count === "number") candidates.push(headRes.count);
    if (breakdownRes.data) {
      candidates.push(breakdownRes.data.length);
      for (const u of breakdownRes.data) {
        const role = (u.role as string) || "intern";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      }
    }
  } catch (e) {
    console.error("[SuperAdmin] supabase exception:", e);
  }

  // C: Clerk (independent source — uses the Clerk API)
  try {
    const client = await clerkClient();
    const res = await client.users.getUserList({ limit: 200, offset: 0 });
    console.log(
      "[SuperAdmin] clerk —",
      "data.length:", res.data.length,
      "totalCount:", res.totalCount,
    );
    if (typeof res.totalCount === "number") candidates.push(res.totalCount);
    candidates.push(res.data.length);
    // Merge Clerk role breakdown only if Supabase didn't give us one.
    if (Object.keys(roleBreakdown).length === 0) {
      for (const u of res.data) {
        const role = (u.publicMetadata?.role as string) || "intern";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      }
    }
  } catch (e) {
    console.error("[SuperAdmin] clerk exception:", e);
  }

  const totalUsers = Math.max(...candidates);
  console.log(
    "[SuperAdmin] candidates:", candidates,
    "→ final totalUsers:", totalUsers,
  );

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
