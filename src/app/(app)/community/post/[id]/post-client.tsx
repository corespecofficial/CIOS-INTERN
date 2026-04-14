"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo, useEffect } from "react";
import * as Ably from "ably";
import Link from "next/link";
import toast from "react-hot-toast";
import type { FeedPost, CommentRow } from "@/lib/db";
import {
  votePost, voteComment, toggleBookmark, addComment, updateComment, deleteComment,
  pinComment, markSolution, reportContent,
} from "@/app/actions/community";

type SortMode = "top" | "new" | "controversial";

interface Me { id: string; name: string; avatarUrl: string | null; role: string; reputation: number; }

export function PostDetailClient({ post: initialPost, initialComments, me }: { post: FeedPost; initialComments: CommentRow[]; me: Me }) {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const canModerate = me.role === "admin" || me.role === "super_admin" || me.role === "moderator";
  const isAuthor = post.author_id === me.id;

  const tree = useMemo(() => buildTree(comments, sortMode), [comments, sortMode]);

  // Live thread — subscribe to post channel for new comments.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!key) return;
    const client = new Ably.Realtime({ key, clientId: me.id || "guest" });
    const ch = client.channels.get(`cios:post:${post.id}`);
    const handler = (msg: Ably.Message) => {
      const d = msg.data as { id: string; parent_id: string | null; author_id: string; author_name: string; author_avatar: string | null; content: string; created_at: string };
      if (!d?.id || d.author_id === me.id) return; // skip my own (already added)
      setComments((list) => list.some((x) => x.id === d.id) ? list : [...list, {
        id: d.id, post_id: post.id, parent_id: d.parent_id,
        author_id: d.author_id, author_name: d.author_name, author_avatar: d.author_avatar, author_reputation: 0,
        content: d.content, upvotes: 0, downvotes: 0,
        is_pinned: false, is_solution: false, brilliant_label: null,
        is_edited: false, is_deleted: false, created_at: d.created_at, my_vote: null,
      }]);
      setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }));
      toast(`💬 New reply from ${d.author_name}`, { duration: 2500 });
    };
    ch.subscribe("new-comment", handler);
    return () => { try { ch.unsubscribe("new-comment", handler); client.close(); } catch { /* ignore */ } };
  }, [post.id, me.id]);

  async function onVotePost(type: "up" | "down") {
    const r = await votePost(post.id, type);
    if (!r.ok) { toast.error(r.error); return; }
    setPost((p) => ({ ...p, my_vote: r.data!.myVote, upvotes: r.data!.up, downvotes: r.data!.down, score: r.data!.score }));
  }
  async function onBookmark() {
    const r = await toggleBookmark(post.id);
    if (!r.ok) { toast.error(r.error); return; }
    setPost((p) => ({ ...p, is_bookmarked: r.data!.bookmarked }));
    toast.success(r.data!.bookmarked ? "Saved" : "Removed");
  }
  async function onVoteComment(c: CommentRow, type: "up" | "down") {
    const prev = c.my_vote;
    const newVote = prev === type ? null : type;
    const upD = (newVote === "up" ? 1 : 0) - (prev === "up" ? 1 : 0);
    const downD = (newVote === "down" ? 1 : 0) - (prev === "down" ? 1 : 0);
    setComments((list) => list.map((x) => x.id === c.id ? { ...x, my_vote: newVote, upvotes: x.upvotes + upD, downvotes: x.downvotes + downD } : x));
    const r = await voteComment(c.id, type);
    if (!r.ok) {
      toast.error(r.error);
      setComments((list) => list.map((x) => x.id === c.id ? c : x));
      return;
    }
    setComments((list) => list.map((x) => x.id === c.id ? { ...x, my_vote: r.data!.myVote, upvotes: r.data!.up, downvotes: r.data!.down } : x));
  }
  async function onAddComment(parentId: string | null, content: string) {
    const r = await addComment({ postId: post.id, parentId, content });
    if (!r.ok) { toast.error(r.error); return false; }
    const newRow: CommentRow = {
      id: r.data!.id, post_id: post.id, parent_id: parentId,
      author_id: me.id, author_name: me.name, author_avatar: me.avatarUrl, author_reputation: me.reputation,
      content: content.trim(), upvotes: 0, downvotes: 0,
      is_pinned: false, is_solution: false, brilliant_label: null,
      is_edited: false, is_deleted: false, created_at: new Date().toISOString(),
      my_vote: null,
    };
    setComments((list) => [...list, newRow]);
    setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }));
    return true;
  }
  async function onEditComment(c: CommentRow, content: string) {
    const r = await updateComment(c.id, content);
    if (!r.ok) { toast.error(r.error); return false; }
    setComments((list) => list.map((x) => x.id === c.id ? { ...x, content, is_edited: true } : x));
    return true;
  }
  async function onDeleteComment(c: CommentRow) {
    if (!confirm("Delete this comment?")) return;
    const r = await deleteComment(c.id);
    if (!r.ok) { toast.error(r.error); return; }
    setComments((list) => list.map((x) => x.id === c.id ? { ...x, is_deleted: true, content: "" } : x));
    setPost((p) => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }));
  }
  async function onPinComment(c: CommentRow) {
    const r = await pinComment(c.id, !c.is_pinned);
    if (!r.ok) { toast.error(r.error); return; }
    setComments((list) => list.map((x) => x.id === c.id ? { ...x, is_pinned: !c.is_pinned } : x));
  }
  async function onMarkSolution(c: CommentRow) {
    const next = post.solved_comment_id === c.id ? null : c.id;
    const r = await markSolution(post.id, next);
    if (!r.ok) { toast.error(r.error); return; }
    setPost((p) => ({ ...p, solved_comment_id: next }));
    setComments((list) => list.map((x) => ({ ...x, is_solution: x.id === next, brilliant_label: x.id === next ? "⭐ Best Answer" : x.brilliant_label })));
    toast.success(next ? "Marked as best answer" : "Unmarked");
  }
  async function onReport(c: CommentRow) {
    const reason = prompt("Why report this comment?");
    if (!reason?.trim()) return;
    const r = await reportContent({ commentId: c.id, reason });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Reported");
  }
  async function doSummarize() {
    if (comments.length === 0) { toast.error("No comments to summarize"); return; }
    setSummarizing(true);
    try {
      const text = comments.filter((c) => !c.is_deleted).map((c) => `${c.author_name}: ${c.content}`).join("\n\n").slice(0, 8000);
      const res = await fetch("/api/ai/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: `Post title: ${post.title}\nPost content: ${post.content}\n\n=== COMMENTS ===\n${text}` }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "AI not configured"); return; }
      setSummary(data.summary);
    } catch (e) { toast.error((e as Error).message); }
    setSummarizing(false);
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/community" style={{ fontSize: 12, color: "#8892A4", textDecoration: "none" }}>← Back to community</Link>
      </div>

      {/* Post body */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <button onClick={() => onVotePost("up")} style={{ ...voteBtn, color: post.my_vote === "up" ? "#66BB6A" : "#5A6478" }}>▲</button>
            <span style={{ fontSize: 14, fontWeight: 800, color: post.score > 0 ? "#66BB6A" : post.score < 0 ? "#EF5350" : "#8892A4" }}>{post.score}</span>
            <button onClick={() => onVotePost("down")} style={{ ...voteBtn, color: post.my_vote === "down" ? "#EF5350" : "#5A6478" }}>▼</button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              {post.author_avatar ? (
                <img src={post.author_avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {(post.author_name?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{post.author_name}</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>
                  {post.community_name && `#${post.community_name} · `}{new Date(post.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
              {post.author_reputation > 0 && <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(255,193,7,0.12)", color: "#FFC107", borderRadius: 6, fontWeight: 700 }}>⭐ {post.author_reputation}</span>}
              {post.is_question && <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(255,112,67,0.12)", color: "#FF7043", borderRadius: 6, fontWeight: 700 }}>QUESTION</span>}
              {post.solved_comment_id && <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(102,187,106,0.12)", color: "#66BB6A", borderRadius: 6, fontWeight: 700 }}>✓ SOLVED</span>}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px 0" }}>{post.title}</h1>
            {post.content && <p style={{ fontSize: 14, color: "#E8EDF5", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{post.content}</p>}
            {post.image_url && <img src={post.image_url} alt="" style={{ width: "100%", maxHeight: 500, objectFit: "cover", borderRadius: 10, marginTop: 10 }} />}
            {post.link_url && (
              <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1E88E5", textDecoration: "underline", display: "block", marginTop: 10 }}>
                🔗 {post.link_url}
              </a>
            )}
            {post.tags.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                {post.tags.map((t) => <span key={t} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(30,136,229,0.1)", color: "#1E88E5", borderRadius: 10, fontWeight: 600 }}>#{t}</span>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={onBookmark} style={{ ...actionBtn, color: post.is_bookmarked ? "#FFC107" : "#8892A4" }}>
                {post.is_bookmarked ? "🔖 Saved" : "🔖 Save"}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }} style={actionBtn}>🔗 Share</button>
              <button onClick={doSummarize} disabled={summarizing} style={{ ...actionBtn, color: "#AB47BC", borderColor: "rgba(171,71,188,0.3)" }}>
                {summarizing ? "Summarizing…" : "✨ AI summarize thread"}
              </button>
            </div>
            {summary && (
              <div style={{ marginTop: 10, background: "rgba(171,71,188,0.08)", border: "1px solid rgba(171,71,188,0.2)", borderRadius: 10, padding: 12, fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                <b style={{ color: "#AB47BC" }}>AI summary:</b>{"\n"}{summary}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>💬 {post.comment_count} comment{post.comment_count === 1 ? "" : "s"}</h2>
        <div style={{ display: "flex", gap: 4 }}>
          {(["top", "new", "controversial"] as SortMode[]).map((s) => (
            <button key={s} onClick={() => setSortMode(s)} style={{ ...sortBtn, ...(sortMode === s ? sortBtnActive : {}) }}>{s}</button>
          ))}
        </div>
      </div>

      {/* New comment */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} placeholder="Add a thoughtful comment… brilliant comments auto-earn rep + badges"
          style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 70 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button
            disabled={!newComment.trim()}
            onClick={async () => { const ok = await onAddComment(null, newComment); if (ok) setNewComment(""); }}
            style={{ ...btnPrimary, opacity: newComment.trim() ? 1 : 0.5 }}
          >Post</button>
        </div>
      </div>

      {/* Comments tree */}
      {tree.length === 0 ? (
        <p style={{ fontSize: 13, color: "#8892A4", textAlign: "center", padding: 30 }}>Be the first to comment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tree.map((n) => (
            <CommentNode
              key={n.comment.id}
              node={n}
              meId={me.id}
              isPostAuthor={isAuthor}
              canModerate={canModerate}
              postSolvedId={post.solved_comment_id}
              postIsQuestion={post.is_question}
              onVote={onVoteComment}
              onReply={onAddComment}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
              onPin={onPinComment}
              onMarkSolution={onMarkSolution}
              onReport={onReport}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Node { comment: CommentRow; children: Node[]; }

function buildTree(comments: CommentRow[], sort: SortMode): Node[] {
  const byId = new Map<string, Node>();
  comments.forEach((c) => byId.set(c.id, { comment: c, children: [] }));
  const roots: Node[] = [];
  byId.forEach((n) => {
    if (n.comment.parent_id && byId.has(n.comment.parent_id)) byId.get(n.comment.parent_id)!.children.push(n);
    else roots.push(n);
  });
  const cmp = (a: Node, b: Node) => {
    if (a.comment.is_pinned !== b.comment.is_pinned) return a.comment.is_pinned ? -1 : 1;
    if (a.comment.is_solution !== b.comment.is_solution) return a.comment.is_solution ? -1 : 1;
    if (sort === "top") return b.comment.upvotes - a.comment.upvotes;
    if (sort === "new") return new Date(b.comment.created_at).getTime() - new Date(a.comment.created_at).getTime();
    // controversial: high votes with narrow margin
    const aCtrl = Math.min(a.comment.upvotes, a.comment.downvotes);
    const bCtrl = Math.min(b.comment.upvotes, b.comment.downvotes);
    return bCtrl - aCtrl;
  };
  roots.sort(cmp);
  byId.forEach((n) => n.children.sort(cmp));
  return roots;
}

function CommentNode({
  node, meId, isPostAuthor, canModerate, postSolvedId, postIsQuestion, depth,
  onVote, onReply, onEdit, onDelete, onPin, onMarkSolution, onReport,
}: {
  node: Node; meId: string; isPostAuthor: boolean; canModerate: boolean;
  postSolvedId: string | null; postIsQuestion: boolean; depth: number;
  onVote: (c: CommentRow, t: "up" | "down") => void;
  onReply: (parentId: string | null, content: string) => Promise<boolean>;
  onEdit: (c: CommentRow, content: string) => Promise<boolean>;
  onDelete: (c: CommentRow) => void;
  onPin: (c: CommentRow) => void;
  onMarkSolution: (c: CommentRow) => void;
  onReport: (c: CommentRow) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(node.comment.content);
  const [collapsed, setCollapsed] = useState(false);
  const c = node.comment;
  const mine = c.author_id === meId;
  const isSolution = c.is_solution || postSolvedId === c.id;

  return (
    <div style={{
      background: isSolution ? "rgba(102,187,106,0.06)" : "#111827",
      border: isSolution ? "1px solid rgba(102,187,106,0.3)" : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10, padding: 12,
      marginLeft: depth > 0 ? 12 : 0,
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <button onClick={() => onVote(c, "up")} style={{ ...voteBtn, color: c.my_vote === "up" ? "#66BB6A" : "#5A6478", fontSize: 12 }}>▲</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: c.upvotes - c.downvotes > 0 ? "#66BB6A" : c.upvotes - c.downvotes < 0 ? "#EF5350" : "#8892A4" }}>{c.upvotes - c.downvotes}</span>
          <button onClick={() => onVote(c, "down")} style={{ ...voteBtn, color: c.my_vote === "down" ? "#EF5350" : "#5A6478", fontSize: 12 }}>▼</button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {c.author_avatar ? (
              <img src={c.author_avatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                {(c.author_name?.[0] || "?").toUpperCase()}
              </div>
            )}
            {node.children.length > 0 && (
              <button onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? `Expand ${countDescendants(node)} replies` : "Collapse"}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#8892A4", borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 11, fontWeight: 700, padding: 0 }}>
                {collapsed ? "+" : "−"}
              </button>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{c.author_name || "Unknown"}</span>
            {c.author_reputation > 0 && <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(255,193,7,0.12)", color: "#FFC107", borderRadius: 4, fontWeight: 700 }}>⭐ {c.author_reputation}</span>}
            {c.is_pinned && <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(255,193,7,0.12)", color: "#FFC107", borderRadius: 4, fontWeight: 700 }}>📌 Pinned</span>}
            {c.brilliant_label && <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", borderRadius: 4, fontWeight: 700 }}>{c.brilliant_label}</span>}
            <span style={{ fontSize: 10, color: "#5A6478" }}>{timeAgo(c.created_at)}{c.is_edited && " · edited"}</span>
          </div>
          {c.is_deleted ? (
            <p style={{ fontSize: 12, color: "#5A6478", fontStyle: "italic", margin: 0 }}>[deleted]</p>
          ) : editing ? (
            <div>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#E8EDF5", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button onClick={async () => { const ok = await onEdit(c, editText); if (ok) setEditing(false); }} style={{ ...miniActionBtn, color: "#1E88E5" }}>Save</button>
                <button onClick={() => { setEditing(false); setEditText(c.content); }} style={miniActionBtn}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: "0 0 6px 0" }}>{c.content}</p>
          )}
          {!c.is_deleted && !editing && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
              <button onClick={() => setReplyOpen(!replyOpen)} style={miniActionBtn}>↩ Reply</button>
              {isPostAuthor && postIsQuestion && (
                <button onClick={() => onMarkSolution(c)} style={{ ...miniActionBtn, color: isSolution ? "#66BB6A" : "#8892A4" }}>
                  {isSolution ? "✓ Best answer" : "Mark as best"}
                </button>
              )}
              {(isPostAuthor || canModerate) && (
                <button onClick={() => onPin(c)} style={miniActionBtn}>{c.is_pinned ? "Unpin" : "📌 Pin"}</button>
              )}
              {mine && <button onClick={() => setEditing(true)} style={miniActionBtn}>Edit</button>}
              {(mine || canModerate) && <button onClick={() => onDelete(c)} style={{ ...miniActionBtn, color: "#EF5350" }}>Delete</button>}
              {!mine && <button onClick={() => onReport(c)} style={{ ...miniActionBtn, color: "#8892A4" }}>🚩 Report</button>}
            </div>
          )}
          {replyOpen && (
            <div style={{ marginTop: 8 }}>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply…" rows={2}
                style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#E8EDF5", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical" }} />
              <button
                onClick={async () => { const ok = await onReply(c.id, replyText); if (ok) { setReplyText(""); setReplyOpen(false); } }}
                disabled={!replyText.trim()}
                style={{ ...btnPrimary, marginTop: 6, opacity: replyText.trim() ? 1 : 0.5 }}
              >Reply</button>
            </div>
          )}
          {/* Children */}
          {node.children.length > 0 && !collapsed && (
            <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
              {node.children.map((ch) => (
                <CommentNode key={ch.comment.id} node={ch} meId={meId} isPostAuthor={isPostAuthor} canModerate={canModerate} postSolvedId={postSolvedId} postIsQuestion={postIsQuestion} depth={depth + 1}
                  onVote={onVote} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onMarkSolution={onMarkSolution} onReport={onReport} />
              ))}
            </div>
          )}
          {collapsed && node.children.length > 0 && (
            <button onClick={() => setCollapsed(false)} style={{ marginTop: 6, background: "transparent", border: "1px dashed rgba(255,255,255,0.1)", color: "#8892A4", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              Show {countDescendants(node)} more {countDescendants(node) === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function countDescendants(node: Node): number {
  return node.children.reduce((a, c) => a + 1 + countDescendants(c), 0);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d}d`;
}

const voteBtn: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", lineHeight: 1 };
const actionBtn: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#8892A4", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 };
const miniActionBtn: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#8892A4", borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontWeight: 600 };
const sortBtn: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#8892A4", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, textTransform: "capitalize" };
const sortBtnActive: React.CSSProperties = { background: "#1E88E5", color: "#fff", border: "none" };
const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
