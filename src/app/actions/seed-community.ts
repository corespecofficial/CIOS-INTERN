"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const STARTER_GROUPS: Array<{ name: string; description: string; tags: string[] }> = [
  { name: "introductions",        description: "Say hi. Tell the community who you are, what you're working on, and what you're hoping to learn.", tags: ["welcome", "intro"] },
  { name: "wins",                 description: "Share what you shipped this week. Big or small — we celebrate everything.",                         tags: ["wins", "showcase"] },
  { name: "help",                 description: "Stuck on something? Ask here. A real human will reply fast.",                                       tags: ["help", "questions"] },
  { name: "ai-prompting",         description: "Prompts, tricks, and breakthroughs with AI tools. Paste what's working for you.",                   tags: ["ai", "prompts"] },
  { name: "design",               description: "Design critiques, moodboards, tools, and inspiration.",                                             tags: ["design", "ux"] },
  { name: "career",               description: "Portfolio feedback, interview prep, salary talk. Level up together.",                               tags: ["career", "jobs"] },
];

const WELCOME_POST = {
  title: "👋 Welcome to the CIOS community",
  content: `Hi, I'm Joshua — welcome to CIOS.

This space is the heart of the internship. Here's how to get the most out of it:

1. **Post in #introductions** — tell us who you are and what you want to build. Don't be shy; every intern here is also figuring things out.
2. **Drop a win in #wins every Friday** — even if it feels small. Momentum compounds.
3. **Ask your dumbest questions in #help** — they're never dumb, and someone else has the same one.
4. **React + vote on posts** you love. It's how the best stuff rises to the top.
5. **Earn kudos, awards, and reputation** by showing up consistently. The platform rewards effort, not just outcomes.

A few ground rules:
- Be kind. If you wouldn't say it to your cousin, don't say it here.
- Stay on topic within each group.
- If something feels off, report it — mods will act.

Let's make this cohort unforgettable. 🚀

— Joshua`,
};

/**
 * Seeds a fresh community with starter groups + a pinned welcome post
 * authored by the current user (super_admin only). Idempotent: re-running
 * skips anything that already exists.
 */
export async function seedCommunity(): Promise<R<{ groupsCreated: number; welcomePostId: string | null }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (me.role !== "super_admin" && me.role !== "admin") return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();

    let groupsCreated = 0;
    const groupIds: Record<string, string> = {};
    for (const g of STARTER_GROUPS) {
      const { data: existing } = await sb.from("communities").select("id").eq("name", g.name).maybeSingle();
      if (existing) { groupIds[g.name] = existing.id; continue; }
      const { data: created, error } = await sb.from("communities").insert({
        name: g.name, description: g.description,
        created_by: me.id, is_private: false, tags: g.tags,
        member_count: 1,
      }).select("id").single();
      if (error || !created) continue;
      await sb.from("community_members").insert({
        community_id: created.id, user_id: me.id, role: "owner",
      });
      groupIds[g.name] = created.id;
      groupsCreated++;
    }

    // Pinned welcome post in #introductions
    let welcomePostId: string | null = null;
    const introId = groupIds["introductions"];
    if (introId) {
      const { data: existingPost } = await sb.from("posts")
        .select("id").eq("community_id", introId).eq("author_id", me.id).eq("title", WELCOME_POST.title).maybeSingle();
      if (existingPost) {
        welcomePostId = existingPost.id;
        await sb.from("posts").update({ is_pinned: true }).eq("id", existingPost.id);
      } else {
        const { data: post } = await sb.from("posts").insert({
          community_id: introId,
          author_id: me.id,
          title: WELCOME_POST.title,
          content: WELCOME_POST.content,
          type: "announcement",
          is_pinned: true,
          tags: ["welcome"],
        }).select("id").single();
        welcomePostId = post?.id || null;
      }
    }

    return { ok: true, data: { groupsCreated, welcomePostId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
