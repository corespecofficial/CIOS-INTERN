/** Client-safe gamification helpers — no DB imports. */

export type XPEventType =
  | "lesson_completed"
  | "module_completed"
  | "course_completed"
  | "quiz_passed"
  | "perfect_quiz"
  | "task_completed"
  | "task_on_time"
  | "helpful_comment"
  | "brilliant_comment"
  | "valuable_post"
  | "accepted_solution"
  | "class_attended"
  | "class_on_time"
  | "weekly_attendance"
  | "mentor_action"
  | "team_win"
  | "lead_generated"
  | "login_streak"
  // penalties
  | "missed_class"
  | "late_attendance"
  | "overdue_task"
  | "warning_issued"
  | "spam_flagged"
  | "eagle_submitted"
  | "eagle_perfect_score"
  | "eagle_of_week"
  | "consistency_bonus"
  | "spin_wheel_win";

export const XP_RULES: Record<XPEventType, number> = {
  lesson_completed: 20,
  module_completed: 50,
  course_completed: 200,
  quiz_passed: 30,
  perfect_quiz: 60,
  task_completed: 15,
  task_on_time: 25,
  helpful_comment: 20,
  brilliant_comment: 50,
  valuable_post: 30,
  accepted_solution: 40,
  class_attended: 15,
  class_on_time: 20,
  weekly_attendance: 75,
  mentor_action: 40,
  team_win: 100,
  lead_generated: 80,
  login_streak: 10,
  missed_class: -20,
  late_attendance: -10,
  overdue_task: -15,
  warning_issued: -25,
  spam_flagged: -50,
  eagle_submitted: 200,
  eagle_perfect_score: 500,
  eagle_of_week: 300,
  consistency_bonus: 150,
  spin_wheel_win: 0, // variable — handled by spin wheel action directly
};

/** Level curve: xpForLevel(n) = 500 * n * (n-1).
 *  Level 2 = 1,000 XP · Level 3 = 3,000 · Level 10 = 45,000 · Level 50 = 1,225,000 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 500 * level * (level - 1);
}

/** Given total XP, what level are they at? */
export function levelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  // Invert xpForLevel: 500 * n * (n-1) = xp  =>  n = (1 + sqrt(1 + xp/125)) / 2
  const n = Math.floor((1 + Math.sqrt(1 + xp / 125)) / 2);
  return Math.max(1, n);
}

export function levelProgress(xp: number): { level: number; nextLevel: number; curLevelXP: number; nextLevelXP: number; progressPct: number; xpInLevel: number; xpToNext: number } {
  const level = levelFromXP(xp);
  const curLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const xpInLevel = xp - curLevelXP;
  const xpToNext = nextLevelXP - xp;
  const progressPct = Math.max(0, Math.min(100, Math.round((xpInLevel / (nextLevelXP - curLevelXP)) * 100)));
  return { level, nextLevel: level + 1, curLevelXP, nextLevelXP, progressPct, xpInLevel, xpToNext };
}

export interface Rank {
  title: string;
  minLevel: number;
  color: string;
  emoji: string;
}

export const RANKS: Rank[] = [
  { title: "New Intern",          minLevel: 1,  color: "#8892A4", emoji: "\u{1F331}" },
  { title: "Active Intern",       minLevel: 3,  color: "#1E88E5", emoji: "\u{26A1}" },
  { title: "Skilled Intern",      minLevel: 6,  color: "#26C6DA", emoji: "\u{1F539}" },
  { title: "Rising Star",         minLevel: 10, color: "#AB47BC", emoji: "\u{2B50}" },
  { title: "Senior Intern",       minLevel: 15, color: "#FFC107", emoji: "\u{1F3AF}" },
  { title: "Community Champion",  minLevel: 20, color: "#FF7043", emoji: "\u{1F947}" },
  { title: "Mentor",              minLevel: 25, color: "#66BB6A", emoji: "\u{1F9D1}\u200D\u{1F3EB}" },
  { title: "Manager",             minLevel: 35, color: "#EF5350", emoji: "\u{1F451}" },
  { title: "Executive",           minLevel: 50, color: "#FFD54F", emoji: "\u{1F48E}" },
];

export function rankFromLevel(level: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) current = r;
  return current;
}

export function formatXP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Cooldowns (ms) for anti-abuse on repeat XP events of the same type. */
export const XP_COOLDOWNS_MS: Partial<Record<XPEventType, number>> = {
  helpful_comment: 60_000,
  valuable_post: 60_000,
  task_completed: 10_000,
};

/** Daily cap per event type (total XP/day). Null = no cap. */
export const XP_DAILY_CAPS: Partial<Record<XPEventType, number>> = {
  helpful_comment: 200,
  valuable_post: 150,
  login_streak: 10,
};
