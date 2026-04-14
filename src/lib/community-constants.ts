export const REACTION_EMOJIS = ["🎉", "🔥", "💯", "😂", "🤔", "❤"] as const;
export type ReactionEmoji = typeof REACTION_EMOJIS[number];

export const AWARD_COSTS: Record<"bronze" | "silver" | "gold" | "diamond", number> = {
  bronze: 5, silver: 20, gold: 50, diamond: 100,
};
export const AWARD_EMOJI: Record<"bronze" | "silver" | "gold" | "diamond", string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎",
};
export type AwardKind = "bronze" | "silver" | "gold" | "diamond";

export interface PollOption { id: string; label: string; votes: number }
export interface PollView {
  id: string; post_id: string; question: string; multi_choice: boolean;
  closes_at: string | null; total_votes: number;
  options: PollOption[]; my_votes: string[]; closed: boolean;
}
