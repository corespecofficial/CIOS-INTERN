import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserGamificationSnapshot, getActiveMissions, getLeaderboard, levelProgress, rankFromLevel } from "@/lib/gamification";
import { GamificationHub } from "./gamification-client";

export const dynamic = "force-dynamic";

export default async function GamificationPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [snap, missions, top10] = await Promise.all([
    getUserGamificationSnapshot(me.id),
    getActiveMissions(me.id),
    getLeaderboard("xp", 10).catch(() => []),
  ]);

  const user = snap.user || { id: me.id, name: me.name, avatar_url: me.avatar_url, role: me.role, xp: 0, level: 1, streak: 0, best_streak: 0, reputation: 0, coins: 0, wallet_balance: 0 };
  const progress = levelProgress(user.xp || 0);
  const rank = rankFromLevel(user.level || 1);

  return (
    <GamificationHub
      user={{ id: user.id, name: user.name, avatarUrl: user.avatar_url, role: user.role, xp: user.xp, level: user.level, streak: user.streak, bestStreak: user.best_streak || 0, reputation: user.reputation, walletCredits: Number(user.wallet_balance || 0), coins: user.coins || 0 }}
      progress={progress}
      rank={rank}
      badges={snap.badges.map((b) => ({ id: b.badges.id, name: b.badges.name, description: b.badges.description, icon_url: b.badges.icon_url, category: b.badges.category, earnedAt: b.earned_at }))}
      events={snap.events}
      missions={missions}
      top10={top10}
    />
  );
}
