"use client";

import { useRouter } from "next/navigation";
import type { LibraryItem } from "@/app/actions/library";

export function MyPurchasesClient({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  const RESOURCE_ICONS: Record<string, string> = { video: "🎬", document: "📄", audio: "🎧", link: "🔗", image_gallery: "🖼️", course_notes: "📝" };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <button onClick={() => router.push("/library")} style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 20, fontFamily: "'Nunito', sans-serif" }}>
        ← Back to Library
      </button>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>🛒 My Purchases</h1>
        <p style={{ fontSize: 13, color: "#5A6478", margin: "4px 0 0" }}>{items.length} owned resource{items.length !== 1 ? "s" : ""}</p>
      </div>

      {items.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 20, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛍️</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#E8EDF5" }}>No purchases yet</div>
          <div style={{ fontSize: 13, color: "#5A6478", marginTop: 4, marginBottom: 20 }}>Unlock premium resources to see them here</div>
          <button onClick={() => router.push("/library")} style={{ padding: "12px 24px", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            Browse Library
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} onClick={() => router.push(`/library/${item.id}`)} style={{ background: "#111827", border: "1px solid rgba(102,187,106,0.15)", borderRadius: 14, padding: "14px 18px", cursor: "pointer", display: "flex", gap: 14, alignItems: "center", transition: "border-color 0.2s" }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(135deg,#1a2035,#0d1117)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, overflow: "hidden" }}>
                {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} /> : RESOURCE_ICONS[item.resource_type] ?? "📚"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#E8EDF5" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>by {item.uploader_name} · {item.category_icon} {item.category_name}</div>
              </div>
              <span style={{ padding: "4px 10px", background: "rgba(102,187,106,0.12)", color: "#66BB6A", borderRadius: 8, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓ Owned</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
