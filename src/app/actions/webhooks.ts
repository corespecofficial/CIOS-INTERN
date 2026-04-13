"use server";

import { createHmac, randomUUID } from "crypto";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type WebhookEvent =
  | "announcement.published"
  | "hire.confirmed"
  | "candidate.applied"
  | "user.created"
  | "task.completed"
  | "achievement.earned";

export interface WebhookEndpoint {
  id: string;
  user_id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  enabled: boolean;
  created_at: string;
}

async function requireAdmin() {
  const me = await getCurrentDbUser();
  if (!me || (me.role !== "admin" && me.role !== "super_admin" && me.role !== "recruiter")) throw new Error("Forbidden");
  return me;
}

export async function createWebhook(input: { url: string; events: WebhookEvent[] }): Promise<R<WebhookEndpoint>> {
  try {
    const me = await requireAdmin();
    const url = input.url.trim();
    if (!/^https:\/\//.test(url)) return { ok: false, error: "Endpoint must be HTTPS" };
    if (input.events.length === 0) return { ok: false, error: "Pick at least one event" };
    const secret = `whsec_${randomUUID().replace(/-/g, "")}`;
    const { data, error } = await supabaseAdmin().from("webhooks").insert({
      user_id: me.id, url, events: input.events, secret, enabled: true,
    }).select("*").single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/integrations");
    return { ok: true, data: data as WebhookEndpoint };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyWebhooks(): Promise<R<WebhookEndpoint[]>> {
  try {
    const me = await requireAdmin();
    const { data } = await supabaseAdmin().from("webhooks").select("*").eq("user_id", me.id).order("created_at", { ascending: false });
    return { ok: true, data: (data || []) as WebhookEndpoint[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteWebhook(id: string): Promise<R> {
  try {
    const me = await requireAdmin();
    await supabaseAdmin().from("webhooks").delete().eq("id", id).eq("user_id", me.id);
    revalidatePath("/admin/integrations");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function toggleWebhook(id: string, enabled: boolean): Promise<R> {
  try {
    const me = await requireAdmin();
    await supabaseAdmin().from("webhooks").update({ enabled }).eq("id", id).eq("user_id", me.id);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Server-side helper — call from anywhere to fan out an event. */
export async function fireWebhook(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data: hooks } = await sb.from("webhooks").select("url, secret, events").eq("enabled", true);
    const subscribers = ((hooks || []) as Array<{ url: string; secret: string; events: WebhookEvent[] }>).filter((h) => h.events.includes(event));
    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    await Promise.allSettled(subscribers.map(async (h) => {
      const signature = createHmac("sha256", h.secret).update(body).digest("hex");
      try {
        await fetch(h.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CIOS-Event": event, "X-CIOS-Signature": signature },
          body, signal: AbortSignal.timeout(8000),
        });
      } catch { /* swallow individual hook errors */ }
    }));
  } catch { /* never block calling code */ }
}
