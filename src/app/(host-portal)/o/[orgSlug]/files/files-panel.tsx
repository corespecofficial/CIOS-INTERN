"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Files panel — used by both the host (/o/<slug>/files) and student
 * (/s/<slug>/files) surfaces. The mode prop drives which controls
 * appear; data shape is identical.
 *
 * Upload uses the standard FormData server-action handoff. Download
 * goes via getOrgFileSignedUrl which produces a 10-minute presigned
 * R2 URL — the URL itself isn't user-shareable beyond that window so
 * we don't worry about deeper auth on the file read.
 */

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  uploadOrgFileAction,
  getOrgFileSignedUrl,
  deleteOrgFile,
  type OrgFileRow,
} from "@/app/actions/org-files";

interface Props {
  orgId: string;
  orgSlug: string;
  mode: "host" | "student";
  canUpload: boolean;
  canDelete: boolean;
  storageReady: boolean;
  initialFiles: OrgFileRow[];
  total: number;
  page: number;
}

const PAGE_SIZE = 50;

export function FilesPanel({ orgId, orgSlug, mode, canUpload, canDelete, storageReady, initialFiles, total, page }: Props) {
  const [files, setFiles] = useState<OrgFileRow[]>(initialFiles);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const blob = fd.get("file");
    if (!blob || !(blob instanceof File) || blob.size === 0) {
      toast.error("Pick a file first");
      return;
    }

    start(async () => {
      const r = await uploadOrgFileAction(orgId, fd);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Uploaded");
      form.reset();
      router.refresh();
    });
  }

  function handleDelete(file: OrgFileRow) {
    if (!confirm(`Delete "${file.display_name}"? This can't be undone.`)) return;
    start(async () => {
      const r = await deleteOrgFile(orgId, file.id);
      if (!r.ok) { toast.error(r.error); return; }
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast.success("Deleted");
    });
  }

  async function handleDownload(file: OrgFileRow) {
    const r = await getOrgFileSignedUrl(orgId, file.id);
    if (!r.ok) { toast.error(r.error); return; }
    // Open in new tab — gives the browser a chance to inline-render
    // images / PDFs / videos. For binary downloads the user can use
    // Save Link As.
    window.open(r.data!.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Files</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 18px" }}>
        {total} file{total === 1 ? "" : "s"} · {mode === "host" ? "scoped to your org's storage prefix" : "shared by your instructors"}
      </p>

      {!storageReady && mode === "host" && (
        <div style={{ background: "rgba(255,167,38,0.08)", border: "1px solid rgba(255,167,38,0.30)", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 12, color: "#FFA726", lineHeight: 1.6 }}>
          <strong>Storage isn&apos;t configured.</strong> Set <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, color: "#E8EDF5" }}>R2_ACCOUNT_ID</code>,{" "}
          <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, color: "#E8EDF5" }}>R2_ACCESS_KEY_ID</code>,{" "}
          <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, color: "#E8EDF5" }}>R2_SECRET_ACCESS_KEY</code> and{" "}
          <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, color: "#E8EDF5" }}>R2_BUCKET</code> in <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, color: "#E8EDF5" }}>.env.local</code>{" "}
          to enable uploads. Listing existing files still works.
        </div>
      )}

      {canUpload && (
        <form onSubmit={handleUpload} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16, marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={inputRef}
            type="file"
            name="file"
            disabled={pending}
            aria-label="Choose a file to upload"
            style={{ flex: 1, minWidth: 220, padding: "8px 10px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}
          />
          <button type="submit" disabled={pending} style={{ padding: "10px 18px", background: pending ? "rgba(30,136,229,0.30)" : "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", flexShrink: 0 }}>
            {pending ? "Uploading…" : "Upload"}
          </button>
          <span style={{ fontSize: 11, color: "#5A6478", flexShrink: 0 }}>Max 25 MB · stored privately to your org</span>
        </form>
      )}

      {files.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed #1F2937", borderRadius: 12, padding: 60, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          {canUpload ? "📂 Upload your first file above." : "📂 No files yet. Your instructors will share resources here."}
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
          {files.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #1F2937" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {fileIcon(f.mime)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.display_name}>
                  {f.display_name}
                </div>
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>
                  {formatBytes(f.size_bytes)}
                  {f.uploaded_by && <> · by {f.uploaded_by.name}</>}
                  {" · "}{new Date(f.created_at).toLocaleDateString()}
                </div>
              </div>
              <button type="button" onClick={() => handleDownload(f)} style={{ padding: "6px 12px", background: "transparent", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.40)", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Download
              </button>
              {canDelete && (
                <button type="button" onClick={() => handleDelete(f)} disabled={pending} style={{ padding: "6px 12px", background: "transparent", color: "#FF8A80", border: "1px solid rgba(239,83,80,0.30)", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "center" }}>
          {page > 1 && <Link href={`/${mode === "host" ? "o" : "s"}/${orgSlug}/files?page=${page - 1}`} style={pagerStyle}>← Prev</Link>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`/${mode === "host" ? "o" : "s"}/${orgSlug}/files?page=${page + 1}`} style={pagerStyle}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

function fileIcon(mime: string | null): string {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime === "application/pdf") return "📕";
  if (mime.startsWith("text/") || mime.includes("json") || mime.includes("xml")) return "📃";
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("compressed")) return "📦";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("csv") || mime.includes("excel")) return "📊";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "📽";
  return "📄";
}

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const pagerStyle: React.CSSProperties = { display: "inline-block", padding: "6px 12px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#8892A4", fontSize: 12, textDecoration: "none" };
