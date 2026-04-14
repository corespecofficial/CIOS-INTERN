"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { FeedPost, CommunityRow } from "@/lib/db";
import {
  createPost, votePost, toggleBookmark, deletePost, pinPost, reportContent,
  joinCommunity, createCommunity, togglePostReaction, togglePostLock,
  togglePostFlag, crosspost,
  createPollForPost, getPollForPost, votePoll, giveAward,
  suspendCommunity, unsuspendCommunity, deleteCommunity,
} from "@/app/actions/community";
import { REACTION_EMOJIS, AWARD_EMOJI, AWARD_COSTS, type PollView } from "@/lib/community-constants";
import { LinkEmbedCard } from "@/components/community/link-embed";
import { UserHovercard } from "@/components/community/user-hovercard";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";

type Tab = "for-you" | "new" | "trending" | "top-today" | "top-week" | "questions" | "following" | "bookmarks";

interface Me { id: string; name: string; avatarUrl: string | null; role: string; reputation: number; }
interface TopContributor { id: string; name: string; avatar_url: string | null; role: string; reputation: number; }

export function CommunityClient({
  me, initialPosts, groups: initialGroups, topContributors, trending = [],
}: {
  me: Me;
  initialPosts: FeedPost[];
  groups: CommunityRow[];
  topContributors: TopContributor[];
  trending?: Array<{ tag: string; count: number }>;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [groups, setGroups] = useState<CommunityRow[]>(initialGroups);
  // URL-driven tab + group so the state is bookmarkable and shareable.
  // IMPORTANT: always start from the default so SSR and first client render
  // match; then hydrate from the URL in an effect below.
  const [tab, _setTab] = useState<Tab>("new");
  const [groupFilter, _setGroupFilter] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab") as Tab | null;
    const g = p.get("g");
    if (t) _setTab(t);
    if (g) _setGroupFilter(g);
  }, []);
  const setTab = (t: Tab) => { _setTab(t); syncUrl({ tab: t, g: groupFilter }); };
  const setGroupFilter = (g: string | null) => { _setGroupFilter(g); syncUrl({ tab, g }); };
  function syncUrl({ tab: t, g }: { tab: Tab; g: string | null }) {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    if (g) u.searchParams.set("g", g); else u.searchParams.delete("g");
    window.history.replaceState(null, "", u.toString());
  }
  const [loading, setLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [crosspostTarget, setCrosspostTarget] = useState<FeedPost | null>(null);
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

  async function onReact(p: FeedPost, emoji: string) {
    // Optimistic
    const had = p.my_reactions?.includes(emoji);
    const nextMine = had ? p.my_reactions.filter((e) => e !== emoji) : [...(p.my_reactions || []), emoji];
    const nextReactions = { ...(p.reactions || {}) };
    nextReactions[emoji] = Math.max(0, (nextReactions[emoji] || 0) + (had ? -1 : 1));
    if (nextReactions[emoji] === 0) delete nextReactions[emoji];
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, reactions: nextReactions, my_reactions: nextMine } : x));
    const r = await togglePostReaction(p.id, emoji);
    if (!r.ok) { toast.error(r.error); setPosts((list) => list.map((x) => x.id === p.id ? p : x)); return; }
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, reactions: r.data!.reactions, my_reactions: r.data!.mine } : x));
  }

  async function onToggleLock(p: FeedPost) {
    const r = await togglePostLock(p.id, !p.is_locked);
    if (!r.ok) { toast.error(r.error); return; }
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, is_locked: !p.is_locked } : x));
    toast.success(p.is_locked ? "Unlocked" : "Locked — no new comments");
  }

  async function onGiveAward(p: FeedPost, kind: "bronze" | "silver" | "gold" | "diamond") {
    const r = await giveAward({ target: "post", targetId: p.id, kind });
    if (!r.ok) { toast.error(r.error); return; }
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, awards: r.data!.awards } : x));
    toast.success(`${AWARD_EMOJI[kind]} Award given`);
  }

  async function onToggleFlag(p: FeedPost, flag: "nsfw" | "spoiler") {
    const value = flag === "nsfw" ? !p.is_nsfw : !p.is_spoiler;
    const r = await togglePostFlag(p.id, flag, value);
    if (!r.ok) { toast.error(r.error); return; }
    setPosts((list) => list.map((x) => x.id === p.id ? { ...x, is_nsfw: flag === "nsfw" ? value : x.is_nsfw, is_spoiler: flag === "spoiler" ? value : x.is_spoiler } : x));
  }

  async function onJoinGroup(g: CommunityRow) {
    const r = await joinCommunity(g.id);
    if (!r.ok) { toast.error(r.error); return; }
    setGroups((list) => list.map((x) => x.id === g.id ? { ...x, joined: r.data!.joined, member_count: r.data!.count } : x));
    toast.success(r.data!.joined ? `Joined ${g.name}` : `Left ${g.name}`);
  }

  const activeGroup = groupFilter ? groups.find((g) => g.id === groupFilter) : null;

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <style>{`@media (max-width: 960px) { aside[data-sb] { display: none !important; } main[data-community] { max-width: 100% !important; } }`}</style>

      {/* ── Community header (sticky below the global top bar) ── */}
      <div className="cios-community-header" style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#0A0E1A",
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
          <button onClick={() => setShowDiscover(true)} style={{ ...chip, color: "#FFC107", borderColor: "rgba(255,193,7,0.3)" }}>🧭 Discover</button>
          <button onClick={() => setShowCreateGroup(true)} style={{ ...chip, color: "#1E88E5", borderColor: "rgba(30,136,229,0.3)" }}>+ Create</button>
        </div>

        {/* Sort tabs — locked with the header so they never collide with posts. */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginTop: 10, scrollbarWidth: "none" }}>
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
      </div>

      {/* Mobile FAB — hidden whenever any modal is open so it never obstructs */}
      {!showComposer && !showCreateGroup && !showDiscover && !crosspostTarget && (
        <button onClick={() => setShowComposer(true)} aria-label="New post" className="cios-community-fab" style={{
          position: "fixed", right: 16, bottom: 80, width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none",
          fontSize: 28, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(30,136,229,0.4)",
          alignItems: "center", justifyContent: "center", zIndex: 700,
        }}>+</button>
      )}

      {/* ── Body: feed + right rail. Each column owns its own scroll so the
           feed can't drag the sidebar (or vice-versa). ── */}
      <div className="cios-community-grid" style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16,
        alignItems: "stretch",
        flex: 1, minHeight: 0,
        overflow: "hidden",
      }}>
        <style>{`
          @media (max-width: 960px) {
            .cios-community-grid {
              grid-template-columns: 1fr !important;
              height: auto !important;
              overflow: visible !important;
            }
            .cios-community-grid > main { overflow: visible !important; height: auto !important; }
            .cios-community-grid > aside { max-height: none !important; position: static !important; overflow: visible !important; }
          }
        `}</style>
        {/* MAIN FEED */}
        <main data-community style={{ minWidth: 0, maxWidth: 720, overflowY: "auto", height: "100%", paddingRight: 6 }}>
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
                  onReact={onReact} onToggleLock={onToggleLock} onToggleFlag={onToggleFlag}
                  onCrosspost={(p) => setCrosspostTarget(p)}
                  onGiveAward={onGiveAward}
                />
              ))}
            </div>
          )}
        </main>

        {/* RIGHT RAIL */}
        <aside data-sb style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
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
                {activeGroup.suspended_at && (
                  <div style={{ marginTop: 10, padding: 10, background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#EF5350", textTransform: "uppercase" }}>🚫 Suspended</div>
                    {activeGroup.suspend_reason && <div style={{ fontSize: 11, color: "#B0BEC5", marginTop: 4 }}>{activeGroup.suspend_reason}</div>}
                  </div>
                )}
                {(me.role === "admin" || me.role === "super_admin" || me.role === "moderator") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 9, color: "#FFB74D", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>🛡 Admin controls</div>
                    {activeGroup.suspended_at ? (
                      <button onClick={async () => {
                        const r = await unsuspendCommunity(activeGroup.id);
                        if (!r.ok) return toast.error(r.error);
                        setGroups((ls) => ls.map((g) => g.id === activeGroup.id ? { ...g, suspended_at: null, suspend_reason: null } : g));
                        toast.success("Group reinstated");
                      }} style={{ ...adminBtn, background: "rgba(102,187,106,0.12)", color: "#66BB6A", borderColor: "rgba(102,187,106,0.3)" }}>
                        ✓ Unsuspend
                      </button>
                    ) : (
                      <button onClick={async () => {
                        const reason = prompt("Reason for suspension (visible to members):");
                        if (!reason) return;
                        const r = await suspendCommunity(activeGroup.id, reason);
                        if (!r.ok) return toast.error(r.error);
                        setGroups((ls) => ls.map((g) => g.id === activeGroup.id ? { ...g, suspended_at: new Date().toISOString(), suspend_reason: reason } : g));
                        toast.success("Suspended");
                      }} style={{ ...adminBtn, background: "rgba(255,193,7,0.1)", color: "#FFC107", borderColor: "rgba(255,193,7,0.25)" }}>
                        ⏸ Suspend group
                      </button>
                    )}
                    {(me.role === "admin" || me.role === "super_admin") && (
                      <button onClick={async () => {
                        if (!confirm(`Delete r/${activeGroup.name}? All posts will be removed. This can't be undone.`)) return;
                        const r = await deleteCommunity(activeGroup.id);
                        if (!r.ok) return toast.error(r.error);
                        setGroups((ls) => ls.filter((g) => g.id !== activeGroup.id));
                        setGroupFilter(null);
                        toast.success("Group deleted");
                      }} style={{ ...adminBtn, background: "rgba(239,83,80,0.1)", color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" }}>
                        🗑 Delete group
                      </button>
                    )}
                  </div>
                )}
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

          {/* Trending topics */}
          {trending.length > 0 && (
            <div style={panelBox}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>🔥 Trending topics</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {trending.slice(0, 8).map((t, i) => (
                  <button key={t.tag} onClick={() => setSearch(t.tag)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, background: "transparent", border: "none", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ width: 18, fontSize: 10, fontWeight: 700, color: i < 3 ? "#FFC107" : "#5A6478" }}>#{i + 1}</span>
                    <span style={{ fontSize: 12, color: "#1E88E5", flex: 1, fontWeight: 700 }}>#{t.tag}</span>
                    <span style={{ fontSize: 10, color: "#8892A4" }}>{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
          onCreated={(g) => { setGroups((list) => [{ ...g, joined: true }, ...list]); setShowCreateGroup(false); setGroupFilter(g.id); toast.success(`r/${g.name} created — you're the owner`); }}
        />
      )}
      {showDiscover && (
        <DiscoverDrawer
          groups={groups}
          onClose={() => setShowDiscover(false)}
          onToggle={onJoinGroup}
          onOpen={(id) => { setGroupFilter(id); setShowDiscover(false); }}
          onCreate={() => { setShowDiscover(false); setShowCreateGroup(true); }}
        />
      )}
      {crosspostTarget && (
        <CrosspostModal
          post={crosspostTarget}
          groups={groups.filter((g) => g.id !== crosspostTarget.community_id)}
          onClose={() => setCrosspostTarget(null)}
          onDone={(newId) => { setCrosspostTarget(null); toast.success("Crossposted"); window.location.href = `/community/post/${newId}`; }}
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

function PostCard({ post, meId, canModerate, onVote, onBookmark, onDelete, onPin, onReport, onReact, onToggleLock, onToggleFlag, onCrosspost, onGiveAward }: {
  post: FeedPost; meId: string; canModerate: boolean;
  onVote: (p: FeedPost, t: "up" | "down") => void;
  onBookmark: (p: FeedPost) => void;
  onDelete: (p: FeedPost) => void;
  onPin: (p: FeedPost) => void;
  onReport: (p: FeedPost) => void;
  onReact: (p: FeedPost, emoji: string) => void;
  onToggleLock: (p: FeedPost) => void;
  onToggleFlag: (p: FeedPost, flag: "nsfw" | "spoiler") => void;
  onCrosspost: (p: FeedPost) => void;
  onGiveAward: (p: FeedPost, kind: "bronze" | "silver" | "gold" | "diamond") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactPickerOpen, setReactPickerOpen] = useState(false);
  const [awardPickerOpen, setAwardPickerOpen] = useState(false);
  const [revealBlur, setRevealBlur] = useState(false);
  const mine = post.author_id === meId;
  const flair = flairFor(post);
  const blurred = (post.is_nsfw || post.is_spoiler) && !revealBlur;

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
            <UserHovercard userId={post.author_id}>
              {post.author_avatar ? (
                <img src={post.author_avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  {(post.author_name?.[0] || "?").toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, color: "#E8EDF5" }}>
                {post.author_name || "Unknown"}
              </span>
            </UserHovercard>
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
            {flair && (
              <span style={{ fontSize: 9, padding: "1px 6px", background: flair.bg, color: flair.fg, borderRadius: 4, fontWeight: 700 }}>{flair.label}</span>
            )}
            {post.is_locked && (
              <span title="Locked — no new comments" style={{ fontSize: 9, padding: "1px 6px", background: "rgba(158,158,158,0.15)", color: "#BDBDBD", borderRadius: 4, fontWeight: 700 }}>🔒 LOCKED</span>
            )}
            {post.is_nsfw && (
              <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(239,83,80,0.15)", color: "#EF5350", borderRadius: 4, fontWeight: 700 }}>NSFW</span>
            )}
            {post.is_spoiler && (
              <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(156,39,176,0.15)", color: "#CE93D8", borderRadius: 4, fontWeight: 700 }}>SPOILER</span>
            )}
            {post.crosspost_of && (
              <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(66,165,245,0.12)", color: "#42A5F5", borderRadius: 4, fontWeight: 700 }}>↻ CROSSPOST</span>
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
            {post.video_url && (
              <video src={post.video_url} controls playsInline
                style={{ width: "100%", maxHeight: 420, borderRadius: 10, marginBottom: 8, background: "#000" }} />
            )}
            {post.image_url && (
              <div style={{ position: "relative", marginBottom: 8 }}>
                <img src={post.image_url} alt="" style={{ width: "100%", maxHeight: 380, objectFit: "cover", borderRadius: 10, display: "block", filter: blurred ? "blur(24px)" : "none", transition: "filter 0.2s" }} />
                {blurred && (
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRevealBlur(true); }} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 800, fontSize: 13 }}>
                    {post.is_nsfw ? "👁 Reveal NSFW" : "👁 Reveal spoiler"}
                  </button>
                )}
              </div>
            )}
            {post.link_url && <LinkEmbedCard url={post.link_url} />}
          </Link>

          {post.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {post.tags.map((t) => (
                <span key={t} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(30,136,229,0.1)", color: "#1E88E5", borderRadius: 10, fontWeight: 600 }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Poll */}
          {post.type === "poll" && <PollBlock postId={post.id} />}

          {/* Awards strip */}
          {post.awards && Object.keys(post.awards).length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
              {(Object.entries(post.awards) as Array<["bronze"|"silver"|"gold"|"diamond", number]>).map(([kind, count]) => (
                <span key={kind} title={`${count} × ${kind}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, padding: "2px 7px", borderRadius: 999, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)", color: "#FFC107" }}>
                  <span>{AWARD_EMOJI[kind] || "🏆"}</span>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{count}</span>
                </span>
              ))}
            </div>
          )}

          {/* Reactions strip */}
          {Object.keys(post.reactions || {}).length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {Object.entries(post.reactions).map(([emoji, count]) => {
                const mine = post.my_reactions?.includes(emoji);
                return (
                  <button key={emoji} onClick={() => onReact(post, emoji)} style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999,
                    background: mine ? "rgba(30,136,229,0.18)" : "rgba(255,255,255,0.05)",
                    border: mine ? "1px solid rgba(30,136,229,0.4)" : "1px solid transparent",
                    color: "#E8EDF5", cursor: "pointer", fontSize: 12,
                  }}>
                    <span>{emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
            <Link href={`/community/post/${post.id}`} style={{ ...actionBtn, textDecoration: "none" }}>💬 {post.comment_count}</Link>
            <div style={{ position: "relative" }}>
              <button onClick={() => setReactPickerOpen((v) => !v)} style={actionBtn}>😊 React</button>
              {reactPickerOpen && (
                <>
                  <div onClick={() => setReactPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                  <div style={{ position: "absolute", bottom: 28, left: 0, zIndex: 10, display: "flex", gap: 4, padding: 6, background: "#1A2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>
                    {REACTION_EMOJIS.map((e) => (
                      <button key={e} onClick={() => { onReact(post, e); setReactPickerOpen(false); }} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", fontSize: 16 }}>{e}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => onBookmark(post)} style={{ ...actionBtn, color: post.is_bookmarked ? "#FFC107" : "#8892A4" }}>
              {post.is_bookmarked ? "🔖 Saved" : "🔖 Save"}
            </button>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/community/post/${post.id}`;
                if (navigator.share) { try { await navigator.share({ title: post.title, url }); return; } catch {} }
                try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); }
              }}
              style={actionBtn}
            >🔗 Share</button>
            <button onClick={() => onCrosspost(post)} style={actionBtn}>↻ Crosspost</button>
            {!mine && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setAwardPickerOpen((v) => !v)} style={actionBtn}>🏆 Award</button>
                {awardPickerOpen && (
                  <AwardPicker post={post} onPick={(k) => { onGiveAward(post, k); setAwardPickerOpen(false); }} onClose={() => setAwardPickerOpen(false)} />
                )}
              </div>
            )}
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button onClick={() => setMenuOpen(!menuOpen)} style={actionBtn}>⋯</button>
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                  <div style={{ position: "absolute", top: 28, right: 0, background: "#1A2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 4, minWidth: 190, zIndex: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>
                    {canModerate && (
                      <MenuItem onClick={() => { onPin(post); setMenuOpen(false); }}>{post.is_pinned ? "Unpin" : "📌 Pin"}</MenuItem>
                    )}
                    {(mine || canModerate) && (
                      <>
                        <MenuItem onClick={() => { onToggleLock(post); setMenuOpen(false); }}>{post.is_locked ? "🔓 Unlock" : "🔒 Lock"}</MenuItem>
                        <MenuItem onClick={() => { onToggleFlag(post, "nsfw"); setMenuOpen(false); }}>{post.is_nsfw ? "Mark safe" : "🔞 Mark NSFW"}</MenuItem>
                        <MenuItem onClick={() => { onToggleFlag(post, "spoiler"); setMenuOpen(false); }}>{post.is_spoiler ? "Remove spoiler" : "Mark as spoiler"}</MenuItem>
                      </>
                    )}
                    {!mine && <MenuItem onClick={() => { onReport(post); setMenuOpen(false); }} danger>🚩 Report</MenuItem>}
                    {(mine || canModerate) && <MenuItem onClick={() => { onDelete(post); setMenuOpen(false); }} danger>🗑 Delete</MenuItem>}
                  </div>
                </>
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [mode, setMode] = useState<"post" | "poll">("post");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollMulti, setPollMulti] = useState(false);
  const [pollClosesHours, setPollClosesHours] = useState(72);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onVideo(files: FileList | null) {
    if (!files || !files[0]) return;
    const f = files[0];
    if (f.size > 50 * 1024 * 1024) { toast.error("Max 50 MB"); return; }
    setUploadingVideo(true);
    const t = toast.loading("Uploading video…");
    try {
      const up = await uploadToCloudinary(f, { folder: "cios-community/video", resourceType: "video" });
      setVideoUrl(up.secureUrl);
      toast.success("Uploaded", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
    finally { setUploadingVideo(false); }
  }

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
    const tags = tagsInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    setBusy(true);
    if (mode === "poll") {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) { setBusy(false); toast.error("At least 2 options"); return; }
      const r = await createPollForPost({
        communityId, title, question: title, options: opts,
        multiChoice: pollMulti, closesInHours: pollClosesHours || undefined, tags,
      });
      setBusy(false);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Poll posted");
      const group = groups.find((g) => g.id === communityId);
      onCreated({
        id: r.data!.postId, community_id: communityId, community_name: group?.name || null,
        author_id: me.id, author_name: me.name, author_avatar: me.avatarUrl, author_reputation: me.reputation,
        title: title.trim(), content: "", type: "poll",
        image_url: null, link_url: null, video_url: null,
        upvotes: 0, downvotes: 0, score: 0, comment_count: 0,
        is_pinned: false, is_question: false, solved_comment_id: null,
        tags, created_at: new Date().toISOString(), my_vote: null, is_bookmarked: false,
        is_locked: false, is_nsfw: false, is_spoiler: false, crosspost_of: null,
        reactions: {}, my_reactions: [], awards: {},
      });
      return;
    }
    const r = await createPost({
      communityId, title, content, isQuestion,
      imageUrl, videoUrl, linkUrl: linkUrl || null, tags,
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Posted");
    const group = groups.find((g) => g.id === communityId);
    const optimistic: FeedPost = {
      id: r.data!.id, community_id: communityId, community_name: group?.name || null,
      author_id: me.id, author_name: me.name, author_avatar: me.avatarUrl, author_reputation: me.reputation,
      title: title.trim(), content, type: isQuestion ? "question" : "discussion",
      image_url: imageUrl, link_url: linkUrl || null, video_url: videoUrl,
      upvotes: 0, downvotes: 0, score: 0, comment_count: 0,
      is_pinned: false, is_question: isQuestion, solved_comment_id: null,
      tags, created_at: new Date().toISOString(), my_vote: null, is_bookmarked: false,
      is_locked: false, is_nsfw: false, is_spoiler: false, crosspost_of: null,
      reactions: {}, my_reactions: [], awards: {},
    };
    onCreated(optimistic);
  }

  return (
    <Modal title={mode === "poll" ? "New poll" : "New post"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 4, padding: 3, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 999, width: "fit-content" }}>
          {(["post", "poll"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer",
              background: mode === m ? "rgba(30,136,229,0.18)" : "transparent",
              color: mode === m ? "#1E88E5" : "#8892A4", fontSize: 12, fontWeight: 700,
            }}>{m === "post" ? "📝 Post" : "📊 Poll"}</button>
          ))}
        </div>
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
        {mode === "poll" && (
          <>
            <div>
              <div style={lbl}>Options (2–8)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pollOptions.map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 6 }}>
                    <input value={o} onChange={(e) => setPollOptions((ls) => ls.map((x, j) => j === i ? e.target.value : x))}
                      placeholder={`Option ${i + 1}`} style={input} />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions((ls) => ls.filter((_, j) => j !== i))}
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 36, color: "#EF5350", cursor: "pointer" }}>✕</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 8 && (
                  <button onClick={() => setPollOptions((ls) => [...ls, ""])}
                    style={{ ...btnGhost, padding: "8px", border: "1px dashed rgba(255,255,255,0.12)" }}>+ Add option</button>
                )}
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E8EDF5", cursor: "pointer" }}>
              <input type="checkbox" checked={pollMulti} onChange={(e) => setPollMulti(e.target.checked)} />
              Allow selecting multiple options
            </label>
            <div>
              <div style={lbl}>Closes in</div>
              <select value={pollClosesHours} onChange={(e) => setPollClosesHours(Number(e.target.value))} style={input}>
                <option value={0}>Never</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
              </select>
            </div>
          </>
        )}
        {mode === "post" && (<>
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
          <div style={lbl}>Video (optional · &lt;50 MB)</div>
          {videoUrl ? (
            <div style={{ position: "relative", maxWidth: 320 }}>
              <video src={videoUrl} controls style={{ width: "100%", borderRadius: 10, background: "#000" }} />
              <button onClick={() => setVideoUrl(null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <>
              <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => onVideo(e.target.files)} />
              <button onClick={() => videoInput.current?.click()} disabled={uploadingVideo} style={{ ...btnGhost, width: "100%", padding: "14px", border: "2px dashed rgba(255,255,255,0.15)" }}>
                {uploadingVideo ? "Uploading…" : "🎬 Upload video"}
              </button>
            </>
          )}
        </div>
        </>)}
        <div>
          <div style={lbl}>Tags (comma separated)</div>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ai, prompting, design" style={input} />
        </div>
        {mode === "post" && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E8EDF5", cursor: "pointer" }}>
            <input type="checkbox" checked={isQuestion} onChange={(e) => setIsQuestion(e.target.checked)} />
            Mark as a question (community can mark a best answer)
          </label>
        )}
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

/* ─── Award picker — responsive: bottom sheet on mobile, popover on desktop ─── */
function AwardPicker({ post, onPick, onClose }: {
  post: FeedPost;
  onPick: (k: "bronze" | "silver" | "gold" | "diamond") => void;
  onClose: () => void;
}) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 680;
  const items: Array<"bronze" | "silver" | "gold" | "diamond"> = ["bronze", "silver", "gold", "diamond"];
  if (isMobile) {
    return (
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          width: "100%", maxWidth: 480, background: "#111827",
          borderTop: "1px solid rgba(255,193,7,0.2)",
          borderRadius: "18px 18px 0 0",
          padding: "18px 16px calc(18px + env(safe-area-inset-bottom))",
        }}>
          <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 999, margin: "-6px auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", textAlign: "center", marginBottom: 4 }}>🏆 Give an award</div>
          <div style={{ fontSize: 11, color: "#8892A4", textAlign: "center", marginBottom: 14 }}>
            Reward this post with reputation. The author receives half.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {items.map((k) => (
              <button key={k} onClick={() => onPick(k)}
                style={{ padding: "14px 6px", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 28 }}>{AWARD_EMOJI[k]}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#E8EDF5", textTransform: "capitalize" }}>{k}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#FFC107" }}>{AWARD_COSTS[k]} rep</span>
              </button>
            ))}
          </div>
          <button onClick={onClose}
            style={{ width: "100%", marginTop: 14, padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#8892A4", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
      <div style={{ position: "absolute", bottom: 32, left: 0, zIndex: 10, display: "flex", gap: 4, padding: 6, background: "#1A2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, boxShadow: "0 10px 24px rgba(0,0,0,0.5)" }}>
        {items.map((k) => (
          <button key={k} onClick={() => onPick(k)} title={`${k} award — ${AWARD_COSTS[k]} rep`}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 52, padding: "8px 4px", background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", color: "#E8EDF5" }}>
            <span style={{ fontSize: 20 }}>{AWARD_EMOJI[k]}</span>
            <span style={{ fontSize: 9, color: "#FFC107", fontWeight: 800 }}>{AWARD_COSTS[k]}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ─── Flair helper ─── */
function flairFor(post: FeedPost): { label: string; bg: string; fg: string } | null {
  if (post.is_question) return { label: "QUESTION", bg: "rgba(255,112,67,0.12)", fg: "#FF7043" };
  switch (post.type) {
    case "announcement": return { label: "ANNOUNCEMENT", bg: "rgba(255,193,7,0.12)", fg: "#FFC107" };
    case "resource": return { label: "RESOURCE", bg: "rgba(102,187,106,0.12)", fg: "#66BB6A" };
    case "poll": return { label: "POLL", bg: "rgba(186,104,200,0.12)", fg: "#BA68C8" };
    default: return null;
  }
}

/* ─── Discover drawer ─── */
function DiscoverDrawer({ groups, onClose, onToggle, onOpen, onCreate }: {
  groups: CommunityRow[];
  onClose: () => void;
  onToggle: (g: CommunityRow) => void | Promise<void>;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "joined" | "unjoined">("all");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (mode === "joined" && !g.joined) return false;
      if (mode === "unjoined" && g.joined) return false;
      if (!query) return true;
      return g.name.toLowerCase().includes(query) || (g.description || "").toLowerCase().includes(query) || (g.tags || []).some((t) => t.toLowerCase().includes(query));
    });
  }, [groups, q, mode]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 100%)", height: "100%", background: "#0A0E1A", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#E8EDF5", flex: 1 }}>🧭 Discover groups</div>
          <button onClick={onCreate} style={{ ...btnPrimary, padding: "6px 12px" }}>+ Create</button>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#E8EDF5", width: 30, height: 30, borderRadius: 8, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups…"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 999, padding: "9px 14px", color: "#E8EDF5", fontSize: 12, outline: "none" }} />
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "joined", "unjoined"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ ...chip, ...(mode === m ? chipActive : {}) }}>
                {m === "all" ? "All" : m === "joined" ? "Joined" : "Not joined"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 12, color: "#8892A4", padding: 16, textAlign: "center" }}>No groups match.</p>
          ) : (
            filtered.map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 10px", borderRadius: 10, background: "#111827", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => onOpen(g.id)} style={{ background: "none", border: "none", color: "#E8EDF5", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, textAlign: "left" }}>
                    {g.is_private ? "🔒 " : "# "}r/{g.name}
                  </button>
                  {g.description && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{g.description}</div>}
                  <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4 }}>{g.member_count} member{g.member_count === 1 ? "" : "s"}</div>
                </div>
                <button onClick={() => onToggle(g)} style={{ ...(g.joined ? btnGhost : btnPrimary), padding: "6px 14px", fontSize: 11, flexShrink: 0 }}>
                  {g.joined ? "Leave" : "+ Join"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Poll block (embedded inside post card) ─── */
function PollBlock({ postId }: { postId: string }) {
  const [poll, setPoll] = useState<PollView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getPollForPost(postId);
      if (!cancelled && r.ok) { setPoll(r.data || null); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [postId]);

  async function vote(optId: string) {
    if (!poll || poll.closed) return;
    const r = await votePoll(poll.id, optId);
    if (!r.ok) { toast.error(r.error); return; }
    setPoll(r.data!);
  }

  if (loading) return <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 8 }}>Loading poll…</div>;
  if (!poll) return null;
  const total = poll.total_votes || 0;
  const expiresLabel = poll.closes_at
    ? (poll.closed ? "Closed" : `Closes ${new Date(poll.closes_at).toLocaleString()}`)
    : null;

  return (
    <div style={{ border: "1px solid rgba(171,71,188,0.2)", background: "rgba(171,71,188,0.05)", borderRadius: 10, padding: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#BA68C8", textTransform: "uppercase", letterSpacing: 0.5 }}>📊 Poll</span>
        <span style={{ fontSize: 11, color: "#E8EDF5", flex: 1 }}>{poll.question}</span>
        {expiresLabel && <span style={{ fontSize: 9, color: poll.closed ? "#EF5350" : "#8892A4" }}>{expiresLabel}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {poll.options.map((o) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const mine = poll.my_votes.includes(o.id);
          return (
            <button key={o.id} onClick={() => vote(o.id)} disabled={poll.closed}
              style={{ position: "relative", width: "100%", background: "#0A0E1A", border: `1px solid ${mine ? "rgba(171,71,188,0.6)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "8px 10px", color: "#E8EDF5", fontSize: 12, textAlign: "left", cursor: poll.closed ? "not-allowed" : "pointer", overflow: "hidden", fontWeight: 600 }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(171,71,188,${mine ? 0.25 : 0.14}) ${pct}%, transparent ${pct}%)`, pointerEvents: "none" }} />
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1 }}>{mine && "✓ "}{o.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#BA68C8" }}>{pct}%</span>
                <span style={{ fontSize: 9, color: "#8892A4" }}>{o.votes}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#8892A4", marginTop: 6 }}>
        {total} vote{total === 1 ? "" : "s"}{poll.multi_choice && " · multi-choice"}
      </div>
    </div>
  );
}

/* ─── Crosspost modal ─── */
function CrosspostModal({ post, groups, onClose, onDone }: {
  post: FeedPost;
  groups: CommunityRow[];
  onClose: () => void;
  onDone: (newId: string) => void;
}) {
  const [target, setTarget] = useState<string>(groups[0]?.id || "");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!target) { toast.error("Pick a group"); return; }
    setBusy(true);
    const r = await crosspost(post.id, target);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    onDone(r.data!.id);
  }
  return (
    <Modal title={`Crosspost "${post.title.slice(0, 40)}${post.title.length > 40 ? "…" : ""}"`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#8892A4" }}>Pick a group to share this post into. Original credit is kept.</div>
        <div>
          <div style={lbl}>Target group</div>
          <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ ...input, cursor: "pointer" }}>
            {groups.length === 0 ? <option>No other groups</option> : groups.map((g) => (
              <option key={g.id} value={g.id}>r/{g.name}{g.joined ? "" : " (you'll be joined)"}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy || groups.length === 0} style={btnPrimary}>{busy ? "Posting…" : "Crosspost"}</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
        padding: 24, maxWidth: 560, width: "100%",
        // On mobile we also have a ~64px bottom nav eating space; reserve for it.
        maxHeight: "min(92vh, calc(100dvh - 88px - env(safe-area-inset-bottom)))",
        overflowY: "auto",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, position: "sticky", top: -24, background: "#111827", paddingTop: 0, paddingBottom: 6, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4, zIndex: 2 }}>
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
const adminBtn: React.CSSProperties = { border: "1px solid", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "left" };
const voteBtn: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", lineHeight: 1 };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit" };
