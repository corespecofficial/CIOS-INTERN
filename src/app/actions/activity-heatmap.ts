"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ActivityDay {
  date: string;      // YYYY-MM-DD
  count: number;     // total activity events
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ActivityHeatmap {
  days: ActivityDay[];
  total: number;
  streak: number;
  maxStreak: number;
  mostActiveDay: string | null;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

export async function getMyActivityHeatmap(): Promise<R<ActivityHeatmap>> {
  return getActivityHeatmapFor(null);
}

export async function getActivityHeatmapFor(userId: string | null): Promise<R<ActivityHeatmap>> {
  try {
    let targetId = userId;
    if (!targetId) {
      const me = await getCurrentDbUser();
      if (!me) return { ok: false, error: "Not authenticated" };
      targetId = me.id;
    }
    const sb = supabaseAdmin();
    const since = new Date();
    since.setDate(since.getDate() - 364);
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    const [subs, posts, msgs, attends] = await Promise.all([
      sb.from("submissions").select("created_at").eq("user_id", targetId).gte("created_at", sinceIso),
      sb.from("posts").select("created_at").eq("author_id", targetId).gte("created_at", sinceIso),
      sb.from("messages").select("created_at").eq("sender_id", targetId).gte("created_at", sinceIso),
      sb.from("attendance").select("created_at").eq("user_id", targetId).gte("created_at", sinceIso),
    ]);

    const counts = new Map<string, number>();
    const bump = (iso: string) => {
      const k = iso.slice(0, 10);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    };
    for (const row of (subs.data ?? []) as Array<{ created_at: string }>) bump(row.created_at);
    for (const row of (posts.data ?? []) as Array<{ created_at: string }>) bump(row.created_at);
    for (const row of (msgs.data ?? []) as Array<{ created_at: string }>) bump(row.created_at);
    for (const row of (attends.data ?? []) as Array<{ created_at: string }>) bump(row.created_at);

    const days: ActivityDay[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const count = counts.get(key) ?? 0;
      days.push({ date: key, count, level: levelFor(count) });
    }

    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) streak++;
      else break;
    }
    let maxStreak = 0;
    let cur = 0;
    for (const d of days) {
      if (d.count > 0) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else cur = 0;
    }
    let mostActiveDay: string | null = null;
    let mostActiveCount = 0;
    for (const d of days) {
      if (d.count > mostActiveCount) {
        mostActiveCount = d.count;
        mostActiveDay = d.date;
      }
    }

    return { ok: true, data: { days, total, streak, maxStreak, mostActiveDay } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
