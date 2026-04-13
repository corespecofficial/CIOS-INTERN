"use server";

import { headers } from "next/headers";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface LoginEvent {
  id: string;
  user_id: string;
  ip: string | null;
  user_agent: string | null;
  device: string | null;
  created_at: string;
  success: boolean;
}

/** Record a login attempt (called from a sign-in webhook or post-auth hook). */
export async function recordLoginEvent(input: { userId: string; success: boolean }): Promise<R> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const ua = h.get("user-agent") || null;
    const device = ua ? deviceFromUA(ua) : null;
    await supabaseAdmin().from("login_history").insert({
      user_id: input.userId,
      ip, user_agent: ua, device, success: input.success,
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyLoginHistory(limit = 30): Promise<R<LoginEvent[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const { data, error } = await supabaseAdmin().from("login_history")
      .select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(limit);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data || []) as LoginEvent[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

function deviceFromUA(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes("iphone")) return "iPhone";
  if (u.includes("ipad")) return "iPad";
  if (u.includes("android")) return "Android";
  if (u.includes("mac os")) return "Mac";
  if (u.includes("windows")) return "Windows";
  if (u.includes("linux")) return "Linux";
  return "Unknown";
}
