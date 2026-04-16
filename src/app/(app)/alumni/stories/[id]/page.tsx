import { supabaseAdmin } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlumniStoryPage({ params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  const { data } = await sb.from("alumni_stories")
    .select("*, author:users!alumni_stories_user_id_fkey(id, name, avatar_url, xp, performance, graduated_at)")
    .eq("id", params.id).eq("status", "approved").maybeSingle();

  if (!data) notFound();

  type Row = typeof data & { author?: { id: string; name: string | null; avatar_url: string | null; xp: number; performance: number; graduated_at: string | null } | null };
  const story = data as Row;
  const author = Array.isArray(story.author) ? story.author[0] : story.author;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif", padding: "0 0 40px" }}>
      {story.cover_image && (
        <img src={story.cover_image} alt="" style={{ width: "100%", height: 280, objectFit: "cover", borderRadius: 16, marginBottom: 24, display: "block" }} />
      )}

      <Link href="/alumni" style={{ fontSize: 12, color: "#8892A4", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>← Back to Alumni Hub</Link>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "0 0 16px", lineHeight: 1.3 }}>{story.title}</h1>

      {/* Author card */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "#111827", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 12, marginBottom: 24 }}>
        {author?.avatar_url
          ? <img src={author.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
          : <span style={{ width: 52, height: 52, borderRadius: "50%", background: "#FFC107", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#0A0E1A" }}>{(author?.name || "?").charAt(0)}</span>
        }
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>{author?.name || "Alumni"}</div>
          {(story.role || story.company) && (
            <div style={{ fontSize: 12, color: "#FFC107", marginTop: 2 }}>{[story.role, story.company].filter(Boolean).join(" @ ")}</div>
          )}
          {author?.graduated_at && (
            <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>Graduated {new Date(author.graduated_at).toLocaleDateString("en", { month: "long", year: "numeric" })}</div>
          )}
        </div>
        {author?.id && (
          <Link href={`/profile/${author.id}`} style={{ fontSize: 12, color: "#1E88E5", fontWeight: 700, textDecoration: "none" }}>View profile →</Link>
        )}
      </div>

      {/* Story body */}
      <div style={{ fontSize: 15, color: "#C8D0DC", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{story.body}</div>

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#5A6478" }}>
        Published {new Date(story.created_at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}
