"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type Channel = "in_app" | "email" | "push";
export type Category = "messages" | "achievements" | "tasks" | "classes" | "wallet" | "announcements" | "system";

export interface NotifPrefs {
  channels: Record<Category, Channel[]>;
  digestFrequency: "off" | "daily" | "weekly";
  quietFromHour: number;
  quietToHour: number;
}

const DEFAULT: NotifPrefs = {
  channels: {
    messages: ["in_app", "push"],
    achievements: ["in_app", "email"],
    tasks: ["in_app", "email"],
    classes: ["in_app", "email", "push"],
    wallet: ["in_app", "email"],
    announcements: ["in_app", "email"],
    system: ["in_app"],
  },
  digestFrequency: "weekly",
  quietFromHour: 22,
  quietToHour: 7,
};

export async function getMyNotifPrefs(): Promise<R<NotifPrefs>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const { data } = await supabaseAdmin().from("users").select("notification_prefs").eq("id", me.id).maybeSingle();
    const stored = (data as { notification_prefs?: Partial<NotifPrefs> } | null)?.notification_prefs;
    return { ok: true, data: { ...DEFAULT, ...(stored || {}), channels: { ...DEFAULT.channels, ...(stored?.channels || {}) } } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function setMyNotifPrefs(prefs: NotifPrefs): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    await supabaseAdmin().from("users").update({ notification_prefs: prefs }).eq("id", me.id);
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
