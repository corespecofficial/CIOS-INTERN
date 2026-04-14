/** Client-safe engagement helpers — no DB imports. */

export type ReactionKind = "fire" | "idea" | "clap" | "heart" | "mind-blown";

export const REACTION_META: Record<ReactionKind, { emoji: string; label: string; color: string }> = {
  fire: { emoji: "🔥", label: "Fire", color: "#FF7043" },
  idea: { emoji: "💡", label: "Idea", color: "#FFC107" },
  clap: { emoji: "👏", label: "Clap", color: "#66BB6A" },
  heart: { emoji: "💖", label: "Heart", color: "#E91E63" },
  "mind-blown": { emoji: "🤯", label: "Mind blown", color: "#AB47BC" },
};

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  /** XP bonus awarded when quest is claimed. Server may override via engagement.features.questXpBonus. */
  bonusXp: number;
  /** Event the quest listens for — matches the `action` string passed to reportQuestProgress. */
  action: "lesson_completed" | "discussion_posted" | "reaction_given" | "login" | "quiz_passed";
}

/** Catalogue of available daily quests. 3 are picked per day (deterministic by date). */
export const QUEST_CATALOGUE: QuestDef[] = [
  { id: "finish-1-lesson",    title: "Finish 1 lesson",       description: "Complete any course lesson today.", emoji: "📚", target: 1, bonusXp: 50, action: "lesson_completed" },
  { id: "finish-2-lessons",   title: "Finish 2 lessons",      description: "Wrap up two lessons in a single day.", emoji: "🚀", target: 2, bonusXp: 80, action: "lesson_completed" },
  { id: "post-discussion",    title: "Post in a discussion",  description: "Share or answer in any course discussion.", emoji: "💬", target: 1, bonusXp: 30, action: "discussion_posted" },
  { id: "give-3-reactions",   title: "Give 3 reactions",      description: "React to lessons or posts from peers.", emoji: "💖", target: 3, bonusXp: 25, action: "reaction_given" },
  { id: "pass-a-quiz",        title: "Pass a quiz",           description: "Clear any quiz today.", emoji: "🧠", target: 1, bonusXp: 60, action: "quiz_passed" },
  { id: "daily-login",        title: "Show up",               description: "Just log in today. You did it.", emoji: "🌞", target: 1, bonusXp: 15, action: "login" },
];

/** Deterministic quest picker: returns the 3 quests for a given UTC date. */
export function questsForDate(isoDate: string): QuestDef[] {
  // Simple hash of the date string
  let h = 0;
  for (let i = 0; i < isoDate.length; i++) h = (h * 31 + isoDate.charCodeAt(i)) & 0xffffffff;
  const pool = [...QUEST_CATALOGUE];
  const picked: QuestDef[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.abs(h + i * 7919) % pool.length;
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface EngagementFeatures {
  dailyQuests: boolean;
  streakFreeze: boolean;
  reactions: boolean;
  leaderboards: boolean;
  badges: boolean;
  xpBurst: boolean;
  peerReview: boolean;
  teams: boolean;
  shareCert: boolean;
  questXpBonus: number;
  freezeCostXp: number;
  leaderboardResetDay: number; // 1=Mon..7=Sun ISO
  teamSize: number;
  reviewXpReward: number;
}

export const DEFAULT_ENGAGEMENT_FEATURES: EngagementFeatures = {
  dailyQuests: true,
  streakFreeze: true,
  reactions: true,
  leaderboards: true,
  badges: true,
  xpBurst: true,
  peerReview: true,
  teams: true,
  shareCert: true,
  questXpBonus: 50,
  freezeCostXp: 200,
  leaderboardResetDay: 1,
  teamSize: 4,
  reviewXpReward: 40,
};
