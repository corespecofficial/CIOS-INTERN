import { listTeamMembers, countTasksInProgressForUsers } from "@/lib/db";
import { TeamLeadDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

export default async function TeamLeadPage() {
  const members = await listTeamMembers();
  const inProgress = await countTasksInProgressForUsers(members.map((m) => m.id));
  const teamScore = members.length > 0
    ? Math.round(members.reduce((s, m) => s + m.performance, 0) / members.length)
    : 0;

  const leaderboard = members
    .slice(0, 5)
    .map((m, i) => ({ rank: i + 1, name: m.name || "Unnamed", xp: m.xp, avatarUrl: m.avatar_url }));

  return (
    <TeamLeadDashboard
      stats={{ members: members.length, inProgress, teamScore }}
      leaderboard={leaderboard}
    />
  );
}
