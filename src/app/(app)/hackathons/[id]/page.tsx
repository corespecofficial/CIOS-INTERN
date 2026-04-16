import { getHackathon, getHackathonTeams, getLeaderboard } from "@/app/actions/hackathons";
import { notFound } from "next/navigation";
import { HackathonDetailClient } from "./hackathon-detail-client";
export const dynamic = "force-dynamic";
export default async function HackathonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [hackathonRes, teamsRes, leaderboardRes] = await Promise.all([
    getHackathon(id),
    getHackathonTeams(id),
    getLeaderboard(id),
  ]);
  if (!hackathonRes.ok || !hackathonRes.data) return notFound();
  return (
    <HackathonDetailClient
      hackathon={hackathonRes.data}
      teams={teamsRes.ok ? teamsRes.data! : []}
      leaderboard={leaderboardRes.ok ? leaderboardRes.data! : []}
    />
  );
}
