"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface InactiveRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  lastSeen: string | null;
  daysInactive: number;
  xp: number;
  streak: number;
}

/** List interns with no `last_seen` in the last `sinceDays` days. */
export async function listInactiveInterns(sinceDays = 7): Promise<R<InactiveRow[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (me.role !== "admin" && me.role !== "super_admin" && me.role !== "team_lead") {
      return { ok: false, error: "Admins only" };
    }
    const cutoff = new Date(Date.now() - sinceDays * 86400000).toISOString();
    const sb = supabaseAdmin();
    const { data } = await sb.from("users")
      .select("id, name, email, avatar_url, role, last_seen, xp, streak")
      .eq("role", "intern")
      .or(`last_seen.is.null,last_seen.lt.${cutoff}`)
      .order("last_seen", { ascending: true, nullsFirst: true })
      .limit(200);
    const now = Date.now();
    const rows: InactiveRow[] = ((data || []) as Array<{ id: string; name: string | null; email: string; avatar_url: string | null; role: string; last_seen: string | null; xp: number | null; streak: number | null }>).map((u) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      avatarUrl: u.avatar_url,
      role: u.role,
      lastSeen: u.last_seen,
      daysInactive: u.last_seen ? Math.floor((now - new Date(u.last_seen).getTime()) / 86400000) : 999,
      xp: u.xp || 0,
      streak: u.streak || 0,
    }));
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Fires a check-in notification to an intern. */
export async function sendCheckIn(userId: string, message?: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (me.role !== "admin" && me.role !== "super_admin" && me.role !== "team_lead") {
      return { ok: false, error: "Admins only" };
    }
    await pushNotification({
      userId,
      title: `Missing you — ${me.name} wants to check in`,
      message: message || "Hey! Haven't seen you in a while. Is everything okay? Drop by when you can 💙",
      type: "message",
      actionUrl: "/dashboard",
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
