import { getCurrentDbUser, supabaseAdmin, getCurrentUserTasks } from "@/lib/db";
import { redirect } from "next/navigation";
import CalendarClient, { type CalEvent, type CalEventType } from "./calendar-client";

export const dynamic = "force-dynamic";

const TYPE_MAP: Record<string, CalEventType> = {
  class: "class", deadline: "deadline", meeting: "meeting",
  event: "event", reminder: "event", payment: "payment",
};

export default async function CalendarPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const admin = supabaseAdmin();
  const safe = async <T,>(p: PromiseLike<T>, fb: T) => { try { return await p; } catch { return fb; } };

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const windowEnd   = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  const [eventsRes, plansRes, remindersRes, tasks] = await Promise.all([
    safe(admin.from("calendar_events").select("id, title, start_time, type, location, color")
      .or(`created_by.eq.${me.id},attendees.cs.{${me.id}}`)
      .gte("start_time", windowStart).lte("start_time", windowEnd).order("start_time"),
      { data: [] } as { data: Array<{ id: string; title: string; start_time: string; type: string; location: string | null; color: string }> }),
    safe(admin.from("plans").select("id, title, due_at, color, icon").eq("owner_id", me.id).eq("archived", false).not("due_at", "is", null),
      { data: [] } as { data: Array<{ id: string; title: string; due_at: string; color: string; icon: string }> }),
    safe(admin.from("reminders").select("id, title, due_at").eq("user_id", me.id).is("done_at", null).gte("due_at", windowStart),
      { data: [] } as { data: Array<{ id: string; title: string; due_at: string }> }),
    getCurrentUserTasks().catch(() => []),
  ]);

  const fromDB: CalEvent[] = (eventsRes.data || []).map((e) => ({
    id: `ev-${e.id}`,
    title: e.title,
    date: e.start_time,
    type: TYPE_MAP[e.type] || "event",
    location: e.location || "",
  }));

  const fromPlans: CalEvent[] = (plansRes.data || []).map((p) => ({
    id: `plan-${p.id}`,
    title: `${p.icon || "📋"} ${p.title}`,
    date: p.due_at,
    type: "deadline",
    location: "Plan deadline",
  }));

  const fromReminders: CalEvent[] = (remindersRes.data || []).map((r) => ({
    id: `rem-${r.id}`,
    title: `🔔 ${r.title}`,
    date: r.due_at,
    type: "event",
    location: "Reminder",
  }));

  const fromTasks: CalEvent[] = tasks.map((t) => ({
    id: `task-${t.id}`,
    title: t.title,
    date: t.due_date,
    type: "deadline",
    location: "Submission Portal",
  }));

  const events = [...fromDB, ...fromPlans, ...fromReminders, ...fromTasks]
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  return <CalendarClient events={events} />;
}
