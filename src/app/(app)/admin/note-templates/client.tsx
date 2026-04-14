"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createTemplate, updateTemplate, deleteTemplate, type NoteTemplateRow } from "@/app/actions/note-templates";

const DEFAULT_CATEGORIES = ["Letters", "Resumes", "Education", "Business", "Reports", "Custom"];

export function AdminTemplatesClient({ initial }: { initial: NoteTemplateRow[] }) {
  const [rows, setRows] = useState<NoteTemplateRow[]>(initial);
  const [editing, setEditing] = useState<NoteTemplateRow | "new" | null>(null);
  const [pending, start] = useTransition();

  const refresh = () => { if (typeof window !== "undefined") window.location.reload(); };

  const toggle = (r: NoteTemplateRow, key: "is_active" | "is_premium") => start(async () => {
    const patch = key === "is_active" ? { isActive: !r.is_active } : { isPremium: !r.is_premium };
    const res = await updateTemplate(r.id, patch);
    if (!res.ok) { toast.error(res.error); return; }
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, [key]: !x[key] } : x));
  });

  const remove = (r: NoteTemplateRow) => start(async () => {
    if (!confirm(`Delete "${r.name}" permanently?`)) return;
    const res = await deleteTemplate(r.id);
    if (!res.ok) { toast.error(res.error); return; }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button onClick={() => setEditing("new")} style={btnPrimary}>+ New template</button>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📑</div>
          <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700 }}>No custom templates yet</div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>Upload one to see it in the Notes Template Picker.</div>
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 140px 90px 90px 120px", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 10, color: "#5A6478", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
            <span />
            <span>Name</span>
            <span>Category</span>
            <span>Premium</span>
            <span>Active</span>
            <span />
          </div>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr 140px 90px 90px 120px", gap: 10, padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: r.accent, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {r.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>{r.category}</div>
              <Toggle on={r.is_premium} disabled={pending} onChange={() => toggle(r, "is_premium")} />
              <Toggle on={r.is_active} disabled={pending} onChange={() => toggle(r, "is_active")} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => setEditing(r)} style={btnGhost}>Edit</button>
                <button onClick={() => remove(r)} disabled={pending} style={{ ...btnGhost, color: "#EF5350" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function TemplateEditor({ row, onClose, onSaved }: { row: NoteTemplateRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(row?.name || "");
  const [category, setCategory] = useState(row?.category || "Letters");
  const [docType, setDocType] = useState<"doc" | "slides" | "table" | "pdf">(row?.doc_type || "doc");
  const [html, setHtml] = useState(row?.html || defaultStarter());
  const [accent, setAccent] = useState(row?.accent || "#1E88E5");
  const [isPremium, setIsPremium] = useState(row?.is_premium || false);
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (!html.trim()) { toast.error("Paste template content"); return; }
    if (row) {
      const r = await updateTemplate(row.id, { name, category, docType, html, accent, isPremium });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Template updated");
    } else {
      const r = await createTemplate({ name, category, docType, html, accent, isPremium });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Template created");
    }
    onSaved();
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0D1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20, width: "100%", maxWidth: 980, maxHeight: "90vh", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>{row ? "Edit template" : "New template"}</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          <div>
            <div style={lbl}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Modern Resume" style={input} />
          </div>
          <div>
            <div style={lbl}>Document type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["doc", "slides", "table", "pdf"] as const).map((t) => (
                <button key={t} onClick={() => setDocType(t)} style={{
                  padding: "8px 14px", borderRadius: 8,
                  background: docType === t ? "rgba(30,136,229,0.2)" : "transparent",
                  color: docType === t ? "#1E88E5" : "#8892A4",
                  border: `1px solid ${docType === t ? "#1E88E5" : "rgba(255,255,255,0.1)"}`,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={lbl}>Category</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DEFAULT_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} style={{
                  padding: "6px 12px", borderRadius: 999,
                  background: category === c ? "rgba(30,136,229,0.2)" : "transparent",
                  color: category === c ? "#1E88E5" : "#8892A4",
                  border: `1px solid ${category === c ? "#1E88E5" : "rgba(255,255,255,0.1)"}`,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>{c}</button>
              ))}
            </div>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Or type a custom category" style={{ ...input, marginTop: 8 }} />
          </div>

          <div>
            <div style={lbl}>Accent colour</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 44, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none" }} />
              <input value={accent} onChange={(e) => setAccent(e.target.value)} placeholder="#1E88E5" style={{ ...input, fontFamily: "monospace" }} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: isPremium ? "rgba(255,193,7,0.08)" : "transparent", border: `1px solid ${isPremium ? "rgba(255,193,7,0.25)" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isPremium ? "#FFC107" : "#E8EDF5" }}>💎 Premium template</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>Only premium subscribers (and admins) can use this template.</div>
            </div>
          </label>

          <div style={{ marginTop: "auto", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={btnGhost}>Cancel</button>
            <button onClick={save} disabled={pending} style={btnPrimary}>{pending ? "Saving…" : row ? "Save changes" : "Create template"}</button>
          </div>
        </div>

        {/* HTML + preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={lbl}>HTML content</div>
            <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={14}
              placeholder="Paste raw HTML here. Inline styles work best."
              style={{ ...input, fontFamily: "monospace", fontSize: 11, resize: "vertical", minHeight: 240 }} />
          </div>
          <div>
            <div style={lbl}>Live preview</div>
            <div style={{ background: "#fff", borderRadius: 10, padding: 10, maxHeight: 300, overflow: "auto" }}
              dangerouslySetInnerHTML={{ __html: html || "<p style='color:#999'>No content</p>" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} disabled={disabled} aria-pressed={on} style={{
      width: 40, height: 22, borderRadius: 999, border: "none",
      background: on ? "linear-gradient(135deg,#66BB6A,#43A047)" : "#334155",
      position: "relative", cursor: disabled ? "not-allowed" : "pointer",
    }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
    </button>
  );
}

function defaultStarter(): string {
  return `<div style="font-family:Georgia,serif;padding:40px;color:#111;line-height:1.6;">
  <h1 style="color:#1E88E5;">[Document title]</h1>
  <p>Replace this with the real template content. Inline styles work best because they survive across platforms.</p>
</div>`;
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8, padding: "9px 12px", color: "#E8EDF5", fontSize: 13, outline: "none",
};
const btnPrimary: React.CSSProperties = { padding: "8px 16px", background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "6px 12px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" };
