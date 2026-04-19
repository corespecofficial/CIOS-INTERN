"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface Broadcast {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  audience: "all" | "cohort" | "roles" | "group";
  audience_value: string | null;
  view_count: number;
  pinned: boolean;
  status: "draft" | "published" | "archived";
  created_at: string;
  viewed_by_me: boolean;
  my_reactions: string[];
  reaction_counts: Record<string, number>;
}

export async function listBroadcasts(): Promise<R<Broadcast[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("broadcasts")
      .select("*, author:users!broadcasts_author_id_fkey(name, avatar_url)")
      .eq("status", "published")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const ids = ((data ?? []) as Array<{ id: string }>).map((b) => b.id);
    let viewedSet = new Set<string>();
    let reactionMap = new Map<string, Record<string, number>>();
    let myReactions = new Map<string, string[]>();
    if (ids.length > 0) {
      const [viewsRes, reactsRes] = await Promise.all([
        sb.from("broadcast_views").select("broadcast_id").eq("user_id", me.id).in("broadcast_id", ids),
        sb.from("broadcast_reactions").select("broadcast_id, reaction, user_id").in("broadcast_id", ids),
      ]);
      for (const v of (viewsRes.data ?? []) as Array<{ broadcast_id: string }>) viewedSet.add(v.broadcast_id);
      for (const r of (reactsRes.data ?? []) as Array<{ broadcast_id: string; reaction: string; user_id: string }>) {
        const cur = reactionMap.get(r.broadcast_id) ?? {};
        cur[r.reaction] = (cur[r.reaction] ?? 0) + 1;
        reactionMap.set(r.broadcast_id, cur);
        if (r.user_id === me.id) {
          const mine = myReactions.get(r.broadcast_id) ?? [];
          mine.push(r.reaction);
          myReactions.set(r.broadcast_id, mine);
        }
      }
    }

    type Row = Omit<Broadcast, "author_name" | "author_avatar" | "viewed_by_me" | "my_reactions" | "reaction_counts"> & { author: { name: string | null; avatar_url: string | null } | null };
    const result: Broadcast[] = ((data ?? []) as Row[]).map((b) => ({
      ...b,
      author_name: b.author?.name ?? "Admin",
      author_avatar: b.author?.avatar_url ?? null,
      viewed_by_me: viewedSet.has(b.id),
      my_reactions: myReactions.get(b.id) ?? [],
      reaction_counts: reactionMap.get(b.id) ?? {},
    }));
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createBroadcast(input: {
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_sec?: number;
  audience?: "all" | "cohort" | "roles" | "group";
  audience_value?: string;
}): Promise<R<Broadcast>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!["admin", "super_admin", "mentor", "instructor"].includes(me.role)) {
      return { ok: false, error: "Only admins, mentors, and instructors can broadcast" };
    }
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("broadcasts")
      .insert({
        author_id: me.id,
        title: input.title,
        description: input.description ?? null,
        video_url: input.video_url,
        thumbnail_url: input.thumbnail_url ?? null,
        duration_sec: input.duration_sec ?? null,
        audience: input.audience ?? "all",
        audience_value: input.audience_value ?? null,
        status: "published",
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/broadcasts");
    return {
      ok: true,
      data: {
        ...(data as Omit<Broadcast, "author_name" | "author_avatar" | "viewed_by_me" | "my_reactions" | "reaction_counts">),
        author_name: me.name || "Admin",
        author_avatar: me.avatar_url,
        viewed_by_me: true,
        my_reactions: [],
        reaction_counts: {},
      } as Broadcast,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function markBroadcastViewed(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: true };
    const sb = supabaseAdmin();
    const { data: exists } = await sb.from("broadcast_views").select("id").eq("broadcast_id", id).eq("user_id", me.id).maybeSingle();
    if (exists) return { ok: true };
    await sb.from("broadcast_views").insert({ broadcast_id: id, user_id: me.id });
    const { data: cur } = await sb.from("broadcasts").select("view_count").eq("id", id).maybeSingle();
    if (cur) await sb.from("broadcasts").update({ view_count: Number((cur as { view_count: number }).view_count ?? 0) + 1 }).eq("id", id);
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export async function reactToBroadcast(id: string, reaction: string): Promise<R<{ toggled: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: ex } = await sb
      .from("broadcast_reactions")
      .select("id")
      .eq("broadcast_id", id)
      .eq("user_id", me.id)
      .eq("reaction", reaction)
      .maybeSingle();
    if (ex) {
      await sb.from("broadcast_reactions").delete().eq("id", (ex as { id: string }).id);
      return { ok: true, data: { toggled: false } };
    }
    await sb.from("broadcast_reactions").insert({ broadcast_id: id, user_id: me.id, reaction });
    return { ok: true, data: { toggled: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteBroadcast(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: b } = await sb.from("broadcasts").select("author_id").eq("id", id).maybeSingle();
    if (!b) return { ok: false, error: "Not found" };
    const isAdmin = ["admin", "super_admin"].includes(me.role);
    if ((b as { author_id: string }).author_id !== me.id && !isAdmin) return { ok: false, error: "Unauthorized" };
    await sb.from("broadcasts").delete().eq("id", id);
    revalidatePath("/broadcasts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
