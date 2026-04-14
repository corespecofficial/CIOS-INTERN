"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type ActivityEvent =
  | "page_view"
  | "session_start"
  | "task_completed"
  | "class_attended"
  | "message_sent"
  | "note_saved"
  | "course_progress"
  | "community_post"
  | "community_comment";

/**
 * Log a single behavior event. Safe to call from any page via a client hook;
 * errors are swallowed so this never breaks the UI.
 */
export async function logActivity(event: ActivityEvent, meta?: Record<string, unknown>): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "no-user" };
    await supabaseAdmin().from("user_events").insert({
      user_id: me.id,
      event,
      meta: meta || null,
    });
    // Also refresh last_seen so presence stays current
    await supabaseAdmin().from("users").update({ last_seen: new Date().toISOString() }).eq("id", me.id);
    return { ok: true };
  } catch { return { ok: false, error: "failed" }; }
}

export interface BehaviorInsights {
  eventsLast7Days: number;
  mostActiveHour: number | null;      // 0–23
  busiestDayOfWeek: number | null;    // 0=Sun..6=Sat
  sessionsLast7Days: number;
  avgSessionsPerDay: number;
  topEvents: Array<{ event: string; count: number }>;
  hourHistogram: number[];            // length 24, per hour
  dayHistogram: number[];             // length 7, per day of week
}

export async function getMyBehaviorInsights(): Promise<R<BehaviorInsights>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data } = await sb.from("user_events")
      .select("event, created_at")
      .eq("user_id", me.id)
      .gte("created_at", since)
      .limit(5000);

    const rows = (data || []) as Array<{ event: string; created_at: string }>;
    const hourHist = new Array(24).fill(0) as number[];
    const dayHist = new Array(7).fill(0) as number[];
    const eventCounts = new Map<string, number>();
    const sessions = new Set<string>();

    for (const r of rows) {
      const d = new Date(r.created_at);
      hourHist[d.getHours()]++;
      dayHist[d.getDay()]++;
      eventCounts.set(r.event, (eventCounts.get(r.event) || 0) + 1);
      if (r.event === "session_start") {
        sessions.add(d.toISOString().slice(0, 10));
      }
    }

    const mostActiveHour = rows.length ? hourHist.indexOf(Math.max(...hourHist)) : null;
    const busiestDayOfWeek = rows.length ? dayHist.indexOf(Math.max(...dayHist)) : null;
    const topEvents = Array.from(eventCounts.entries())
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([event, count]) => ({ event, count }));

    return {
      ok: true,
      data: {
        eventsLast7Days: rows.length,
        mostActiveHour,
        busiestDayOfWeek,
        sessionsLast7Days: sessions.size,
        avgSessionsPerDay: Math.round((sessions.size / 7) * 10) / 10,
        topEvents,
        hourHistogram: hourHist,
        dayHistogram: dayHist,
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
