"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { uploadLibraryItem } from "@/app/actions/library";
import type { LibraryCategory } from "@/app/actions/library";

interface Props { categories: LibraryCategory[] }

export function LibraryUploadClient({ categories }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [form, setForm] = useState({
    title: "", description: "", category_slug: categories[0]?.slug ?? "",
    resource_type: "document", access_type: "free",
    price: 0, currency: "NGN",
    file_url: "", external_link: "", thumbnail_url: "", preview_url: "",
    duration_minutes: 0, download_allowed: true, featured: false,
    drip_release_at: "", tags: "",
  });

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.category_slug) { toast.error("Category is required."); return; }
    if (!form.file_url && !form.external_link) { toast.error("Either a file URL or external link is required."); return; }

    start(async () => {
      const res = await uploadLibraryItem({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category_slug: form.category_slug,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        resource_type: form.resource_type,
        access_type: form.access_type,
        price: form.access_type === "free" ? 0 : Number(form.price),
        currency: form.currency,
        allowed_roles: [],
        file_url: form.file_url || undefined,
        external_link: form.external_link || undefined,
        thumbnail_url: form.thumbnail_url || undefined,
        preview_url: form.preview_url || undefined,
        duration_minutes: form.duration_minutes > 0 ? form.duration_minutes : undefined,
        download_allowed: form.download_allowed,
        featured: form.featured,
        drip_release_at: form.drip_release_at || undefined,
      });

      if (res.ok) {
        toast.success("Resource uploaded!");
        router.push(`/library/${res.data.id}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#8892A4", display: "block", marginBottom: 6 } as const;
  const inputStyle = { width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8EDF5", fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        .lu-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 520px) { .lu-grid2 { grid-template-columns: 1fr; gap: 0; } }
      `}</style>
      <button onClick={() => router.push("/library")} style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 20, fontFamily: "'Nunito', sans-serif" }}>
        ← Back to Library
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>📤 Upload Resource</h1>
        <p style={{ fontSize: 13, color: "#5A6478", margin: "4px 0 0" }}>Add a new resource to the library</p>
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Complete Guide to Meta Ads" />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What will users learn from this resource?" />
        </div>

        {/* Category + Type row */}
        <div className="lu-grid2">
          <div>
            <label style={labelStyle}>Category *</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.category_slug} onChange={(e) => set("category_slug", e.target.value)}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Resource Type *</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.resource_type} onChange={(e) => set("resource_type", e.target.value)}>
              <option value="video">🎬 Video</option>
              <option value="document">📄 Document</option>
              <option value="audio">🎧 Audio</option>
              <option value="link">🔗 External Link</option>
              <option value="course_notes">📝 Course Notes</option>
              <option value="image_gallery">🖼️ Image Gallery</option>
            </select>
          </div>
        </div>

        {/* Access + Price */}
        <div className="lu-grid2">
          <div>
            <label style={labelStyle}>Access Type</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.access_type} onChange={(e) => set("access_type", e.target.value)}>
              <option value="free">🆓 Free</option>
              <option value="paid">💰 Paid (one-time)</option>
              <option value="subscription">⭐ Subscription only</option>
              <option value="role_restricted">🔒 Role-restricted</option>
              <option value="reward_unlocked">🏆 Earn &amp; Unlock</option>
            </select>
          </div>
          {form.access_type === "paid" && (
            <div>
              <label style={labelStyle}>Price (NGN)</label>
              <input type="number" style={inputStyle} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 2500" min={0} />
            </div>
          )}
        </div>

        {/* File URL + External link */}
        <div>
          <label style={labelStyle}>File URL (Cloudinary / Storage)</label>
          <input style={inputStyle} value={form.file_url} onChange={(e) => set("file_url", e.target.value)} placeholder="https://res.cloudinary.com/…" />
        </div>
        <div>
          <label style={labelStyle}>External Link (YouTube / Google Drive / Article)</label>
          <input style={inputStyle} value={form.external_link} onChange={(e) => set("external_link", e.target.value)} placeholder="https://youtube.com/watch?v=…" />
        </div>

        {/* Thumbnail */}
        <div>
          <label style={labelStyle}>Thumbnail URL</label>
          <input style={inputStyle} value={form.thumbnail_url} onChange={(e) => set("thumbnail_url", e.target.value)} placeholder="https://… (optional cover image)" />
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <input style={inputStyle} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="marketing, instagram, ads, beginner" />
        </div>

        {/* Duration */}
        {["video", "audio"].includes(form.resource_type) && (
          <div>
            <label style={labelStyle}>Duration (minutes)</label>
            <input type="number" style={inputStyle} value={form.duration_minutes || ""} onChange={(e) => set("duration_minutes", parseInt(e.target.value) || 0)} placeholder="e.g. 45" min={0} />
          </div>
        )}

        {/* Toggles */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { key: "download_allowed", label: "⬇️ Allow downloads" },
            { key: "featured", label: "⭐ Feature on homepage" },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#E8EDF5" }}>
              <input type="checkbox" checked={(form as Record<string, unknown>)[key] as boolean} onChange={(e) => set(key, e.target.checked)} style={{ width: 16, height: 16, accentColor: "#1E88E5", cursor: "pointer" }} />
              {label}
            </label>
          ))}
        </div>

        {/* Drip */}
        <div>
          <label style={labelStyle}>Drip Release Date (optional)</label>
          <input type="datetime-local" style={inputStyle} value={form.drip_release_at} onChange={(e) => set("drip_release_at", e.target.value)} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={pending} style={{ width: "100%", padding: 15, background: "linear-gradient(135deg,#1E88E5,#AB47BC)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, cursor: pending ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Uploading…" : "📤 Upload Resource"}
        </button>
      </div>
    </div>
  );
}
