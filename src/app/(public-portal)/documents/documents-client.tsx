"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { saveDocument, renameDocument, deleteDocument } from "@/app/actions/documents";
import { useCurrentUser } from "@/lib/use-current-user";

interface Doc {
  id: string; name: string; kind: string; mime: string | null; size_bytes: number;
  url: string; thumbnail_url: string | null; tags: string[]; folder: string | null;
  description: string | null; is_generated: boolean; generated_by: string | null;
  created_at: string;
}

const KINDS = [
  { key: "all", label: "All", color: "#8892A4" },
  { key: "cv", label: "CVs", color: "#1E88E5" },
  { key: "certificate", label: "Certificates", color: "#FFC107" },
  { key: "report", label: "Reports", color: "#AB47BC" },
  { key: "contract", label: "Contracts", color: "#EF5350" },
  { key: "invoice", label: "Invoices", color: "#66BB6A" },
  { key: "material", label: "Materials", color: "#26C6DA" },
  { key: "id_card", label: "ID Cards", color: "#FF7043" },
  { key: "other", label: "Other", color: "#8892A4" },
];

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export function DocumentsClient({ initial }: { initial: Array<Record<string, unknown>> }) {
  const [docs, setDocs] = useState<Doc[]>(initial as unknown as Doc[]);
  const [kind, setKind] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<Doc | null>(null);
  const [pending, start] = useTransition();
  const me = useCurrentUser();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter((d) => (kind === "all" || d.kind === kind) && (!q || d.name.toLowerCase().includes(q)));
  }, [docs, kind, search]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: docs.length };
    for (const d of docs) m[d.kind] = (m[d.kind] || 0) + 1;
    return m;
  }, [docs]);

  const onUpload = async (file: File) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) return toast.error("Cloudinary not configured");
    if (file.size > 25 * 1024 * 1024) return toast.error("Max 25 MB");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed");
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const guessKind =
        ["pdf"].includes(ext) ? "report" :
        ["jpg", "jpeg", "png", "webp"].includes(ext) ? "other" :
        ["doc", "docx"].includes(ext) ? "report" : "other";
      const saved = await saveDocument({
        name: file.name,
        kind: guessKind,
        mime: file.type,
        sizeBytes: file.size,
        url: data.secure_url,
        thumbnailUrl: data.format === "pdf" ? undefined : data.secure_url,
      });
      if (!saved.ok) throw new Error(saved.error);
      const newDoc: Doc = {
        id: saved.data!.id, name: file.name, kind: guessKind, mime: file.type, size_bytes: file.size,
        url: data.secure_url, thumbnail_url: null, tags: [], folder: null, description: null,
        is_generated: false, generated_by: null, created_at: new Date().toISOString(),
      };
      setDocs((prev) => [newDoc, ...prev]);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onGenerateCV = () => start(async () => {
    const t = toast.loading("Building your CV PDF…");
    try {
      const date = new Date().toISOString().slice(0, 10);
      const cvName = `${(me.firstName || "My")}-CV-${date}.pdf`;
      // Save a pointer row in Documents. The actual PDF is streamed on demand
      // from /api/cv whenever anyone hits the preview/download link.
      const res = await saveDocument({
        name: cvName,
        kind: "cv",
        mime: "application/pdf",
        sizeBytes: 0,
        url: "/api/cv",
        description: "Auto-generated from your profile",
        isGenerated: true,
        generatedBy: "cv_generator",
      });
      if (!res.ok) { toast.error(res.error, { id: t }); return; }
      const newDoc: Doc = {
        id: res.data!.id, name: cvName, kind: "cv",
        mime: "application/pdf", size_bytes: 0,
        url: "/api/cv",
        thumbnail_url: null, tags: [], folder: null,
        description: "Auto-generated from your profile",
        is_generated: true, generated_by: "cv_generator",
        created_at: new Date().toISOString(),
      };
      setDocs((prev) => [newDoc, ...prev]);
      toast.success("CV ready — tap to preview", { id: t });
      // Open the preview right away so the user sees the result
      setPreviewing(newDoc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed", { id: t });
    }
  });

  const onDelete = (id: string) => start(async () => {
    if (!confirm("Delete this document?")) return;
    const res = await deleteDocument(id);
    if (!res.ok) return toast.error(res.error);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Deleted");
  });

  const onRename = (id: string, name: string) => start(async () => {
    const res = await renameDocument(id, name);
    if (!res.ok) return toast.error(res.error);
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, name } : d));
    setRenaming(null);
    toast.success("Renamed");
  });

  const bytes = (n: number) => n < 1024 ? `${n}B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)}KB` : `${(n / (1024 * 1024)).toFixed(1)}MB`;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(239,83,80,0.06))", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 16, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,193,7,0.15)", color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>DOCUMENTS</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📁 My documents</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Certificates · CVs · reports · contracts — all in one place</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={btnPrimary}>
            ⬆ Upload
            <input type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ""; }} disabled={uploading} />
          </label>
          <button onClick={onGenerateCV} disabled={pending} style={btnGhost}>📄 Generate CV</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        {KINDS.slice(1, 7).map((k) => (
          <div key={k.key} onClick={() => setKind(k.key)} style={{ background: "#111827", border: `1px solid ${k.color}33`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
            <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{counts[k.key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search by name…" style={{ ...input, flex: 1, minWidth: 200 }} />
        <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, overflowX: "auto" }}>
          {KINDS.map((k) => (
            <button key={k.key} onClick={() => setKind(k.key)} style={{
              padding: "6px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: kind === k.key ? `${k.color}22` : "transparent",
              color: kind === k.key ? k.color : "#8892A4",
              border: "none", whiteSpace: "nowrap",
            }}>{k.label}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
            {docs.length === 0 ? "No documents yet. Upload a file or generate your CV." : "No documents match this filter."}
          </div>
        )}
        {filtered.map((d) => {
          const meta = KINDS.find((k) => k.key === d.kind) || KINDS[KINDS.length - 1];
          return (
            <div key={d.id} style={{ background: "#111827", border: `1px solid ${meta.color}22`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 100, background: `linear-gradient(135deg, ${meta.color}22, #0A0E1A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                {d.thumbnail_url ? <img src={d.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> :
                  d.kind === "cv" ? "📄" :
                  d.kind === "certificate" ? "🏆" :
                  d.kind === "report" ? "📊" :
                  d.kind === "contract" ? "📜" :
                  d.kind === "invoice" ? "💳" :
                  d.kind === "material" ? "📚" :
                  d.kind === "id_card" ? "🪪" : "📎"}
              </div>
              <div style={{ padding: 12 }}>
                {renaming?.id === d.id ? (
                  <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") onRename(d.id, renaming.name); if (e.key === "Escape") setRenaming(null); }}
                    onBlur={() => onRename(d.id, renaming.name)}
                    style={{ ...input, width: "100%", fontSize: 13 }} />
                ) : (
                  <div onClick={() => setRenaming({ id: d.id, name: d.name })} style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 4, cursor: "text", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                )}
                <div style={{ fontSize: 10, color: "#8892A4", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 99, background: `${meta.color}22`, color: meta.color, fontWeight: 700, textTransform: "uppercase" }}>{meta.label}</span>
                  <span>{bytes(d.size_bytes)}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setPreviewing(d)} style={{ flex: 1, textAlign: "center", padding: "6px 10px", background: `${meta.color}22`, color: meta.color, borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer" }}>👁 Preview</button>
                  <a href={d.url === "/api/cv" ? "/api/cv?download=1" : d.url} target="_blank" rel="noopener noreferrer" download={d.name} style={{ padding: "6px 10px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>↓</a>
                  <button onClick={() => onDelete(d.id)} disabled={pending} style={{ padding: "6px 10px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {uploading && <div style={{ position: "fixed", bottom: 20, right: 20, background: "#111827", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 10, padding: "10px 16px", color: "#1E88E5", fontSize: 12, fontWeight: 700, zIndex: 100 }}>⬆ Uploading…</div>}

      {previewing && <PreviewModal doc={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}

function PreviewModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const isImage = (doc.mime || "").startsWith("image/");
  const isPdf = (doc.mime || "").includes("pdf") || doc.url === "/api/cv";
  const downloadUrl = doc.url === "/api/cv" ? "/api/cv?download=1" : doc.url;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        width: "min(960px, 100%)", maxHeight: "92dvh",
        background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14, overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
            <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{doc.mime || "Document"}</div>
          </div>
          <a href={downloadUrl} download={doc.name} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>↓ Download</a>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, background: "#0A0E1A", minHeight: 300, overflow: "hidden" }}>
          {isPdf ? (
            <iframe src={doc.url} title={doc.name} style={{ width: "100%", height: "min(80dvh, 720px)", border: "none" }} />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.url} alt={doc.name} style={{ width: "100%", height: "auto", maxHeight: "80dvh", objectFit: "contain", display: "block" }} />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "#8892A4" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📎</div>
              <div style={{ fontSize: 13, marginBottom: 14 }}>Preview not available for this file type.</div>
              <a href={downloadUrl} download={doc.name} style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Download to view</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #FFC107, #FFA000)", color: "#1A1A1A", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-block" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const input: React.CSSProperties = { padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };
