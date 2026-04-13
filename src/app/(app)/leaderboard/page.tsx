import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getLeaderboard, type LeaderboardMode } from "@/lib/gamification";
import { LeaderboardClient } from "./leaderboard-client";

export const dynamic = "force-dynamic";

const MODES: LeaderboardMode[] = ["xp", "weekly", "monthly", "contributors", "attendance"];

export default async function LeaderboardPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const boards: Record<string, Awaited<ReturnType<typeof getLeaderboard>>> = {};
  await Promise.all(MODES.map(async (m) => { boards[m] = await getLeaderboard(m, 100).catch(() => []); }));

  return <LeaderboardClient meId={me.id} boards={boards} />;
}
