import Link from "next/link";
import { listFeedPosts } from "@/lib/db";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function BookmarksPage() {
  const posts = await listFeedPosts("bookmarks");

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/community" style={{ fontSize: 12, color: "#8892A4", textDecoration: "none" }}>← Community</Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "6px 0" }}>🔖 My bookmarks</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>{posts.length} saved post{posts.length === 1 ? "" : "s"}</p>
      </div>

      {posts.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔖</div>
          <p style={{ fontSize: 14, color: "#8892A4", margin: "0 0 16px 0" }}>Nothing saved yet. Use the 🔖 Save button on any post.</p>
          <Link href="/community" style={{ background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Browse posts</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.map((p) => (
            <Link key={p.id} href={`/community/post/${p.id}`} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>{p.community_name && `#${p.community_name} · `}{timeAgo(p.created_at)}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", margin: "0 0 6px 0" }}>{p.title}</h3>
              {p.content && <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</p>}
              <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#5A6478", marginTop: 6 }}>
                <span>by {p.author_name}</span>
                <span>·</span>
                <span>{p.score > 0 ? "▲" : "▼"} {p.score}</span>
                <span>·</span>
                <span>💬 {p.comment_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
