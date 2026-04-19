"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";
import { createStory, toggleStoryReaction, markStoryViewed, deleteStory, type Story } from "@/app/actions/stories";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
};

const BG_OPTIONS = ["#1E88E5", "#EC4899", "#6B3FD4", "#F59E0B", "#10B981", "#EF5350", "#26C6DA"];
const REACTIONS: { key: "fire" | "love" | "eyes" | "idea"; emoji: string }[] = [
  { key: "fire", emoji: "🔥" },
  { key: "love", emoji: "❤️" },
  { key: "eyes", emoji: "👀" },
  { key: "idea", emoji: "💡" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / (1000 * 60 * 60));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  initialStories: Story[];
}

export default function StoriesClient({ initialStories }: Props) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [pending, startTransition] = useTransition();

  function openStory(i: number) {
    setViewerIdx(i);
    const s = stories[i];
    if (!s.viewed_by_me) {
      markStoryViewed(s.id).catch(() => {});
      setStories((prev) => prev.map((x, idx) => idx === i ? { ...x, viewed_by_me: true, view_count: x.view_count + 1 } : x));
    }
  }

  function closeViewer() { setViewerIdx(null); }

  function handleReaction(storyId: string, reaction: "fire" | "love" | "eyes" | "idea") {
    startTransition(async () => {
      await toggleStoryReaction(storyId, reaction);
      setStories((prev) => prev.map((s) => {
        if (s.id !== storyId) return s;
        const has = s.my_reactions.includes(reaction);
        const newCount = (s.reactions[reaction] ?? 0) + (has ? -1 : 1);
        return {
          ...s,
          reactions: { ...s.reactions, [reaction]: Math.max(0, newCount) },
          my_reactions: has ? s.my_reactions.filter((r) => r !== reaction) : [...s.my_reactions, reaction],
        };
      }));
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this story?")) return;
    startTransition(async () => {
      const res = await deleteStory(id);
      if (res.ok) {
        setStories((prev) => prev.filter((s) => s.id !== id));
        closeViewer();
        router.refresh();
      }
    });
  }

  const active = stories.filter((s) => new Date(s.expires_at) > new Date());
  const currentStory = viewerIdx !== null ? active[viewerIdx] : null;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        .stories-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        @media (max-width: 760px) { .stories-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 460px) { .stories-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#EC4899", marginBottom: 10, textTransform: "uppercase" }}>
            📱 Stories
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>What&apos;s happening right now.</h1>
          <p style={{ margin: "4px 0 0", color: C.dim, fontSize: 13 }}>
            Short updates that expire in 48 hours. Share a win, a breakthrough, or a question.
          </p>
        </div>
        <button onClick={() => setShowComposer(true)} style={{ padding: "10px 18px", background: "#EC4899", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          + Post a Story
        </button>
      </div>

      {showComposer && <StoryComposer onClose={() => setShowComposer(false)} onPosted={(s) => { setStories((prev) => [s, ...prev]); setShowComposer(false); router.refresh(); }} />}

      {active.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          No stories yet. Be the first to post.
        </div>
      ) : (
        <div className="stories-grid">
          {active.map((s, i) => (
            <button
              key={s.id}
              onClick={() => openStory(i)}
              style={{
                aspectRatio: "9/14",
                borderRadius: 14,
                border: s.viewed_by_me ? `1px solid ${C.border}` : "2px solid #EC4899",
                background: s.media_url ? `url(${s.thumbnail_url || s.media_url}) center/cover` : `linear-gradient(135deg, ${s.background_color}, ${s.background_color}dd)`,
                cursor: "pointer",
                position: "relative",
                padding: 0,
                overflow: "hidden",
                textAlign: "left",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 40%)" }} />
              {s.kind === "video" && (
                <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", borderRadius: 999, padding: "2px 8px", fontSize: 10, color: "#fff", fontWeight: 700 }}>▶ VIDEO</div>
              )}
              {s.featured && (
                <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,193,7,0.95)", borderRadius: 999, padding: "2px 8px", fontSize: 9, color: "#000", fontWeight: 800 }}>⭐ FEATURED</div>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px", color: "#fff" }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.9 }}>@{s.author_name.split(" ")[0].toLowerCase()}</div>
                {s.caption && <div style={{ fontSize: 12, lineHeight: 1.3, maxHeight: 36, overflow: "hidden", textOverflow: "ellipsis" }}>{s.caption.slice(0, 60)}{s.caption.length > 60 ? "…" : ""}</div>}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{timeAgo(s.created_at)} · 👁 {s.view_count}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Story viewer */}
      {currentStory && viewerIdx !== null && (
        <div
          onClick={closeViewer}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: 420, width: "100%", aspectRatio: "9/16", background: currentStory.media_url ? "#000" : currentStory.background_color, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            {/* Top bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 16px", zIndex: 3, background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {currentStory.author_avatar ? (
                  <img src={currentStory.author_avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>
                    {currentStory.author_name[0]}
                  </div>
                )}
                <div style={{ flex: 1, color: "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{currentStory.author_name}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>{timeAgo(currentStory.created_at)}</div>
                </div>
                <button onClick={() => handleDelete(currentStory.id)} style={{ background: "transparent", color: "rgba(255,255,255,0.6)", border: "none", fontSize: 18, cursor: "pointer" }}>⋯</button>
                <button onClick={closeViewer} style={{ background: "transparent", color: "#fff", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
              {currentStory.kind === "text" && (
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, lineHeight: 1.4 }}>
                  {currentStory.caption}
                </div>
              )}
              {currentStory.kind === "photo" && currentStory.media_url && (
                <img src={currentStory.media_url} alt="" style={{ width: "100%", maxHeight: "100%", objectFit: "contain" }} />
              )}
              {currentStory.kind === "video" && currentStory.media_url && (
                <video src={currentStory.media_url} controls autoPlay style={{ width: "100%", maxHeight: "100%" }} />
              )}
            </div>

            {/* Caption overlay for media */}
            {(currentStory.kind === "photo" || currentStory.kind === "video") && currentStory.caption && (
              <div style={{ position: "absolute", bottom: 80, left: 16, right: 16, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13 }}>
                {currentStory.caption}
              </div>
            )}

            {/* Reactions bar */}
            <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.7)", display: "flex", gap: 8, justifyContent: "space-around" }}>
              {REACTIONS.map((r) => {
                const has = currentStory.my_reactions.includes(r.key);
                const count = currentStory.reactions[r.key] ?? 0;
                return (
                  <button
                    key={r.key}
                    onClick={() => handleReaction(currentStory.id, r.key)}
                    disabled={pending}
                    style={{ flex: 1, padding: "8px 4px", background: has ? "rgba(255,255,255,0.2)" : "transparent", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 20 }}
                  >
                    {r.emoji} {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoryComposer({ onClose, onPosted }: { onClose: () => void; onPosted: (s: Story) => void }) {
  const [kind, setKind] = useState<"text" | "photo" | "video">("text");
  const [caption, setCaption] = useState("");
  const [bgColor, setBgColor] = useState(BG_OPTIONS[0]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setErr(null);
    try {
      const isVideo = f.type.startsWith("video/");
      const upload = isVideo
        ? await uploadToCloudinary(f, { folder: "stories", resourceType: "video" })
        : await uploadToCloudinary(await compressImage(f, { maxDim: 1280 }), { folder: "stories", resourceType: "image" });
      setMediaUrl(upload.secureUrl);
      setKind(isVideo ? "video" : "photo");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setErr(null);
    if (kind === "text" && !caption.trim()) { setErr("Add some text"); return; }
    if (kind !== "text" && !mediaUrl) { setErr("Upload media first"); return; }
    startTransition(async () => {
      const res = await createStory({ kind, caption, media_url: mediaUrl ?? undefined, background_color: bgColor });
      if (!res.ok) { setErr(res.error); return; }
      if (res.data) onPosted(res.data);
    });
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, maxWidth: 440, width: "100%" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 700 }}>New Story</h2>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {(["text", "photo", "video"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              style={{ flex: 1, padding: "8px 10px", background: kind === k ? "#EC4899" : "transparent", color: kind === k ? "#fff" : C.dim, border: `1px solid ${kind === k ? "#EC4899" : C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}
            >
              {k}
            </button>
          ))}
        </div>

        {kind === "text" && (
          <>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share a win, a lesson, a question…"
              rows={5}
              style={{ width: "100%", padding: 12, background: bgColor, color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, resize: "none", boxSizing: "border-box", textAlign: "center" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {BG_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  aria-label={`Color ${c}`}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: bgColor === c ? "2px solid #fff" : "2px solid rgba(255,255,255,0.15)", background: c, cursor: "pointer" }}
                />
              ))}
            </div>
          </>
        )}

        {kind !== "text" && (
          <>
            {mediaUrl ? (
              kind === "photo" ? (
                <img src={mediaUrl} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 10 }} />
              ) : (
                <video src={mediaUrl} controls style={{ width: "100%", maxHeight: 300, borderRadius: 10 }} />
              )
            ) : (
              <div style={{ padding: 30, border: `2px dashed ${C.border}`, borderRadius: 10, textAlign: "center" }}>
                <input
                  type="file"
                  accept={kind === "photo" ? "image/*" : "video/*"}
                  onChange={onFile}
                  disabled={uploading}
                  style={{ color: C.text, fontSize: 13 }}
                />
                {uploading && <div style={{ color: "#FFC107", fontSize: 12, marginTop: 8 }}>Uploading…</div>}
              </div>
            )}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)…"
              rows={2}
              style={{ width: "100%", padding: 10, marginTop: 10, background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, resize: "none", boxSizing: "border-box" }}
            />
          </>
        )}

        {err && <div style={{ color: "#EF5350", fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 14px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={pending || uploading} style={{ flex: 2, padding: "10px 14px", background: "#EC4899", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {pending ? "Posting…" : "Post Story"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 10, textAlign: "center" }}>Stories expire after 48 hours.</div>
      </div>
    </div>
  );
}
