"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";
import { createArticle, type Article } from "@/app/actions/articles";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#66BB6A",
};

interface Props {
  initialArticles: Article[];
}

export default function ArticlesClient({ initialArticles }: Props) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [showComposer, setShowComposer] = useState(false);

  const featured = articles.find((a) => a.featured);
  const rest = articles.filter((a) => a !== featured);

  function handleCreated(a: Article) {
    setArticles((prev) => [a, ...prev]);
    setShowComposer(false);
    router.refresh();
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px 60px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(102,187,106,0.12)", border: "1px solid rgba(102,187,106,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>
            📰 Articles
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Learnings from the cohort.</h1>
          <p style={{ margin: "4px 0 0", color: C.dim, fontSize: 13 }}>
            Deep-dive articles on what interns are building, learning, and shipping.
          </p>
        </div>
        <button onClick={() => setShowComposer(true)} style={{ padding: "10px 18px", background: C.accent, color: "#000", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          ✏️ Write an article
        </button>
      </div>

      {showComposer && <ArticleComposer onClose={() => setShowComposer(false)} onPosted={handleCreated} />}

      {featured && <FeaturedCard article={featured} />}

      {rest.length === 0 && !featured ? (
        <div style={{ padding: 60, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
          No articles yet. Write the first one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rest.map((a) => <ArticleRow key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}

function FeaturedCard({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`} style={{ textDecoration: "none", color: C.text }}>
      <div style={{ background: `linear-gradient(135deg, ${C.accent}22, ${C.card})`, border: `1px solid ${C.accent}33`, borderRadius: 16, padding: 24, marginBottom: 20, display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        {article.cover_url && (
          <img src={article.cover_url} alt="" style={{ width: 200, height: 140, objectFit: "cover", borderRadius: 10 }} />
        )}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 10, color: "#FFC107", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
            ⭐ Featured
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.25 }}>{article.title}</h2>
          {article.subtitle && <p style={{ margin: 0, color: C.dim, fontSize: 14, lineHeight: 1.5 }}>{article.subtitle}</p>}
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: C.dim, flexWrap: "wrap" }}>
            <span>{article.author_name}</span>
            <span>·</span>
            <span>⏱ {article.reading_min} min read</span>
            <span>·</span>
            <span>🔥 {article.reaction_count}</span>
            <span>·</span>
            <span>👁 {article.view_count}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleRow({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`} style={{ textDecoration: "none", color: C.text }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: "flex", gap: 16, alignItems: "flex-start" }}>
        {article.cover_url ? (
          <img src={article.cover_url} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 120, height: 80, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}22, ${C.card})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>📄</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.3, marginBottom: 4 }}>{article.title}</div>
          {article.subtitle && <p style={{ margin: "0 0 8px", color: C.dim, fontSize: 13, lineHeight: 1.5 }}>{article.subtitle}</p>}
          <div style={{ fontSize: 11, color: C.dim, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>{article.author_name}</span>
            <span>·</span>
            <span>⏱ {article.reading_min}m</span>
            <span>·</span>
            <span>🔥 {article.reaction_count}</span>
            {article.tags.length > 0 && (
              <>
                <span>·</span>
                {article.tags.slice(0, 3).map((t) => (
                  <span key={t} style={{ padding: "2px 8px", background: `${C.accent}15`, color: C.accent, borderRadius: 999, fontWeight: 600, fontSize: 10 }}>
                    #{t}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleComposer({ onClose, onPosted }: { onClose: () => void; onPosted: (a: Article) => void }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const compressed = await compressImage(f, { maxDim: 1400 });
      const up = await uploadToCloudinary(compressed, { folder: "articles/covers", resourceType: "image" });
      setCoverUrl(up.secureUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function submit(status: "draft" | "published") {
    setErr(null);
    if (!title.trim() || !body.trim()) { setErr("Title and body required"); return; }
    startTransition(async () => {
      const res = await createArticle({
        title,
        subtitle: subtitle || undefined,
        body,
        cover_url: coverUrl || undefined,
        tags: tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status,
      });
      if (!res.ok) { setErr(res.error); return; }
      if (res.data) onPosted(res.data);
    });
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800 }}>✏️ New article</h2>

        <label style={lbl}>Cover image (optional)</label>
        <input type="file" accept="image/*" onChange={onCoverFile} disabled={uploading} style={{ color: C.text, fontSize: 13, marginBottom: 8 }} />
        {coverUrl && <img src={coverUrl} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />}

        <label style={lbl}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your headline…" style={{ ...inp, fontSize: 16, fontWeight: 700 }} />

        <label style={lbl}>Subtitle (optional)</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="One-sentence hook" style={inp} />

        <label style={lbl}>Body (supports line breaks; no Markdown rendered yet)</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} placeholder="Write your story. Structure with paragraphs. Every ~220 words = 1 min read." style={{ ...inp, resize: "vertical", minHeight: 260, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, lineHeight: 1.6 }} />

        <label style={lbl}>Tags (comma-separated, optional)</label>
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="design, career, week-5" style={inp} />

        {err && <div style={{ color: "#EF5350", fontSize: 12, margin: "10px 0" }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ padding: "11px 16px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => submit("draft")} style={{ padding: "11px 16px", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }} disabled={pending}>
            Save draft
          </button>
          <button onClick={() => submit("published")} style={{ flex: 1, padding: "11px 16px", background: C.accent, color: "#000", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer" }} disabled={pending || uploading}>
            {pending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 14,
  marginBottom: 14,
  outline: "none",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: C.dim,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};
