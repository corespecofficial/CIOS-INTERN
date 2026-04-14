"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveNote, trashNote, aiNoteAssist, type DbNote } from "@/app/actions/notes";
import { ShareNoteModal } from "@/components/notes/share-modal";
import {
  exportAsPdf, exportAsImage, exportAsTxt, exportAsMarkdown, exportAsHtml, exportAsDoc,
  htmlToPlainText, qrCodeUrl,
  readAloud, type ReadAloudHandle,
  saveVersion, listVersions, type NoteVersion,
  encryptHtml, decryptHtml, isEncrypted,
} from "@/lib/note-exports";

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
  const [shareOpen, setShareOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([initialNote.html || ""]);
  const [histIdx, setHistIdx] = useState(0);
  const [pending, start] = useTransition();
  const editorRef = useRef<HTMLDivElement>(null);
  /** Last selection range captured on blur so format-sheet taps operate on
   *  the original selection even after the keyboard/modal stole focus. */
  const savedRangeRef = useRef<Range | null>(null);
  const readRef = useRef<ReadAloudHandle | null>(null);
  const [readingAloud, setReadingAloud] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [formatSheet, setFormatSheet] = useState<FormatSheetKey | null>(null);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  /** Auto-save status shown in the header. */
  type SyncStatus = "saved" | "saving" | "offline" | "pending";
  const [sync, setSync] = useState<SyncStatus>("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect offline state
  useEffect(() => {
    const goOnline = () => setSync((s) => (s === "offline" ? "pending" : s));
    const goOffline = () => setSync("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (!navigator.onLine) setSync("offline");
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = (body.trim().match(/\S+/g) || []).length;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/notes/${initialNote.id}` : `/notes/${initialNote.id}`;

  useEffect(() => () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); }, []);

  // Seed the contentEditable with the stored HTML exactly once (otherwise
  // React would reset the DOM on every keystroke and destroy the caret).
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== body) {
      editorRef.current.innerHTML = body || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flag the body while the editor is mounted so scoped CSS can neutralise
  // the parent CIOS <main> scroll/padding. More portable than `:has()`.
  useEffect(() => {
    document.body.classList.add("cios-notes-active");
    return () => { document.body.classList.remove("cios-notes-active"); };
  }, []);

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

  /** Save to the DB now. Silent — no toast. */
  const doSave = async (t: string, b: string) => {
    setSync("saving");
    const r = await saveNote({ id: initialNote.id, title: t.trim() || "Untitled", html: b });
    if (!r.ok) { setSync("pending"); return false; }
    saveVersion(initialNote.id, t, b);
    setSync("saved");
    setDirty(false);
    return true;
  };

  const onSave = () => start(async () => { await doSave(title, body); });

  /** Debounced auto-save — fires ~1.5s after the last edit. */
  const scheduleAutosave = (nextTitle: string, nextBody: string) => {
    if (!navigator.onLine) { setSync("offline"); return; }
    setSync("pending");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { doSave(nextTitle, nextBody); }, 1500);
  };

  // Auto-save when body changes
  useEffect(() => {
    if (!dirty) return;
    scheduleAutosave(title, body);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, title, dirty]);

  /* ── Tools-sheet handlers ─────────────────────────────────────── */

  const onAddToFolder = () => start(async () => {
    const folder = prompt("Folder name (leave blank to clear):", initialNote.folder || "");
    if (folder === null) return;
    const r = await saveNote({ id: initialNote.id, title, html: body, folder: folder.trim() || null });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(folder.trim() ? `Added to "${folder.trim()}"` : "Removed from folder");
  });

  const onReadAloud = () => {
    if (readingAloud) {
      readRef.current?.stop(); readRef.current = null; setReadingAloud(false); return;
    }
    const text = htmlToPlainText(body);
    if (!text.trim()) { toast.error("Nothing to read yet"); return; }
    const h = readAloud(`${title}. ${text}`);
    if (!h) { toast.error("Speech synthesis not supported in this browser"); return; }
    readRef.current = h; setReadingAloud(true);
    // Poll for completion
    const check = setInterval(() => {
      if (!h.speaking()) { clearInterval(check); setReadingAloud(false); readRef.current = null; }
    }, 500);
  };

  const onEncrypt = async () => {
    if (isEncrypted(body)) {
      const pw = prompt("Enter the password to decrypt this document:");
      if (!pw) return;
      try {
        const plain = await decryptHtml(body, pw);
        setBody(plain); setDirty(true);
        toast.success("Decrypted — remember to save");
      } catch (e) { toast.error((e as Error).message); }
      return;
    }
    const pw = prompt("Enter a password to encrypt this document.\n\n⚠ If you lose it, the contents CANNOT be recovered.");
    if (!pw || pw.length < 4) { if (pw !== null) toast.error("Use at least 4 characters"); return; }
    const confirm2 = prompt("Re-enter password to confirm:");
    if (confirm2 !== pw) { toast.error("Passwords don't match"); return; }
    const cipher = await encryptHtml(body, pw);
    setBody(cipher); setDirty(true);
    toast.success("Encrypted — click Save to persist");
  };

  useEffect(() => () => { readRef.current?.stop(); }, []);

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
    <div className="notes-editor-root" style={{
      fontFamily: "'Nunito', sans-serif",
      background: "#0A0E1A",
      height: "100%",
      minHeight: 0,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        /* Neutralise the parent CIOS shell so the editor's own flex layout
           (header · body · toolbar) owns the remaining space under the CIOS
           header. main-content-area is flex column; forcing it + main to
           100dvh with overflow:hidden means the editor body takes flex:1
           and the toolbar stays visible at the bottom.
           Using a body class rather than :has() for wider browser support. */
        body.cios-notes-active { overflow: hidden !important; }
        body.cios-notes-active .main-content-area {
          height: 100dvh !important;
          min-height: 0 !important;
          max-height: 100dvh !important;
          overflow: hidden !important;
        }
        body.cios-notes-active .main-content-area > main {
          flex: 1 1 auto !important;
          overflow: hidden !important;
          padding: 0 !important;
          min-height: 0 !important;
        }
        @media (max-width: 900px) {
          .notes-editor-root {
            position: fixed !important;
            inset: 0 !important;
            z-index: 100 !important;
            height: 100dvh !important;
          }
        }
        /* Rich-text styles for the contentEditable canvas. */
        .cios-note-body h1 { font-size: 28px; font-weight: 800; margin: 18px 0 8px; color: #E8EDF5; }
        .cios-note-body h2 { font-size: 22px; font-weight: 800; margin: 16px 0 6px; color: #E8EDF5; }
        .cios-note-body h3 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; color: #E8EDF5; }
        .cios-note-body h4 { font-size: 16px; font-weight: 700; margin: 12px 0 6px; color: #E8EDF5; }
        .cios-note-body p { margin: 6px 0; }
        .cios-note-body ul { list-style: disc outside; padding-left: 28px; margin: 8px 0; }
        .cios-note-body ol { list-style-type: decimal; padding-left: 28px; margin: 8px 0; }
        .cios-note-body ol[type="a"] { list-style-type: lower-alpha; }
        .cios-note-body ol[type="A"] { list-style-type: upper-alpha; }
        .cios-note-body ol[type="i"] { list-style-type: lower-roman; }
        .cios-note-body ol[type="I"] { list-style-type: upper-roman; }
        .cios-note-body li { margin: 2px 0; }
        .cios-note-body blockquote { border-left: 3px solid #1E88E5; padding: 4px 0 4px 12px; margin: 10px 0; color: #B0BEC5; font-style: italic; }
        .cios-note-body pre { background: rgba(255,255,255,0.05); border-radius: 6px; padding: 10px 14px; margin: 10px 0; font-family: ui-monospace, monospace; font-size: 14px; overflow-x: auto; }
        .cios-note-body hr { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 18px 0; }
        .cios-note-body a { color: #42A5F5; text-decoration: underline; }
        .cios-note-body img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .cios-note-body table { border-collapse: collapse; margin: 10px 0; }
        .cios-note-body table td, .cios-note-body table th { border: 1px solid rgba(255,255,255,0.15); padding: 6px 10px; min-width: 60px; }
        .cios-note-body table th { background: rgba(255,255,255,0.05); font-weight: 700; }
        .cios-note-body :focus { outline: none; }
      `}</style>
      {/* Top bar — locked at the top. flex-shrink:0 prevents it from
          collapsing when the textarea content is long. */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0A0E1A", zIndex: 10 }}>
        <button onClick={() => router.push("/notes")} style={iconBtn} aria-label="Back">‹</button>
        {/* Desktop-only title inside header */}
        <input
          className="notes-title-desktop"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          placeholder="Untitled"
          style={{
            flex: 1, minWidth: 0,
            background: "none", border: "none", outline: "none",
            color: "#E8EDF5", fontSize: 15, fontWeight: 700,
            padding: "6px 10px", fontFamily: "'Nunito', sans-serif",
            borderRadius: 6,
          }}
        />
        <div className="notes-title-spacer-mobile" style={{ flex: 1 }} />
        <button onClick={undo} disabled={histIdx <= 0} style={{ ...iconBtn, opacity: histIdx <= 0 ? 0.3 : 1 }} aria-label="Undo">↶</button>
        <button onClick={redo} disabled={histIdx >= history.length - 1} style={{ ...iconBtn, opacity: histIdx >= history.length - 1 ? 0.3 : 1 }} aria-label="Redo">↷</button>
        <button onClick={shareLink} style={iconBtn} aria-label="Share link">↗</button>
        <button onClick={() => setShareOpen(true)} style={iconBtn} aria-label="Collaborate / share with people">👥</button>
        <button onClick={() => setToolsOpen(true)} style={iconBtn} aria-label="Tools">≡</button>
        <SyncBadge status={sync} />
      </div>

      {/* Mobile-only big title row (hidden on desktop because title sits in header) */}
      <input
        className="notes-title-mobile"
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
      {/* Rich-text canvas — contentEditable so formatting renders live. */}
      <div
        ref={editorRef}
        className="cios-note-body"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onBodyChange((e.currentTarget as HTMLDivElement).innerHTML)}
        onBlur={(e) => {
          // Remember selection when user taps a toolbar button (they blur briefly).
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && e.currentTarget.contains(sel.anchorNode)) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
          }
        }}
        style={{
          flex: 1, minHeight: 0,
          outline: "none",
          color: "#E8EDF5", fontSize: 16, lineHeight: 1.7,
          padding: "8px 20px 16px", fontFamily: "'Nunito', sans-serif",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      />

      {/* Word counter */}
      <div style={{ position: "fixed", left: 16, bottom: 74, padding: "4px 10px", background: "rgba(17,24,39,0.9)", color: "#8892A4", fontSize: 10, fontWeight: 700, borderRadius: 6 }}>
        Full text: {wordCount}
      </div>

      {/* Bottom toolbar — locked flush to the bottom of the editor.
          flex-shrink:0 keeps it at its natural height even when the
          textarea content tries to push it out. */}
      <div style={{
        flexShrink: 0,
        width: "100%",
        background: "rgba(10,14,26,0.98)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-around",
          padding: "6px 10px max(6px, env(safe-area-inset-bottom))",
        }}>
          {[
            { key: "format",    label: "Format",    icon: "Aa" },
            { key: "paragraph", label: "Paragraph", icon: "¶" },
            { key: "lists",     label: "Lists",     icon: "☰" },
            { key: "insert",    label: "Insert",    icon: "+" },
            { key: "tools",     label: "Tools",     icon: "⊞",  onClick: () => setToolsOpen(true) },
            { key: "keyboard",  label: "Keyboard",  icon: "⌨",  onClick: () => editorRef.current?.focus() },
          ].map((b) => (
            <button key={b.key}
              onMouseDown={(e) => {
                // Preserve the textarea selection so format/insert ops land in the right place.
                e.preventDefault();
              }}
              onClick={b.onClick || (() => setFormatSheet(b.key as FormatSheetKey))}
              title={b.label} aria-label={b.label}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#B0BEC5",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "4px 6px", minWidth: 52, borderRadius: 8,
              }}>
              <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{b.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.1 }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {formatSheet && (
        <FormatSheet
          which={formatSheet}
          onClose={() => setFormatSheet(null)}
          editorRef={editorRef}
          savedRangeRef={savedRangeRef}
          onHtmlChange={onBodyChange}
        />
      )}

      {toolsOpen && (
        <ToolsSheet
          docTitle={title}
          docHtml={body}
          wordCount={wordCount}
          shareUrl={shareUrl}
          onClose={() => setToolsOpen(false)}
          onSaveAs={() => { setToolsOpen(false); setSaveAsOpen(true); }}
          onFind={() => { setToolsOpen(false); setFindOpen(true); }}
          onPrint={() => { setToolsOpen(false); window.print(); }}
          onTrash={() => { setToolsOpen(false); onTrash(); }}
          onShare={() => { setToolsOpen(false); shareLink(); }}
          onAddToFolder={() => { setToolsOpen(false); onAddToFolder(); }}
          onConvert={() => { setToolsOpen(false); setConvertOpen(true); }}
          onReadAloud={onReadAloud}
          readingAloud={readingAloud}
          onVersions={() => { setToolsOpen(false); setVersionsOpen(true); }}
          onEncrypt={() => { setToolsOpen(false); onEncrypt(); }}
          onAi={onAi}
          aiBusy={aiBusy}
        />
      )}

      {saveAsOpen && (
        <SaveAsSheet
          title={title}
          html={body}
          onRename={(t) => { setTitle(t); setDirty(true); }}
          onClose={() => setSaveAsOpen(false)}
        />
      )}

      {findOpen && (
        <FindBar
          editorRef={editorRef}
          onClose={() => setFindOpen(false)}
        />
      )}

      {convertOpen && (
        <ConvertSheet
          title={title}
          html={body}
          onClose={() => setConvertOpen(false)}
        />
      )}

      {versionsOpen && (
        <VersionsSheet
          noteId={initialNote.id}
          onRestore={(v) => { setTitle(v.title); setBody(v.html); setDirty(true); setVersionsOpen(false); toast.success("Version restored — save to keep"); }}
          onClose={() => setVersionsOpen(false)}
        />
      )}

      {shareOpen && (
        <ShareNoteModal noteId={initialNote.id} noteTitle={title} onClose={() => setShareOpen(false)} />
      )}

      <style>{`
        /* Title always lives in the header — hide the big title row and
           the flex spacer on every screen size. */
        .notes-title-mobile { display: none !important; }
        .notes-title-spacer-mobile { display: none !important; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TOOLS BOTTOM SHEET
   ───────────────────────────────────────────── */

interface ToolsSheetProps {
  docTitle: string;
  docHtml: string;
  wordCount: number;
  shareUrl: string;
  onClose: () => void;
  onSaveAs: () => void;
  onFind: () => void;
  onPrint: () => void;
  onTrash: () => void;
  onShare: () => void;
  onAddToFolder: () => void;
  onConvert: () => void;
  onReadAloud: () => void;
  readingAloud: boolean;
  onVersions: () => void;
  onEncrypt: () => void;
  onAi: (op: "summarize" | "rewrite" | "grammar" | "expand" | "bullets") => () => void;
  aiBusy: string | null;
}

function ToolsSheet(p: ToolsSheetProps) {
  const [showQr, setShowQr] = useState(false);

  const Row = ({ icon, label, hint, onClick, danger }: { icon: string; label: string; hint?: string; onClick?: () => void; danger?: boolean }) => (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14,
      width: "100%", padding: "13px 18px", background: "none", border: "none",
      borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
      color: danger ? "#EF5350" : "#E8EDF5", textAlign: "left",
    }}>
      <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 1 }}>{hint}</div>}
      </div>
      <span style={{ color: "#5A6478" }}>›</span>
    </button>
  );

  return (
    <div onClick={p.onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, maxHeight: "86dvh", overflowY: "auto",
        background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "18px 18px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2B5797", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>W</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{p.docTitle}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>Words: {p.wordCount}</div>
            </div>
          </div>
          <button onClick={p.onClose} style={iconGhost}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 14 }}>
          <QuickBtn icon="💾" label="Save As" onClick={p.onSaveAs} />
          <QuickBtn icon="⌕" label="Find" onClick={p.onFind} />
          <QuickBtn icon="↗" label="Share" onClick={p.onShare} />
          <QuickBtn icon="🖨" label="Print" onClick={p.onPrint} />
        </div>

        <Row icon="📤" label="Send To" hint="Computer / Phone / Other Devices" onClick={() => setShowQr(true)} />
        <Row icon="＋" label="Add To" hint="Add to a folder" onClick={p.onAddToFolder} />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <Row icon="⇄" label="Export / Convert" hint=".pdf · .docx · .md · .txt · .html · image" onClick={p.onConvert} />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 800, padding: "12px 18px 6px", textTransform: "uppercase", letterSpacing: 1 }}>AI Writing</div>
        <Row icon="✨" label={p.aiBusy === "summarize" ? "Summarizing…" : "Summarize"} onClick={p.onAi("summarize")} />
        <Row icon="✎" label={p.aiBusy === "rewrite" ? "Rewriting…" : "Rewrite professionally"} onClick={p.onAi("rewrite")} />
        <Row icon="✓" label={p.aiBusy === "grammar" ? "Fixing…" : "Fix grammar"} onClick={p.onAi("grammar")} />
        <Row icon="⇡" label={p.aiBusy === "expand" ? "Expanding…" : "Expand"} onClick={p.onAi("expand")} />
        <Row icon="•" label={p.aiBusy === "bullets" ? "Bulleting…" : "Convert to bullets"} onClick={p.onAi("bullets")} />
        <Row icon="🎧" label={p.readingAloud ? "Stop reading" : "AI Read Aloud"} onClick={p.onReadAloud} />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <Row icon="⟲" label="Version History" onClick={p.onVersions} />
        <Row icon="🔒" label="Encrypt Document" onClick={p.onEncrypt} />
        <Row icon="ℹ" label="Document Information" onClick={() => alert(`${p.docTitle}\n${p.wordCount} words · ${p.docHtml.length} chars`)} />
        <Row icon="↗" label="Open with Another App" onClick={p.onShare} />

        <div style={{ borderTop: "6px solid #05080F" }} />
        <Row icon="🗑" label="Move to Trash" onClick={p.onTrash} danger />

        <div style={{ height: "calc(12px + env(safe-area-inset-bottom))" }} />
      </div>

      {showQr && <SendToSheet url={p.shareUrl} title={p.docTitle} onClose={() => setShowQr(false)} />}
    </div>
  );
}

function SendToSheet({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const copyLink = async () => { try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); } };
  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return; }
    try { await navigator.share({ title, url }); } catch {}
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0D1220", borderRadius: 16, padding: 22, maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>📤 Send to another device</div>
          <button onClick={onClose} style={iconGhost}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 14 }}>Scan this on your phone or another computer:</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeUrl(url, 240)} alt="QR code" width={240} height={240} style={{ borderRadius: 10, background: "#fff", padding: 8 }} />
        <div style={{ fontSize: 10, color: "#5A6478", margin: "12px 0", wordBreak: "break-all" }}>{url}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={nativeShare} style={{ padding: "8px 14px", background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📱 Share</button>
          <button onClick={copyLink} style={{ padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔗 Copy link</button>
        </div>
      </div>
    </div>
  );
}

/** Auto-save status pill. Mirrors Notion/Docs/Word Web behaviour. */
function SyncBadge({ status }: { status: "saved" | "saving" | "offline" | "pending" }) {
  const cfg =
    status === "saving"  ? { label: "Saving…",  color: "#FFC107", dot: "#FFC107", spin: true } :
    status === "pending" ? { label: "Syncing…", color: "#42A5F5", dot: "#42A5F5", spin: true } :
    status === "offline" ? { label: "Offline",  color: "#EF5350", dot: "#EF5350", spin: false } :
                           { label: "Saved",    color: "#66BB6A", dot: "#66BB6A", spin: false };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 12px", borderRadius: 999,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
      color: cfg.color, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: cfg.dot,
        animation: cfg.spin ? "cios-pulse 1s infinite" : "none",
      }} />
      {cfg.label}
      <style>{`@keyframes cios-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </div>
  );
}

/** "Save As" — export the document in a chosen format. Lets user rename first. */
function SaveAsSheet({ title, html, onRename, onClose }: { title: string; html: string; onRename: (t: string) => void; onClose: () => void }) {
  const [name, setName] = useState(title.replace(/\.[^.]+$/, ""));

  const formats: Array<{ ext: string; label: string; color: string; run: (t: string, h: string) => void }> = [
    { ext: ".pdf",   label: "PDF document",     color: "#EF5350", run: exportAsPdf },
    { ext: ".docx",  label: "Word document",    color: "#2B5797", run: exportAsDoc },
    { ext: ".md",    label: "Markdown",         color: "#00897B", run: exportAsMarkdown },
    { ext: ".txt",   label: "Plain text",       color: "#8892A4", run: exportAsTxt },
    { ext: ".html",  label: "Web page (HTML)",  color: "#FF7043", run: exportAsHtml },
    { ext: ".png",   label: "Image (PNG)",      color: "#AB47BC", run: (t, h) => exportAsImage(t, h) },
  ];

  const save = (fmt: typeof formats[number]) => {
    const finalName = (name.trim() || "document");
    onRename(finalName + fmt.ext);
    fmt.run(finalName, html);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 95, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 0 0", maxHeight: "86dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>💾 Save As</div>
          <button onClick={onClose} style={iconGhost}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, marginBottom: 6 }}>File name</div>
          <input
            value={name} onChange={(e) => setName(e.target.value)} autoFocus
            placeholder="document"
            style={{ width: "100%", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 14, outline: "none" }}
          />
          <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, margin: "18px 0 8px" }}>Save as type</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {formats.map((f) => (
              <button key={f.ext} onClick={() => save(f)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
                color: "#E8EDF5", textAlign: "left", cursor: "pointer",
              }}>
                <span style={{ width: 40, height: 40, borderRadius: 8, background: f.color, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{f.ext.replace(".", "").toUpperCase().slice(0, 4)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>{name.trim() || "document"}{f.ext}</div>
                </div>
                <span style={{ color: "#5A6478" }}>⬇</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: "calc(12px + env(safe-area-inset-bottom))" }} />
      </div>
    </div>
  );
}

/** In-editor find bar with next/prev + live highlight using native window.find. */
function FindBar({ editorRef, onClose }: { editorRef: React.RefObject<HTMLDivElement | null>; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [count, setCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Live count matches so user sees how many
  useEffect(() => {
    if (!editorRef.current) { setCount(0); return; }
    if (!q) { setCount(0); return; }
    const text = editorRef.current.innerText || "";
    try {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      setCount((text.match(re) || []).length);
    } catch { setCount(0); }
  }, [q, editorRef]);

  const jump = (backward: boolean) => {
    if (!q) return;
    editorRef.current?.focus();
    // window.find works in Chrome, Safari, Firefox (deprecated but ubiquitous).
    // Args: search, caseSensitive, backward, wrap, wholeWord, searchFrames, showDialog
    const w = window as unknown as { find?: (s: string, cs?: boolean, bw?: boolean, wr?: boolean, ww?: boolean, sf?: boolean, sd?: boolean) => boolean };
    w.find?.(q, false, backward, true, false, false, false);
  };

  return (
    <div style={{
      position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
      zIndex: 85, display: "flex", alignItems: "center", gap: 8,
      background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    }}>
      <span style={{ color: "#8892A4", padding: "0 4px 0 10px", fontSize: 14 }}>⌕</span>
      <input
        ref={inputRef}
        value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onClose(); }
          if (e.key === "Enter") { e.preventDefault(); jump(e.shiftKey); }
        }}
        placeholder="Find in document"
        style={{ background: "none", border: "none", outline: "none", color: "#E8EDF5", fontSize: 13, width: 220, padding: "6px 4px" }}
      />
      <div style={{ fontSize: 10, color: "#8892A4", minWidth: 40, textAlign: "center" }}>
        {q ? `${count} match${count === 1 ? "" : "es"}` : ""}
      </div>
      <button onClick={() => jump(true)} title="Previous (Shift+Enter)" style={{ ...iconGhost, padding: "4px 8px" }}>↑</button>
      <button onClick={() => jump(false)} title="Next (Enter)" style={{ ...iconGhost, padding: "4px 8px" }}>↓</button>
      <button onClick={onClose} title="Close (Esc)" style={{ ...iconGhost, padding: "4px 10px" }}>✕</button>
    </div>
  );
}

/** One of the bottom-toolbar format categories. */
type FormatSheetKey = "format" | "paragraph" | "lists" | "insert";

/** A single tile inside a format sheet. */
interface SheetItem {
  icon: string;
  label: string;
  style?: React.CSSProperties;
  op?: RichCmd;   // one of the declarative rich-text commands
  fn?: () => void; // or an arbitrary handler (prompts, custom HTML, etc.)
}
/** A titled group of SheetItems rendered in a sub-section. */
interface SheetGroup {
  title: string;
  items: SheetItem[];
}

function FormatSheet({ which, onClose, editorRef, savedRangeRef, onHtmlChange }: {
  which: FormatSheetKey;
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  savedRangeRef: React.RefObject<Range | null>;
  onHtmlChange: (html: string) => void;
}) {
  const apply = (op: RichCmd) => {
    runRichCmd(editorRef, savedRangeRef.current, op, onHtmlChange);
    onClose();
  };

  /** Helper: build an ordered list with a specific numbering type. */
  const orderedList = (type: "1" | "a" | "A" | "i" | "I") =>
    ({ type: "insertHtml", html: `<ol type="${type}"><li></li></ol>` } as RichCmd);

  const formatGroups: SheetGroup[] = [
    {
      title: "Basic",
      items: [
        { icon: "B", label: "Bold",      style: { fontWeight: 900 },                                   op: { type: "exec", cmd: "bold" } },
        { icon: "I", label: "Italic",    style: { fontStyle: "italic", fontWeight: 700 },              op: { type: "exec", cmd: "italic" } },
        { icon: "U", label: "Underline", style: { textDecoration: "underline", fontWeight: 700 },      op: { type: "exec", cmd: "underline" } },
        { icon: "S", label: "Strike",    style: { textDecoration: "line-through", fontWeight: 700 },   op: { type: "exec", cmd: "strikeThrough" } },
      ],
    },
    {
      title: "Advanced",
      items: [
        { icon: "</>", label: "Inline code", style: { fontFamily: "monospace", fontSize: 14 },         op: { type: "wrapHtml", before: '<code style="background:rgba(255,255,255,0.08);padding:2px 5px;border-radius:4px;font-family:monospace;">', after: "</code>" } },
        { icon: "Hᵢ",  label: "Highlight",   style: { fontWeight: 800, background: "#FFC107", color: "#111", padding: "1px 4px", borderRadius: 3 }, op: { type: "wrapHtml", before: '<mark style="background:#FFC107;color:#111;padding:1px 3px;border-radius:3px;">', after: "</mark>" } },
        { icon: "X²",  label: "Superscript", style: { fontSize: 13 },                                  op: { type: "exec", cmd: "superscript" } },
        { icon: "X₂",  label: "Subscript",   style: { fontSize: 13 },                                  op: { type: "exec", cmd: "subscript" } },
      ],
    },
    {
      title: "Colour",
      items: [
        { icon: "A",  label: "Red",    style: { color: "#EF5350" }, op: { type: "exec", cmd: "foreColor", value: "#EF5350" } },
        { icon: "A",  label: "Blue",   style: { color: "#42A5F5" }, op: { type: "exec", cmd: "foreColor", value: "#42A5F5" } },
        { icon: "A",  label: "Green",  style: { color: "#66BB6A" }, op: { type: "exec", cmd: "foreColor", value: "#66BB6A" } },
        { icon: "A",  label: "Yellow", style: { color: "#FFC107" }, op: { type: "exec", cmd: "foreColor", value: "#FFC107" } },
        { icon: "A",  label: "Default", op: { type: "exec", cmd: "foreColor", value: "#E8EDF5" } },
        { icon: "⌫",  label: "Clear formatting", op: { type: "exec", cmd: "removeFormat" } },
      ],
    },
  ];

  const paragraphGroups: SheetGroup[] = [
    {
      title: "Headings",
      items: [
        { icon: "H1", label: "Heading 1", style: { fontWeight: 900 }, op: { type: "block", tag: "h1" } },
        { icon: "H2", label: "Heading 2", style: { fontWeight: 800 }, op: { type: "block", tag: "h2" } },
        { icon: "H3", label: "Heading 3", style: { fontWeight: 700 }, op: { type: "block", tag: "h3" } },
        { icon: "H4", label: "Heading 4", style: { fontWeight: 700, fontSize: 15 }, op: { type: "block", tag: "h4" } },
        { icon: "¶",  label: "Paragraph", op: { type: "block", tag: "p" } },
      ],
    },
    {
      title: "Alignment",
      items: [
        { icon: "⇤", label: "Align left",    op: { type: "exec", cmd: "justifyLeft" } },
        { icon: "≡", label: "Align center",  op: { type: "exec", cmd: "justifyCenter" } },
        { icon: "⇥", label: "Align right",   op: { type: "exec", cmd: "justifyRight" } },
        { icon: "⇔", label: "Justify",       op: { type: "exec", cmd: "justifyFull" } },
      ],
    },
    {
      title: "Indent & blocks",
      items: [
        { icon: "→",  label: "Indent",      op: { type: "exec", cmd: "indent" } },
        { icon: "←",  label: "Outdent",     op: { type: "exec", cmd: "outdent" } },
        { icon: "❝",  label: "Quote",       op: { type: "block", tag: "blockquote" } },
        { icon: "{}", label: "Code block",  op: { type: "insertHtml", html: "<pre><code>code here</code></pre>" } },
      ],
    },
  ];

  const listsGroups: SheetGroup[] = [
    {
      title: "Bullets & tasks",
      items: [
        { icon: "•", label: "Bullet list",  op: { type: "exec", cmd: "insertUnorderedList" } },
        { icon: "☐", label: "Checklist",    op: { type: "insertHtml", html: `<ul style="list-style:none;padding-left:4px;"><li><input type="checkbox" disabled /> </li></ul>` } },
      ],
    },
    {
      title: "Numbered (1, 2, 3…)",
      items: [
        { icon: "1.",  label: "1, 2, 3",    op: orderedList("1") },
        { icon: "a.",  label: "a, b, c",    op: orderedList("a") },
        { icon: "A.",  label: "A, B, C",    op: orderedList("A") },
        { icon: "i.",  label: "i, ii, iii", op: orderedList("i") },
        { icon: "I.",  label: "I, II, III", op: orderedList("I") },
      ],
    },
  ];

  const insertGroups: SheetGroup[] = [
    {
      title: "Media",
      items: [
        { icon: "🔗", label: "Link",   fn: () => { const url = prompt("Enter URL:"); if (url) runRichCmd(editorRef, savedRangeRef.current, { type: "exec", cmd: "createLink", value: url }, onHtmlChange); onClose(); } },
        { icon: "🖼", label: "Image",  fn: () => { const url = prompt("Image URL:"); if (url) runRichCmd(editorRef, savedRangeRef.current, { type: "insertHtml", html: `<img src="${url}" alt="" />` }, onHtmlChange); onClose(); } },
        { icon: "▥",  label: "Table",  fn: () => {
          const cols = parseInt(prompt("Columns?", "3") || "3", 10);
          const rows = parseInt(prompt("Rows?", "3") || "3", 10);
          if (!cols || !rows) return;
          const headers = Array(cols).fill(0).map((_, i) => `<th>Col ${i + 1}</th>`).join("");
          const body = Array(rows).fill(0).map(() => `<tr>${Array(cols).fill("<td></td>").join("")}</tr>`).join("");
          runRichCmd(editorRef, savedRangeRef.current, { type: "insertHtml", html: `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table><p></p>` }, onHtmlChange);
          onClose();
        } },
      ],
    },
    {
      title: "Breaks",
      items: [
        { icon: "―", label: "Divider",       op: { type: "insertHtml", html: "<hr />" } },
        { icon: "⏎", label: "New paragraph", op: { type: "insertHtml", html: "<p><br/></p>" } },
        { icon: "↵", label: "Line break",    op: { type: "insertHtml", html: "<br />" } },
      ],
    },
    {
      title: "Date & time",
      items: [
        { icon: "📅", label: "Today's date",  op: { type: "insertHtml", html: new Date().toLocaleDateString() } },
        { icon: "⏱", label: "Timestamp",      op: { type: "insertHtml", html: new Date().toLocaleString() } },
        { icon: "🕐", label: "Time only",     op: { type: "insertHtml", html: new Date().toLocaleTimeString() } },
      ],
    },
  ];

  const config: { title: string; groups: SheetGroup[] } = {
    format:    { title: "Text formatting", groups: formatGroups },
    paragraph: { title: "Paragraph",       groups: paragraphGroups },
    lists:     { title: "Lists",           groups: listsGroups },
    insert:    { title: "Insert",          groups: insertGroups },
  }[which];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520,
        background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "18px 18px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>{config.title}</div>
          <button onClick={onClose} style={iconGhost}>✕</button>
        </div>
        <div style={{ padding: "8px 14px 0", maxHeight: "72dvh", overflowY: "auto" }}>
          {config.groups.map((g) => (
            <div key={g.title} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, margin: "8px 4px 6px" }}>
                {g.title}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {g.items.map((it) => (
                  <button key={it.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { if (it.fn) it.fn(); else if (it.op) apply(it.op); }}
                    title={it.label}
                    style={{
                      background: "#111827", border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 10, padding: "12px 6px",
                      cursor: "pointer", color: "#E8EDF5",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      minHeight: 60,
                    }}>
                    <span style={{ fontSize: 16, lineHeight: 1, ...(it.style || {}) }}>{it.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.15 }}>{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: "calc(10px + env(safe-area-inset-bottom))" }} />
      </div>
    </div>
  );
}

function ConvertSheet({ title, html, onClose }: { title: string; html: string; onClose: () => void }) {
  const formats = [
    { icon: "W",    label: "Word (.doc)",  hint: "Opens in Microsoft Word, Google Docs, LibreOffice", run: () => exportAsDoc(title, html) },
    { icon: "M",    label: "Markdown (.md)", hint: "Plain markdown — ideal for GitHub, Obsidian, Notion", run: () => exportAsMarkdown(title, html) },
    { icon: "T",    label: "Plain text (.txt)", hint: "No formatting — just the words", run: () => exportAsTxt(title, html) },
    { icon: "{ }",  label: "HTML (.html)", hint: "Self-contained web page", run: () => exportAsHtml(title, html) },
    { icon: "🖼",   label: "Image (.png)",  hint: "High-resolution screenshot of the document", run: () => exportAsImage(title, html) },
    { icon: "📄",   label: "PDF",           hint: "Browser print dialog → Save as PDF", run: () => exportAsPdf(title, html) },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 0 0", maxHeight: "80dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>Convert & Export</div>
          <button onClick={onClose} style={iconGhost}>✕</button>
        </div>
        {formats.map((f) => (
          <button key={f.label} onClick={() => { f.run(); onClose(); }} style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            padding: "13px 18px", background: "none", border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#E8EDF5", textAlign: "left", cursor: "pointer",
          }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{f.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{f.hint}</div>
            </div>
            <span style={{ color: "#5A6478" }}>⬇</span>
          </button>
        ))}
        <div style={{ height: "calc(12px + env(safe-area-inset-bottom))" }} />
      </div>
    </div>
  );
}

function VersionsSheet({ noteId, onRestore, onClose }: { noteId: string; onRestore: (v: NoteVersion) => void; onClose: () => void }) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  useEffect(() => { setVersions(listVersions(noteId)); }, [noteId]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 0 0", maxHeight: "80dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>⟲ Version history</div>
            <div style={{ fontSize: 10, color: "#8892A4" }}>Last {versions.length} snapshots · saved automatically on each Save</div>
          </div>
          <button onClick={onClose} style={iconGhost}>✕</button>
        </div>
        {versions.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
            No versions yet — hit Save to create your first snapshot.
          </div>
        )}
        {versions.map((v, i) => (
          <button key={v.at} onClick={() => onRestore(v)} style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "12px 18px", background: "none", border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#E8EDF5", textAlign: "left", cursor: "pointer",
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: i === 0 ? "rgba(102,187,106,0.15)" : "#111827", color: i === 0 ? "#66BB6A" : "#8892A4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
              {i === 0 ? "★" : `#${i + 1}`}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title || "Untitled"}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>{new Date(v.at).toLocaleString()} · {v.wordCount} words</div>
            </div>
            <span style={{ color: "#5A6478", fontSize: 12 }}>Restore</span>
          </button>
        ))}
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

/**
 * WYSIWYG text operations for a contentEditable canvas.
 *
 * We use document.execCommand — it's technically deprecated but still
 * implemented by every modern browser and is the simplest way to get
 * real bold/italic/underline/etc. without pulling in a full rich-text
 * library. Each helper restores a saved Range first so taps in a modal
 * sheet operate on the user's original selection.
 */
export type RichCmd =
  | { type: "exec"; cmd: string; value?: string }
  | { type: "block"; tag: string }
  | { type: "wrapHtml"; before: string; after: string }
  | { type: "insertHtml"; html: string };

function restoreRange(ref: React.RefObject<HTMLDivElement | null>, saved: Range | null) {
  const el = ref.current; if (!el) return;
  el.focus();
  if (saved) {
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(saved); }
  }
}

function runRichCmd(
  ref: React.RefObject<HTMLDivElement | null>,
  saved: Range | null,
  op: RichCmd,
  onHtmlChange: (html: string) => void,
) {
  const el = ref.current; if (!el) return;
  restoreRange(ref, saved);
  try {
    if (op.type === "exec") {
      document.execCommand(op.cmd, false, op.value);
    } else if (op.type === "block") {
      document.execCommand("formatBlock", false, op.tag);
    } else if (op.type === "wrapHtml") {
      document.execCommand("insertHTML", false, op.before + (window.getSelection()?.toString() || "") + op.after);
    } else if (op.type === "insertHtml") {
      document.execCommand("insertHTML", false, op.html);
    }
  } catch { /* silently ignore unsupported commands */ }
  // Push the fresh DOM state back into React
  onHtmlChange(el.innerHTML);
}

const iconBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#E8EDF5",
  width: 38, height: 38, borderRadius: 10, cursor: "pointer",
  fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
};
const iconGhost: React.CSSProperties = { background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18, padding: 6 };
