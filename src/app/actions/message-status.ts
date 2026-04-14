"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type MessageStatus = "sent" | "delivered" | "read";

/**
 * WhatsApp-style tick logic:
 *  - sent:      stored on server, recipient offline       → 1 grey tick
 *  - delivered: recipient online (connected to Ably)      → 2 grey ticks
 *  - read:      recipient has the conversation open        → 2 green ticks
 *
 * We derive status from:
 *  - users.last_seen (for online-ness within 60 s)
 *  - message_reads table (per-message per-viewer timestamp)
 */

/** Mark the current user as having the room open — writes "delivered" for every
 *  unread message they can see, and "read" for those they're currently viewing. */
export async function markRoomViewed(roomId: string): Promise<R<{ delivered: number; read: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: msgs } = await sb.from("messages")
      .select("id, sender_id, created_at")
      .eq("chat_room_id", roomId)
      .neq("sender_id", me.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const ids = ((msgs || []) as Array<{ id: string }>).map((m) => m.id);
    if (ids.length === 0) return { ok: true, data: { delivered: 0, read: 0 } };

    const now = new Date().toISOString();
    const rows = ids.map((mid) => ({
      message_id: mid,
      viewer_id: me.id,
      delivered_at: now,
      read_at: now,
    }));

    const { error } = await sb.from("message_reads").upsert(rows, {
      onConflict: "message_id,viewer_id",
      ignoreDuplicates: false,
    });
    if (error) return { ok: false, error: error.message };

    return { ok: true, data: { delivered: ids.length, read: ids.length } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Mark only delivery (user received the message via Ably) — for use when user
 *  is online somewhere in the app but NOT inside the current chat. */
export async function markRoomDelivered(roomId: string): Promise<R<{ delivered: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: msgs } = await sb.from("messages")
      .select("id")
      .eq("chat_room_id", roomId)
      .neq("sender_id", me.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = ((msgs || []) as Array<{ id: string }>).map((m) => m.id);
    if (ids.length === 0) return { ok: true, data: { delivered: 0 } };

    const rows = ids.map((mid) => ({
      message_id: mid,
      viewer_id: me.id,
      delivered_at: new Date().toISOString(),
    }));

    await sb.from("message_reads").upsert(rows, {
      onConflict: "message_id,viewer_id",
      ignoreDuplicates: true, // don't overwrite existing read_at
    });
    return { ok: true, data: { delivered: ids.length } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Given a list of my-sent messages, return the status for each from the recipient's pov. */
export async function getOutgoingStatuses(messageIds: string[]): Promise<R<Record<string, MessageStatus>>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (messageIds.length === 0) return { ok: true, data: {} };
    const sb = supabaseAdmin();
    const { data } = await sb.from("message_reads")
      .select("message_id, delivered_at, read_at")
      .in("message_id", messageIds);
    const map: Record<string, MessageStatus> = {};
    for (const id of messageIds) map[id] = "sent";
    for (const r of (data || []) as Array<{ message_id: string; delivered_at: string | null; read_at: string | null }>) {
      if (r.read_at) map[r.message_id] = "read";
      else if (r.delivered_at) map[r.message_id] = "delivered";
    }
    return { ok: true, data: map };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
