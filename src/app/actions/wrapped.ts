"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface WrappedData {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  role: string;
  year: number;
  month: number;
  monthLabel: string;
  // Stats
  performanceScore: number;
  xpEarned: number;
  pointsBalance: number;
  streak: number;
  tasksCompleted: number;
  reportsSubmitted: number;
  coursesCompleted: number;
  certificatesEarned: number;
  badgesEarned: number;
  communityPosts: number;
  rank: number | null;
  totalInCohort: number;
  percentileTop: number; // e.g. 15 means top 15%
  // Narrative
  topSkill: string;
  monthlyHighlight: string;
  vsLastMonth: number; // XP delta
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export async function getMyWrapped(year?: number, month?: number): Promise<R<WrappedData>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const prevStart = new Date(y, m - 2, 1);
    const prevEnd = new Date(y, m - 1, 1);

    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const prevStartIso = prevStart.toISOString();
    const prevEndIso = prevEnd.toISOString();

    const sb = supabaseAdmin();

    const [subs, reports, posts, grades, certs, userBadges, txs, prevTxs, allLeaders] = await Promise.all([
      sb.from("submissions").select("id, created_at").eq("user_id", me.id).gte("created_at", startIso).lt("created_at", endIso),
      sb.from("submissions").select("id").eq("user_id", me.id).gte("created_at", startIso).lt("created_at", endIso),
      sb.from("posts").select("id").eq("author_id", me.id).gte("created_at", startIso).lt("created_at", endIso),
      sb.from("course_enrollments").select("id, completed_at").eq("user_id", me.id).eq("status", "completed").gte("completed_at", startIso).lt("completed_at", endIso),
      sb.from("certificates").select("id").eq("user_id", me.id).gte("issued_at", startIso).lt("issued_at", endIso),
      sb.from("user_badges").select("id").eq("user_id", me.id).gte("earned_at", startIso).lt("earned_at", endIso),
      sb.from("transactions").select("type, amount").eq("user_id", me.id).gte("created_at", startIso).lt("created_at", endIso),
      sb.from("transactions").select("type, amount").eq("user_id", me.id).gte("created_at", prevStartIso).lt("created_at", prevEndIso),
      sb.from("users").select("id, xp").order("xp", { ascending: false }),
    ]);

    const tasksCompleted = (subs.data ?? []).length;
    const reportsSubmitted = (reports.data ?? []).length;
    const communityPosts = (posts.data ?? []).length;
    const coursesCompleted = (grades.data ?? []).length;
    const certificatesEarned = (certs.data ?? []).length;
    const badgesEarned = (userBadges.data ?? []).length;

    const CREDIT = new Set(["credit", "stipend", "bonus", "reward"]);
    let xpEarned = 0;
    for (const t of (txs.data ?? []) as Array<{ type: string; amount: string | number }>) {
      if (CREDIT.has(t.type)) xpEarned += Number(t.amount);
    }
    let prevXp = 0;
    for (const t of (prevTxs.data ?? []) as Array<{ type: string; amount: string | number }>) {
      if (CREDIT.has(t.type)) prevXp += Number(t.amount);
    }

    const leaders = (allLeaders.data ?? []) as Array<{ id: string; xp: number }>;
    const rank = leaders.findIndex((u) => u.id === me.id) + 1 || null;
    const totalInCohort = leaders.length;
    const percentileTop = rank && totalInCohort > 0 ? Math.max(1, Math.round((rank / totalInCohort) * 100)) : 100;

    let topSkill = "Consistency";
    if (tasksCompleted >= 20) topSkill = "Execution";
    else if (coursesCompleted >= 2) topSkill = "Learning";
    else if (communityPosts >= 10) topSkill = "Community";
    else if ((me.streak ?? 0) >= 14) topSkill = "Discipline";

    let monthlyHighlight = "A solid month of growth.";
    if (tasksCompleted >= 20 && certificatesEarned >= 1) monthlyHighlight = "Top-tier output — finished strong.";
    else if (tasksCompleted >= 15) monthlyHighlight = "Hit your stride on tasks.";
    else if (coursesCompleted >= 2) monthlyHighlight = "Learning machine this month.";
    else if ((me.streak ?? 0) >= 20) monthlyHighlight = "Streak on fire — consistency unlocked.";
    else if (badgesEarned >= 3) monthlyHighlight = "Badge collector — multiple new wins.";
    else if (percentileTop <= 10) monthlyHighlight = "Top 10% of the cohort — keep going.";

    return {
      ok: true,
      data: {
        userId: me.id,
        userName: me.name || "CIOS Intern",
        avatarUrl: me.avatar_url,
        role: me.role,
        year: y,
        month: m,
        monthLabel: `${MONTHS[m - 1]} ${y}`,
        performanceScore: Number(me.performance ?? 0),
        xpEarned,
        pointsBalance: Number(me.xp ?? 0),
        streak: Number(me.streak ?? 0),
        tasksCompleted,
        reportsSubmitted,
        coursesCompleted,
        certificatesEarned,
        badgesEarned,
        communityPosts,
        rank,
        totalInCohort,
        percentileTop,
        topSkill,
        monthlyHighlight,
        vsLastMonth: xpEarned - prevXp,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
