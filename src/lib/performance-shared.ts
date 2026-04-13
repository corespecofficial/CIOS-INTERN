export const DEFAULT_WEIGHTS = {
  attendance: 20,
  tasks: 20,
  courses: 20,
  community: 15,
  consistency: 10,
  revenue: 10,
  discipline: 5,
};

export type Weights = typeof DEFAULT_WEIGHTS;

export function grade(score: number): { letter: string; tier: string; color: string } {
  if (score >= 95) return { letter: "A+", tier: "Exceptional", color: "#66BB6A" };
  if (score >= 90) return { letter: "A", tier: "Outstanding", color: "#66BB6A" };
  if (score >= 85) return { letter: "A-", tier: "Excellent", color: "#AED581" };
  if (score >= 80) return { letter: "B+", tier: "Very Good", color: "#26C6DA" };
  if (score >= 75) return { letter: "B", tier: "Good", color: "#1E88E5" };
  if (score >= 70) return { letter: "B-", tier: "Above Average", color: "#1E88E5" };
  if (score >= 65) return { letter: "C+", tier: "Average", color: "#FFC107" };
  if (score >= 55) return { letter: "C", tier: "Developing", color: "#FFC107" };
  if (score >= 45) return { letter: "D", tier: "Needs Focus", color: "#FF7043" };
  return { letter: "F", tier: "At Risk", color: "#EF5350" };
}

export interface PersonalMetrics {
  userId: string;
  attendance: number;
  tasks: number;
  courses: number;
  community: number;
  consistency: number;
  revenue: number;
  discipline: number;
  total: number;
  xp: number;
  streak: number;
  level: number;
  reputation: number;
  weeklyActivity: { date: string; count: number }[];
  skillBreakdown: { subject: string; score: number }[];
  attendanceTrend: { week: string; rate: number }[];
}

export interface TeamMember {
  id: string; name: string; avatarUrl: string | null; role: string;
  score: number; xp: number; streak: number; reputation: number; status: string;
}
