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
} from "@/lib/db";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    dbUser,
    todaysTasks,
    upcomingClasses,
    leaderboard,
    weekly,
    activity,
    teamMembers,
  ] = await Promise.all([
    getCurrentDbUser(),
    getTodaysTasksForCurrentUser(3),
    getUpcomingClasses(2),
    getTopLeaderboard(3),
    getWeeklyPerformance(),
    getRecentActivityForCurrentUser(4),
    listTeamMembers(),
  ]);

  const inProgress = await countTasksInProgressForUsers(teamMembers.map((m) => m.id));
  const teamScore = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((s, m) => s + m.performance, 0) / teamMembers.length)
    : 0;
  const teamLeaderboard = teamMembers
    .slice(0, 5)
    .map((m, i) => ({ rank: i + 1, name: m.name || "Unnamed", xp: m.xp, avatarUrl: m.avatar_url }));

  const level = dbUser?.level ?? 1;

  const stats = {
    xp: dbUser?.xp ?? 0,
    streak: dbUser?.streak ?? 0,
    performance: dbUser?.performance ?? 0,
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
  };

  return <DashboardClient stats={stats} />;
}
