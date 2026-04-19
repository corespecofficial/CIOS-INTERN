"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import {
  createCompanyDoc,
  deleteCompanyDoc,
  updateCompanyDoc,
  type CompanyDoc,
  type CompanyDocCategory,
  type CompanyDocType,
  type CompanyDocAccess,
} from "@/app/actions/company-library";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  card2: "#161D2E",
  blue: "#1E88E5",
  green: "#66BB6A",
  gold: "#FFC107",
  red: "#EF5350",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
};

const CATEGORIES: { value: CompanyDocCategory; label: string; emoji: string; color: string }[] = [
  { value: "investor", label: "Investor", emoji: "💰", color: "#FFC107" },
  { value: "product", label: "Product", emoji: "🛠", color: "#1E88E5" },
  { value: "market", label: "Market", emoji: "🌍", color: "#66BB6A" },
  { value: "press", label: "Press", emoji: "📰", color: "#AB47BC" },
  { value: "technical", label: "Technical", emoji: "⚙️", color: "#FF7043" },
  { value: "growth", label: "Growth", emoji: "📈", color: "#EC4899" },
];

interface Props {
  initialDocs: CompanyDoc[];
}

export default function CompanyDocsClient({ initialDocs }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<CompanyDoc[]>(initialDocs);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "product" as CompanyDocCategory,
    doc_type: "pdf" as CompanyDocType,
    file_url: "",
    cover_emoji: "📄",
    cover_color: "#1E88E5",
    access_level: "public" as CompanyDocAccess,
    featured: false,
    sort_order: 0,
    page_count: 0,
    status: "published" as "draft" | "published" | "archived",
    file_size_bytes: 0,
  });

  function resetForm() {
    setForm({
      title: "",
      description: "",
      category: "product",
      doc_type: "pdf",
      file_url: "",
      cover_emoji: "📄",
      cover_color: "#1E88E5",
      access_level: "public",
      featured: false,
      sort_order: 0,
      page_count: 0,
      status: "published",
      file_size_bytes: 0,
    });
    setEditingId(null);
    setError(null);
  }

  function openEditForm(doc: CompanyDoc) {
    setForm({
      title: doc.title,
      description: doc.description ?? "",
      category: doc.category,
      doc_type: doc.doc_type,
      file_url: doc.file_url,
      cover_emoji: doc.cover_emoji,
      cover_color: doc.cover_color,
      access_level: doc.access_level,
      featured: doc.featured,
      sort_order: doc.sort_order,
      page_count: doc.page_count ?? 0,
      status: doc.status,
      file_size_bytes: doc.file_size_bytes ?? 0,
    });
    setEditingId(doc.id);
    setShowForm(true);
    setError(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadToCloudinary(file, {
        folder: "company-library",
        resourceType: "raw",
        filename: file.name,
      });
      setForm((f) => ({
        ...f,
        file_url: uploaded.secureUrl,
        file_size_bytes: uploaded.bytes,
        doc_type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : file.name.toLowerCase().endsWith(".html") ? "html" : f.doc_type,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title || !form.file_url) {
      setError("Title and file URL are required");
      return;
    }
    startTransition(async () => {
      const payload = {
        ...form,
        page_count: form.page_count || undefined,
        file_size_bytes: form.file_size_bytes || undefined,
      };
      const res = editingId
        ? await updateCompanyDoc(editingId, payload)
        : await createCompanyDoc(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data) {
        if (editingId) {
          setDocs((prev) => prev.map((d) => (d.id === editingId ? res.data! : d)));
        } else {
          setDocs((prev) => [res.data!, ...prev]);
        }
      }
      resetForm();
      setShowForm(false);
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteCompanyDoc(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setDocs((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .cd-input { width: 100%; padding: 9px 12px; background: ${C.bg}; color: ${C.text}; border: 1px solid ${C.border}; border-radius: 8px; font-size: 14px; box-sizing: border-box; outline: none; }
        .cd-input:focus { border-color: ${C.blue}; }
        .cd-label { display: block; font-size: 11px; font-weight: 700; color: ${C.dim}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .cd-btn { padding: 10px 18px; border-radius: 8px; border: none; font-weight: 700; font-size: 14px; cursor: pointer; }
        .cd-btn-primary { background: ${C.blue}; color: #fff; }
        .cd-btn-secondary { background: transparent; color: ${C.dim}; border: 1px solid ${C.border}; }
        .cd-btn-danger { background: ${C.red}; color: #fff; }
        .cd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) { .cd-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>📚 Company Library</h1>
          <p style={{ margin: "4px 0 0", color: C.dim, fontSize: 14 }}>
            Upload and manage public-facing company documents. Published items appear at <a href="/resources" target="_blank" style={{ color: C.blue }}>/resources</a>.
          </p>
        </div>
        <button
          className="cd-btn cd-btn-primary"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          style={{ marginLeft: "auto" }}
        >
          {showForm ? "✕ Close" : "+ New Document"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 28 }}
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>
            {editingId ? "Edit Document" : "New Document"}
          </h2>

          <div style={{ marginBottom: 14 }}>
            <label className="cd-label">File Upload</label>
            <input
              type="file"
              accept=".pdf,.html,.pptx,.key"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ color: C.text, fontSize: 13 }}
            />
            {uploading && <div style={{ color: C.gold, fontSize: 12, marginTop: 6 }}>Uploading to Cloudinary…</div>}
            {form.file_url && (
              <div style={{ color: C.green, fontSize: 12, marginTop: 6, wordBreak: "break-all" }}>
                ✓ Uploaded: <a href={form.file_url} target="_blank" rel="noreferrer" style={{ color: C.green }}>{form.file_url}</a>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="cd-label">Or paste external URL</label>
            <input
              className="cd-input"
              value={form.file_url}
              onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
              placeholder="https://…"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="cd-label">Title *</label>
            <input
              className="cd-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="CPS Intern Investor Pitch Deck"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="cd-label">Description</label>
            <textarea
              className="cd-input"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="One-paragraph summary shown on the library grid."
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="cd-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="cd-label">Category</label>
              <select
                className="cd-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CompanyDocCategory, cover_color: CATEGORIES.find((c) => c.value === e.target.value)?.color ?? f.cover_color }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="cd-label">Doc Type</label>
              <select
                className="cd-input"
                value={form.doc_type}
                onChange={(e) => setForm((f) => ({ ...f, doc_type: e.target.value as CompanyDocType }))}
              >
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="slides">Slides</option>
                <option value="video">Video</option>
                <option value="external">External link</option>
              </select>
            </div>
          </div>

          <div className="cd-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="cd-label">Access Level</label>
              <select
                className="cd-input"
                value={form.access_level}
                onChange={(e) => setForm((f) => ({ ...f, access_level: e.target.value as CompanyDocAccess }))}
              >
                <option value="public">🌍 Public — anyone</option>
                <option value="investor">🔐 Investor-only</option>
                <option value="internal">🏢 Internal-only</option>
              </select>
            </div>
            <div>
              <label className="cd-label">Status</label>
              <select
                className="cd-input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "draft" | "published" | "archived" }))}
              >
                <option value="published">✓ Published</option>
                <option value="draft">📝 Draft</option>
                <option value="archived">📦 Archived</option>
              </select>
            </div>
          </div>

          <div className="cd-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="cd-label">Cover Emoji</label>
              <input
                className="cd-input"
                value={form.cover_emoji}
                onChange={(e) => setForm((f) => ({ ...f, cover_emoji: e.target.value }))}
                maxLength={4}
              />
            </div>
            <div>
              <label className="cd-label">Cover Color</label>
              <input
                className="cd-input"
                type="color"
                value={form.cover_color}
                onChange={(e) => setForm((f) => ({ ...f, cover_color: e.target.value }))}
                style={{ height: 40, padding: 4 }}
              />
            </div>
          </div>

          <div className="cd-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="cd-label">Page Count (optional)</label>
              <input
                className="cd-input"
                type="number"
                value={form.page_count || ""}
                onChange={(e) => setForm((f) => ({ ...f, page_count: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div>
              <label className="cd-label">Sort Order</label>
              <input
                className="cd-input"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: C.text, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              ⭐ Featured (shown in the large hero grid)
            </label>
          </div>

          {error && (
            <div style={{ color: C.red, fontSize: 13, marginBottom: 12, padding: "10px 12px", background: `${C.red}11`, border: `1px solid ${C.red}44`, borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="cd-btn cd-btn-secondary" onClick={() => { resetForm(); setShowForm(false); }} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="cd-btn cd-btn-primary" disabled={pending || uploading}>
              {pending ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {docs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
            No documents yet. Click &quot;New Document&quot; above to upload your first one.
          </div>
        ) : (
          docs.map((doc) => {
            const cat = CATEGORIES.find((c) => c.value === doc.category);
            return (
              <div
                key={doc.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: `${doc.cover_color}22`,
                    color: doc.cover_color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {doc.cover_emoji}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                    <strong style={{ fontSize: 15 }}>{doc.title}</strong>
                    {doc.featured && <span style={{ fontSize: 11, background: "#FFC10722", color: "#FFC107", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>⭐ FEATURED</span>}
                    {doc.status !== "published" && <span style={{ fontSize: 11, background: `${C.dim}22`, color: C.dim, padding: "2px 8px", borderRadius: 999, fontWeight: 700, textTransform: "uppercase" }}>{doc.status}</span>}
                    {doc.access_level !== "public" && <span style={{ fontSize: 11, background: `${C.red}22`, color: C.red, padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>🔐 {doc.access_level}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.dim, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>{cat?.emoji} {cat?.label}</span>
                    <span>· {doc.doc_type.toUpperCase()}</span>
                    <span>· 👁 {doc.view_count}</span>
                    {doc.page_count && <span>· {doc.page_count}p</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "7px 14px", borderRadius: 7, background: C.card2, color: C.text, fontSize: 12, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.border}` }}
                  >
                    Open
                  </a>
                  <button
                    className="cd-btn cd-btn-secondary"
                    style={{ padding: "7px 14px", fontSize: 12 }}
                    onClick={() => openEditForm(doc)}
                  >
                    Edit
                  </button>
                  <button
                    className="cd-btn cd-btn-danger"
                    style={{ padding: "7px 14px", fontSize: 12 }}
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
