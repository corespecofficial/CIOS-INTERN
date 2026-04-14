"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveNote, trashNote, aiNoteAssist, type DbNote } from "@/app/actions/notes";

/**
 * WPS-style editor. Big writing canvas, zero distractions. Top bar has
 * back, undo/redo, share, tools sheet, save. Bottom bar has format
 * helpers. Keyboard opens as normal; we keep the bottom bar above the
 * keyboard on mobile via env(safe-area-inset-bottom).
 */
export function EditorClient({ initialNote }: { initialNote: DbNote }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialNote.title || "Untitled");
  const [body, setBody] = useState(initialNote.html || "");
  const [dirty, setDirty] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([initialNote.html || ""]);
  const [histIdx, setHistIdx] = useState(0);
  const [pending, start] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = (body.trim().match(/\S+/g) || []).length;

  useEffect(() => () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); }, []);

  const onBodyChange = (next: string) => {
    setBody(next);
    setDirty(true);
    // Push to undo history, debounced to once every 400ms
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      setHistory((prev) => [...prev.slice(0, histIdx + 1), next].slice(-50));
      setHistIdx((i) => Math.min(i + 1, 49));
    }, 400);
  };

  const onSave = () => start(async () => {
    const r = await saveNote({ id: initialNote.id, title: title.trim() || "Untitled", html: body });
    if (!r.ok) { toast.error(r.error); return; }
    setDirty(false);
    toast.success("Saved");
  });

  const undo = () => {
    if (histIdx <= 0) return;
    const i = histIdx - 1;
    setHistIdx(i); setBody(history[i]); setDirty(true);
  };
  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const i = histIdx + 1;
    setHistIdx(i); setBody(history[i]); setDirty(true);
  };

  const onAi = (op: "summarize" | "rewrite" | "grammar" | "expand" | "bullets") => async () => {
    if (!body.trim()) { toast.error("Write something first"); return; }
    setAiBusy(op);
    const r = await aiNoteAssist(op, body);
    setAiBusy(null);
    if (!r.ok) { toast.error(r.error); return; }
    onBodyChange(r.data!.output);
    toast.success(`AI ${op} applied`);
    setToolsOpen(false);
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/notes/${initialNote.id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); }
  };

  const onTrash = () => start(async () => {
    if (!confirm("Move to trash?")) return;
    const r = await trashNote(initialNote.id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Moved to trash");
    router.push("/notes");
  });

  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      background: "#0A0E1A",
      minHeight: "100dvh",
      margin: "-1.5rem -1rem",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0A0E1A", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.push("/notes")} style={iconBtn} aria-label="Back">‹</button>
        <div style={{ flex: 1 }} />
        <button onClick={undo} disabled={histIdx <= 0} style={{ ...iconBtn, opacity: histIdx <= 0 ? 0.3 : 1 }} aria-label="Undo">↶</button>
        <button onClick={redo} disabled={histIdx >= history.length - 1} style={{ ...iconBtn, opacity: histIdx >= history.length - 1 ? 0.3 : 1 }} aria-label="Redo">↷</button>
        <button onClick={shareLink} style={iconBtn} aria-label="Share">↗</button>
        <button onClick={() => setToolsOpen(true)} style={iconBtn} aria-label="Tools">≡</button>
        <button onClick={onSave} disabled={pending || !dirty} style={{
          padding: "7px 14px", background: dirty ? "linear-gradient(135deg,#1E88E5,#1565C0)" : "rgba(30,136,229,0.3)",
          color: "#fff", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 800, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          ✓ Save
        </button>
      </div>

      {/* Title row */}
      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
        placeholder="Untitled"
        style={{
          background: "none", border: "none", outline: "none",
          color: "#E8EDF5", fontSize: 22, fontWeight: 800,
          padding: "20px 20px 6px", fontFamily: "'Nunito', sans-serif",
        }}
      />

      {/* Writing canvas */}
      <textarea
        ref={textRef}
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder=""
        style={{
          flex: 1, background: "none", border: "none", outline: "none",
          color: "#E8EDF5", fontSize: 16, lineHeight: 1.7,
          padding: "8px 20px 200px", fontFamily: "'Nunito', sans-serif",
          resize: "none", minHeight: "60vh",
        }}
      />

      {/* Word counter */}
      <div style={{ position: "fixed", left: 16, bottom: 74, padding: "4px 10px", background: "rgba(17,24,39,0.9)", color: "#8892A4", fontSize: 10, fontWeight: 700, borderRadius: 6 }}>
        Full text: {wordCount}
      </div>

      {/* Bottom toolbar */}
      <div style={{
        position: "sticky", bottom: 0, zIndex: 10,
        background: "rgba(10,14,26,0.98)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "6px 0 calc(6px + env(safe-area-inset-bottom))",
      }}>
        {[
          { label: "Fit to Screen", icon: "⇿", on: () => toast("Fit" ) },
          { label: "Format", icon: "T", on: () => insertAround(textRef, "**", "**") },
          { label: "Paragraph", icon: "≡", on: () => insertPrefix(textRef, "\n\n") },
          { label: "Add Image", icon: "🖼", on: () => toast("Image upload coming soon") },
          { label: "Tools", icon: "⊞", on: () => setToolsOpen(true) },
          { label: "Keyboard", icon: "⌨", on: () => textRef.current?.focus() },
        ].map((b) => (
          <button key={b.label} onClick={b.on} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#8892A4", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, padding: "4px 6px", minWidth: 48,
          }}>
            <span style={{ fontSize: 18 }}>{b.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, textAlign: "center", lineHeight: 1.1 }}>{b.label}</span>
          </button>
        ))}
      </div>

      {toolsOpen && (
        <ToolsSheet
          docTitle={title}
          wordCount={wordCount}
          onClose={() => setToolsOpen(false)}
          onSave={() => { setToolsOpen(false); onSave(); }}
          onTrash={() => { setToolsOpen(false); onTrash(); }}
          onShare={() => { setToolsOpen(false); shareLink(); }}
          onAi={onAi}
          aiBusy={aiBusy}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TOOLS BOTTOM SHEET
   ───────────────────────────────────────────── */

interface ToolsSheetProps {
  docTitle: string;
  wordCount: number;
  onClose: () => void;
  onSave: () => void;
  onTrash: () => void;
  onShare: () => void;
  onAi: (op: "summarize" | "rewrite" | "grammar" | "expand" | "bullets") => () => void;
  aiBusy: string | null;
}

function ToolsSheet({ docTitle, wordCount, onClose, onSave, onTrash, onShare, onAi, aiBusy }: ToolsSheetProps) {
  const Row = ({ icon, label, hint, onClick, danger, coming }: { icon: string; label: string; hint?: string; onClick?: () => void; danger?: boolean; coming?: boolean }) => (
    <button onClick={onClick} disabled={coming} style={{
      display: "flex", alignItems: "center", gap: 14,
      width: "100%", padding: "13px 18px", background: "none", border: "none",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      cursor: coming ? "default" : "pointer",
      color: danger ? "#EF5350" : "#E8EDF5", textAlign: "left",
      opacity: coming ? 0.5 : 1,
    }}>
      <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 1 }}>{hint}</div>}
      </div>
      {coming && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", background: "rgba(255,193,7,0.15)", color: "#FFC107", borderRadius: 999 }}>SOON</span>}
      {!coming && <span style={{ color: "#5A6478" }}>›</span>}
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, maxHeight: "86dvh", overflowY: "auto",
        background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "18px 18px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2B5797", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>W</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{docTitle}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>Words: {wordCount} · Size: live</div>
            </div>
          </div>
          <button onClick={onClose} style={iconGhost}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 14 }}>
          <QuickBtn icon="💾" label="Save As" onClick={onSave} />
          <QuickBtn icon="⌕" label="Find" onClick={() => alert("Use your browser's Ctrl/Cmd+F for now")} />
          <QuickBtn icon="↗" label="Share" onClick={onShare} />
          <QuickBtn icon="🖨" label="Print" onClick={() => window.print()} />
        </div>

        <Row icon="📤" label="Send To" hint="Computer / Phone / Other Devices" coming />
        <Row icon="＋" label="Add To" coming />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <Row icon="📄" label="Export as PDF" onClick={() => toast("Export PDF coming soon")} coming />
        <Row icon="🖼" label="Export as Image" coming />
        <Row icon="⇄" label="More Conversion Options" coming />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 800, padding: "12px 18px 6px", textTransform: "uppercase", letterSpacing: 1 }}>AI Writing</div>
        <Row icon="✨" label={aiBusy === "summarize" ? "Summarizing…" : "Summarize"} onClick={onAi("summarize")} />
        <Row icon="✎" label={aiBusy === "rewrite" ? "Rewriting…" : "Rewrite professionally"} onClick={onAi("rewrite")} />
        <Row icon="✓" label={aiBusy === "grammar" ? "Fixing…" : "Fix grammar"} onClick={onAi("grammar")} />
        <Row icon="⇡" label={aiBusy === "expand" ? "Expanding…" : "Expand"} onClick={onAi("expand")} />
        <Row icon="•" label={aiBusy === "bullets" ? "Bulleting…" : "Convert to bullets"} onClick={onAi("bullets")} />
        <Row icon="🎧" label="AI Read Aloud" coming />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <Row icon="⟲" label="Version History" coming />
        <Row icon="🔒" label="Encrypt Document" coming />
        <Row icon="ℹ" label="Document Information" onClick={() => alert(`${docTitle}\n${wordCount} words`)} />
        <Row icon="↗" label="Open with Another App" onClick={onShare} />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <Row icon="🗑" label="Move to Trash" onClick={onTrash} danger />

        <div style={{ height: "calc(12px + env(safe-area-inset-bottom))" }} />
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: "#111827", border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 12, padding: "12px 6px", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      color: "#E8EDF5",
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Text helpers
   ───────────────────────────────────────────── */

function insertAround(ref: React.RefObject<HTMLTextAreaElement | null>, open: string, close: string) {
  const el = ref.current; if (!el) return;
  const start = el.selectionStart, end = el.selectionEnd;
  const before = el.value.slice(0, start), sel = el.value.slice(start, end), after = el.value.slice(end);
  const next = before + open + (sel || "bold") + close + after;
  el.value = next;
  el.focus();
  el.setSelectionRange(start + open.length, start + open.length + (sel || "bold").length);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
function insertPrefix(ref: React.RefObject<HTMLTextAreaElement | null>, prefix: string) {
  const el = ref.current; if (!el) return;
  const pos = el.selectionStart;
  el.value = el.value.slice(0, pos) + prefix + el.value.slice(pos);
  el.focus();
  el.setSelectionRange(pos + prefix.length, pos + prefix.length);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const iconBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#E8EDF5",
  width: 38, height: 38, borderRadius: 10, cursor: "pointer",
  fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
};
const iconGhost: React.CSSProperties = { background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18, padding: 6 };
