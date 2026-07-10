"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";
import { canMessage } from "@/lib/messaging-privacy";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function assertMember(roomId: string, userId: string) {
  const { data, error } = await supabaseAdmin()
    .from("chat_room_members")
    .select("id, role")
    .eq("chat_room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden — you are not a member of this room");
  return data;
}

/* ───────── DM helpers ───────── */

export async function getOrCreateDirectRoom(otherUserId: string): Promise<Result<{ roomId: string }>> {
  try {
    const me = await requireMe();
    if (me.id === otherUserId) return { ok: false, error: "Cannot DM yourself" };
    // Enforce contact permission — admins/super-admins bypass inside canMessage
    const allowed = await canMessage(me.id, otherUserId);
    if (!allowed) return { ok: false, error: "You don't have permission to message this user. Request a contact via Messages → Contacts." };
    const sb = supabaseAdmin();

    // Find rooms where both users are members and type=direct
    const { data: mine } = await sb
      .from("chat_room_members")
      .select("chat_room_id, chat_room:chat_rooms!chat_room_members_chat_room_id_fkey(type)")
      .eq("user_id", me.id);
    const myDirectRoomIds = (mine || [])
      .filter((r: { chat_room: { type: string } | { type: string }[] | null }) => {
        const cr = Array.isArray(r.chat_room) ? r.chat_room[0] : r.chat_room;
        return cr?.type === "direct";
      })
      .map((r: { chat_room_id: string }) => r.chat_room_id);

    if (myDirectRoomIds.length > 0) {
      const { data: shared } = await sb
        .from("chat_room_members")
        .select("chat_room_id")
        .in("chat_room_id", myDirectRoomIds)
        .eq("user_id", otherUserId)
        .maybeSingle();
      if (shared) return { ok: true, data: { roomId: shared.chat_room_id } };
    }

    // Create new direct room
    const { data: room, error: roomErr } = await sb
      .from("chat_rooms")
      .insert({ name: "Direct", type: "direct", created_by: me.id })
      .select("id")
      .single();
    if (roomErr || !room) return { ok: false, error: roomErr?.message || "Could not create room" };

    const { error: membersErr } = await sb.from("chat_room_members").insert([
      { chat_room_id: room.id, user_id: me.id, role: "owner" },
      { chat_room_id: room.id, user_id: otherUserId, role: "member" },
    ]);
    if (membersErr) return { ok: false, error: membersErr.message };

    revalidatePath("/messages");
    return { ok: true, data: { roomId: room.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createGroupRoom(
  name: string,
  memberIds: string[],
  avatarUrl: string | null = null
): Promise<Result<{ roomId: string }>> {
  try {
    const me = await requireMe();
    if (!name.trim()) return { ok: false, error: "Group name required" };
    if (memberIds.length === 0) return { ok: false, error: "Add at least one member" };

    const sb = supabaseAdmin();
    const { data: room, error: roomErr } = await sb
      .from("chat_rooms")
      .insert({ name: name.trim(), type: "group", created_by: me.id, avatar_url: avatarUrl })
      .select("id")
      .single();
    if (roomErr || !room) return { ok: false, error: roomErr?.message || "Could not create group" };

    const uniqueMembers = Array.from(new Set([me.id, ...memberIds]));
    const rows = uniqueMembers.map((uid) => ({
      chat_room_id: room.id,
      user_id: uid,
      role: uid === me.id ? "owner" : "member",
    }));
    const { error: mErr } = await sb.from("chat_room_members").insert(rows);
    if (mErr) return { ok: false, error: mErr.message };

    revalidatePath("/messages");
    return { ok: true, data: { roomId: room.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── Message operations ───────── */

export interface SendMessagePayload {
  roomId: string;
  content: string;
  replyToId?: string | null;
  attachmentUrl?: string | null;
  messageType?: "text" | "image" | "file";
}

export async function sendMessage(p: SendMessagePayload): Promise<Result<{ messageId: string; createdAt: string }>> {
  try {
    const me = await requireMe();
    await assertMember(p.roomId, me.id);

    const content = p.content.trim();
    if (!content && !p.attachmentUrl) return { ok: false, error: "Empty message" };
    if (content.length > 4000) return { ok: false, error: "Message too long" };

    const sb = supabaseAdmin();

    // Belt-and-braces: enforce contact permission on every send, not just on
    // room creation. Covers the case where a connection was revoked but the
    // old room row still exists with both users as members.
    const { data: room } = await sb.from("chat_rooms").select("type").eq("id", p.roomId).maybeSingle();
    if ((room as { type?: string } | null)?.type === "direct") {
      const { data: others } = await sb.from("chat_room_members")
        .select("user_id").eq("chat_room_id", p.roomId).neq("user_id", me.id);
      const otherId = (others as Array<{ user_id: string }> | null)?.[0]?.user_id;
      if (otherId) {
        const allowed = await canMessage(me.id, otherId);
        if (!allowed) return { ok: false, error: "This contact was revoked. Send a new connect request from Contacts." };
      }
    }
    const { data, error } = await sb
      .from("messages")
      .insert({
        chat_room_id: p.roomId,
        sender_id: me.id,
        content,
        message_type: p.messageType || (p.replyToId ? "reply" : "text"),
        reply_to_id: p.replyToId || null,
        attachment_url: p.attachmentUrl || null,
      })
      .select("id, created_at")
      .single();
    if (error || !data) return { ok: false, error: error?.message || "Send failed" };

    // Bump room updated_at so list sorts right
    await sb.from("chat_rooms").update({ updated_at: new Date().toISOString() }).eq("id", p.roomId);

    // Fire notifications to all other room members (globally, not just realtime chat)
    try {
      const [{ data: room }, { data: members }] = await Promise.all([
        sb.from("chat_rooms").select("name, type").eq("id", p.roomId).single(),
        sb.from("chat_room_members")
          .select("user_id, is_muted, user:users!chat_room_members_user_id_fkey(clerk_id)")
          .eq("chat_room_id", p.roomId).neq("user_id", me.id),
      ]);
      const title = room?.type === "direct" ? `${me.name} messaged you` : `${me.name} in ${room?.name || "a group"}`;
      const preview = content ? content.slice(0, 120) : p.messageType === "image" ? "📷 Image" : "📎 Attachment";
      type M = { user_id: string; is_muted: boolean; user?: { clerk_id?: string } | { clerk_id?: string }[] | null };
      for (const mrow of (members || []) as M[]) {
        if (mrow.is_muted) continue; // respect per-member mute
        const u = Array.isArray(mrow.user) ? mrow.user[0] : mrow.user;
        await pushNotification({
          userId: mrow.user_id,
          userClerkId: u?.clerk_id || null,
          title, message: preview, type: "message",
          actionUrl: `/messages`,
        });
      }
    } catch (e) { console.warn("[notif] message push:", e); }

    return { ok: true, data: { messageId: data.id, createdAt: data.created_at } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function editMessage(messageId: string, newContent: string): Promise<Result> {
  try {
    const me = await requireMe();
    const content = newContent.trim();
    if (!content) return { ok: false, error: "Empty content" };
    const sb = supabaseAdmin();
    const { data: msg } = await sb.from("messages").select("sender_id").eq("id", messageId).single();
    if (!msg || msg.sender_id !== me.id) return { ok: false, error: "Cannot edit this message" };
    const { error } = await sb.from("messages")
      .update({ content, is_edited: true, updated_at: new Date().toISOString() })
      .eq("id", messageId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteMessage(messageId: string, forEveryone: boolean): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: msg } = await sb.from("messages").select("sender_id, chat_room_id").eq("id", messageId).single();
    if (!msg) return { ok: false, error: "Message not found" };

    if (forEveryone) {
      if (msg.sender_id !== me.id) return { ok: false, error: "Only the sender can delete for everyone" };
      const { error } = await sb.from("messages")
        .update({ is_deleted: true, content: "" })
        .eq("id", messageId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await sb.from("message_deletions")
        .insert({ user_id: me.id, message_id: messageId });
      if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleReaction(messageId: string, emoji: string): Promise<Result<{ reactions: Record<string, string[]> }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: msg, error: mErr } = await sb.from("messages")
      .select("reactions, chat_room_id").eq("id", messageId).single();
    if (mErr || !msg) return { ok: false, error: "Message not found" };
    await assertMember(msg.chat_room_id, me.id);

    const reactions = { ...(msg.reactions || {}) } as Record<string, string[]>;
    const list = reactions[emoji] || [];
    if (list.includes(me.id)) {
      reactions[emoji] = list.filter((id) => id !== me.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...list, me.id];
    }
    const { error } = await sb.from("messages").update({ reactions }).eq("id", messageId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { reactions } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleStarMessage(messageId: string): Promise<Result<{ starred: boolean }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("starred_messages")
      .select("id").eq("user_id", me.id).eq("message_id", messageId).maybeSingle();
    if (existing) {
      await sb.from("starred_messages").delete().eq("id", existing.id);
      return { ok: true, data: { starred: false } };
    }
    await sb.from("starred_messages").insert({ user_id: me.id, message_id: messageId });
    return { ok: true, data: { starred: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markRoomRead(roomId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin()
      .from("chat_room_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("chat_room_id", roomId)
      .eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setRoomPref(
  roomId: string,
  patch: { is_muted?: boolean; is_pinned?: boolean; is_archived_for_user?: boolean }
): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin()
      .from("chat_room_members")
      .update(patch)
      .eq("chat_room_id", roomId)
      .eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function addMembersToGroup(roomId: string, userIds: string[]): Promise<Result> {
  try {
    const me = await requireMe();
    const mem = await assertMember(roomId, me.id);
    if (mem.role !== "owner" && mem.role !== "admin") return { ok: false, error: "Admin only" };
    if (userIds.length === 0) return { ok: false, error: "No users to add" };
    const sb = supabaseAdmin();
    const rows = userIds.map((uid) => ({ chat_room_id: roomId, user_id: uid, role: "member" }));
    const { error } = await sb.from("chat_room_members").upsert(rows, { onConflict: "chat_room_id,user_id" });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function leaveRoom(roomId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin()
      .from("chat_room_members")
      .delete()
      .eq("chat_room_id", roomId)
      .eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── Block / Unblock ───────── */

export async function blockUser(targetUserId: string): Promise<Result> {
  try {
    const me = await requireMe();
    if (me.id === targetUserId) return { ok: false, error: "Cannot block yourself" };
    const sb = supabaseAdmin();
    const { error } = await sb.from("blocked_users")
      .insert({ blocker_id: me.id, blocked_id: targetUserId });
    if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function unblockUser(targetUserId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const { error } = await supabaseAdmin()
      .from("blocked_users")
      .delete()
      .eq("blocker_id", me.id)
      .eq("blocked_id", targetUserId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listBlockedUsers(): Promise<Result<{ ids: string[] }>> {
  try {
    const me = await requireMe();
    const { data } = await supabaseAdmin()
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", me.id);
    return { ok: true, data: { ids: (data || []).map((r: { blocked_id: string }) => r.blocked_id) } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── Forward ───────── */

export async function forwardMessage(
  sourceMessageId: string,
  targetRoomIds: string[]
): Promise<Result<{ sent: number }>> {
  try {
    const me = await requireMe();
    if (targetRoomIds.length === 0) return { ok: false, error: "Pick at least one chat" };
    const sb = supabaseAdmin();

    const { data: src } = await sb
      .from("messages")
      .select("content, message_type, attachment_url")
      .eq("id", sourceMessageId)
      .single();
    if (!src) return { ok: false, error: "Source message not found" };

    let sent = 0;
    for (const roomId of targetRoomIds) {
      // Ensure member (skip otherwise)
      const { data: m } = await sb
        .from("chat_room_members")
        .select("id").eq("chat_room_id", roomId).eq("user_id", me.id).maybeSingle();
      if (!m) continue;
      const { error } = await sb.from("messages").insert({
        chat_room_id: roomId,
        sender_id: me.id,
        content: src.content,
        message_type: src.message_type,
        attachment_url: src.attachment_url,
      });
      if (!error) {
        sent++;
        await sb.from("chat_rooms").update({ updated_at: new Date().toISOString() }).eq("id", roomId);
      }
    }
    revalidatePath("/messages");
    return { ok: true, data: { sent } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── Ably token auth ───────── */

export async function createAblyToken(): Promise<Result<{ tokenRequest: unknown }>> {
  try {
    const me = await requireMe();
    const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!key) return { ok: false, error: "Ably not configured" };
    const Ably = (await import("ably")).default;
    const rest = new Ably.Rest({ key });
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: me.clerk_id,
      capability: JSON.stringify({
        "room:*": ["*"],
        "presence:*": ["*"],
        // Org-portal realtime channels: chat fan-out and dashboard
        // activity feed. We grant subscribe-wide here because Ably
        // capabilities can't reference per-user membership state at
        // token-mint time; org-side authorization is enforced by the
        // server actions that publish to these channels (assertOrgMember
        // / HOST_ROLES gates) — clients can only ever LISTEN.
        "org-chat:*": ["subscribe", "presence", "history"],
        "org-activity:*": ["subscribe", "history"],
        ...(me.role === "super_admin" ? { "platform-orgs": ["subscribe", "history"] } : {}),
        [`notif:${me.clerk_id}`]: ["subscribe", "presence", "history"],
      }),
    });
    return { ok: true, data: { tokenRequest } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Full-text search across messages — within a single room or across all rooms I'm in. */
export async function searchMessages(query: string, roomId?: string): Promise<Result<Array<{ id: string; chat_room_id: string; sender_id: string; sender_name: string | null; content: string; created_at: string }>>> {
  try {
    const me = await requireMe();
    const q = query.trim();
    if (q.length < 2) return { ok: true, data: [] };
    const sb = supabaseAdmin();
    let req = sb.from("messages")
      .select("id, chat_room_id, sender_id, content, created_at, sender:sender_id(name)")
      .ilike("content", `%${q}%`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (roomId) {
      await assertMember(roomId, me.id);
      req = req.eq("chat_room_id", roomId);
    } else {
      const { data: rooms } = await sb.from("chat_room_members").select("chat_room_id").eq("user_id", me.id);
      const ids = ((rooms || []) as Array<{ chat_room_id: string }>).map((r) => r.chat_room_id);
      if (ids.length === 0) return { ok: true, data: [] };
      req = req.in("chat_room_id", ids);
    }
    const { data, error } = await req;
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: ((data || []) as Array<{ id: string; chat_room_id: string; sender_id: string; content: string; created_at: string; sender: { name: string } | { name: string }[] | null }>).map((m) => ({
        id: m.id,
        chat_room_id: m.chat_room_id,
        sender_id: m.sender_id,
        sender_name: Array.isArray(m.sender) ? (m.sender[0]?.name || null) : (m.sender?.name || null),
        content: m.content,
        created_at: m.created_at,
      })),
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
