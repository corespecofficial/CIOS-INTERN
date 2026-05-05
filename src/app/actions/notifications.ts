"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Ably from "ably";
import { sendEmail, wrapEmail } from "@/lib/email";
import { sendWebPushToUser } from "@/lib/web-push-send";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type NotificationType = "info" | "success" | "warning" | "error" | "task" | "message" | "achievement" | "fine" | "system";

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

let restClient: Ably.Rest | null = null;
function getAblyRest(): Ably.Rest | null {
  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  if (!restClient) restClient = new Ably.Rest({ key });
  return restClient;
}

/**
 * Server-callable helper (shared from other actions).
 * Creates notification row AND publishes to the user's Ably channel for realtime delivery.
 */
export async function pushNotification(params: {
  userId: string;            // supabase users.id
  userClerkId?: string | null;
  title: string;
  message?: string;
  type?: NotificationType;
  actionUrl?: string | null;
}): Promise<{ id: string } | null> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("notifications").insert({
      user_id: params.userId,
      title: params.title.slice(0, 200),
      message: (params.message || "").slice(0, 500),
      type: params.type || "info",
      action_url: params.actionUrl || null,
    }).select("id, created_at").single();
    if (error || !data) { console.error("[notif] insert:", error); return null; }

    // Realtime push via Ably if we know the clerk id
    let clerkId = params.userClerkId || null;
    if (!clerkId) {
      const { data: u } = await sb.from("users").select("clerk_id").eq("id", params.userId).single();
      clerkId = u?.clerk_id || null;
    }
    const rest = getAblyRest();
    if (rest && clerkId) {
      try {
        const ch = rest.channels.get(`notif:${clerkId}`);
        await ch.publish("new", { id: data.id, title: params.title, message: params.message || "", type: params.type || "info", actionUrl: params.actionUrl || null, createdAt: data.created_at });
      } catch (e) {
        console.warn("[notif] ably publish:", e);
      }
    }
    // Web Push — delivers to phone notification bar even when app is in background
    sendWebPushToUser(params.userId, {
      title: params.title,
      body: params.message || "",
      url: params.actionUrl || "/notifications",
      tag: `cios-${params.type || "info"}`,
    }).catch((e) => console.warn("[web-push] send error:", e));

    return { id: data.id };
  } catch (e) {
    console.error("[notif] pushNotification:", e);
    return null;
  }
}

/**
 * Bulk fan-out variant of pushNotification. Use for org announcements,
 * cron-driven deadline reminders, and other events that target many
 * users in a single tick. The per-row pattern would do N inserts,
 * blocking on each round-trip; this batches the DB insert into one
 * statement (or one chunk per CHUNK_SIZE) and then fans out the Ably
 * realtime publish + web-push side-by-side per recipient.
 *
 * Each recipient must include their `userId` (Supabase users.id) and
 * optionally `userClerkId` (Clerk id). If the clerk id is missing we
 * resolve it in a single follow-up SELECT after the insert — no N+1.
 *
 * action_url can be a constant string OR a function so callers can
 * pick a per-recipient URL (e.g. host vs student announcement page).
 */
export async function bulkPushNotifications(params: {
  recipients: Array<{ userId: string; userClerkId?: string | null }>;
  title: string;
  message?: string;
  type?: NotificationType;
  /** Constant URL applied to every row, OR a function called once per recipient */
  actionUrl?: string | ((r: { userId: string; userClerkId?: string | null }) => string | null);
  /** Optional org_id to scope the notifications row */
  orgId?: string | null;
}): Promise<{ inserted: number; pushed: number }> {
  const { recipients, title, message, type, actionUrl, orgId } = params;
  if (recipients.length === 0) return { inserted: 0, pushed: 0 };

  const sb = supabaseAdmin();
  const CHUNK = 500;
  let inserted = 0;
  // Track the Ably/web-push targets we still need to dispatch after all
  // chunks have been written.
  const dispatchList: Array<{ userId: string; userClerkId?: string | null; url: string | null; rowId: string; createdAt: string }> = [];

  for (let i = 0; i < recipients.length; i += CHUNK) {
    const slice = recipients.slice(i, i + CHUNK);
    const rows = slice.map((r) => {
      const url = typeof actionUrl === "function" ? actionUrl(r) : (actionUrl ?? null);
      return {
        user_id: r.userId,
        org_id: orgId ?? null,
        title: title.slice(0, 200),
        message: (message || "").slice(0, 500),
        type: type || "info",
        action_url: url,
        is_read: false,
      };
    });
    const { data, error } = await sb.from("notifications").insert(rows).select("id, user_id, action_url, created_at");
    if (error) {
      console.warn("[notif] bulk insert failed:", error.message);
      continue;
    }
    inserted += (data?.length || 0);
    for (const row of (data || []) as Array<{ id: string; user_id: string; action_url: string | null; created_at: string }>) {
      const r = slice.find((x) => x.userId === row.user_id);
      if (!r) continue;
      dispatchList.push({
        userId: row.user_id,
        userClerkId: r.userClerkId,
        url: row.action_url,
        rowId: row.id,
        createdAt: row.created_at,
      });
    }
  }

  // Resolve missing clerk ids in one round-trip.
  const missing = dispatchList.filter((d) => !d.userClerkId).map((d) => d.userId);
  if (missing.length > 0) {
    const { data: lookup } = await sb.from("users").select("id, clerk_id").in("id", missing);
    const byId = new Map<string, string>();
    for (const r of (lookup || []) as Array<{ id: string; clerk_id: string | null }>) {
      if (r.clerk_id) byId.set(r.id, r.clerk_id);
    }
    for (const d of dispatchList) if (!d.userClerkId) d.userClerkId = byId.get(d.userId) || null;
  }

  // Realtime + web push, in parallel. Failures don't block — the DB
  // row is the source of truth and the user will see it on next load.
  const rest = getAblyRest();
  const dispatchPromises = dispatchList.map(async (d) => {
    if (rest && d.userClerkId) {
      try {
        const ch = rest.channels.get(`notif:${d.userClerkId}`);
        await ch.publish("new", {
          id: d.rowId,
          title,
          message: message || "",
          type: type || "info",
          actionUrl: d.url,
          createdAt: d.createdAt,
        });
      } catch (e) {
        console.warn("[notif bulk] ably:", e instanceof Error ? e.message : e);
      }
    }
    try {
      await sendWebPushToUser(d.userId, {
        title,
        body: message || "",
        url: d.url || "/notifications",
        tag: `cios-${type || "info"}`,
      });
    } catch (e) {
      console.warn("[notif bulk] web-push:", e instanceof Error ? e.message : e);
    }
  });
  await Promise.allSettled(dispatchPromises);

  return { inserted, pushed: dispatchList.length };
}

export async function listMyNotifications(limit = 30): Promise<Result<{ notifications: NotificationRow[]; unread: number }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const [{ data }, { count }] = await Promise.all([
      sb.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(limit),
      sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", me.id).eq("is_read", false),
    ]);
    return { ok: true, data: { notifications: (data || []) as NotificationRow[], unread: count || 0 } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markNotificationRead(id: string): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin().from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markAllNotificationsRead(): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin().from("notifications").update({ is_read: true }).eq("user_id", me.id).eq("is_read", false);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteNotification(id: string): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin().from("notifications").delete().eq("id", id).eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function togglePinNotification(id: string, pinned: boolean): Promise<Result> {
  try {
    const me = await requireMe();
    // Encode pinned state via a custom field repurposing action_url prefix — simplest: keep a local preference map.
    // For DB-backed pin, add a column in a follow-up migration. For MVP we toggle via is_read set to false intentionally:
    const { error } = await supabaseAdmin().from("notifications").update({
      is_read: pinned ? false : true,  // pinned = unread-looking (stays at top)
    }).eq("id", id).eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function broadcastAnnouncement(input: { title: string; message: string; targetRole?: "all" | "intern" | "team_lead" | "instructor" | "admin" | "super_admin" | "moderator" | "finance" | "support"; priority?: "critical" | "important" | "normal"; sendEmailCopy?: boolean }): Promise<Result<{ sent: number; emailed: number }>> {
  try {
    const me = await requireMe();
    if (me.role !== "admin" && me.role !== "super_admin") throw new Error("Admin only");
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const sb = supabaseAdmin();
    let query = sb.from("users").select("id, clerk_id, role, email, name");
    if (input.targetRole && input.targetRole !== "all") query = query.eq("role", input.targetRole);
    const { data } = await query;
    const type = input.priority === "critical" ? "error" : input.priority === "important" ? "warning" : "info";
    let sent = 0;
    let emailed = 0;
    for (const u of (data || []) as { id: string; clerk_id: string; email: string; name: string }[]) {
      const r = await pushNotification({
        userId: u.id, userClerkId: u.clerk_id,
        title: `📢 ${input.title}`,
        message: input.message,
        type,
      });
      if (r) sent++;
      if (input.sendEmailCopy && u.email) {
        const res = await sendEmail({
          to: u.email,
          subject: `📢 ${input.title}`,
          html: wrapEmail(
            `<h2 style="margin:0 0 10px 0;font-size:20px;color:#E8EDF5;">${input.title}</h2>
             ${input.message ? `<p style="white-space:pre-wrap;line-height:1.7;">${input.message.replace(/\n/g, "<br>")}</p>` : ""}
             <p style="font-size:12px;color:#5A6478;margin-top:18px;">Sent by CIOS admin · ${new Date().toLocaleDateString()}</p>`,
            { preheader: input.message?.slice(0, 100) || input.title }
          ),
        });
        if (res.ok) emailed++;
      }
    }
    return { ok: true, data: { sent, emailed } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearAllNotifications(): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin().from("notifications").delete().eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
