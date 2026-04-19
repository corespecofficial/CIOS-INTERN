import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { getArticleBySlug } from "@/app/actions/articles";
import ArticleReactionBar from "./reaction-bar";

export const dynamic = "force-dynamic";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getArticleBySlug(slug);
  if (!res.ok || !res.data) notFound();
  const a = res.data;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Link href="/articles" style={{ color: C.dim, fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
        ← All articles
      </Link>

      {a.cover_url && (
        <img src={a.cover_url} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 14, marginBottom: 20 }} />
      )}

      <h1 style={{ margin: "0 0 10px", fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15 }}>
        {a.title}
      </h1>
      {a.subtitle && <p style={{ margin: "0 0 20px", color: C.dim, fontSize: 18, lineHeight: 1.5 }}>{a.subtitle}</p>}

      {/* Author row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {a.author_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.author_avatar} alt="" style={{ width: 44, height: 44, borderRadius: "50%" }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1E88E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
            {a.author_name[0]}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{a.author_name}</div>
          <div style={{ fontSize: 12, color: C.dim }}>
            {a.published_at ? new Date(a.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Draft"} · ⏱ {a.reading_min} min read
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ fontSize: 17, lineHeight: 1.8, color: C.text, fontFamily: "Georgia, 'Times New Roman', serif", whiteSpace: "pre-wrap" }}>
        {a.body}
      </div>

      {/* Tags */}
      {a.tags.length > 0 && (
        <div style={{ marginTop: 28, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {a.tags.map((t) => (
            <span key={t} style={{ padding: "5px 12px", background: "rgba(102,187,106,0.12)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Reactions */}
      <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        <ArticleReactionBar articleId={a.id} initialReacted={!!a.reacted_by_me} initialCount={a.reaction_count} />
      </div>
    </div>
  );
}
