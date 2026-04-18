"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { LibraryItem } from "@/app/actions/library";
import { updateLibraryItem, deleteLibraryItem } from "@/app/actions/library";

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  published: { color: "#66BB6A", bg: "rgba(102,187,106,0.12)" },
  draft:     { color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  archived:  { color: "#5A6478", bg: "rgba(90,100,120,0.12)" },
};

interface Props { items: LibraryItem[]; userRole: string }

export function LibraryAdminClient({ items, userRole }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const isAdmin = ["admin", "super_admin"].includes(userRole);

  const filtered = items.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggleStatus(item: LibraryItem) {
    const newStatus = item.status === "published" ? "draft" : "published";
    start(async () => {
      const res = await updateLibraryItem(item.id, { status: newStatus });
      if (res.ok) toast.success(`Marked as ${newStatus}`);
      else toast.error(res.error);
    });
  }

  function toggleFeatured(item: LibraryItem) {
    start(async () => {
      const res = await updateLibraryItem(item.id, { featured: !item.featured });
      if (res.ok) toast.success(item.featured ? "Removed from featured" : "Added to featured");
      else toast.error(res.error);
    });
  }

  function handleDelete(item: LibraryItem) {
    if (!confirm(`Archive "${item.title}"?`)) return;
    start(async () => {
      const res = await deleteLibraryItem(item.id);
      if (res.ok) { toast.success("Archived."); router.refresh(); }
      else toast.error(res.error);
    });
  }

  const statsRow = [
    { label: "Total",     value: items.length,                                           color: "#1E88E5" },
    { label: "Published", value: items.filter((i) => i.status === "published").length,   color: "#66BB6A" },
    { label: "Draft",     value: items.filter((i) => i.status === "draft").length,       color: "#FFC107" },
    { label: "Featured",  value: items.filter((i) => i.featured).length,                 color: "#AB47BC" },
    { label: "Free",      value: items.filter((i) => i.access_type === "free").length,   color: "#66BB6A" },
    { label: "Paid",      value: items.filter((i) => i.access_type === "paid").length,   color: "#FFC107" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>📚 Library Admin</h1>
          <p style={{ fontSize: 13, color: "#5A6478", margin: "4px 0 0" }}>Manage all uploaded resources</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/library")} style={{ padding: "9px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8EDF5", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
            View Library
          </button>
          <button onClick={() => router.push("/library/upload")} style={{ padding: "9px 18px", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            + Upload
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 22 }}>
        {statsRow.map((s) => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#5A6478", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#5A6478" }}>🔍</span>
        <input
          style={{ width: "100%", padding: "11px 14px 11px 40px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8EDF5", fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" }}
          placeholder="Search resources…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5A6478", fontSize: 14 }}>No resources found</div>
        ) : (
          filtered.map((item, idx) => {
            const sc = STATUS_CFG[item.status] ?? STATUS_CFG.draft;
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: idx < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg,#1a2035,#0d1117)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, overflow: "hidden" }}>
                  {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} /> : "📚"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>
                    {item.category_icon} {item.category_name} · {item.resource_type} · {item.access_type === "free" ? "Free" : `₦${Number(item.price).toLocaleString()}`} · {item.view_count} views
                  </div>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                  {item.status}
                </span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => router.push(`/library/${item.id}`)} style={{ padding: "6px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#E8EDF5", fontSize: 11, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }} title="View">👁️</button>
                  <button onClick={() => toggleFeatured(item)} disabled={pending} style={{ padding: "6px 10px", background: item.featured ? "rgba(255,193,7,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${item.featured ? "rgba(255,193,7,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 7, color: item.featured ? "#FFC107" : "#5A6478", fontSize: 11, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }} title={item.featured ? "Unfeature" : "Feature"}>⭐</button>
                  <button onClick={() => toggleStatus(item)} disabled={pending} style={{ padding: "6px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: item.status === "published" ? "#FFC107" : "#66BB6A", fontSize: 11, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                    {item.status === "published" ? "Draft" : "Publish"}
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(item)} disabled={pending} style={{ padding: "6px 10px", background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.2)", borderRadius: 7, color: "#EF5350", fontSize: 11, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                      Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`@media (max-width: 640px) { div[style*="grid-template-columns: repeat(6"] { grid-template-columns: repeat(3,1fr) !important; } }`}</style>
    </div>
  );
}
