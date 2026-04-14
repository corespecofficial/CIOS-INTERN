"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface LiveStreak {
  kind: "login" | "learning" | "task" | "attendance" | "community";
  current: number;
  best: number;
  lastActive: string | null;
  activeToday: boolean;
}

/**
 * Compute streaks directly from user_events + task/enrollment tables.
 * This is the source of truth — no separate counter table that can drift.
 */
export async function getMyLiveStreaks(): Promise<R<LiveStreak[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const since = new Date(Date.now() - 120 * 86400_000).toISOString(); // look back 120 days

    const [events, tasks, attend, commentRows, postRows] = await Promise.all([
      sb.from("user_events").select("event, created_at").eq("user_id", me.id).gte("created_at", since).order("created_at", { ascending: false }),
      sb.from("tasks").select("completed_at").eq("user_id", me.id).eq("status", "completed").not("completed_at", "is", null).gte("completed_at", since),
      sb.from("attendance").select("joined_at").eq("user_id", me.id).gte("joined_at", since),
      sb.from("comments").select("created_at").eq("author_id", me.id).gte("created_at", since),
      sb.from("posts").select("created_at").eq("author_id", me.id).gte("created_at", since),
    ]);

    const eventRows = (events.data || []) as Array<{ event: string; created_at: string }>;

    // Per-kind day-set builder
    const loginDays = new Set<string>();
    const learningDays = new Set<string>();
    const taskDays = new Set<string>();
    const attendDays = new Set<string>();
    const communityDays = new Set<string>();

    for (const e of eventRows) {
      const day = e.created_at.slice(0, 10);
      if (e.event === "session_start" || e.event === "page_view") loginDays.add(day);
      if (e.event === "page_view" || e.event === "course_progress" || e.event === "note_saved") {
        // any learning-adjacent action
        learningDays.add(day);
      }
      if (e.event === "community_post" || e.event === "community_comment") communityDays.add(day);
    }
    for (const t of (tasks.data || []) as Array<{ completed_at: string }>) taskDays.add(t.completed_at.slice(0, 10));
    for (const a of (attend.data || []) as Array<{ joined_at: string }>) attendDays.add(a.joined_at.slice(0, 10));
    for (const c of (commentRows.data || []) as Array<{ created_at: string }>) communityDays.add(c.created_at.slice(0, 10));
    for (const p of (postRows.data || []) as Array<{ created_at: string }>) communityDays.add(p.created_at.slice(0, 10));

    const today = new Date().toISOString().slice(0, 10);

    const build = (kind: LiveStreak["kind"], days: Set<string>): LiveStreak => {
      const sorted = Array.from(days).sort().reverse();
      const lastActive = sorted[0] || null;
      const activeToday = days.has(today);
      // Current streak: consecutive days going back from today (or from most recent day if today is blank but yesterday is active)
      let current = 0;
      const cursor = new Date();
      cursor.setUTCHours(0, 0, 0, 0);
      // If not active today, still count streak if yesterday was active (streak intact until end-of-today)
      if (!activeToday) cursor.setUTCDate(cursor.getUTCDate() - 1);
      while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (days.has(key)) { current++; cursor.setUTCDate(cursor.getUTCDate() - 1); } else break;
      }
      // Best streak: scan all sorted days for longest consecutive run
      let best = current;
      if (sorted.length > 0) {
        let run = 1;
        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1]);
          const curr = new Date(sorted[i]);
          const diff = Math.round((prev.getTime() - curr.getTime()) / 86400_000);
          if (diff === 1) { run++; best = Math.max(best, run); }
          else { run = 1; }
        }
      }
      return { kind, current, best, lastActive, activeToday };
    };

    return {
      ok: true,
      data: [
        build("login", loginDays),
        build("learning", learningDays),
        build("task", taskDays),
        build("attendance", attendDays),
        build("community", communityDays),
      ],
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
