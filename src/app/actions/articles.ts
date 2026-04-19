"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface Article {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  body: string;
  reading_min: number;
  tags: string[];
  status: "draft" | "published" | "archived";
  featured: boolean;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  published_at: string | null;
  reacted_by_me?: boolean;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export async function listArticles(): Promise<R<Article[]>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("articles")
      .select("*, author:users!articles_author_id_fkey(name, avatar_url)")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    let myReactSet = new Set<string>();
    if (me) {
      const ids = (data ?? []).map((a) => (a as { id: string }).id);
      if (ids.length > 0) {
        const { data: mine } = await sb.from("article_reactions").select("article_id").eq("user_id", me.id).in("article_id", ids);
        for (const r of (mine ?? []) as Array<{ article_id: string }>) myReactSet.add(r.article_id);
      }
    }

    type Row = Omit<Article, "author_name" | "author_avatar"> & { author: { name: string | null; avatar_url: string | null } | null };
    const articles: Article[] = ((data ?? []) as Row[]).map((a) => ({
      ...a,
      author_name: a.author?.name ?? "Anonymous",
      author_avatar: a.author?.avatar_url ?? null,
      reacted_by_me: myReactSet.has(a.id),
    }));
    return { ok: true, data: articles };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getArticleBySlug(slug: string): Promise<R<Article | null>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("articles")
      .select("*, author:users!articles_author_id_fkey(name, avatar_url)")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return { ok: true, data: null };

    let reacted = false;
    if (me) {
      const { data: mine } = await sb
        .from("article_reactions")
        .select("id")
        .eq("article_id", (data as { id: string }).id)
        .eq("user_id", me.id)
        .maybeSingle();
      reacted = !!mine;
    }

    await sb.from("articles").update({ view_count: Number((data as { view_count: number }).view_count ?? 0) + 1 }).eq("id", (data as { id: string }).id);

    type Row = Omit<Article, "author_name" | "author_avatar"> & { author: { name: string | null; avatar_url: string | null } | null };
    const a = data as Row;
    return {
      ok: true,
      data: {
        ...a,
        author_name: a.author?.name ?? "Anonymous",
        author_avatar: a.author?.avatar_url ?? null,
        reacted_by_me: reacted,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createArticle(input: {
  title: string;
  subtitle?: string;
  cover_url?: string;
  body: string;
  tags?: string[];
  status?: "draft" | "published";
}): Promise<R<Article>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!input.title.trim() || !input.body.trim()) return { ok: false, error: "Title and body required" };

    const sb = supabaseAdmin();
    let slug = slugify(input.title);
    let attempts = 0;
    while (attempts < 5) {
      const { data: taken } = await sb.from("articles").select("id").eq("slug", slug).maybeSingle();
      if (!taken) break;
      slug = `${slugify(input.title)}-${Math.floor(Math.random() * 9999)}`;
      attempts++;
    }

    const status = input.status ?? "published";
    const { data, error } = await sb
      .from("articles")
      .insert({
        author_id: me.id,
        slug,
        title: input.title,
        subtitle: input.subtitle ?? null,
        cover_url: input.cover_url ?? null,
        body: input.body,
        reading_min: readingMinutes(input.body),
        tags: input.tags ?? [],
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/articles");
    return {
      ok: true,
      data: {
        ...(data as Omit<Article, "author_name" | "author_avatar">),
        author_name: me.name || "You",
        author_avatar: me.avatar_url,
      } as Article,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function toggleArticleReaction(articleId: string): Promise<R<{ reacted: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("article_reactions").select("id").eq("article_id", articleId).eq("user_id", me.id).maybeSingle();
    if (existing) {
      await sb.from("article_reactions").delete().eq("id", (existing as { id: string }).id);
      const { data: cur } = await sb.from("articles").select("reaction_count").eq("id", articleId).maybeSingle();
      if (cur) await sb.from("articles").update({ reaction_count: Math.max(0, Number((cur as { reaction_count: number }).reaction_count ?? 0) - 1) }).eq("id", articleId);
      return { ok: true, data: { reacted: false } };
    }
    await sb.from("article_reactions").insert({ article_id: articleId, user_id: me.id });
    const { data: cur } = await sb.from("articles").select("reaction_count").eq("id", articleId).maybeSingle();
    if (cur) await sb.from("articles").update({ reaction_count: Number((cur as { reaction_count: number }).reaction_count ?? 0) + 1 }).eq("id", articleId);
    return { ok: true, data: { reacted: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
