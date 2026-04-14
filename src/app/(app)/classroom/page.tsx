import {
  listClassSessions, getCurrentDbUser, supabaseAdmin,
  getTodaysTasksForCurrentUser, getRecentActivityForCurrentUser,
  getMyEnrolledCourses, rankForLevel,
} from "@/lib/db";
import { levelFromXP } from "@/lib/gamification-shared";
import { computePersonalMetrics, getWeights } from "@/lib/performance";
import { ClassroomClient } from "./classroom-client";

export const dynamic = "force-dynamic";

export default async function ClassroomPage() {
  const me = await getCurrentDbUser();
  if (!me) return null;

  const [sessions, todaysTasks, activity, enrolled, weights, xpSumRow, loginDaysRes] = await Promise.all([
    listClassSessions({ upcomingOnly: false, limit: 100 }),
    getTodaysTasksForCurrentUser(6),
    getRecentActivityForCurrentUser(5),
    getMyEnrolledCourses(),
    getWeights(),
    // Live XP sum — xp_events is the source of truth (users.xp is cached)
    supabaseAdmin().from("xp_events").select("amount").eq("user_id", me.id),
    // Live login-streak computation from user_events
    supabaseAdmin().from("user_events")
      .select("created_at")
      .eq("user_id", me.id)
      .in("event", ["session_start", "page_view"])
      .gte("created_at", new Date(Date.now() - 120 * 86400_000).toISOString()),
  ]);

  const canInstruct = me.role === "instructor" || me.role === "admin" || me.role === "super_admin";

  // Live XP: prefer xp_events sum, fall back to cached users.xp if the events
  // table hasn't been populated yet (e.g. on a fresh deployment).
  const xpFromEvents = ((xpSumRow.data || []) as Array<{ amount: number }>).reduce((s, r) => s + (r.amount || 0), 0);
  const liveXp = xpFromEvents > 0 ? xpFromEvents : (me.xp || 0);
  const liveLevel = levelFromXP(liveXp);

  // Live login streak (consecutive UTC days ending today/yesterday)
  const loginDays = new Set<string>();
  for (const e of ((loginDaysRes.data || []) as Array<{ created_at: string }>)) {
    loginDays.add(e.created_at.slice(0, 10));
  }
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!loginDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let liveStreak = 0;
  while (loginDays.has(cursor.toISOString().slice(0, 10))) {
    liveStreak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Live performance from the actual performance engine (not the cached column)
  const metrics = await computePersonalMetrics(me.id, weights).catch(() => null);
  const livePerformance = metrics ? Math.round(metrics.total) : (me.performance ?? 0);

  const continueLearning = enrolled
    .filter((c) => c.progress > 0 && c.progress < 100)
    .slice(0, 4)
    .map((c) => ({
      id: c.id, title: c.title, progress: c.progress,
      thumbnailUrl: c.thumbnail_url, category: c.category,
    }));

  return (
    <ClassroomClient
      sessions={sessions}
      canInstruct={canInstruct}
      panels={{
        todaysTasks,
        activity,
        continueLearning,
        rewards: {
          xp: liveXp,
          streak: liveStreak,
          level: liveLevel,
          rank: rankForLevel(liveLevel),
          performance: livePerformance,
        },
      }}
    />
  );
}
