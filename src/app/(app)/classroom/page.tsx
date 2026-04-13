import {
  listClassSessions, getCurrentDbUser,
  getTodaysTasksForCurrentUser, getRecentActivityForCurrentUser,
  getMyEnrolledCourses, rankForLevel,
} from "@/lib/db";
import { ClassroomClient } from "./classroom-client";

export const dynamic = "force-dynamic";

export default async function ClassroomPage() {
  const [me, sessions, todaysTasks, activity, enrolled] = await Promise.all([
    getCurrentDbUser(),
    listClassSessions({ upcomingOnly: false, limit: 100 }),
    getTodaysTasksForCurrentUser(6),
    getRecentActivityForCurrentUser(5),
    getMyEnrolledCourses(),
  ]);
  const canInstruct = me?.role === "instructor" || me?.role === "admin" || me?.role === "super_admin";

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
          xp: me?.xp ?? 0,
          streak: me?.streak ?? 0,
          level: me?.level ?? 1,
          rank: rankForLevel(me?.level ?? 1),
          performance: me?.performance ?? 0,
        },
      }}
    />
  );
}
