"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PeerPost { id: string; title: string; score: number; comment_count: number; community_name: string | null; tags: string[] }

/**
 * Surfaces the top 3 community threads matching the given tags or the
 * text of the page's task/lesson. Helps a stuck intern find the answer
 * or discussion without leaving the context they're in.
 */
export function PeerAnswers({ tags, query }: { tags?: string[]; query?: string }) {
  const [posts, setPosts] = useState<PeerPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams();
        if (tags?.length) qs.set("tags", tags.join(","));
        if (query) qs.set("q", query);
        const r = await fetch(`/api/community/peer-answers?${qs.toString()}`);
        if (!r.ok) { if (!cancelled) setLoading(false); return; }
        const data = await r.json();
        if (!cancelled) { setPosts(data.posts || []); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tags, query]);

  if (loading) return null;
  if (posts.length === 0) return null;

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 14, padding: 14, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "#1E88E5", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>💭 Peer answers</span>
        <span style={{ fontSize: 11, color: "#8892A4" }}>What other interns asked about this</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {posts.map((p) => (
          <Link key={p.id} href={`/community/post/${p.id}`} style={{
            display: "block", padding: "10px 12px", background: "#0A0E1A",
            border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, textDecoration: "none",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.title}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 10, color: "#8892A4" }}>
              <span>▲ {p.score}</span>
              <span>💬 {p.comment_count}</span>
              {p.community_name && <span># {p.community_name}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
