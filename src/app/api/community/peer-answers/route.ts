import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export const runtime = "nodejs";

/** Returns the top community posts matching tags or a keyword query.
 *  Used by the PeerAnswers widget on task/lesson pages. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tags = (url.searchParams.get("tags") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const q = (url.searchParams.get("q") || "").trim();

  const sb = supabaseAdmin();
  let query = sb.from("posts")
    .select("id, title, score, comment_count, tags, community:communities!posts_community_id_fkey(name)")
    .eq("is_deleted", false)
    .order("score", { ascending: false })
    .limit(3);

  if (tags.length > 0) query = query.overlaps("tags", tags);
  else if (q) query = query.ilike("title", `%${q}%`);
  else return NextResponse.json({ posts: [] });

  const { data } = await query;
  type R = { id: string; title: string; score: number; comment_count: number; tags: string[] | null; community: { name?: string } | { name?: string }[] | null };
  const posts = ((data || []) as R[]).map((r) => {
    const c = Array.isArray(r.community) ? r.community[0] : r.community;
    return {
      id: r.id, title: r.title, score: r.score || 0,
      comment_count: r.comment_count || 0, tags: r.tags || [],
      community_name: c?.name || null,
    };
  });
  return NextResponse.json({ posts });
}
