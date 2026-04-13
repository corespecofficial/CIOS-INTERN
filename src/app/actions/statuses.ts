"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type StatusKind = "text" | "image" | "video";
export type StatusPrivacy = "everyone" | "contacts" | "only_selected" | "except_selected";

export interface StatusItem {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  kind: StatusKind;
  content: string;
  media_url: string | null;
  background: string | null;
  text_color: string | null;
  privacy: StatusPrivacy;
  reactions: Record<string, string[]>;
  viewer_count: number;
  has_viewed: boolean;
  created_at: string;
  expires_at: string;
  is_mine: boolean;
}

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

export async function createStatus(input: {
  kind: StatusKind;
  content: string;
  mediaUrl?: string | null;
  background?: string | null;
  textColor?: string | null;
  privacy?: StatusPrivacy;
  audienceIds?: string[];
}): Promise<Result<{ id: string }>> {
  try {
    const me = await requireMe();
    if (input.kind === "text" && !input.content.trim()) return { ok: false, error: "Text status cannot be empty" };
    if ((input.kind === "image" || input.kind === "video") && !input.mediaUrl) return { ok: false, error: "Media URL required" };

    const sb = supabaseAdmin();
    const { data, error } = await sb.from("statuses").insert({
      user_id: me.id,
      kind: input.kind,
      content: input.content || "",
      media_url: input.mediaUrl || null,
      background: input.background || null,
      text_color: input.textColor || null,
      privacy: input.privacy || "everyone",
      audience_ids: input.audienceIds || [],
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Insert failed" };

    revalidatePath("/messages");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteStatus(statusId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data } = await sb.from("statuses").select("user_id").eq("id", statusId).single();
    if (!data) return { ok: false, error: "Status not found" };
    if (data.user_id !== me.id) return { ok: false, error: "Only the owner can delete" };
    await sb.from("statuses").delete().eq("id", statusId);
    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markStatusViewed(statusId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { error } = await sb.from("status_views").insert({ status_id: statusId, viewer_id: me.id });
    if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function reactToStatus(statusId: string, emoji: string): Promise<Result<{ reactions: Record<string, string[]> }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: current } = await sb.from("statuses").select("reactions").eq("id", statusId).single();
    if (!current) return { ok: false, error: "Status not found" };
    const reactions = { ...(current.reactions || {}) } as Record<string, string[]>;
    const list = reactions[emoji] || [];
    reactions[emoji] = list.includes(me.id) ? list.filter((id) => id !== me.id) : [...list, me.id];
    if (reactions[emoji].length === 0) delete reactions[emoji];
    const { error } = await sb.from("statuses").update({ reactions }).eq("id", statusId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { reactions } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getStatusViewers(statusId: string): Promise<Result<{ viewers: { id: string; name: string; avatar_url: string | null; viewed_at: string }[] }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: s } = await sb.from("statuses").select("user_id").eq("id", statusId).single();
    if (!s) return { ok: false, error: "Status not found" };
    if (s.user_id !== me.id) return { ok: false, error: "Only the owner can see viewers" };
    const { data } = await sb
      .from("status_views")
      .select("viewed_at, user:users!status_views_viewer_id_fkey(id, name, avatar_url)")
      .eq("status_id", statusId)
      .order("viewed_at", { ascending: false });
    const viewers = (data || []).map((r: { viewed_at: string; user: { id: string; name: string; avatar_url: string | null } | { id: string; name: string; avatar_url: string | null }[] | null }) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      return { id: u?.id || "", name: u?.name || "Unknown", avatar_url: u?.avatar_url || null, viewed_at: r.viewed_at };
    });
    return { ok: true, data: { viewers } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
