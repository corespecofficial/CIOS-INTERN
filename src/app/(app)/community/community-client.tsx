"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { FeedPost, CommunityRow } from "@/lib/db";
import {
  createPost, votePost, toggleBookmark, deletePost, pinPost, reportContent,
  joinCommunity, createCommunity,
} from "@/app/actions/community";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";

type Tab = "for-you" | "new" | "trending" | "top-today" | "top-week" | "questions" | "following" | "bookmarks";

interface Me { id: string; name: string; avatarUrl: string | null; role: string; reputation: number; }
interface TopContributor { id: string; name: string; avatar_url: string | null; role: string; reputation: number; }

export function CommunityClient({
  me, initialPosts, groups: initialGroups, topContributors,
}: {
  me: Me;
  initialPosts: FeedPost[];
  groups: CommunityRow[];
  topContributors: TopContributor[];
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [groups, setGroups] = useState<CommunityRow[]>(initialGroups);
  const [tab, setTab] = useState<Tab>("new");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [search, setSearch] = useState("");

  const canModerate = me.role === "admin" || me.role === "super_admin" || me.role === "moderator";

  // Fetch posts when tab or group filter changes
  useEffect(() => {
    if (tab === "new" && !groupFilter) return; // initial hydration covers this
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await fetch(`/api/community/feed?sort=${tab}${groupFilter ? `&community=${groupFilter}` : ""}`);
      if (cancelled) return;
      if (res.ok) { const data = await res.json(); setPosts(data.posts || []); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tab, groupFilter]);

  const filteredPosts = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)));
  }, [posts, search]);

  async function onVote(p: FeedPost, type: "up" | "down") {
    // Optimistic toggle
    const prev = p.my_vote;
    const newVote = prev === type ? null : type;
    const upDelta = (newVote === "up" ? 1 : 0) - (prev === "up" ? 1 : 0);
    const downDelta = (newVote === "down" ? 1 : 0) - (prev === "down" ? 1 : 0);
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, my_vote: newVote, upvotes: x.upvotes + upDelta, downvotes: x.downvotes + downDelta, score: x.score + upDelta - downDelta } : x));

    const r = await votePost(p.id, type);
    if (!r.ok) {
      toast.error(r.error);
      setPosts((list) => list.map((x) => x.id === p.id ? p : x));
      return;
    }
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, my_vote: r.data!.myVote, upvotes: r.data!.up, downvotes: r.data!.down, score: r.data!.score } : x));
  }

  async function onBookmark(p: FeedPost) {
    const next = !p.is_bookmarked;
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, is_bookmarked: next } : x));
    const r = await toggleBookmark(p.id);
    if (!r.ok) {
      toast.error(r.error);
      setPosts((list) => list.map((x) => x.id === p.id ? { ...x, is_bookmarked: !next } : x));
      return;
    }
    toast.success(r.data!.bookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
  }

  async function onDeletePost(p: FeedPost) {
    if (!confirm("Delete this post?")) return;
    const r = await deletePost(p.id);
    if (!r.ok) { toast.error(r.error); return; }
    setPosts((list) => list.filter((x) => x.id !== p.id));
    toast.success("Deleted");
  }

  async function onPinPost(p: FeedPost) {
    const r = await pinPost(p.id, !p.is_pinned);
    if (!r.ok) { toast.error(r.error); return; }
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, is_pinned: !p.is_pinned } : x));
  }

  async function onReport(p: FeedPost) {
    const reason = prompt("Why are you reporting this post?");
    if (!reason?.trim()) return;
    const r = await reportContent({ postId: p.id, reason });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Reported. Moderators will review.");
  }

  async function onJoinGroup(g: CommunityRow) {
    const r = await joinCommunity(g.id);
    if (!r.ok) { toast.error(r.error); return; }
    setGroups((list) => list.map((x) => x.id === g.id ? { ...x, joined: r.data!.joined, member_count: r.data!.count } : x));
    toast.success(r.data!.joined ? `Joined ${g.name}` : `Left ${g.name}`);
  }

  const activeGroup = groupFilter ? groups.find((g) => g.id === groupFilter) : null;

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <style>{`@media (max-width: 960px) { aside[data-sb] { display: none !important; } main[data-community] { max-width: 100% !important; } }`}</style>

      {/* ── Community header (sticky, Reddit-mobile style) ── */}
      <div className="cios-community-header" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(10,14,26,0.92)", backdropFilter: "blur(12px)",
        margin: "-20px -20px 14px -20px", padding: "14px 20px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <style>{`
          @media (max-width: 768px) {
            .cios-community-header { margin: -12px -12px 10px -12px !important; padding: 10px 12px 8px !important; }
            .cios-community-header .cios-com-title { font-size: 17px !important; }
            .cios-community-header .cios-com-search { width: 100% !important; flex: 1 1 100% !important; order: 5; }
            .cios-community-header .cios-com-postbtn { padding: 6px 14px !important; font-size: 12px !important; }
            .cios-community-header .cios-com-row1 { gap: 8px !important; }
            .cios-community-fab { display: flex !important; }
          }
          .cios-community-fab { display: none; }
        `}</style>
        <div className="cios-com-row1" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <h1 className="cios-com-title" style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55vw" }}>
            {activeGroup ? `r/${activeGroup.name}` : "r/community"}
          </h1>
          {activeGroup && !activeGroup.joined && (
            <button onClick={() => onJoinGroup(activeGroup)} style={joinPill}>+ Join</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowComposer(true)} className="cios-com-postbtn" style={btnPrimary}>+ Post</button>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search r/community…"
            className="cios-com-search"
            style={{ width: 220, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 999, padding: "8px 14px", color: "#E8EDF5", fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Group chip strip — horizontal scroll, Reddit-style community switcher */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          <button onClick={() => setGroupFilter(null)} style={{ ...chip, ...(groupFilter === null ? chipActive : {}) }}>
            🌐 All
          </button>
          {groups.map((g) => (
            <button key={g.id} onClick={() => setGroupFilter(g.id)} style={{ ...chip, ...(groupFilter === g.id ? chipActive : {}) }}>
              {g.is_private ? "🔒" : "#"} {g.name}
            </button>
          ))}
          <button onClick={() => setShowCreateGroup(true)} style={{ ...chip, color: "#1E88E5", borderColor: "rgba(30,136,229,0.3)" }}>+ Create</button>
        </div>
      </div>

      {/* Mobile FAB — Reddit-style floating + Post button */}
      <button onClick={() => setShowComposer(true)} aria-label="New post" className="cios-community-fab" style={{
        position: "fixed", right: 16, bottom: 80, width: 56, height: 56, borderRadius: "50%",
        background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none",
        fontSize: 28, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(30,136,229,0.4)",
        alignItems: "center", justifyContent: "center", zIndex: 700,
      }}>+</button>

      {/* ── Body: feed + right rail ── */}
      <div className="cios-community-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16, alignItems: "flex-start" }}>
        <style>{`
          @media (max-width: 960px) {
            .cios-community-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        {/* MAIN FEED */}
        <main data-community style={{ minWidth: 0, maxWidth: 720 }}>
          {/* Sort tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 12 }}>
            {(["for-you","new","trending","top-today","top-week","questions","following","bookmarks"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: tab === t ? "rgba(30,136,229,0.15)" : "transparent",
                  color: tab === t ? "#1E88E5" : "#8892A4",
                  border: "none", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                {labelOf(t)}
              </button>
            ))}
          </div>

          {loading && <p style={{ fontSize: 13, color: "#8892A4", textAlign: "center", padding: 20 }}>Loading…</p>}
          {!loading && filteredPosts.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>💭</div>
              <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
                {search ? "No posts match your search." : tab === "bookmarks" ? "No bookmarks yet. Save posts with 🔖." : "Be the first to post."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredPosts.map((p) => (
                <PostCard
                  key={p.id} post={p} meId={me.id} canModerate={canModerate}
                  onVote={onVote} onBookmark={onBookmark} onDelete={onDeletePost} onPin={onPinPost} onReport={onReport}
                />
              ))}
            </div>
          )}
        </main>

        {/* RIGHT RAIL */}
        <aside data-sb style={{ position: "sticky", top: 120, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* About current group (or all) */}
          <div style={panelBox}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>About</div>
            {activeGroup ? (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: "0 0 6px 0" }}>r/{activeGroup.name}</h3>
                {activeGroup.description && <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 10px 0", lineHeight: 1.5 }}>{activeGroup.description}</p>}
                <div style={{ fontSize: 11, color: "#8892A4", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8, marginBottom: 6 }}>
                  <b style={{ color: "#E8EDF5", fontSize: 14 }}>{activeGroup.member_count}</b> members
                </div>
                {activeGroup.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {activeGroup.tags.map((t) => <span key={t} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(30,136,229,0.1)", color: "#1E88E5", borderRadius: 10, fontWeight: 600 }}>#{t}</span>)}
                  </div>
                )}
                <button onClick={() => onJoinGroup(activeGroup)} style={{ ...btnPrimary, width: "100%", marginTop: 10 }}>
                  {activeGroup.joined ? "Leave group" : "+ Join group"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 10px 0", lineHeight: 1.5 }}>
                  The CIOS community — share wins, ask questions, help each other grow.
                </p>
                <button onClick={() => setShowCreateGroup(true)} style={{ ...btnPrimary, width: "100%" }}>+ Create a group</button>
              </>
            )}
          </div>

          {/* Your authority */}
          <div style={panelBox}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Your authority</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: "#FFC107" }}>{me.reputation}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>reputation</div>
            </div>
            <Link href="/community/bookmarks" style={{ ...bookmarkLink, marginTop: 10 }}>🔖 My bookmarks</Link>
          </div>

          {/* Top contributors */}
          <div style={panelBox}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>🏆 Top contributors</div>
            {topContributors.length === 0 ? (
              <p style={{ fontSize: 12, color: "#8892A4" }}>No activity yet.</p>
            ) : (
              topContributors.slice(0, 5).map((u, i) => (
                <Link key={u.id} href={`/community/profile/${u.id}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", borderRadius: 6, textDecoration: "none", color: "inherit" }}>
                  <span style={{ width: 18, fontSize: 10, fontWeight: 700, color: i < 3 ? "#FFC107" : "#5A6478", textAlign: "center" }}>{i + 1}</span>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                      {(u.name[0] || "?").toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: 11, color: "#E8EDF5", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
                  <span style={{ fontSize: 9, color: "#FFC107", fontWeight: 700 }}>{u.reputation}</span>
                </Link>
              ))
            )}
          </div>

          {/* Rules */}
          <div style={panelBox}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Community rules</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#8892A4", lineHeight: 1.7 }}>
              <li>Be respectful — no harassment or hate</li>
              <li>Stay on topic — keep posts relevant to the group</li>
              <li>No spam or self-promotion without value</li>
              <li>Use questions tag when asking for help</li>
              <li>Credit sources for shared content</li>
            </ol>
          </div>
        </aside>
      </div>

      {/* Modals */}
      {showComposer && (
        <ComposerModal
          me={me}
          groups={groups}
          defaultGroupId={groupFilter || groups[0]?.id}
          onClose={() => setShowComposer(false)}
          onCreated={(newPost) => {
            setPosts((list) => [newPost, ...list]);
            setShowComposer(false);
          }}
        />
      )}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(g) => { setGroups((list) => [g, ...list]); setShowCreateGroup(false); }}
        />
      )}
    </div>
  );
}

function labelOf(t: Tab): string {
  switch (t) {
    case "for-you": return "For You";
    case "top-today": return "Top Today";
    case "top-week": return "Top Week";
    default: return t;
  }
}

/* ─────────────── Post card ─────────────── */

function PostCard({ post, meId, canModerate, onVote, onBookmark, onDelete, onPin, onReport }: {
  post: FeedPost; meId: string; canModerate: boolean;
  onVote: (p: FeedPost, t: "up" | "down") => void;
  onBookmark: (p: FeedPost) => void;
  onDelete: (p: FeedPost) => void;
  onPin: (p: FeedPost) => void;
  onReport: (p: FeedPost) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mine = post.author_id === meId;

  return (
    <div style={{ background: "#111827", border: `1px solid ${post.is_pinned ? "rgba(255,193,7,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: 14, position: "relative" }}>
      {post.is_pinned && (
        <div style={{ fontSize: 10, fontWeight: 700, color: "#FFC107", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>📌 Pinned</div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        {/* Vote column */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <button onClick={() => onVote(post, "up")} style={{ ...voteBtn, color: post.my_vote === "up" ? "#66BB6A" : "#5A6478" }} title="Upvote">▲</button>
          <span style={{ fontSize: 12, fontWeight: 800, color: post.score > 0 ? "#66BB6A" : post.score < 0 ? "#EF5350" : "#8892A4", minWidth: 24, textAlign: "center" }}>
            {post.score}
          </span>
          <button onClick={() => onVote(post, "down")} style={{ ...voteBtn, color: post.my_vote === "down" ? "#EF5350" : "#5A6478" }} title="Downvote">▼</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            {post.author_avatar ? (
              <img src={post.author_avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                {(post.author_name?.[0] || "?").toUpperCase()}
              </div>
            )}
            <Link href={`/community/profile/${post.author_id}`} style={{ fontSize: 11, fontWeight: 700, color: "#E8EDF5", textDecoration: "none" }}>
              {post.author_name || "Unknown"}
            </Link>
            {post.author_reputation > 0 && (
              <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(255,193,7,0.12)", color: "#FFC107", borderRadius: 4, fontWeight: 700 }}>
                ⭐ {post.author_reputation}
              </span>
            )}
            {post.community_name && (
              <>
                <span style={{ fontSize: 10, color: "#5A6478" }}>·</span>
                <span style={{ fontSize: 10, color: "#8892A4" }}># {post.community_name}</span>
              </>
            )}
            {post.is_question && (
              <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(255,112,67,0.12)", color: "#FF7043", borderRadius: 4, fontWeight: 700 }}>Q</span>
            )}
            {post.solved_comment_id && (
              <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(102,187,106,0.12)", color: "#66BB6A", borderRadius: 4, fontWeight: 700 }}>✓ SOLVED</span>
            )}
            <span style={{ fontSize: 10, color: "#5A6478", marginLeft: "auto" }}>{timeAgo(post.created_at)}</span>
          </div>

          <Link href={`/community/post/${post.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", margin: "0 0 6px 0", lineHeight: 1.3 }}>{post.title}</h3>
            {post.content && (
              <p style={{ fontSize: 13, color: "#8892A4", margin: "0 0 8px 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.content}
              </p>
            )}
            {post.image_url && (
              <img src={post.image_url} alt="" style={{ width: "100%", maxHeight: 380, objectFit: "cover", borderRadius: 10, marginBottom: 8, display: "block" }} />
            )}
            {post.link_url && (
              <a href={post.link_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: "#1E88E5", textDecoration: "underline", display: "block", marginBottom: 8 }}>
                🔗 {post.link_url}
              </a>
            )}
          </Link>

          {post.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {post.tags.map((t) => (
                <span key={t} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(30,136,229,0.1)", color: "#1E88E5", borderRadius: 10, fontWeight: 600 }}>#{t}</span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
            <Link href={`/community/post/${post.id}`} style={{ ...actionBtn, textDecoration: "none" }}>💬 {post.comment_count}</Link>
            <button onClick={() => onBookmark(post)} style={{ ...actionBtn, color: post.is_bookmarked ? "#FFC107" : "#8892A4" }}>
              {post.is_bookmarked ? "🔖 Saved" : "🔖 Save"}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/community/post/${post.id}`); toast.success("Link copied"); }} style={actionBtn}>🔗 Share</button>
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button onClick={() => setMenuOpen(!menuOpen)} style={actionBtn}>⋯</button>
              {menuOpen && (
                <div style={{ position: "absolute", top: 28, right: 0, background: "#1A2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 4, minWidth: 170, zIndex: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>
                  {canModerate && (
                    <MenuItem onClick={() => { onPin(post); setMenuOpen(false); }}>{post.is_pinned ? "Unpin" : "📌 Pin"}</MenuItem>
                  )}
                  {!mine && <MenuItem onClick={() => { onReport(post); setMenuOpen(false); }} danger>🚩 Report</MenuItem>}
                  {(mine || canModerate) && <MenuItem onClick={() => { onDelete(post); setMenuOpen(false); }} danger>🗑 Delete</MenuItem>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "transparent", border: "none", color: danger ? "#EF5350" : "#E8EDF5", fontSize: 12, cursor: "pointer", borderRadius: 6 }}>
      {children}
    </button>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─────────────── Composer ─────────────── */

function ComposerModal({ me, groups, defaultGroupId, onClose, onCreated }: {
  me: Me; groups: CommunityRow[]; defaultGroupId?: string;
  onClose: () => void;
  onCreated: (p: FeedPost) => void;
}) {
  const [communityId, setCommunityId] = useState(defaultGroupId || groups[0]?.id || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onImage(files: FileList | null) {
    if (!files || !files[0]) return;
    setUploading(true);
    const t = toast.loading("Uploading…");
    try {
      const compressed = await compressImage(files[0], { maxBytes: 2 * 1024 * 1024 });
      const up = await uploadToCloudinary(compressed, { folder: "cios-community/images", resourceType: "image" });
      setImageUrl(up.secureUrl);
      toast.success("Uploaded", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
    finally { setUploading(false); }
  }

  async function suggestTitle() {
    if (!content.trim()) { toast.error("Write your post content first — AI will suggest a title"); return; }
    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        content: `Suggest 3 short, compelling post titles (under 80 chars each) for this content. Return just the titles as a numbered list:\n\n${content}`,
        count: 3,
      })});
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "AI not configured"); return; }
      // Parse first suggestion
      const first = String(data.text || "").split("\n").find((l: string) => /^\s*1[.)]/.test(l))?.replace(/^\s*1[.)]\s*/, "").replace(/^["']|["']$/g, "").trim();
      if (first) { setTitle(first); toast.success("Title suggested"); }
      else toast.error("Couldn't parse AI response");
    } catch (e) { toast.error((e as Error).message); }
    setSuggesting(false);
  }

  async function submit() {
    if (!communityId) { toast.error("Pick or create a group"); return; }
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    const tags = tagsInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    const r = await createPost({
      communityId, title, content, isQuestion,
      imageUrl, linkUrl: linkUrl || null, tags,
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Posted");
    const group = groups.find((g) => g.id === communityId);
    const optimistic: FeedPost = {
      id: r.data!.id, community_id: communityId, community_name: group?.name || null,
      author_id: me.id, author_name: me.name, author_avatar: me.avatarUrl, author_reputation: me.reputation,
      title: title.trim(), content, type: isQuestion ? "question" : "discussion",
      image_url: imageUrl, link_url: linkUrl || null,
      upvotes: 0, downvotes: 0, score: 0, comment_count: 0,
      is_pinned: false, is_question: isQuestion, solved_comment_id: null,
      tags, created_at: new Date().toISOString(), my_vote: null, is_bookmarked: false,
    };
    onCreated(optimistic);
  }

  return (
    <Modal title="New post" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={lbl}>Group</div>
          {groups.length === 0 ? (
            <p style={{ fontSize: 12, color: "#FFC107" }}>No groups yet — create one from the sidebar first.</p>
          ) : (
            <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} style={input}>
              {groups.map((g) => <option key={g.id} value={g.id}># {g.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={lbl}>Title</div>
            <button onClick={suggestTitle} disabled={suggesting || !content.trim()} style={{ background: "transparent", border: "none", color: "#AB47BC", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {suggesting ? "…" : "✨ Suggest with AI"}
            </button>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your post about?" style={input} autoFocus />
        </div>
        <div>
          <div style={lbl}>Content</div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Share the full story… use plain text + URLs" style={{ ...input, minHeight: 120, resize: "vertical" }} />
        </div>
        <div>
          <div style={lbl}>Link (optional)</div>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." style={input} />
        </div>
        <div>
          <div style={lbl}>Image (optional · &lt;2 MB, auto-compressed)</div>
          {imageUrl ? (
            <div style={{ position: "relative", maxWidth: 320 }}>
              <img src={imageUrl} alt="" style={{ width: "100%", borderRadius: 10 }} />
              <button onClick={() => setImageUrl(null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <>
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => onImage(e.target.files)} />
              <button onClick={() => fileInput.current?.click()} disabled={uploading} style={{ ...btnGhost, width: "100%", padding: "14px", border: "2px dashed rgba(255,255,255,0.15)" }}>
                {uploading ? "Uploading…" : "🖼 Upload image"}
              </button>
            </>
          )}
        </div>
        <div>
          <div style={lbl}>Tags (comma separated)</div>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ai, prompting, design" style={input} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E8EDF5", cursor: "pointer" }}>
          <input type="checkbox" checked={isQuestion} onChange={(e) => setIsQuestion(e.target.checked)} />
          Mark as a question (community can mark a best answer)
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy || uploading} style={btnPrimary}>{busy ? "Posting…" : "Post"}</button>
        </div>
      </div>
    </Modal>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: CommunityRow) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) { toast.error("Name required"); return; }
    setBusy(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const r = await createCommunity({ name, description, isPrivate, tags });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    onCreated({ id: r.data!.id, name, description, member_count: 1, is_private: isPrivate, tags, created_by: "", joined: true });
    toast.success("Group created");
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={lbl}>Group name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AI Creators Hub" style={input} autoFocus />
        </div>
        <div>
          <div style={lbl}>Description</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...input, minHeight: 70, resize: "vertical" }} />
        </div>
        <div>
          <div style={lbl}>Tags</div>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="design, creators, feedback" style={input} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E8EDF5", cursor: "pointer" }}>
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          Private (members must request to join)
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#E8EDF5", width: 30, height: 30, borderRadius: 8, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Styles */
const panelBox: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14 };
const chip: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
  background: "#111827", color: "#8892A4", border: "1px solid rgba(255,255,255,0.07)",
  whiteSpace: "nowrap", flexShrink: 0,
};
const chipActive: React.CSSProperties = { background: "rgba(30,136,229,0.15)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.3)" };
const joinPill: React.CSSProperties = {
  padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
  background: "#1E88E5", color: "#fff", border: "none", cursor: "pointer",
};
const bookmarkLink: React.CSSProperties = {
  display: "block", padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  background: "rgba(255,193,7,0.06)", color: "#FFC107", textDecoration: "none",
  border: "1px solid rgba(255,193,7,0.15)",
};
const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 999, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none" };
const btnGhost: React.CSSProperties = { background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const actionBtn: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#8892A4", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 };
const voteBtn: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", lineHeight: 1 };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit" };
