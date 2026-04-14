"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";

export interface WeeklyRecap {
  weekStart: string;
  weekEnd: string;
  tasksDone: number;
  lessonsCompleted: number;
  xpEarned: number;
  postsMade: number;
  commentsMade: number;
  streakDays: number;
  topTag: string | null;
  rankNow: number | null;
  rankDelta: number | null;
}

/** Returns last 7 days of aggregate activity for the current user. */
export async function getMyWeeklyRecap(): Promise<{ ok: true; data: WeeklyRecap } | { ok: false; error: string }> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const now = Date.now();
    const weekAgo = new Date(now - 7 * 86400000).toISOString();
    const weekEnd = new Date(now).toISOString();
    const twoWeeksAgo = new Date(now - 14 * 86400000).toISOString();

    const [
      { count: tasksDone },
      { count: lessonsCompleted },
      { data: xpRows },
      { count: postsMade },
      { count: commentsMade },
      { data: tagsRows },
      { data: rankThisRows },
      { data: rankLastRows },
    ] = await Promise.all([
      sb.from("tasks").select("*", { count: "exact", head: true })
        .eq("assigned_to", me.id).eq("status", "approved")
        .gte("completed_at", weekAgo),
      sb.from("module_completions").select("*", { count: "exact", head: true })
        .eq("user_id", me.id).gte("completed_at", weekAgo),
      sb.from("xp_events").select("amount").eq("user_id", me.id).gte("created_at", weekAgo),
      sb.from("posts").select("*", { count: "exact", head: true })
        .eq("author_id", me.id).eq("is_deleted", false).gte("created_at", weekAgo),
      sb.from("comments").select("*", { count: "exact", head: true })
        .eq("author_id", me.id).gte("created_at", weekAgo),
      sb.from("posts").select("tags").eq("author_id", me.id).gte("created_at", weekAgo),
      sb.from("users").select("id, xp").order("xp", { ascending: false }).limit(500),
      sb.from("xp_events").select("amount").eq("user_id", me.id).gte("created_at", twoWeeksAgo).lt("created_at", weekAgo),
    ]);

    const xpEarned = (xpRows || []).reduce((a: number, r: { amount?: number | null }) => a + (r.amount || 0), 0);
    const xpLastWeek = (rankLastRows || []).reduce((a: number, r: { amount?: number | null }) => a + (r.amount || 0), 0);

    const tagCounts = new Map<string, number>();
    for (const r of (tagsRows || []) as { tags: string[] | null }[]) {
      for (const t of r.tags || []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
    const topTag = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const rankList = (rankThisRows || []) as { id: string; xp: number | null }[];
    const rankNow = rankList.findIndex((r) => r.id === me.id);
    const rankNowOut = rankNow >= 0 ? rankNow + 1 : null;

    // Infer last-week rank by subtracting last-week's xp from current and re-sorting.
    const lastWeekList = rankList.map((r) => ({ id: r.id, xp: (r.xp || 0) - (r.id === me.id ? xpLastWeek : 0) }))
      .sort((a, b) => b.xp - a.xp);
    const rankLast = lastWeekList.findIndex((r) => r.id === me.id);
    const rankDelta = rankNowOut && rankLast >= 0 ? (rankLast + 1) - rankNowOut : null;

    return { ok: true, data: {
      weekStart: weekAgo, weekEnd,
      tasksDone: tasksDone || 0,
      lessonsCompleted: lessonsCompleted || 0,
      xpEarned,
      postsMade: postsMade || 0,
      commentsMade: commentsMade || 0,
      streakDays: me.streak || 0,
      topTag,
      rankNow: rankNowOut,
      rankDelta,
    } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
