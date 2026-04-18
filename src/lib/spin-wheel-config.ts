/** Shared spin wheel config — no server imports, safe for client use. */

export type SpinPrize = {
  label: string;
  type: "xp" | "wallet" | "bonus_spin" | "miss";
  amount: number;
  color: string;
  emoji: string;
};

export const WHEEL_PRIZES: SpinPrize[] = [
  { label: "+50 XP",       type: "xp",         amount: 50,   color: "#1E88E5", emoji: "⚡" },
  { label: "+100 XP",      type: "xp",         amount: 100,  color: "#7C3AED", emoji: "🎯" },
  { label: "+200 XP",      type: "xp",         amount: 200,  color: "#059669", emoji: "💎" },
  { label: "+500 XP",      type: "xp",         amount: 500,  color: "#D97706", emoji: "🔥" },
  { label: "+₦200",        type: "wallet",     amount: 200,  color: "#10B981", emoji: "💰" },
  { label: "+₦500",        type: "wallet",     amount: 500,  color: "#F59E0B", emoji: "💵" },
  { label: "Bonus Spin!",  type: "bonus_spin", amount: 1,    color: "#EF4444", emoji: "🎁" },
  { label: "Try Tomorrow", type: "miss",       amount: 0,    color: "#4B5563", emoji: "😅" },
];

// Weighted random — higher weights = more likely (must sum to 100)
export const WHEEL_WEIGHTS = [30, 25, 15, 8, 10, 5, 5, 2];
