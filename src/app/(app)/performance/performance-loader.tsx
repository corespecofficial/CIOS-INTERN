"use client";

import dynamic from "next/dynamic";
import type { PersonalMetrics, TeamMember, Weights } from "@/lib/performance-shared";

interface TeamData {
  avgScore: number; totalMembers: number; active: number;
  topPerformers: TeamMember[]; lowActivity: TeamMember[];
  membersByScore: TeamMember[];
  attendanceAverage: number; taskCompletion: number;
}
interface OrgData {
  totalUsers: number; activeWeek: number; activeMonth: number;
  retentionPct: number; churnPct: number;
  courseCompletions: number; totalRevenue: number;
  finesCollected: number; rewardsIssued: number;
  usersByRole: { role: string; count: number }[];
  growthTrend: { date: string; total: number }[];
}

const PerformanceClient = dynamic(
  () => import("./performance-client").then((m) => m.PerformanceClient),
  { ssr: false, loading: () => <div style={{ padding: 32, color: "#8892A4" }}>Loading analytics…</div> },
);

export function PerformanceLoader(props: {
  me: { id: string; name: string; role: string };
  personal: PersonalMetrics;
  team: TeamData | null;
  org: OrgData | null;
  weights: Weights;
  canSetWeights: boolean;
}) {
  return <PerformanceClient {...props} />;
}
