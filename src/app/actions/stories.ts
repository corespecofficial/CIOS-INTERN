"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface Story {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  kind: "text" | "photo" | "video";
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  background_color: string;
  view_count: number;
  featured: boolean;
  saved_to_profile: boolean;
  expires_at: string;
  created_at: string;
  reactions: Record<string, number>;
  viewed_by_me: boolean;
  my_reactions: string[];
}

export async function listActiveStories(): Promise<R<Story[]>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("stories")
      .select("*, author:users!stories_author_id_fkey(name, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const storyIds = (data ?? []).map((s) => (s as { id: string }).id);
    let reactionsMap = new Map<string, Record<string, number>>();
    let myReactionsMap = new Map<string, string[]>();
    let viewedSet = new Set<string>();

    if (storyIds.length > 0) {
      const [reactRes, viewRes] = await Promise.all([
        sb.from("story_reactions").select("story_id, reaction, user_id").in("story_id", storyIds),
        me ? sb.from("story_views").select("story_id").in("story_id", storyIds).eq("user_id", me.id) : Promise.resolve({ data: [] }),
      ]);

      for (const r of (reactRes.data ?? []) as Array<{ story_id: string; reaction: string; user_id: string }>) {
        const cur = reactionsMap.get(r.story_id) ?? {};
        cur[r.reaction] = (cur[r.reaction] ?? 0) + 1;
        reactionsMap.set(r.story_id, cur);
        if (me && r.user_id === me.id) {
          const arr = myReactionsMap.get(r.story_id) ?? [];
          arr.push(r.reaction);
          myReactionsMap.set(r.story_id, arr);
        }
      }
      for (const v of (viewRes.data ?? []) as Array<{ story_id: string }>) {
        viewedSet.add(v.story_id);
      }
    }

    type Row = {
      id: string;
      author_id: string;
      kind: string;
      caption: string | null;
      media_url: string | null;
      thumbnail_url: string | null;
      background_color: string;
      view_count: number;
      featured: boolean;
      saved_to_profile: boolean;
      expires_at: string;
      created_at: string;
      author: { name: string | null; avatar_url: string | null } | null;
    };

    const stories: Story[] = ((data ?? []) as Row[]).map((s) => ({
      id: s.id,
      author_id: s.author_id,
      author_name: s.author?.name ?? "Anonymous",
      author_avatar: s.author?.avatar_url ?? null,
      kind: s.kind as Story["kind"],
      caption: s.caption,
      media_url: s.media_url,
      thumbnail_url: s.thumbnail_url,
      background_color: s.background_color,
      view_count: s.view_count,
      featured: s.featured,
      saved_to_profile: s.saved_to_profile,
      expires_at: s.expires_at,
      created_at: s.created_at,
      reactions: reactionsMap.get(s.id) ?? {},
      viewed_by_me: viewedSet.has(s.id),
      my_reactions: myReactionsMap.get(s.id) ?? [],
    }));

    return { ok: true, data: stories };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createStory(input: {
  kind: "text" | "photo" | "video";
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  background_color?: string;
}): Promise<R<Story>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (input.kind !== "text" && !input.media_url) {
      return { ok: false, error: "Media is required for photo/video stories" };
    }
    if (input.kind === "text" && !input.caption) {
      return { ok: false, error: "Caption is required for text stories" };
    }
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("stories")
      .insert({
        author_id: me.id,
        kind: input.kind,
        caption: input.caption ?? null,
        media_url: input.media_url ?? null,
        thumbnail_url: input.thumbnail_url ?? null,
        background_color: input.background_color ?? "#1E88E5",
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/stories");
    revalidatePath("/community");
    return {
      ok: true,
      data: {
        ...(data as { id: string; author_id: string; kind: Story["kind"]; caption: string | null; media_url: string | null; thumbnail_url: string | null; background_color: string; view_count: number; featured: boolean; saved_to_profile: boolean; expires_at: string; created_at: string }),
        author_name: me.name || "You",
        author_avatar: me.avatar_url,
        reactions: {},
        viewed_by_me: true,
        my_reactions: [],
      } as Story,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function markStoryViewed(storyId: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: true };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("story_views").select("id").eq("story_id", storyId).eq("user_id", me.id).maybeSingle();
    if (existing) return { ok: true };
    await sb.from("story_views").insert({ story_id: storyId, user_id: me.id });
    const { data: cur } = await sb.from("stories").select("view_count").eq("id", storyId).maybeSingle();
    if (cur) await sb.from("stories").update({ view_count: Number((cur as { view_count: number }).view_count ?? 0) + 1 }).eq("id", storyId);
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export async function toggleStoryReaction(storyId: string, reaction: "fire" | "love" | "eyes" | "idea"): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb
      .from("story_reactions")
      .select("id")
      .eq("story_id", storyId)
      .eq("user_id", me.id)
      .eq("reaction", reaction)
      .maybeSingle();
    if (existing) {
      await sb.from("story_reactions").delete().eq("id", (existing as { id: string }).id);
    } else {
      await sb.from("story_reactions").insert({ story_id: storyId, user_id: me.id, reaction });
    }
    revalidatePath("/stories");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteStory(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: s } = await sb.from("stories").select("author_id").eq("id", id).maybeSingle();
    if (!s) return { ok: false, error: "Not found" };
    const isAdmin = ["admin", "super_admin"].includes(me.role);
    if ((s as { author_id: string }).author_id !== me.id && !isAdmin) return { ok: false, error: "Unauthorized" };
    await sb.from("stories").delete().eq("id", id);
    revalidatePath("/stories");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
