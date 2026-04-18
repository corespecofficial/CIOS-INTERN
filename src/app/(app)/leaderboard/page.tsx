import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getLeaderboard, type LeaderboardMode } from "@/lib/gamification";
import { getFaithfulLeaderboard } from "@/app/actions/honor-faithful";
import { LeaderboardClient } from "./leaderboard-client";

export const dynamic = "force-dynamic";

const MODES: LeaderboardMode[] = ["xp", "weekly", "monthly", "contributors", "attendance"];

// Top-20 cap: showing only top performers keeps the leaderboard motivating
// without shaming interns lower in the list (Wave 1.3 — No Public Shaming)
const LEADERBOARD_LIMIT = 20;

export default async function LeaderboardPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [boards, faithfulRows] = await Promise.all([
    (async () => {
      const b: Record<string, Awaited<ReturnType<typeof getLeaderboard>>> = {};
      await Promise.all(MODES.map(async (m) => { b[m] = await getLeaderboard(m, LEADERBOARD_LIMIT).catch(() => []); }));
      return b;
    })(),
    getFaithfulLeaderboard().catch(() => []),
  ]);

  return <LeaderboardClient meId={me.id} boards={boards} faithfulRows={faithfulRows} />;
}
