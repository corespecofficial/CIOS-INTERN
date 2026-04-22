import {
  getCurrentDbUser,
  getTodaysTasksForCurrentUser,
  getUpcomingClasses,
  getTopLeaderboard,
  getWeeklyPerformance,
  getRecentActivityForCurrentUser,
  listTeamMembers,
  countTasksInProgressForUsers,
  rankForLevel,
  getMyCoursesAsInstructor,
  getInstructorUpcomingClasses,
  getInstructorRecentGrades,
  sumRevenue,
  supabaseAdmin,
} from "@/lib/db";
import { computePersonalMetrics, getWeights } from "@/lib/performance";
import { levelFromXP } from "@/lib/gamification-shared";
import { getFeatureFlags } from "@/app/actions/platform-settings";
import { clerkClient } from "@clerk/nextjs/server";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Fetches the four super-admin stat tiles (users, orgs, revenue, health)
 *  + per-role breakdown, using the same multi-source fan-out as /super-admin.
 *  Returns undefined shape identical to SuperAdminDashboard's `stats` prop. */
async function fetchSuperAdminData() {
  const candidates: number[] = [0];
  let roleBreakdown: Record<string, number> = {};

  try {
    const sb = supabaseAdmin();
    const [headRes, breakdownRes] = await Promise.all([
      sb.from("users").select("*", { count: "exact", head: true }),
      sb.from("users").select("id, role").range(0, 999),
    ]);
    if (typeof headRes.count === "number") candidates.push(headRes.count);
    if (breakdownRes.data) {
      candidates.push(breakdownRes.data.length);
      for (const u of breakdownRes.data) {
        const role = (u.role as string) || "intern";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      }
    }
  } catch (e) {
    console.error("[Dashboard super-admin] supabase exception:", e);
  }

  try {
    const client = await clerkClient();
    const res = await client.users.getUserList({ limit: 200, offset: 0 });
    if (typeof res.totalCount === "number") candidates.push(res.totalCount);
    candidates.push(res.data.length);
    if (Object.keys(roleBreakdown).length === 0) {
      for (const u of res.data) {
        const role = (u.publicMetadata?.role as string) || "intern";
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      }
    }
  } catch (e) {
    console.error("[Dashboard super-admin] clerk exception:", e);
  }

  const [totalRevenue, featureFlags] = await Promise.all([
    sumRevenue(),
    getFeatureFlags(),
  ]);

  return {
    stats: {
      totalUsers: Math.max(...candidates),
      totalRevenue,
      orgs: 1,
      systemHealth: 100,
    },
    featureFlags,
    roleBreakdown,
  };
}

export default async function DashboardPage() {
  const [dbUser, weights] = await Promise.all([getCurrentDbUser(), getWeights()]);
  const isInstructor = dbUser?.role === "instructor";

  const [
    todaysTasks,
    upcomingClasses,
    leaderboard,
    weekly,
    activity,
    teamMembers,
    freshMetrics,
    instructorCourses,
    instructorUpcoming,
    instructorGrades,
  ] = await Promise.all([
    getTodaysTasksForCurrentUser(3),
    getUpcomingClasses(2),
    getTopLeaderboard(3),
    getWeeklyPerformance(),
    getRecentActivityForCurrentUser(4),
    listTeamMembers(),
    dbUser ? computePersonalMetrics(dbUser.id, weights) : Promise.resolve(null),
    isInstructor ? getMyCoursesAsInstructor() : Promise.resolve([]),
    isInstructor ? getInstructorUpcomingClasses(3) : Promise.resolve([]),
    isInstructor ? getInstructorRecentGrades(5) : Promise.resolve([]),
  ]);

  const inProgress = await countTasksInProgressForUsers(teamMembers.map((m) => m.id));
  const teamScore = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((s, m) => s + m.performance, 0) / teamMembers.length)
    : 0;
  const teamLeaderboard = teamMembers
    .slice(0, 5)
    .map((m, i) => ({ rank: i + 1, name: m.name || "Unnamed", xp: m.xp, avatarUrl: m.avatar_url }));

  const level = levelFromXP(dbUser?.xp ?? 0);

  const stats = {
    xp: dbUser?.xp ?? 0,
    streak: dbUser?.streak ?? 0,
    performance: freshMetrics?.total ?? dbUser?.performance ?? 0,
    walletBalance: dbUser?.wallet_balance ?? 0,
    level,
    rank: rankForLevel(level),
    todaysTasks,
    upcomingClasses,
    leaderboard,
    weekly,
    activity,
    teamStats: { members: teamMembers.length, inProgress, teamScore },
    teamLeaderboard,
    instructorData: isInstructor ? {
      courses: instructorCourses.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category || "General",
        difficulty: c.difficulty || "Beginner",
        totalEnrolled: c.total_enrolled || 0,
        totalModules: c.total_modules || 0,
        thumbnailUrl: c.thumbnail_url || null,
      })),
      upcomingClasses: instructorUpcoming,
      recentGrades: instructorGrades,
    } : null,
  };

  const role = dbUser?.role ?? "intern";

  // Super-admins get an extra data bundle (total users, revenue, flags, role
  // breakdown). Every other role renders from `stats` alone, so we skip the
  // extra queries to keep the page fast.
  const superAdmin = role === "super_admin" ? await fetchSuperAdminData() : undefined;

  return <DashboardClient stats={stats} role={role} superAdmin={superAdmin} />;
}
