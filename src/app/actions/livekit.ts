"use server";

import { AccessToken } from "livekit-server-sdk";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

export interface LiveBroadcastInput {
  title: string;
  description?: string;
  scheduled_at?: string;
  start_now?: boolean;
}

export interface LiveRoomTokens {
  broadcast_id: string;
  room_name: string;
  token: string;
  ws_url: string;
  is_host: boolean;
}

function ensureCreds(): string | null {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return "LiveKit is not configured. Set NEXT_PUBLIC_LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.";
  }
  return null;
}

export async function createLiveBroadcast(input: LiveBroadcastInput): Promise<R<{ broadcast_id: string; room_name: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!["admin", "super_admin", "mentor", "instructor"].includes(me.role)) {
      return { ok: false, error: "Only admins, mentors, and instructors can broadcast live" };
    }
    const sb = supabaseAdmin();
    const roomName = `cios-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startNow = input.start_now ?? !input.scheduled_at;

    const { data, error } = await sb
      .from("broadcasts")
      .insert({
        author_id: me.id,
        title: input.title,
        description: input.description ?? null,
        video_url: null,
        mode: startNow ? "live" : "scheduled",
        room_name: roomName,
        scheduled_at: input.scheduled_at ?? null,
        is_live: startNow,
        live_started_at: startNow ? new Date().toISOString() : null,
        status: "published",
      })
      .select("id, room_name")
      .single();
    if (error) throw error;
    revalidatePath("/broadcasts");
    return { ok: true, data: { broadcast_id: (data as { id: string }).id, room_name: (data as { room_name: string }).room_name } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getLiveRoomToken(broadcastId: string): Promise<R<LiveRoomTokens>> {
  try {
    const credErr = ensureCreds();
    if (credErr) return { ok: false, error: credErr };
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: b } = await sb.from("broadcasts").select("id, author_id, room_name, mode, is_live").eq("id", broadcastId).maybeSingle();
    if (!b) return { ok: false, error: "Broadcast not found" };
    const row = b as { id: string; author_id: string; room_name: string | null; mode: string; is_live: boolean };
    if (!row.room_name) return { ok: false, error: "This broadcast is not a live room" };

    const isHost = row.author_id === me.id;
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: me.id,
      name: me.name || "Participant",
      ttl: "2h",
    });
    at.addGrant({
      roomJoin: true,
      room: row.room_name,
      canPublish: isHost,
      canPublishData: true,
      canSubscribe: true,
    });
    const token = await at.toJwt();

    return {
      ok: true,
      data: {
        broadcast_id: row.id,
        room_name: row.room_name,
        token,
        ws_url: LIVEKIT_URL,
        is_host: isHost,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function endLiveBroadcast(broadcastId: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: b } = await sb.from("broadcasts").select("author_id").eq("id", broadcastId).maybeSingle();
    if (!b) return { ok: false, error: "Not found" };
    const isAdmin = ["admin", "super_admin"].includes(me.role);
    if ((b as { author_id: string }).author_id !== me.id && !isAdmin) return { ok: false, error: "Unauthorized" };

    await sb
      .from("broadcasts")
      .update({ is_live: false, live_ended_at: new Date().toISOString(), mode: "recorded" })
      .eq("id", broadcastId);
    revalidatePath("/broadcasts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
