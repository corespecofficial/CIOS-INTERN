"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { awardXP } from "@/lib/gamification";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

/* ────────── ALARMS ────────── */

export interface AlarmInput {
  label: string;
  timeOfDay: string;          // "HH:MM"
  daysOfWeek: number[];       // 0=Sun..6=Sat
  fireOn?: string | null;     // one-off date
  sound?: string;
  volume?: number;
  snoozeMinutes?: number;
  vibrate?: boolean;
  gradualWake?: boolean;
  voiceNote?: string;
  active?: boolean;
}

export async function listAlarms(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    const { data } = await supabaseAdmin().from("alarms").select("*").eq("user_id", me.id).order("time_of_day");
    return { ok: true, data: data || [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function upsertAlarm(id: string | null, input: AlarmInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    const row = {
      user_id: me.id,
      label: input.label || "",
      time_of_day: input.timeOfDay,
      days_of_week: input.daysOfWeek || [],
      fire_on: input.fireOn || null,
      sound: input.sound || "chime",
      volume: input.volume ?? 80,
      snooze_minutes: input.snoozeMinutes ?? 5,
      vibrate: input.vibrate ?? true,
      gradual_wake: input.gradualWake ?? false,
      voice_note: input.voiceNote || null,
      active: input.active ?? true,
      updated_at: new Date().toISOString(),
    };
    const sb = supabaseAdmin();
    let res;
    if (id) res = await sb.from("alarms").update(row).eq("id", id).eq("user_id", me.id).select("id").single();
    else    res = await sb.from("alarms").insert(row).select("id").single();
    if (res.error) return { ok: false, error: res.error.message };
    revalidatePath("/alarms");
    return { ok: true, data: { id: (res.data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleAlarm(id: string, active: boolean): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("alarms").update({ active, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", me.id);
    revalidatePath("/alarms");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteAlarm(id: string): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("alarms").delete().eq("id", id).eq("user_id", me.id);
    revalidatePath("/alarms");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ────────── REMINDERS ────────── */

export interface ReminderInput {
  title: string;
  notes?: string;
  dueAt: string;
  priority?: "low" | "normal" | "high" | "urgent";
  recurrence?: "none" | "daily" | "weekly" | "monthly";
}

export async function listReminders(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    const { data } = await supabaseAdmin().from("reminders").select("*").eq("user_id", me.id).order("due_at", { ascending: true });
    return { ok: true, data: data || [] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function upsertReminder(id: string | null, input: ReminderInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    const row = {
      user_id: me.id,
      title: input.title, notes: input.notes || null,
      due_at: input.dueAt,
      priority: input.priority || "normal",
      recurrence: input.recurrence || "none",
      updated_at: new Date().toISOString(),
    };
    const sb = supabaseAdmin();
    let res;
    if (id) res = await sb.from("reminders").update(row).eq("id", id).eq("user_id", me.id).select("id").single();
    else    res = await sb.from("reminders").insert(row).select("id").single();
    if (res.error) return { ok: false, error: res.error.message };
    revalidatePath("/reminders");
    return { ok: true, data: { id: (res.data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function completeReminder(id: string): Promise<R> {
  try {
    const me = await requireMe();
    // Mark done; if recurring, schedule next occurrence
    const { data: r } = await supabaseAdmin().from("reminders").select("recurrence, due_at").eq("id", id).eq("user_id", me.id).single();
    await supabaseAdmin().from("reminders").update({ done_at: new Date().toISOString() }).eq("id", id).eq("user_id", me.id);
    if (r && r.recurrence !== "none") {
      const next = new Date(r.due_at);
      if (r.recurrence === "daily") next.setDate(next.getDate() + 1);
      if (r.recurrence === "weekly") next.setDate(next.getDate() + 7);
      if (r.recurrence === "monthly") next.setMonth(next.getMonth() + 1);
      const { data: orig } = await supabaseAdmin().from("reminders").select("title, notes, priority, recurrence").eq("id", id).single();
      if (orig) {
        await supabaseAdmin().from("reminders").insert({
          user_id: me.id, title: orig.title, notes: orig.notes, priority: orig.priority,
          recurrence: orig.recurrence, due_at: next.toISOString(),
        });
      }
    }
    revalidatePath("/reminders");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function snoozeReminder(id: string, minutes: number): Promise<R> {
  try {
    const me = await requireMe();
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    await supabaseAdmin().from("reminders").update({ snoozed_until: until }).eq("id", id).eq("user_id", me.id);
    revalidatePath("/reminders");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteReminder(id: string): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("reminders").delete().eq("id", id).eq("user_id", me.id);
    revalidatePath("/reminders");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ────────── FOCUS / POMODORO ────────── */

export async function logFocusSession(input: { kind: "pomodoro" | "break" | "custom"; plannedSeconds: number; actualSeconds: number; label?: string; completed: boolean }): Promise<R<{ xp: number }>> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("timer_sessions").insert({
      user_id: me.id, kind: input.kind,
      planned_seconds: input.plannedSeconds, actual_seconds: input.actualSeconds,
      label: input.label || null, completed: input.completed,
      ended_at: new Date().toISOString(),
    });
    let xp = 0;
    if (input.kind === "pomodoro" && input.completed) {
      const r = await awardXP(me.id, "task_completed", { refType: "pomodoro", refId: `${me.id}:${Date.now()}` });
      xp = r.awarded;
    }
    // Update daily productivity_logs
    const day = new Date().toISOString().slice(0, 10);
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("productivity_logs").select("id, pomodoros, focus_minutes").eq("user_id", me.id).eq("day", day).maybeSingle();
    const mins = Math.round(input.actualSeconds / 60);
    if (existing) {
      await sb.from("productivity_logs").update({
        pomodoros: (existing.pomodoros || 0) + (input.kind === "pomodoro" && input.completed ? 1 : 0),
        focus_minutes: (existing.focus_minutes || 0) + mins,
      }).eq("id", existing.id);
    } else {
      await sb.from("productivity_logs").insert({
        user_id: me.id, day,
        pomodoros: input.kind === "pomodoro" && input.completed ? 1 : 0,
        focus_minutes: mins,
      });
    }
    return { ok: true, data: { xp } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
