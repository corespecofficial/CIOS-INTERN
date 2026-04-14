"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";
import { aiNoteAssist } from "@/app/actions/notes";
import { TiptapEditor } from "@/components/notes/tiptap-editor";

/* ────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────── */

type NoteStatus = "draft" | "final" | "shared" | "private";

interface Note {
  id: string;
  title: string;
  html: string;
  color: string;
  icon: string;
  cover_url: string | null;
  folder: string | null;          // folder name, null = inbox
  tags: string[];
  status: NoteStatus;
  starred: boolean;
  pinned: boolean;
  archived: boolean;
  trashed_at: string | null;      // ISO when trashed
  created_at: string;
  updated_at: string;
}

const COLORS = ["#1E88E5", "#66BB6A", "#FFC107", "#EF5350", "#AB47BC", "#26C6DA", "#FF7043"];
const ICONS = ["📝", "📄", "📓", "📔", "📕", "📗", "📘", "📙", "📚", "📒", "✨", "🎯", "💡", "🚀", "🔥", "⭐", "🧠", "💼", "🎨", "🔬"];
const STORAGE_KEY = "cios-notes-v2";
const TRASH_RETENTION_DAYS = 30;

/* ────────────────────────────────────────────────────────────
   TEMPLATES
   ──────────────────────────────────────────────────────────── */

const TEMPLATES: Array<{ id: string; name: string; icon: string; html: string }> = [
  {
    id: "meeting", name: "Meeting Notes", icon: "🤝",
    html: `<h1>Meeting Notes</h1><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h2>Agenda</h2><ul><li></li></ul><h2>Discussion</h2><p></p><h2>Action Items</h2><ul><li></li></ul><h2>Next steps</h2><p></p>`,
  },
  {
    id: "weekly", name: "Weekly Report", icon: "📊",
    html: `<h1>Weekly Report — Week of </h1><h2>This week's wins</h2><ul><li></li></ul><h2>Challenges</h2><ul><li></li></ul><h2>Metrics</h2><p></p><h2>Plan for next week</h2><ul><li></li></ul>`,
  },
  {
    id: "resume", name: "Resume Draft", icon: "📄",
    html: `<h1>Your Name</h1><p>Email · Phone · Location · LinkedIn</p><h2>Summary</h2><p></p><h2>Experience</h2><p><strong>Role · Company · Dates</strong></p><ul><li></li></ul><h2>Education</h2><p></p><h2>Skills</h2><p></p>`,
  },
  {
    id: "course", name: "Course Notes", icon: "📚",
    html: `<h1>Course Title — Lesson #</h1><h2>Key concepts</h2><ul><li></li></ul><h2>Examples</h2><p></p><h2>Questions to follow up</h2><ul><li></li></ul><h2>Personal takeaway</h2><p></p>`,
  },
  {
    id: "proposal", name: "Business Proposal", icon: "💼",
    html: `<h1>Project Proposal</h1><h2>Executive Summary</h2><p></p><h2>Problem</h2><p></p><h2>Proposed Solution</h2><p></p><h2>Timeline</h2><p></p><h2>Budget</h2><p></p><h2>Outcome</h2><p></p>`,
  },
  {
    id: "content-cal", name: "Content Calendar", icon: "📅",
    html: `<h1>Content Calendar — Month</h1><h2>Themes</h2><ul><li></li></ul><h2>Posts</h2><p>| Date | Channel | Topic | Status |</p><p>| ---- | ------- | ----- | ------ |</p><p>|      |         |       |        |</p>`,
  },
  {
    id: "research", name: "Research Sheet", icon: "🔬",
    html: `<h1>Research: </h1><h2>Question</h2><p></p><h2>Sources</h2><ol><li></li></ol><h2>Findings</h2><p></p><h2>Analysis</h2><p></p><h2>Conclusion</h2><p></p>`,
  },
  {
    id: "project", name: "Project Plan", icon: "🎯",
    html: `<h1>Project Plan</h1><h2>Goals</h2><ul><li></li></ul><h2>Scope</h2><p></p><h2>Milestones</h2><ol><li></li></ol><h2>Risks</h2><p></p><h2>Owner</h2><p></p>`,
  },
];

/* ────────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────────── */

const uid = () => `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const wordCount = (html: string) => { const t = stripHtml(html); return t ? t.split(/\s+/).length : 0; };
const readingTime = (html: string) => Math.max(1, Math.round(wordCount(html) / 200));

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/g, "\n")
    .replace(/<li[^>]*>/g, "- ")
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<b>(.*?)<\/b>/g, "**$1**")
    .replace(/<em>(.*?)<\/em>/g, "_$1_")
    .replace(/<i>(.*?)<\/i>/g, "_$1_")
    .replace(/<u>(.*?)<\/u>/g, "$1")
    .replace(/<h1>(.*?)<\/h1>/g, "# $1\n")
    .replace(/<h2>(.*?)<\/h2>/g, "## $1\n")
    .replace(/<h3>(.*?)<\/h3>/g, "### $1\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function download(filename: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    // Auto-purge trash older than retention window
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 86400_000;
    return parsed.filter((n) => !n.trashed_at || new Date(n.trashed_at).getTime() > cutoff);
  } catch { return []; }
}

function saveNotes(notes: Note[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

function makeNote(patch: Partial<Note> = {}): Note {
  return {
    id: uid(), title: "Untitled note", html: "",
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    icon: "📝", cover_url: null, folder: null, tags: [],
    status: "draft", starred: false, pinned: false, archived: false,
    trashed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...patch,
  };
}

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────── */

type View = "all" | "starred" | "shared" | "trash" | "templates";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const [folder, setFolder] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">("updated");
  const [focusMode, setFocusMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showMobileToolbar, setShowMobileToolbar] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [collabOn, setCollabOn] = useState(false);
  const [suggestionMode, setSuggestionMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Hydrate
  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    if (loaded[0]) setActiveId(loaded.find((n) => !n.trashed_at)?.id || null);
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => { if (hydrated) saveNotes(notes); }, [notes, hydrated]);

  const active = notes.find((n) => n.id === activeId) || null;

  // Sync editor HTML when switching notes
  useEffect(() => {
    if (editorRef.current && active) editorRef.current.innerHTML = active.html || "";
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) if (n.folder && !n.trashed_at) set.add(n.folder);
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let list = notes.slice();
    if (view === "trash") list = list.filter((n) => n.trashed_at);
    else list = list.filter((n) => !n.trashed_at);
    if (view === "starred") list = list.filter((n) => n.starred);
    if (view === "shared") list = list.filter((n) => n.status === "shared");
    if (folder !== null && view === "all") list = list.filter((n) => n.folder === folder);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) => (n.title + " " + stripHtml(n.html) + " " + (n.tags || []).join(" ")).toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "created") return b.created_at.localeCompare(a.created_at);
      return b.updated_at.localeCompare(a.updated_at);
    });
    return list;
  }, [notes, view, folder, search, sortBy]);

  /* ── Note CRUD ── */
  const createNote = (template?: typeof TEMPLATES[number]) => {
    const note = makeNote(template ? { title: template.name, html: template.html, icon: template.icon } : {});
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
    setView("all"); setFolder(null);
    setTimeout(() => titleRef.current?.focus(), 50);
    toast.success(template ? `Created from "${template.name}"` : "Note created");
  };
  const updateActive = (patch: Partial<Note>) => {
    if (!active) return;
    setNotes((prev) => prev.map((n) => n.id === active.id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n));
  };
  const trashActive = () => {
    if (!active) return;
    setNotes((prev) => prev.map((n) => n.id === active.id ? { ...n, trashed_at: new Date().toISOString() } : n));
    setActiveId(notes.find((n) => n.id !== active.id && !n.trashed_at)?.id || null);
    toast.success("Moved to trash");
  };
  const restoreNote = (id: string) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, trashed_at: null } : n));
    toast.success("Restored");
  };
  const permanentDelete = (id: string) => {
    if (!confirm("Delete forever? This cannot be undone.")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
  };
  const duplicateActive = () => {
    if (!active) return;
    const dup = makeNote({ ...active, id: uid(), title: active.title + " (copy)", created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    setNotes((prev) => [dup, ...prev]); setActiveId(dup.id);
    toast.success("Duplicated");
  };

  /* ── Editor toolbar ── */
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    if (editorRef.current) updateActive({ html: editorRef.current.innerHTML });
  };
  const insertChecklist = () => exec("insertHTML", '<ul style="list-style:none;padding-left:0"><li><input type="checkbox" /> </li></ul>');
  const insertCode = () => exec("insertHTML", '<pre style="background:#0A0E1A;border:1px solid rgba(255,255,255,0.1);padding:12px;border-radius:8px;font-family:monospace;font-size:13px;overflow-x:auto"><code></code></pre><p></p>');
  const insertDivider = () => exec("insertHTML", '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:16px 0" />');
  const insertTable = () => {
    const cell = '<td style="border:1px solid rgba(255,255,255,0.15);padding:8px;min-width:80px"><br/></td>';
    const row = `<tr>${cell.repeat(3)}</tr>`;
    exec("insertHTML", `<table style="border-collapse:collapse;margin:8px 0">${row.repeat(3)}</table><p></p>`);
  };
  const insertEmoji = () => {
    const e = prompt("Emoji to insert (or paste any character):");
    if (e) exec("insertText", e);
  };
  const insertLink = () => {
    const url = prompt("Link URL:");
    if (url) exec("createLink", url);
  };

  /* ── AI assist ── */
  const runAi = async (op: "summarize" | "rewrite" | "grammar" | "expand" | "bullets" | "translate") => {
    if (!active) return;
    const sel = window.getSelection?.();
    const selText = sel && sel.toString().trim();
    const text = selText || stripHtml(active.html);
    if (!text || text.length < 5) { toast.error("Write or select something first"); return; }
    const target = op === "translate" ? (prompt("Translate to which language?", "English") || "English") : undefined;
    const t = toast.loading(`AI: ${op}…`);
    const r = await aiNoteAssist(op, text, target);
    if (!r.ok) { toast.error(r.error, { id: t }); return; }
    toast.success("Done", { id: t });
    // Append result as a quoted block under the current note
    const html = `<blockquote style="border-left:3px solid #26C6DA;background:rgba(38,198,218,0.06);padding:8px 12px;margin:8px 0"><div style="font-size:10px;font-weight:700;color:#26C6DA;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">🤖 AI · ${op}</div>${r.data!.output.replace(/\n/g, "<br/>")}</blockquote>`;
    if (editorRef.current) {
      editorRef.current.innerHTML += html;
      updateActive({ html: editorRef.current.innerHTML });
    }
  };

  /* ── Cover upload ── */
  const onPickCover = async (file: File) => {
    const t = toast.loading("Uploading cover…");
    try {
      const compressed = await compressImage(file, { maxBytes: 2 * 1024 * 1024 });
      const up = await uploadToCloudinary(compressed, { folder: "cios-notes/covers", resourceType: "image" });
      updateActive({ cover_url: up.secureUrl });
      toast.success("Cover set", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
  };

  /* ── Exports ── */
  const baseFilename = (n: Note) => (n.title || "untitled").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const exportMd = () => { if (!active) return; download(`${baseFilename(active)}.md`, `# ${active.title}\n\n${htmlToMarkdown(active.html)}\n`, "text/markdown"); toast.success("Markdown downloaded"); };
  const exportTxt = () => { if (!active) return; download(`${baseFilename(active)}.txt`, `${active.title}\n\n${stripHtml(active.html)}\n`, "text/plain"); toast.success("Text downloaded"); };
  const exportHtml = () => {
    if (!active) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${active.title}</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#222;line-height:1.6}h1,h2,h3{font-family:'Space Grotesk',sans-serif}img{max-width:100%}pre{background:#f5f5f5;padding:12px;border-radius:6px}</style></head><body><h1>${active.title}</h1>${active.html}</body></html>`;
    download(`${baseFilename(active)}.html`, html, "text/html");
    toast.success("HTML downloaded");
  };
  const printDoc = () => {
    if (!active) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Pop-up blocked"); return; }
    w.document.write(`<!doctype html><html><head><title>${active.title}</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#222;line-height:1.6;max-width:760px;margin:0 auto}h1,h2,h3{font-family:'Space Grotesk',sans-serif}img{max-width:100%}pre{background:#f5f5f5;padding:12px;border-radius:6px}@media print{body{padding:24px}}</style></head><body><h1>${active.title}</h1>${active.html}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
  const sharePublic = async () => {
    if (!active) return;
    // Encode the note inline to share (no DB) — works for public read-only shares
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ title: active.title, html: active.html, icon: active.icon }))));
    const url = `${window.location.origin}/notes/shared#${payload}`;
    try { await navigator.clipboard.writeText(url); toast.success("Public link copied"); }
    catch { prompt("Copy this link:", url); }
    updateActive({ status: "shared" });
  };

  /* ── Render ── */

  if (!hydrated) {
    return <div style={{ padding: 40, color: "#8892A4" }}>Loading…</div>;
  }

  const wc = active ? wordCount(active.html) : 0;
  const rt = active ? readingTime(active.html) : 0;

  return (
    <div className="cios-notes-root" style={{ display: "flex", gap: 14, height: "calc(100vh - 110px)", minHeight: 600, fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        .cios-notes-sidebar { width: 300px; flex-shrink: 0; background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
        .cios-notes-editor { flex: 1; background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .cios-notes-toolbar { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); align-items: center; }
        .cios-notes-tb { background: transparent; border: 1px solid rgba(255,255,255,0.07); color: #E8EDF5; min-width: 34px; height: 32px; padding: 0 10px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .cios-notes-tb:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
        .cios-notes-sep { width: 1px; background: rgba(255,255,255,0.08); margin: 4px 6px; height: 22px; }
        /* Editor surface — more breathable padding + typography */
        .cios-notes-editor-surface { flex: 1; padding: 40px 64px 56px; overflow-y: auto; outline: none; font-size: 16px; line-height: 1.75; color: #E8EDF5; max-width: 820px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        .cios-notes-editor-surface:empty:before { content: attr(data-placeholder); color: #5A6478; pointer-events: none; }
        .cios-notes-editor-surface h1 { font-family: 'Space Grotesk', sans-serif; font-size: 34px; font-weight: 800; margin: 24px 0 14px; letter-spacing: -0.5px; }
        .cios-notes-editor-surface h2 { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; margin: 20px 0 10px; }
        .cios-notes-editor-surface h3 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
        .cios-notes-editor-surface p { margin: 10px 0; }
        .cios-notes-editor-surface ul, .cios-notes-editor-surface ol { padding-left: 28px; margin: 12px 0; }
        .cios-notes-editor-surface li { margin: 4px 0; }
        .cios-notes-editor-surface a { color: #1E88E5; text-decoration: underline; text-underline-offset: 2px; }
        .cios-notes-editor-surface img { max-width: 100%; border-radius: 10px; margin: 14px 0; }
        .cios-notes-editor-surface blockquote { border-left: 3px solid #1E88E5; margin: 14px 0; padding: 8px 18px; color: #B0BEC5; background: rgba(30,136,229,0.04); border-radius: 0 8px 8px 0; }
        .cios-notes-editor-surface pre { background: #0A0E1A; padding: 16px; border-radius: 10px; overflow-x: auto; margin: 14px 0; border: 1px solid rgba(255,255,255,0.05); }
        .cios-notes-editor-surface code { background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        .cios-notes-editor-surface table { border-collapse: collapse; margin: 14px 0; }
        .cios-notes-editor-surface hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 28px 0; }
        .cios-notes-mobile-fab { display: none; }

        @media (max-width: 768px) {
          .cios-notes-root { flex-direction: column !important; height: calc(100dvh - 56px - 80px) !important; gap: 8px !important; min-height: 0; }
          .cios-notes-sidebar {
            width: 100% !important;
            display: ${activeId ? "none" : "flex"} !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            height: 100% !important;
            border-radius: 12px !important;
          }
          .cios-notes-editor { border-radius: 12px !important; border: 1px solid rgba(255,255,255,0.07) !important; height: 100%; min-height: 0; flex: 1 1 auto; display: ${activeId ? "flex" : "none"} !important; }
          .cios-notes-toolbar { display: none !important; }
          .cios-notes-toolbar.open { display: flex !important; position: fixed; left: 0; right: 0; bottom: 0; z-index: 900; background: #111827; border-top: 1px solid rgba(255,255,255,0.1); padding: 10px 12px; overflow-x: auto; flex-wrap: nowrap !important; }
          .cios-notes-editor-surface { padding: 20px 16px 90px !important; font-size: 15px; }
          .cios-notes-mobile-fab { display: flex !important; }
          .cios-notes-mobile-back { display: inline-flex !important; }
        }
        .cios-notes-mobile-back { display: none; }
        .focus-mode .cios-notes-sidebar, .focus-mode .cios-notes-toolbar, .focus-mode .cios-notes-meta { display: none !important; }
        .focus-mode .cios-notes-editor-surface { padding: 60px max(40px, 12vw) 100px !important; max-width: 800px; margin: 0 auto; }
      `}</style>

      <div className={focusMode ? "focus-mode" : ""} style={{ display: "contents" }}>
        {/* ── LEFT SIDEBAR ── */}
        <aside className="cios-notes-sidebar">
          <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📚 Notes</h2>
              <button onClick={() => createNote()} title="New note" style={{ background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ New</button>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search…" style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#E8EDF5", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 2 }}>
            {(["all", "starred", "shared", "trash"] as View[]).map((v) => (
              <button key={v} onClick={() => { setView(v); setFolder(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: view === v ? "rgba(30,136,229,0.12)" : "transparent", border: "none", borderRadius: 8, color: view === v ? "#1E88E5" : "#E8EDF5", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", textTransform: "capitalize" }}>
                {v === "all" ? "🗂 All notes" : v === "starred" ? "⭐ Starred" : v === "shared" ? "🔗 Shared" : "🗑 Trash"}
              </button>
            ))}
            <button onClick={() => { setView("templates"); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: view === "templates" ? "rgba(255,193,7,0.15)" : "transparent", border: "none", borderRadius: 8, color: view === "templates" ? "#FFC107" : "#E8EDF5", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>📋 Templates</button>
          </div>

          {folders.length > 0 && view === "all" && (
            <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 10, color: "#5A6478", fontWeight: 700, letterSpacing: 1, padding: "4px 6px" }}>FOLDERS</div>
              <button onClick={() => setFolder(null)} style={{ display: "flex", padding: "6px 10px", background: folder === null ? "rgba(255,255,255,0.04)" : "transparent", border: "none", borderRadius: 6, color: "#B0BEC5", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left" }}>📥 Inbox</button>
              {folders.map((f) => (
                <button key={f} onClick={() => setFolder(f)} style={{ display: "flex", padding: "6px 10px", background: folder === f ? "rgba(255,255,255,0.04)" : "transparent", border: "none", borderRadius: 6, color: "#B0BEC5", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left" }}>📁 {f}</button>
              ))}
            </div>
          )}

          <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "6px 8px", color: "#B0BEC5", fontSize: 11 }}>
              <option value="updated">Sort by: Last updated</option>
              <option value="created">Sort by: Created</option>
              <option value="title">Sort by: Title</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {view === "templates" ? (
              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: "#8892A4", padding: "4px 6px" }}>Tap to start a new doc from a template</div>
                {TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => createNote(t)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, color: "#E8EDF5", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</span>
                  </button>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#8892A4", fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>{view === "trash" ? "🗑" : "📝"}</div>
                {search ? "No matches." : view === "trash" ? "Trash is empty." : "No notes yet — tap + New."}
              </div>
            ) : filteredNotes.map((n) => (
              <button
                key={n.id} onClick={() => setActiveId(n.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  background: n.id === activeId ? "rgba(30,136,229,0.08)" : "transparent",
                  border: "none", borderTop: "none", borderRight: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  borderLeftWidth: 3, borderLeftStyle: "solid",
                  borderLeftColor: n.id === activeId ? n.color : "transparent",
                  cursor: "pointer", color: "#E8EDF5", display: "block",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{n.icon}</span>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title || "Untitled"}</span>
                  {n.pinned && <span title="Pinned" style={{ fontSize: 11 }}>📌</span>}
                  {n.starred && <span title="Starred" style={{ fontSize: 11 }}>⭐</span>}
                </div>
                <div style={{ fontSize: 11, color: "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
                  {stripHtml(n.html).slice(0, 70) || "Empty note"}
                </div>
                <div style={{ fontSize: 10, color: "#5A6478", display: "flex", justifyContent: "space-between" }}>
                  <span>{new Date(n.updated_at).toLocaleDateString()}</span>
                  {n.tags.length > 0 && <span>{n.tags.slice(0, 2).map(t => `#${t}`).join(" ")}</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── EDITOR ── */}
        <section className="cios-notes-editor">
          {!active ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "#8892A4", padding: 24 }}>
              <div style={{ fontSize: 56 }}>📝</div>
              <div style={{ fontSize: 15, textAlign: "center" }}>Pick a note from the sidebar, or start fresh.</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={() => createNote()} style={{ background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New blank note</button>
                <button onClick={() => setView("templates")} style={{ background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 Browse templates</button>
              </div>
            </div>
          ) : (
            <>
              {/* Cover image */}
              {active.cover_url && (
                <div style={{ position: "relative", height: 160, overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <img src={active.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => updateActive({ cover_url: null })} title="Remove cover" style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Remove cover</button>
                </div>
              )}

              {/* Title row + meta */}
              <div className="cios-notes-meta" style={{ padding: "18px 32px 10px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button className="cios-notes-mobile-back" onClick={() => setActiveId(null)} aria-label="Back" style={{ background: "transparent", color: "#E8EDF5", border: "none", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
                <button onClick={() => setShowIconPicker(!showIconPicker)} title="Change icon" style={{ background: "transparent", color: "inherit", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "6px 10px", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>{active.icon}</button>
                <input ref={titleRef} value={active.title} onChange={(e) => updateActive({ title: e.target.value })} placeholder="Untitled note" style={{ flex: 1, minWidth: 200, background: "transparent", border: "none", outline: "none", color: "#E8EDF5", fontSize: 24, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.3px", padding: "4px 0" }} />
                <select value={active.status} onChange={(e) => updateActive({ status: e.target.value as NoteStatus })} style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#B0BEC5", fontSize: 11, padding: "4px 8px" }}>
                  <option value="draft">Draft</option><option value="final">Final</option>
                  <option value="shared">Shared</option><option value="private">Private</option>
                </select>
                <button onClick={() => updateActive({ starred: !active.starred })} title="Star" style={btnIcon(active.starred ? "#FFC107" : "#5A6478")}>{active.starred ? "⭐" : "☆"}</button>
                <button onClick={() => updateActive({ pinned: !active.pinned })} title="Pin" style={btnIcon(active.pinned ? "#1E88E5" : "#5A6478")}>📌</button>
                <button onClick={() => setShowRightPanel(!showRightPanel)} title="Outline & details" style={btnIcon("#5A6478")}>☰</button>
                <button onClick={() => setFocusMode(!focusMode)} title="Focus mode" style={btnIcon(focusMode ? "#26C6DA" : "#5A6478")}>🧘</button>
              </div>

              {showIconPicker && (
                <div style={{ padding: "8px 24px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {ICONS.map((i) => (
                    <button key={i} onClick={() => { updateActive({ icon: i }); setShowIconPicker(false); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: 6, fontSize: 18, cursor: "pointer" }}>{i}</button>
                  ))}
                </div>
              )}

              {/* Tags + folder + cover */}
              <div className="cios-notes-meta" style={{ padding: "0 24px 8px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: "#8892A4" }}>
                <input value={active.folder || ""} onChange={(e) => updateActive({ folder: e.target.value || null })} placeholder="📁 Folder…" style={metaInput} />
                <input value={(active.tags || []).join(", ")} onChange={(e) => updateActive({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="🏷 tags, comma, separated" style={{ ...metaInput, flex: 1, minWidth: 160 }} />
                <label style={{ ...metaInput, cursor: "pointer", color: "#1E88E5" }}>
                  🖼 {active.cover_url ? "Change cover" : "Add cover"}
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onPickCover(e.target.files[0])} />
                </label>
              </div>

              {/* Live collab + suggestion-mode toggles */}
              <div style={{ display: "flex", gap: 8, padding: "6px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: collabOn ? "#66BB6A" : "#8892A4", cursor: "pointer" }}>
                  <input type="checkbox" checked={collabOn} onChange={(e) => setCollabOn(e.target.checked)} style={{ accentColor: "#66BB6A" }} />
                  🟢 Live collaboration {collabOn ? "(on)" : ""}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: suggestionMode ? "#FFC107" : "#8892A4", cursor: "pointer" }}>
                  <input type="checkbox" checked={suggestionMode} onChange={(e) => setSuggestionMode(e.target.checked)} style={{ accentColor: "#FFC107" }} />
                  ✏️ Suggestion mode {suggestionMode ? "(on)" : ""}
                </label>
                <select onChange={(e) => { if (e.target.value) { runAi(e.target.value as "summarize"); e.target.value = ""; } }} title="AI assist" style={{ padding: "4px 8px", fontSize: 11, color: "#26C6DA", background: "rgba(38,198,218,0.08)", border: "1px solid rgba(38,198,218,0.2)", borderRadius: 6, cursor: "pointer" }}>
                  <option value="">🤖 AI ▾</option>
                  <option value="summarize">Summarize</option>
                  <option value="rewrite">Rewrite professionally</option>
                  <option value="grammar">Fix grammar</option>
                  <option value="expand">Expand</option>
                  <option value="bullets">Convert to bullets</option>
                  <option value="translate">Translate…</option>
                </select>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: "#5A6478" }}>{wc} words · {rt} min read</span>
              </div>

              {/* TipTap Editor */}
              <TiptapEditor
                key={active.id /* re-mount on note change */}
                value={active.html}
                onChange={(html) => updateActive({ html })}
                placeholder="Start writing…"
                suggestionMode={suggestionMode}
                collab={collabOn ? { docId: active.id, userName: "You", userColor: "#1E88E5" } : undefined}
              />

              {/* Footer */}
              <div className="cios-notes-meta" style={{ padding: "8px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#5A6478" }}>
                <span>💾 Saved · {new Date(active.updated_at).toLocaleString()}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={duplicateActive} style={btnGhost}>Duplicate</button>
                  <button onClick={sharePublic} style={btnGhost}>🔗 Share</button>
                  <button onClick={exportMd} style={btnGhost}>.md</button>
                  <button onClick={exportHtml} style={btnGhost}>.html</button>
                  <button onClick={exportTxt} style={btnGhost}>.txt</button>
                  <button onClick={printDoc} style={btnGhost}>🖨 Print/PDF</button>
                  {active.trashed_at ? (
                    <>
                      <button onClick={() => restoreNote(active.id)} style={{ ...btnGhost, color: "#66BB6A" }}>↩ Restore</button>
                      <button onClick={() => permanentDelete(active.id)} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" }}>Delete forever</button>
                    </>
                  ) : (
                    <button onClick={trashActive} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" }}>🗑 Trash</button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── Mobile floating toolbar toggle (FAB) ── */}
        {active && !focusMode && (
          <button onClick={() => setShowMobileToolbar(!showMobileToolbar)} aria-label="Format" className="cios-notes-mobile-fab" style={{
            position: "fixed", right: 16, bottom: 90, width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", border: "none",
            fontSize: 22, cursor: "pointer", boxShadow: "0 6px 20px rgba(30,136,229,0.4)",
            alignItems: "center", justifyContent: "center", zIndex: 800,
          }}>{showMobileToolbar ? "✕" : "Aa"}</button>
        )}
      </div>

      {/* Right panel — outline + details */}
      {showRightPanel && active && (
        <aside style={{ position: "fixed", right: 0, top: 56, bottom: 0, width: 280, background: "#111827", borderLeft: "1px solid rgba(255,255,255,0.07)", padding: 16, zIndex: 700, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Document details</h3>
            <button onClick={() => setShowRightPanel(false)} style={{ background: "transparent", border: "none", color: "#8892A4", fontSize: 16, cursor: "pointer" }}>✕</button>
          </div>
          <Stat label="Words" value={wc.toString()} />
          <Stat label="Reading time" value={`${rt} min`} />
          <Stat label="Created" value={new Date(active.created_at).toLocaleString()} />
          <Stat label="Updated" value={new Date(active.updated_at).toLocaleString()} />
          <Stat label="Status" value={active.status} />
          <div style={{ marginTop: 16, fontSize: 11, color: "#8892A4", padding: 10, background: "rgba(38,198,218,0.06)", border: "1px solid rgba(38,198,218,0.15)", borderRadius: 8 }}>
            🤖 <strong>AI tools</strong>, real-time collaboration, and version history will land in the next release.
          </div>
        </aside>
      )}
    </div>
  );
}

const btnGhost: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" };
const btnIcon = (color: string): React.CSSProperties => ({ background: "transparent", color, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 8px", fontSize: 14, cursor: "pointer", lineHeight: 1 });
const metaInput: React.CSSProperties = { background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, color: "#B0BEC5", fontSize: 11, padding: "5px 8px", outline: "none" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#E8EDF5", wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
