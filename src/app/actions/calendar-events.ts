"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

export interface EventInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type?: "class" | "deadline" | "meeting" | "event" | "reminder";
  color?: string;
  location?: string;
}

export async function listMyEvents(fromISO: string, toISO: string): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("calendar_events").select("*")
      .or(`created_by.eq.${me.id},attendees.cs.{${me.id}}`)
      .gte("start_time", fromISO).lte("start_time", toISO)
      .order("start_time");
    return { ok: true, data: data || [] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function createEvent(input: EventInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const { data, error } = await supabaseAdmin().from("calendar_events").insert({
      title: input.title.trim(),
      description: input.description || null,
      start_time: input.startTime,
      end_time: input.endTime,
      type: input.type || "event",
      color: input.color || "#1E88E5",
      location: input.location || null,
      created_by: me.id,
    }).select("id").single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/calendar"); revalidatePath("/planner");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteEvent(id: string): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("calendar_events").delete().eq("id", id).eq("created_by", me.id);
    revalidatePath("/calendar"); revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
