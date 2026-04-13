"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";
import { awardXP } from "@/lib/gamification";

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
  tags?: string[];
  isQuestion?: boolean;
}

export async function createPost(input: CreatePostInput): Promise<Result<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const sb = supabaseAdmin();
    // Verify membership for posting in the community
    const { data: mem } = await sb.from("community_members").select("id").eq("community_id", input.communityId).eq("user_id", me.id).maybeSingle();
    if (!mem) {
      // Auto-join public community
      const { data: c } = await sb.from("communities").select("is_private").eq("id", input.communityId).single();
      if (c?.is_private) return { ok: false, error: "Join the community to post" };
      await sb.from("community_members").insert({ community_id: input.communityId, user_id: me.id, role: "member" });
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
