"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";
import { awardXP } from "@/lib/gamification";
import Ably from "ably";

let ablyRest: Ably.Rest | null = null;
function getAblyRest(): Ably.Rest | null {
  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  if (!ablyRest) ablyRest = new Ably.Rest({ key });
  return ablyRest;
}

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

function recomputeScore(up: number, down: number): number {
  return up - down;
}

/* ─────────────── Community / Groups ─────────────── */

export async function createCommunity(input: { name: string; description: string; category?: string; isPrivate?: boolean; tags?: string[] }): Promise<Result<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.name.trim()) return { ok: false, error: "Name required" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("communities").insert({
      name: input.name.trim(),
      description: input.description || "",
      created_by: me.id,
      is_private: input.isPrivate || false,
      tags: input.tags || [],
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    await sb.from("community_members").insert({ community_id: data.id, user_id: me.id, role: "owner" });
    await sb.from("communities").update({ member_count: 1 }).eq("id", data.id);
    revalidatePath("/community/groups");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function joinCommunity(communityId: string): Promise<Result<{ joined: boolean; count: number }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("community_members")
      .select("id").eq("community_id", communityId).eq("user_id", me.id).maybeSingle();
    if (existing) {
      // Leave
      await sb.from("community_members").delete().eq("id", existing.id);
    } else {
      await sb.from("community_members").insert({ community_id: communityId, user_id: me.id, role: "member" });
    }
    const { count } = await sb.from("community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId);
    await sb.from("communities").update({ member_count: count || 0 }).eq("id", communityId);
    revalidatePath("/community");
    return { ok: true, data: { joined: !existing, count: count || 0 } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────────── Posts ─────────────── */

export interface CreatePostInput {
  communityId: string;
  title: string;
  content: string;
  type?: "discussion" | "question" | "announcement" | "resource" | "poll";
  imageUrl?: string | null;
  linkUrl?: string | null;
  videoUrl?: string | null;
  tags?: string[];
  isQuestion?: boolean;
}

export async function createPost(input: CreatePostInput): Promise<Result<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const sb = supabaseAdmin();

    // Anti-spam rate limit — accounts under 48 hours old are capped to 3
    // posts per rolling hour. Established accounts are uncapped. Mods and
    // admins bypass entirely.
    if (me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") {
      const { data: meRow } = await sb.from("users").select("created_at").eq("id", me.id).single();
      const ageMs = meRow?.created_at ? Date.now() - new Date(meRow.created_at).getTime() : 0;
      if (ageMs < 48 * 3600 * 1000) {
        const since = new Date(Date.now() - 3600 * 1000).toISOString();
        const { count } = await sb.from("posts").select("*", { count: "exact", head: true })
          .eq("author_id", me.id).gte("created_at", since);
        if ((count || 0) >= 3) {
          return { ok: false, error: "New accounts can post up to 3 times per hour. Try again in a bit." };
        }
      }
    }

    // Verify membership for posting in the community. Owner / creator is
    // always treated as a member even if the membership row got lost.
    const { data: c } = await sb.from("communities").select("is_private, created_by").eq("id", input.communityId).single();
    if (!c) return { ok: false, error: "Community not found" };
    const { data: mem } = await sb.from("community_members").select("id").eq("community_id", input.communityId).eq("user_id", me.id).maybeSingle();
    const isOwner = c.created_by === me.id;
    if (!mem && !isOwner) {
      if (c.is_private) return { ok: false, error: "Request to join this private group first" };
      await sb.from("community_members").insert({ community_id: input.communityId, user_id: me.id, role: "member" });
    } else if (!mem && isOwner) {
      // Self-heal owner membership if it was never written or got dropped.
      await sb.from("community_members").insert({ community_id: input.communityId, user_id: me.id, role: "owner" });
    }

    const { data, error } = await sb.from("posts").insert({
      community_id: input.communityId,
      author_id: me.id,
      title: input.title.trim(),
      content: input.content || "",
      type: input.type || (input.isQuestion ? "question" : "discussion"),
      is_question: !!input.isQuestion || input.type === "question",
      image_url: input.imageUrl || null,
      link_url: input.linkUrl || null,
      video_url: input.videoUrl || null,
      tags: input.tags || [],
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Post failed" };

    revalidatePath("/community");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updatePost(postId: string, patch: { title?: string; content?: string; tags?: string[] }): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("posts").select("author_id").eq("id", postId).single();
    if (!p) return { ok: false, error: "Post not found" };
    if (p.author_id !== me.id && me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") {
      return { ok: false, error: "Forbidden" };
    }
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.content !== undefined) dbPatch.content = patch.content;
    if (patch.tags !== undefined) dbPatch.tags = patch.tags;
    const { error } = await sb.from("posts").update(dbPatch).eq("id", postId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/community/post/${postId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deletePost(postId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("posts").select("author_id").eq("id", postId).single();
    if (!p) return { ok: false, error: "Not found" };
    if (p.author_id !== me.id && me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") {
      return { ok: false, error: "Forbidden" };
    }
    await sb.from("posts").update({ is_deleted: true }).eq("id", postId);
    revalidatePath("/community");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pinPost(postId: string, pinned: boolean): Promise<Result> {
  try {
    const me = await requireMe();
    if (me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") {
      return { ok: false, error: "Moderator only" };
    }
    await supabaseAdmin().from("posts").update({ is_pinned: pinned }).eq("id", postId);
    revalidatePath("/community");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────────── Voting ─────────────── */

async function updateUserReputation(userId: string, delta: number) {
  const sb = supabaseAdmin();
  const { data } = await sb.from("users").select("reputation").eq("id", userId).single();
  const next = Math.max(0, (data?.reputation || 0) + delta);
  await sb.from("users").update({ reputation: next }).eq("id", userId);
}

export async function votePost(postId: string, voteType: "up" | "down"): Promise<Result<{ up: number; down: number; score: number; myVote: "up" | "down" | null }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("post_votes")
      .select("id, vote_type").eq("post_id", postId).eq("user_id", me.id).maybeSingle();

    let finalVote: "up" | "down" | null = voteType;
    if (existing) {
      if (existing.vote_type === voteType) {
        await sb.from("post_votes").delete().eq("id", existing.id);
        finalVote = null;
      } else {
        await sb.from("post_votes").update({ vote_type: voteType }).eq("id", existing.id);
      }
    } else {
      await sb.from("post_votes").insert({ post_id: postId, user_id: me.id, vote_type: voteType });
    }

    // Recount
    const [{ count: up }, { count: down }] = await Promise.all([
      sb.from("post_votes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("vote_type", "up"),
      sb.from("post_votes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("vote_type", "down"),
    ]);
    const score = recomputeScore(up || 0, down || 0);
    await sb.from("posts").update({ upvotes: up || 0, downvotes: down || 0, score }).eq("id", postId);

    // Reputation: author gets +2 per upvote, -1 per downvote (delta only)
    const { data: post } = await sb.from("posts").select("author_id").eq("id", postId).single();
    if (post && post.author_id !== me.id) {
      // Compute delta from previous state
      const prev = existing ? (existing.vote_type === "up" ? 2 : -1) : 0;
      const nextRep = finalVote === "up" ? 2 : finalVote === "down" ? -1 : 0;
      const delta = nextRep - prev;
      if (delta !== 0) await updateUserReputation(post.author_id, delta);
    }

    revalidatePath(`/community/post/${postId}`);
    return { ok: true, data: { up: up || 0, down: down || 0, score, myVote: finalVote } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function voteComment(commentId: string, voteType: "up" | "down"): Promise<Result<{ up: number; down: number; myVote: "up" | "down" | null }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("comment_votes")
      .select("id, vote_type").eq("comment_id", commentId).eq("user_id", me.id).maybeSingle();

    let finalVote: "up" | "down" | null = voteType;
    if (existing) {
      if (existing.vote_type === voteType) {
        await sb.from("comment_votes").delete().eq("id", existing.id);
        finalVote = null;
      } else {
        await sb.from("comment_votes").update({ vote_type: voteType }).eq("id", existing.id);
      }
    } else {
      await sb.from("comment_votes").insert({ comment_id: commentId, user_id: me.id, vote_type: voteType });
    }

    const [{ count: up }, { count: down }] = await Promise.all([
      sb.from("comment_votes").select("*", { count: "exact", head: true }).eq("comment_id", commentId).eq("vote_type", "up"),
      sb.from("comment_votes").select("*", { count: "exact", head: true }).eq("comment_id", commentId).eq("vote_type", "down"),
    ]);

    // Auto-apply brilliance labels based on upvotes
    let brilliantLabel: string | null = null;
    const upCount = up || 0;
    if (upCount >= 20) brilliantLabel = "🔥 Brilliant Insight";
    else if (upCount >= 10) brilliantLabel = "💡 Helpful";
    else if (upCount >= 5) brilliantLabel = "👍 Useful";

    await sb.from("comments").update({
      upvotes: upCount, downvotes: down || 0,
      brilliant_label: brilliantLabel,
    }).eq("id", commentId);

    // Reputation for comment author
    const { data: comment } = await sb.from("comments").select("author_id").eq("id", commentId).single();
    if (comment && comment.author_id !== me.id) {
      const prev = existing ? (existing.vote_type === "up" ? 1 : -1) : 0;
      const nextRep = finalVote === "up" ? 1 : finalVote === "down" ? -1 : 0;
      const delta = nextRep - prev;
      if (delta !== 0) await updateUserReputation(comment.author_id, delta);
      // XP: helpful_comment at 5+ upvotes, brilliant_comment bonus at 20+ (deduped by commentId)
      if (upCount >= 5) await awardXP(comment.author_id, "helpful_comment", { refType: "comment", refId: commentId });
      if (upCount >= 20) await awardXP(comment.author_id, "brilliant_comment", { refType: "comment_brilliant", refId: commentId });
    }

    return { ok: true, data: { up: upCount, down: down || 0, myVote: finalVote } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────────── Comments ─────────────── */

export async function addComment(input: { postId: string; parentId?: string | null; content: string }): Promise<Result<{ id: string; brilliantLabel: string | null }>> {
  try {
    const me = await requireMe();
    if (!input.content.trim()) return { ok: false, error: "Empty comment" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("comments").insert({
      post_id: input.postId,
      parent_id: input.parentId || null,
      author_id: me.id,
      content: input.content.trim(),
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };

    // Bump post.comment_count
    const { count } = await sb.from("comments").select("*", { count: "exact", head: true }).eq("post_id", input.postId);
    await sb.from("posts").update({ comment_count: count || 0 }).eq("id", input.postId);

    // Live-thread broadcast — anyone on the post detail page hears this.
    try {
      const rest = getAblyRest();
      if (rest) {
        const ch = rest.channels.get(`cios:post:${input.postId}`);
        await ch.publish("new-comment", {
          id: data.id, post_id: input.postId, parent_id: input.parentId || null,
          author_id: me.id, author_name: me.name, author_avatar: me.avatar_url || null,
          content: input.content.trim(), created_at: new Date().toISOString(),
        });
      }
    } catch (e) { console.warn("[ably] post channel publish:", e); }

    // Notify: parent comment author on reply, or post author on top-level comment
    try {
      let notifyUserId: string | null = null;
      let notifyTitle = "";
      if (input.parentId) {
        const { data: parent } = await sb.from("comments").select("author_id").eq("id", input.parentId).single();
        if (parent && parent.author_id !== me.id) {
          notifyUserId = parent.author_id;
          notifyTitle = `${me.name} replied to your comment`;
        }
      } else {
        const { data: post } = await sb.from("posts").select("author_id").eq("id", input.postId).single();
        if (post && post.author_id !== me.id) {
          notifyUserId = post.author_id;
          notifyTitle = `${me.name} commented on your post`;
        }
      }
      if (notifyUserId) {
        await pushNotification({
          userId: notifyUserId, title: notifyTitle,
          message: input.content.trim().slice(0, 120),
          type: "info", actionUrl: `/community/post/${input.postId}`,
        });
      }
    } catch (e) { console.warn("[notif] comment push:", e); }

    revalidatePath(`/community/post/${input.postId}`);
    return { ok: true, data: { id: data.id, brilliantLabel: null } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateComment(commentId: string, content: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: c } = await sb.from("comments").select("author_id").eq("id", commentId).single();
    if (!c) return { ok: false, error: "Not found" };
    if (c.author_id !== me.id) return { ok: false, error: "Only author can edit" };
    await sb.from("comments").update({ content: content.trim(), is_edited: true, updated_at: new Date().toISOString() }).eq("id", commentId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteComment(commentId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: c } = await sb.from("comments").select("author_id, post_id").eq("id", commentId).single();
    if (!c) return { ok: false, error: "Not found" };
    if (c.author_id !== me.id && me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") {
      return { ok: false, error: "Forbidden" };
    }
    await sb.from("comments").update({ is_deleted: true, content: "" }).eq("id", commentId);
    const { count } = await sb.from("comments").select("*", { count: "exact", head: true }).eq("post_id", c.post_id).eq("is_deleted", false);
    await sb.from("posts").update({ comment_count: count || 0 }).eq("id", c.post_id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pinComment(commentId: string, pinned: boolean): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: c } = await sb.from("comments").select("post_id").eq("id", commentId).single();
    if (!c) return { ok: false, error: "Not found" };
    const { data: post } = await sb.from("posts").select("author_id").eq("id", c.post_id).single();
    const canPin = post?.author_id === me.id || me.role === "admin" || me.role === "super_admin" || me.role === "moderator";
    if (!canPin) return { ok: false, error: "Only post author or moderator can pin" };
    await sb.from("comments").update({ is_pinned: pinned }).eq("id", commentId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markSolution(postId: string, commentId: string | null): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("posts").select("author_id").eq("id", postId).single();
    if (!p) return { ok: false, error: "Not found" };
    if (p.author_id !== me.id && me.role !== "admin" && me.role !== "super_admin") return { ok: false, error: "Only post author can mark" };
    // Unmark previous
    await sb.from("comments").update({ is_solution: false }).eq("post_id", postId);
    if (commentId) {
      await sb.from("comments").update({ is_solution: true, brilliant_label: "⭐ Best Answer" }).eq("id", commentId);
      // Reputation boost: +10 for accepted answer
      const { data: sc } = await sb.from("comments").select("author_id").eq("id", commentId).single();
      if (sc && sc.author_id !== me.id) {
        await updateUserReputation(sc.author_id, 10);
        await awardXP(sc.author_id, "accepted_solution", { refType: "comment", refId: commentId });
      }
    }
    await sb.from("posts").update({ solved_comment_id: commentId }).eq("id", postId);
    revalidatePath(`/community/post/${postId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────────── Bookmarks ─────────────── */

export async function toggleBookmark(postId: string): Promise<Result<{ bookmarked: boolean }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("post_bookmarks").select("id").eq("post_id", postId).eq("user_id", me.id).maybeSingle();
    if (existing) {
      await sb.from("post_bookmarks").delete().eq("id", existing.id);
      return { ok: true, data: { bookmarked: false } };
    }
    await sb.from("post_bookmarks").insert({ post_id: postId, user_id: me.id });
    return { ok: true, data: { bookmarked: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────────── Reports ─────────────── */

export async function reportContent(input: { postId?: string; commentId?: string; reason: string }): Promise<Result> {
  try {
    const me = await requireMe();
    if (!input.reason.trim()) return { ok: false, error: "Reason required" };
    if (!input.postId && !input.commentId) return { ok: false, error: "Nothing to report" };
    await supabaseAdmin().from("post_reports").insert({
      post_id: input.postId || null,
      comment_id: input.commentId || null,
      reporter_id: me.id,
      reason: input.reason.slice(0, 500),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────────── Phase A: reactions / flags / crosspost ─────────────── */

import { REACTION_EMOJIS, AWARD_COSTS, type ReactionEmoji, type PollView, type PollOption } from "@/lib/community-constants";

export async function togglePostReaction(postId: string, emoji: string): Promise<Result<{ reactions: Record<string, number>; mine: string[] }>> {
  try {
    const me = await requireMe();
    if (!REACTION_EMOJIS.includes(emoji as ReactionEmoji)) return { ok: false, error: "Invalid reaction" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("post_reactions")
      .select("id").eq("post_id", postId).eq("user_id", me.id).eq("emoji", emoji).maybeSingle();
    if (existing) {
      await sb.from("post_reactions").delete().eq("id", existing.id);
    } else {
      await sb.from("post_reactions").insert({ post_id: postId, user_id: me.id, emoji });
    }
    // Recompute aggregate
    const { data: all } = await sb.from("post_reactions").select("emoji, user_id").eq("post_id", postId);
    const reactions: Record<string, number> = {};
    const mine: string[] = [];
    for (const r of (all || []) as { emoji: string; user_id: string }[]) {
      reactions[r.emoji] = (reactions[r.emoji] || 0) + 1;
      if (r.user_id === me.id) mine.push(r.emoji);
    }
    return { ok: true, data: { reactions, mine } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function togglePostLock(postId: string, locked: boolean): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("posts").select("author_id, community_id").eq("id", postId).single();
    if (!p) return { ok: false, error: "Not found" };
    const isMod = me.role === "admin" || me.role === "super_admin" || me.role === "moderator";
    const { data: c } = await sb.from("communities").select("created_by").eq("id", p.community_id).single();
    const isOwner = c?.created_by === me.id;
    if (!isMod && !isOwner) return { ok: false, error: "Only mods or group owner" };
    await sb.from("posts").update({ is_locked: locked }).eq("id", postId);
    revalidatePath("/community");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function togglePostFlag(postId: string, flag: "nsfw" | "spoiler", value: boolean): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("posts").select("author_id").eq("id", postId).single();
    if (!p) return { ok: false, error: "Not found" };
    const isMod = me.role === "admin" || me.role === "super_admin" || me.role === "moderator";
    if (p.author_id !== me.id && !isMod) return { ok: false, error: "Forbidden" };
    const col = flag === "nsfw" ? "is_nsfw" : "is_spoiler";
    await sb.from("posts").update({ [col]: value }).eq("id", postId);
    revalidatePath("/community");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function crosspost(postId: string, targetCommunityId: string): Promise<Result<{ id: string }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: src } = await sb.from("posts").select("title, content, type, image_url, link_url, tags").eq("id", postId).single();
    if (!src) return { ok: false, error: "Original post not found" };
    // Confirm target membership or ownership
    const { data: c } = await sb.from("communities").select("is_private, created_by").eq("id", targetCommunityId).single();
    if (!c) return { ok: false, error: "Target group not found" };
    const { data: mem } = await sb.from("community_members").select("id").eq("community_id", targetCommunityId).eq("user_id", me.id).maybeSingle();
    const isOwner = c.created_by === me.id;
    if (!mem && !isOwner) {
      if (c.is_private) return { ok: false, error: "You're not in that private group" };
      await sb.from("community_members").insert({ community_id: targetCommunityId, user_id: me.id, role: "member" });
    }
    const { data: inserted, error } = await sb.from("posts").insert({
      community_id: targetCommunityId,
      author_id: me.id,
      title: src.title,
      content: src.content,
      type: src.type,
      image_url: src.image_url,
      link_url: src.link_url,
      tags: src.tags,
      crosspost_of: postId,
    }).select("id").single();
    if (error || !inserted) return { ok: false, error: error?.message || "Crosspost failed" };
    revalidatePath("/community");
    return { ok: true, data: { id: inserted.id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────────── Phase B: polls ─────────────── */

export async function createPollForPost(input: {
  communityId: string; title: string; question: string;
  options: string[]; multiChoice?: boolean; closesInHours?: number;
  tags?: string[];
}): Promise<Result<{ postId: string; pollId: string }>> {
  try {
    const me = await requireMe();
    const opts = (input.options || []).map((o) => o.trim()).filter(Boolean);
    if (!input.question.trim()) return { ok: false, error: "Question required" };
    if (opts.length < 2) return { ok: false, error: "At least 2 options" };
    if (opts.length > 8) return { ok: false, error: "Max 8 options" };
    const sb = supabaseAdmin();
    // Reuse createPost's membership check
    const postR = await createPost({
      communityId: input.communityId,
      title: input.title.trim() || input.question.trim(),
      content: "", type: "poll",
      tags: input.tags || [],
    });
    if (!postR.ok) return { ok: false, error: postR.error };
    const postId = postR.data!.id;
    const closesAt = input.closesInHours ? new Date(Date.now() + input.closesInHours * 3600000).toISOString() : null;
    const { data: poll, error: perr } = await sb.from("post_polls").insert({
      post_id: postId, question: input.question.trim(),
      multi_choice: !!input.multiChoice, closes_at: closesAt,
    }).select("id").single();
    if (perr || !poll) return { ok: false, error: perr?.message || "Failed to create poll" };
    await sb.from("post_poll_options").insert(opts.map((label, i) => ({ poll_id: poll.id, label, position: i })));
    revalidatePath("/community");
    return { ok: true, data: { postId, pollId: poll.id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getPollForPost(postId: string): Promise<Result<PollView | null>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data: poll } = await sb.from("post_polls").select("id, post_id, question, multi_choice, closes_at").eq("post_id", postId).maybeSingle();
    if (!poll) return { ok: true, data: null };
    const [{ data: opts }, { data: votes }] = await Promise.all([
      sb.from("post_poll_options").select("id, label, position").eq("poll_id", poll.id).order("position", { ascending: true }),
      sb.from("post_poll_votes").select("option_id, user_id").eq("poll_id", poll.id),
    ]);
    const counts = new Map<string, number>();
    const mine: string[] = [];
    for (const v of (votes || []) as { option_id: string; user_id: string }[]) {
      counts.set(v.option_id, (counts.get(v.option_id) || 0) + 1);
      if (me && v.user_id === me.id) mine.push(v.option_id);
    }
    const options: PollOption[] = (opts || []).map((o: { id: string; label: string }) => ({ id: o.id, label: o.label, votes: counts.get(o.id) || 0 }));
    const total = options.reduce((a, o) => a + o.votes, 0);
    const closed = !!poll.closes_at && new Date(poll.closes_at).getTime() < Date.now();
    return { ok: true, data: { id: poll.id, post_id: poll.post_id, question: poll.question, multi_choice: poll.multi_choice, closes_at: poll.closes_at, total_votes: total, options, my_votes: mine, closed } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function votePoll(pollId: string, optionId: string): Promise<Result<PollView>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: poll } = await sb.from("post_polls").select("id, post_id, multi_choice, closes_at").eq("id", pollId).single();
    if (!poll) return { ok: false, error: "Poll not found" };
    if (poll.closes_at && new Date(poll.closes_at).getTime() < Date.now()) return { ok: false, error: "Poll closed" };
    const { data: existing } = await sb.from("post_poll_votes").select("id, option_id").eq("poll_id", pollId).eq("user_id", me.id);
    const already = (existing || []).find((v: { option_id: string }) => v.option_id === optionId);
    if (already) {
      await sb.from("post_poll_votes").delete().eq("id", (already as { id: string }).id);
    } else {
      if (!poll.multi_choice && existing && existing.length > 0) {
        await sb.from("post_poll_votes").delete().eq("poll_id", pollId).eq("user_id", me.id);
      }
      await sb.from("post_poll_votes").insert({ poll_id: pollId, option_id: optionId, user_id: me.id });
    }
    const view = await getPollForPost(poll.post_id);
    if (!view.ok || !view.data) return { ok: false, error: "Failed to reload poll" };
    return { ok: true, data: view.data };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────────── Phase B: awards ─────────────── */

export async function giveAward(input: {
  target: "post" | "comment"; targetId: string;
  kind: "bronze" | "silver" | "gold" | "diamond";
}): Promise<Result<{ remaining: number; awards: Record<string, number> }>> {
  try {
    const me = await requireMe();
    const cost = AWARD_COSTS[input.kind];
    if (!cost) return { ok: false, error: "Invalid award" };
    if ((me.reputation || 0) < cost) return { ok: false, error: `Need ${cost} rep; you have ${me.reputation || 0}` };
    const sb = supabaseAdmin();
    let receiverId: string | null = null;
    if (input.target === "post") {
      const { data: p } = await sb.from("posts").select("author_id").eq("id", input.targetId).single();
      receiverId = p?.author_id || null;
    } else {
      const { data: c } = await sb.from("comments").select("author_id").eq("id", input.targetId).single();
      receiverId = c?.author_id || null;
    }
    if (!receiverId) return { ok: false, error: "Target not found" };
    if (receiverId === me.id) return { ok: false, error: "Can't award yourself" };
    await sb.from("community_awards").insert({
      post_id: input.target === "post" ? input.targetId : null,
      comment_id: input.target === "comment" ? input.targetId : null,
      giver_id: me.id, receiver_id: receiverId, kind: input.kind, cost,
    });
    // Deduct giver reputation, add half to receiver
    await sb.from("users").update({ reputation: (me.reputation || 0) - cost }).eq("id", me.id);
    const { data: r } = await sb.from("users").select("reputation").eq("id", receiverId).single();
    await sb.from("users").update({ reputation: ((r?.reputation as number) || 0) + Math.floor(cost / 2) }).eq("id", receiverId);
    // Return aggregate
    const awardsQ = await sb.from("community_awards").select("kind").match(input.target === "post" ? { post_id: input.targetId } : { comment_id: input.targetId });
    const awards: Record<string, number> = {};
    for (const a of (awardsQ.data || []) as { kind: string }[]) awards[a.kind] = (awards[a.kind] || 0) + 1;
    return { ok: true, data: { remaining: (me.reputation || 0) - cost, awards } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────────── Phase B: trending tags ─────────────── */

export async function listTrendingTags(withinHours = 72, limit = 10): Promise<Result<Array<{ tag: string; count: number }>>> {
  try {
    const sb = supabaseAdmin();
    const since = new Date(Date.now() - withinHours * 3600000).toISOString();
    const { data } = await sb.from("posts").select("tags").gte("created_at", since).eq("is_deleted", false);
    const counts = new Map<string, number>();
    for (const row of (data || []) as { tags: string[] | null }[]) {
      for (const t of row.tags || []) {
        const k = t.trim().toLowerCase();
        if (!k) continue;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag, count]) => ({ tag, count }));
    return { ok: true, data: sorted };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────────── Moderation: report queue ─────────────── */

export interface ReportRow {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reporter_name: string | null;
  reason: string;
  status: "open" | "dismissed" | "actioned";
  created_at: string;
  target_title: string | null;
  target_preview: string | null;
  target_author: string | null;
}

export async function listReports(status: "open" | "all" = "open"): Promise<Result<ReportRow[]>> {
  try {
    const me = await requireMe();
    if (me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") return { ok: false, error: "Mods only" };
    const sb = supabaseAdmin();
    let q = sb.from("post_reports").select("id, post_id, comment_id, reporter_id, reason, status, created_at, reporter:users!post_reports_reporter_id_fkey(name)").order("created_at", { ascending: false }).limit(100);
    if (status === "open") q = q.eq("status", "open");
    const { data } = await q;
    type Row = { id: string; post_id: string | null; comment_id: string | null; reporter_id: string; reason: string; status: ReportRow["status"]; created_at: string; reporter?: { name?: string } | { name?: string }[] | null };
    const rows = (data || []) as Row[];
    const out: ReportRow[] = [];
    for (const r of rows) {
      let title: string | null = null;
      let preview: string | null = null;
      let author: string | null = null;
      if (r.post_id) {
        const { data: p } = await sb.from("posts").select("title, content, author:users!posts_author_id_fkey(name)").eq("id", r.post_id).maybeSingle();
        const a = p?.author as { name?: string } | { name?: string }[] | null | undefined;
        const aObj = Array.isArray(a) ? a[0] : a;
        title = p?.title || null;
        preview = (p?.content || "").slice(0, 160);
        author = aObj?.name || null;
      } else if (r.comment_id) {
        const { data: c } = await sb.from("comments").select("content, author:users!comments_author_id_fkey(name)").eq("id", r.comment_id).maybeSingle();
        const a = c?.author as { name?: string } | { name?: string }[] | null | undefined;
        const aObj = Array.isArray(a) ? a[0] : a;
        title = "Comment";
        preview = (c?.content || "").slice(0, 160);
        author = aObj?.name || null;
      }
      const rep = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
      out.push({
        id: r.id, post_id: r.post_id, comment_id: r.comment_id,
        reporter_id: r.reporter_id, reporter_name: rep?.name || null,
        reason: r.reason, status: r.status, created_at: r.created_at,
        target_title: title, target_preview: preview, target_author: author,
      });
    }
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function resolveReport(id: string, action: "dismiss" | "remove", note?: string): Promise<Result> {
  try {
    const me = await requireMe();
    if (me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") return { ok: false, error: "Mods only" };
    const sb = supabaseAdmin();
    const { data: r } = await sb.from("post_reports").select("post_id, comment_id").eq("id", id).single();
    if (!r) return { ok: false, error: "Report not found" };
    if (action === "remove") {
      if (r.post_id) await sb.from("posts").update({ is_deleted: true }).eq("id", r.post_id);
      if (r.comment_id) await sb.from("comments").update({ is_deleted: true }).eq("id", r.comment_id);
    }
    await sb.from("post_reports").update({
      status: action === "remove" ? "actioned" : "dismissed",
      resolved_by: me.id, resolved_at: new Date().toISOString(),
      resolution_note: note || null,
    }).eq("id", id);
    revalidatePath("/moderator/reports");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────────── Admin: suspend / unsuspend / delete group ─────────────── */

function isAdmin(role: string): boolean {
  return role === "admin" || role === "super_admin" || role === "moderator";
}

export async function suspendCommunity(communityId: string, reason?: string): Promise<Result> {
  try {
    const me = await requireMe();
    if (!isAdmin(me.role)) return { ok: false, error: "Admins only" };
    await supabaseAdmin().from("communities").update({
      suspended_at: new Date().toISOString(),
      suspended_by: me.id,
      suspend_reason: reason || null,
    }).eq("id", communityId);
    revalidatePath("/community");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function unsuspendCommunity(communityId: string): Promise<Result> {
  try {
    const me = await requireMe();
    if (!isAdmin(me.role)) return { ok: false, error: "Admins only" };
    await supabaseAdmin().from("communities").update({
      suspended_at: null, suspended_by: null, suspend_reason: null,
    }).eq("id", communityId);
    revalidatePath("/community");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteCommunity(communityId: string): Promise<Result> {
  try {
    const me = await requireMe();
    if (me.role !== "admin" && me.role !== "super_admin") return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    // Cascade manually for safety: posts → comments/reactions/awards → poll bits.
    await sb.from("posts").update({ is_deleted: true }).eq("community_id", communityId);
    await sb.from("community_members").delete().eq("community_id", communityId);
    await sb.from("communities").delete().eq("id", communityId);
    revalidatePath("/community");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────────── Phase C: user hovercards ─────────────── */

export interface MiniProfile {
  id: string; name: string; avatarUrl: string | null;
  role: string; reputation: number; bio: string | null;
  postCount: number; commentCount: number; joinedAt: string | null;
}
export async function getUserMiniProfile(userId: string): Promise<Result<MiniProfile>> {
  try {
    const sb = supabaseAdmin();
    const { data: u } = await sb.from("users").select("id, name, avatar_url, role, reputation, bio, created_at").eq("id", userId).maybeSingle();
    if (!u) return { ok: false, error: "User not found" };
    const [{ count: postCount }, { count: commentCount }] = await Promise.all([
      sb.from("posts").select("*", { count: "exact", head: true }).eq("author_id", userId).eq("is_deleted", false),
      sb.from("comments").select("*", { count: "exact", head: true }).eq("author_id", userId),
    ]);
    return { ok: true, data: {
      id: u.id, name: u.name || "Unknown", avatarUrl: u.avatar_url || null,
      role: u.role || "intern", reputation: u.reputation || 0, bio: u.bio || null,
      postCount: postCount || 0, commentCount: commentCount || 0, joinedAt: u.created_at || null,
    } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────────── Follow ─────────────── */

export async function toggleFollow(userId: string): Promise<Result<{ following: boolean }>> {
  try {
    const me = await requireMe();
    if (me.id === userId) return { ok: false, error: "Cannot follow yourself" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("user_follows").select("id").eq("follower_id", me.id).eq("followed_id", userId).maybeSingle();
    if (existing) {
      await sb.from("user_follows").delete().eq("id", existing.id);
      return { ok: true, data: { following: false } };
    }
    await sb.from("user_follows").insert({ follower_id: me.id, followed_id: userId });
    return { ok: true, data: { following: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
