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
} from "@/lib/db";
import { computePersonalMetrics, getWeights } from "@/lib/performance";
import { levelFromXP } from "@/lib/gamification-shared";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

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

  return <DashboardClient stats={stats} role={dbUser?.role ?? "intern"} />;
}
