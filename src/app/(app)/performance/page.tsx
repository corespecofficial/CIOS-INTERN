import { getCurrentDbUser } from "@/lib/db";
import { computePersonalMetrics, getTeamMetrics, getOrgMetrics, getWeights } from "@/lib/performance";
import { PerformanceLoader as PerformanceClient } from "./performance-loader";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const weights = await getWeights();
  const canViewTeam = me.role === "team_lead" || me.role === "instructor" || me.role === "admin" || me.role === "super_admin";
  const canViewOrg = me.role === "admin" || me.role === "super_admin";

  const [personal, team, org] = await Promise.all([
    computePersonalMetrics(me.id, weights).catch((e) => {
      console.error("[performance] personal failed:", e);
      return {
        userId: me.id, attendance: 0, tasks: 0, courses: 0, community: 0, consistency: 0, revenue: 0, discipline: 100,
        total: 0, xp: 0, streak: 0, level: 1, reputation: 0,
        weeklyActivity: [], skillBreakdown: [], attendanceTrend: [],
      };
    }),
    canViewTeam ? getTeamMetrics().catch((e) => { console.error("[performance] team failed:", e); return null; }) : null,
    canViewOrg ? getOrgMetrics().catch((e) => { console.error("[performance] org failed:", e); return null; }) : null,
  ]);

  return (
    <PerformanceClient
      me={{ id: me.id, name: me.name, role: me.role }}
      personal={personal}
      team={team}
      org={org}
      weights={weights}
      canSetWeights={me.role === "super_admin"}
    />
  );
}
