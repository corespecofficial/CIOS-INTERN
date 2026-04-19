"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface DigestData {
  userName: string;
  weekLabel: string;
  tasksCompleted: number;
  reportsSubmitted: number;
  pointsEarned: number;
  streak: number;
  hoursLogged: number;
  postsMade: number;
  rankDelta: number | null;
  topSkill: string;
  focusArea: string;
  highlight: string;
  nextSteps: string[];
  upcomingTasks: { id: string; title: string; due: string | null }[];
  upcomingEvents: { id: string; title: string; when: string }[];
}

export async function getMyDigest(): Promise<R<DigestData>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    const now = new Date();
    const weekStart = new Date(now);
    const dow = weekStart.getDay();
    weekStart.setDate(now.getDate() - ((dow + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const startIso = weekStart.toISOString();
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);

    const prevStart = new Date(weekStart);
    prevStart.setDate(weekStart.getDate() - 7);
    const prevStartIso = prevStart.toISOString();

    const sb = supabaseAdmin();
    const [subs, posts, txs, prevTxs, upcomingTasks, upcomingEvents] = await Promise.all([
      sb.from("submissions").select("id").eq("user_id", me.id).gte("created_at", startIso),
      sb.from("posts").select("id").eq("author_id", me.id).gte("created_at", startIso),
      sb.from("transactions").select("type, amount").eq("user_id", me.id).gte("created_at", startIso),
      sb.from("transactions").select("type, amount").eq("user_id", me.id).gte("created_at", prevStartIso).lt("created_at", startIso),
      sb.from("tasks").select("id, title, due_date").eq("assigned_to", me.id).gte("due_date", now.toISOString()).lt("due_date", nextWeek.toISOString()).order("due_date", { ascending: true }).limit(5),
      sb.from("calendar_events").select("id, title, start_at").gte("start_at", now.toISOString()).lt("start_at", nextWeek.toISOString()).order("start_at", { ascending: true }).limit(5),
    ]);

    const tasksCompleted = (subs.data ?? []).length;
    const postsMade = (posts.data ?? []).length;

    const CREDIT = new Set(["credit", "stipend", "bonus", "reward"]);
    let pointsEarned = 0;
    for (const t of (txs.data ?? []) as Array<{ type: string; amount: string | number }>) {
      if (CREDIT.has(t.type)) pointsEarned += Number(t.amount);
    }
    let prevPoints = 0;
    for (const t of (prevTxs.data ?? []) as Array<{ type: string; amount: string | number }>) {
      if (CREDIT.has(t.type)) prevPoints += Number(t.amount);
    }
    const rankDelta = prevPoints === 0 ? null : pointsEarned - prevPoints;

    let topSkill = "Consistency";
    if (tasksCompleted >= 10) topSkill = "Execution";
    else if (postsMade >= 5) topSkill = "Community";
    else if ((me.streak ?? 0) >= 7) topSkill = "Discipline";

    let focusArea = "Keep submitting daily reports.";
    let highlight = "Solid week.";
    const nextSteps: string[] = [];

    if (tasksCompleted >= 10) highlight = `Huge week — ${tasksCompleted} tasks shipped.`;
    else if (tasksCompleted >= 5) highlight = `Strong — ${tasksCompleted} tasks done this week.`;
    else if (tasksCompleted > 0) highlight = `${tasksCompleted} task${tasksCompleted === 1 ? "" : "s"} this week — room to push harder.`;
    else highlight = "Quiet week — a few focused hours would change the picture.";

    if (tasksCompleted < 3) {
      focusArea = "Complete at least 3 tasks this week.";
      nextSteps.push("Pick 3 tasks from your board Monday morning.");
    }
    if (postsMade === 0) nextSteps.push("Share one project learning in the community — 50 bonus points.");
    if ((me.streak ?? 0) < 7) nextSteps.push("Build a 7-day submission streak for the Discipline badge.");
    if (rankDelta !== null && rankDelta < 0) nextSteps.push("Your point earnings dropped vs last week — find one habit to restore.");
    if (nextSteps.length === 0) nextSteps.push("You're on track — compound it another week.");

    type TaskRow = { id: string; title: string; due_date: string | null };
    type EventRow = { id: string; title: string; start_at: string };

    return {
      ok: true,
      data: {
        userName: me.name || "there",
        weekLabel: `Week of ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        tasksCompleted,
        reportsSubmitted: tasksCompleted, // same source for now
        pointsEarned,
        streak: Number(me.streak ?? 0),
        hoursLogged: Math.round(tasksCompleted * 1.5),
        postsMade,
        rankDelta,
        topSkill,
        focusArea,
        highlight,
        nextSteps,
        upcomingTasks: ((upcomingTasks.data ?? []) as TaskRow[]).map((t) => ({ id: t.id, title: t.title, due: t.due_date })),
        upcomingEvents: ((upcomingEvents.data ?? []) as EventRow[]).map((e) => ({ id: e.id, title: e.title, when: e.start_at })),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
