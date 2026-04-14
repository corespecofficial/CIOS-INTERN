"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { saveNote, trashNote, type DbNote } from "@/app/actions/notes";
import { ShareNoteModal } from "@/components/notes/share-modal";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";
import { EditorShell, SyncBadge, useAutoSave, useBackHandler } from "./editor-shell";
import {
  exportAsPdf, exportAsImage, exportAsHtml, exportAsDoc, exportAsMarkdown, exportAsTxt,
  saveVersion, listVersions, type NoteVersion,
  encryptHtml, decryptHtml, isEncrypted,
} from "@/lib/note-exports";

/* ════════════════════════════════════════════════════════════
   DATA MODEL
   ════════════════════════════════════════════════════════════ */

type PageStyle = "blank" | "lined" | "grid" | "staff";
type PageSize = "A4" | "Letter" | "Legal";
type PageOri = "portrait" | "landscape";

type AnnoKind = "highlight" | "underline" | "strike" | "sticky" | "drawing";
interface Annotation {
  id: string; kind: AnnoKind;
  x: number; y: number; w: number; h: number; // %
  color?: string;
  text?: string;     // for sticky notes
  svg?: string;      // for drawings (raw svg content)
  rotation?: number;
}

type StampType = "approved" | "draft" | "confidential" | "void" | "paid" | "received" | "sample" | "urgent" | "reviewed" | "signature" | "initials";
interface Stamp {
  id: string; kind: StampType;
  x: number; y: number; w: number; h: number; // %
  text?: string;     // signature/initials text or custom text
  color?: string;
  rotation?: number;
}

interface FormField {
  id: string;
  type: "text" | "checkbox" | "date" | "signature";
  x: number; y: number; w: number; h: number;
  value: string;
  label?: string;
}

interface Page {
  html: string;
  rotation?: 0 | 90 | 180 | 270;
  annotations?: Annotation[];
  stamps?: Stamp[];
  fields?: FormField[];
  hidden?: boolean;
}
interface Watermark { text?: string; image?: string; opacity?: number; rotation?: number; color?: string; }
interface Bookmark { name: string; page: number; }

interface Doc {
  style: PageStyle;
  size: PageSize;
  orientation: PageOri;
  color: string;
  pages: Page[];
  watermark?: Watermark;
  header?: string;
  footer?: string;
  pageNumbers?: boolean;
  bookmarks?: Bookmark[];
  pageless?: boolean;     // Google Docs-style continuous canvas (no page breaks)
  font?: string;          // CSS font-family for the editable body
}

function parseDoc(html: string): Doc {
  try {
    const j = JSON.parse(html || "{}");
    if (j && Array.isArray(j.pages)) {
      // Backwards-compat: pages may be string[] in old format
      const pages: Page[] = j.pages.map((p: string | Page) => typeof p === "string" ? { html: p } : p);
      return {
        style: j.style || "blank", size: j.size || "A4", orientation: j.orientation || "portrait",
        color: j.color || "#ffffff", pages,
        watermark: j.watermark, header: j.header, footer: j.footer,
        pageNumbers: j.pageNumbers, bookmarks: j.bookmarks || [],
        pageless: !!j.pageless, font: j.font || "Georgia, serif",
      };
    }
  } catch {}
  return { style: "blank", size: "A4", orientation: "portrait", color: "#ffffff", pages: [{ html: "" }] };
}

const sizes: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 794, h: 1123 },
  Letter: { w: 816, h: 1056 },
  Legal: { w: 816, h: 1344 },
};

/* ════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════ */

type ToolTab = "edit" | "comment" | "fill" | "pages" | "more";
type CommentTool = "none" | "highlight" | "underline" | "strike" | "sticky" | "drawing";

export function PdfEditorClient({ initialNote }: { initialNote: DbNote }) {
  const back = useBackHandler();
  const [title, setTitle] = useState(initialNote.title || "Document.pdf");
  const [doc, setDoc] = useState<Doc>(() => parseDoc(initialNote.html));
  const [active, setActive] = useState(0);
  const [docToolsOpen, setDocToolsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tab, setTab] = useState<ToolTab | null>(null);
  const [commentTool, setCommentTool] = useState<CommentTool>("none");
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<Doc[]>([]);
  const [redoStack, setRedoStack] = useState<Doc[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const watermarkImgRef = useRef<HTMLInputElement>(null);

  const { sync, schedule } = useAutoSave({
    saver: async () => {
      const r = await saveNote({ id: initialNote.id, title, html: JSON.stringify(doc) });
      if (r.ok) saveVersion(initialNote.id, title, JSON.stringify(doc));
      return !!r.ok;
    },
  });

  const page = doc.pages[active] || { html: "" };
  const dim = sizes[doc.size];
  const aspectW = doc.orientation === "portrait" ? dim.w : dim.h;
  const aspectH = doc.orientation === "portrait" ? dim.h : dim.w;
  const aspectRatio = `${aspectW} / ${aspectH}`;

  // Refs to each page wrapper so we can detect which page is on-screen.
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pageBodyRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Track the currently-most-visible page in continuous-scroll mode.
  useEffect(() => {
    if (doc.pageless) return;
    const observers: IntersectionObserver[] = [];
    pageRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && e.intersectionRatio > 0.5) setActive(i);
      }, { threshold: [0.5] });
      obs.observe(el); observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.pages.length, doc.pageless]);

  // Seed every contentEditable body once on mount + when number of pages changes.
  useEffect(() => {
    pageBodyRefs.current.forEach((el, i) => {
      if (el && el.innerHTML !== (doc.pages[i]?.html || "")) {
        el.innerHTML = doc.pages[i]?.html || "";
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.pages.length, doc.pageless]);

  // Single-page back-compat seeder (used by undo/redo + version restore)
  useEffect(() => {
    const el = pageBodyRefs.current[active];
    if (el && el.innerHTML !== (page.html || "")) el.innerHTML = page.html || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const pushHistory = () => { setHistory((h) => [...h.slice(-29), structuredClone(doc)]); setRedoStack([]); };
  const undo = () => {
    const last = history[history.length - 1]; if (!last) { toast("Nothing to undo"); return; }
    setRedoStack((r) => [doc, ...r].slice(0, 30));
    setDoc(last); setHistory((h) => h.slice(0, -1)); schedule();
    pageBodyRefs.current.forEach((el, i) => { if (el) el.innerHTML = last.pages[i]?.html || ""; });
  };
  const redo = () => {
    const next = redoStack[0]; if (!next) { toast("Nothing to redo"); return; }
    setHistory((h) => [...h, doc]); setDoc(next); setRedoStack((r) => r.slice(1)); schedule();
    pageBodyRefs.current.forEach((el, i) => { if (el) el.innerHTML = next.pages[i]?.html || ""; });
  };

  /* ── auto-pagination: spill overflow into next page (paged mode only) ── */
  const paginate = (idx: number) => {
    if (doc.pageless) return;
    const el = pageBodyRefs.current[idx];
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 2) {
      // Try to pull back content from next page if current has slack
      const nextEl = pageBodyRefs.current[idx + 1];
      if (!nextEl || !nextEl.firstChild) return;
      let guard = 0;
      while (nextEl.firstChild && guard++ < 200) {
        const cand = nextEl.firstChild;
        el.appendChild(cand);
        if (el.scrollHeight > el.clientHeight + 2) { nextEl.insertBefore(cand, nextEl.firstChild); break; }
      }
      const htmlCur = el.innerHTML, htmlNext = nextEl.innerHTML;
      setDoc((d) => ({ ...d, pages: d.pages.map((p, i) => i === idx ? { ...p, html: htmlCur } : i === idx + 1 ? { ...p, html: htmlNext } : p) }));
      return;
    }
    let nextEl = pageBodyRefs.current[idx + 1];
    if (!nextEl) {
      setDoc((d) => ({ ...d, pages: [...d.pages, { html: "" }] }));
      requestAnimationFrame(() => paginate(idx));
      return;
    }
    let guard = 0;
    while (el.scrollHeight > el.clientHeight + 2 && el.lastChild && guard++ < 300) {
      nextEl.insertBefore(el.lastChild, nextEl.firstChild);
    }
    const htmlCur = el.innerHTML, htmlNext = nextEl.innerHTML;
    setDoc((d) => ({ ...d, pages: d.pages.map((p, i) => i === idx ? { ...p, html: htmlCur } : i === idx + 1 ? { ...p, html: htmlNext } : p) }));
    requestAnimationFrame(() => paginate(idx + 1));
  };

  /* ── page mutations ── */
  const onPageInput = (idx: number, html: string) => {
    setDoc((d) => ({ ...d, pages: d.pages.map((p, i) => i === idx ? { ...p, html } : p) }));
    schedule();
    if (!doc.pageless) requestAnimationFrame(() => paginate(idx));
  };
  const updatePage = (i: number, patch: Partial<Page>) => {
    setDoc((d) => ({ ...d, pages: d.pages.map((p, idx) => idx === i ? { ...p, ...patch } : p) }));
    schedule();
  };
  const updateDoc = (patch: Partial<Doc>) => { pushHistory(); setDoc((d) => ({ ...d, ...patch })); schedule(); };

  const addPage = (at?: number) => {
    pushHistory();
    const idx = typeof at === "number" ? at : doc.pages.length;
    const newPages = [...doc.pages]; newPages.splice(idx, 0, { html: "" });
    setDoc((d) => ({ ...d, pages: newPages }));
    setActive(idx); schedule();
  };
  const deletePage = (i: number) => {
    if (doc.pages.length <= 1) { toast.error("Keep at least one page"); return; }
    pushHistory();
    setDoc((d) => ({ ...d, pages: d.pages.filter((_, idx) => idx !== i) }));
    setActive(Math.max(0, i - 1)); schedule();
  };
  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= doc.pages.length) return;
    pushHistory();
    const arr = [...doc.pages]; const [it] = arr.splice(from, 1); arr.splice(to, 0, it);
    setDoc((d) => ({ ...d, pages: arr })); setActive(to); schedule();
  };
  const rotatePage = (i: number) => {
    pushHistory();
    const cur = doc.pages[i]?.rotation || 0;
    const next = ((cur + 90) % 360) as 0 | 90 | 180 | 270;
    updatePage(i, { rotation: next });
  };

  /* ── insert content into editable body ── */
  const insertHtml = (html: string) => {
    if (!pageRef.current) return;
    pageRef.current.focus();
    document.execCommand("insertHTML", false, html);
    const newHtml = pageRef.current.innerHTML;
    setDoc((d) => ({ ...d, pages: d.pages.map((p, i) => i === active ? { ...p, html: newHtml } : p) }));
    schedule();
  };

  /* ── annotations & stamps ── */
  const addAnnotation = (a: Omit<Annotation, "id">) => {
    pushHistory();
    const ann: Annotation = { id: `an-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, ...a };
    updatePage(active, { annotations: [...(page.annotations || []), ann] });
  };
  const updateAnno = (id: string, patch: Partial<Annotation>) => {
    updatePage(active, { annotations: (page.annotations || []).map((a) => a.id === id ? { ...a, ...patch } : a) });
  };
  const deleteAnno = (id: string) => {
    updatePage(active, { annotations: (page.annotations || []).filter((a) => a.id !== id) });
  };

  const addStamp = (kind: StampType, text?: string) => {
    pushHistory();
    const s: Stamp = {
      id: `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      kind, x: 30, y: 30, w: 40, h: 12,
      text: text || stampLabel(kind),
      color: stampColor(kind),
      rotation: 0,
    };
    updatePage(active, { stamps: [...(page.stamps || []), s] });
    toast.success(`${stampLabel(kind)} stamp added — drag to position`);
  };
  const updateStamp = (id: string, patch: Partial<Stamp>) => {
    updatePage(active, { stamps: (page.stamps || []).map((s) => s.id === id ? { ...s, ...patch } : s) });
  };
  const deleteStamp = (id: string) => {
    updatePage(active, { stamps: (page.stamps || []).filter((s) => s.id !== id) });
  };

  /* ── form fields ── */
  const addField = (type: FormField["type"]) => {
    pushHistory();
    const f: FormField = { id: `fl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, type, x: 20, y: 20, w: type === "checkbox" ? 6 : 30, h: type === "checkbox" ? 6 : 6, value: "", label: type };
    updatePage(active, { fields: [...(page.fields || []), f] });
  };
  const updateField = (id: string, patch: Partial<FormField>) => {
    updatePage(active, { fields: (page.fields || []).map((f) => f.id === id ? { ...f, ...patch } : f) });
  };
  const deleteField = (id: string) => {
    updatePage(active, { fields: (page.fields || []).filter((f) => f.id !== id) });
  };

  /* ── upload helpers ── */
  const uploadAndInsertImage = async (file: File) => {
    const t = toast.loading("Uploading…");
    try {
      const c = await compressImage(file, { maxBytes: 2 * 1024 * 1024, maxDim: 1920 });
      const up = await uploadToCloudinary(c, { folder: "cios-notes/pdf", resourceType: "image" });
      insertHtml(`<p><img src="${up.secureUrl}" alt="" style="max-width:100%;margin:8px 0;" /></p>`);
      toast.success("Image added", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
  };
  const uploadWatermarkImage = async (file: File) => {
    const t = toast.loading("Uploading…");
    try {
      const c = await compressImage(file, { maxBytes: 2 * 1024 * 1024, maxDim: 1920 });
      const up = await uploadToCloudinary(c, { folder: "cios-notes/pdf-wm", resourceType: "image" });
      updateDoc({ watermark: { ...(doc.watermark || {}), image: up.secureUrl, text: undefined, opacity: 0.15 } });
      toast.success("Watermark applied", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
  };

  /* ── page click handler — applies the active annotation tool to whichever page was clicked ── */
  const onPageClickAt = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    setActive(idx);
    if (commentTool === "none") return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const targetPage = doc.pages[idx];
    const addAnno = (a: Omit<Annotation, "id">) => {
      pushHistory();
      const ann: Annotation = { id: `an-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, ...a };
      updatePage(idx, { annotations: [...(targetPage.annotations || []), ann] });
    };
    if (commentTool === "sticky") {
      const text = prompt("Sticky note text:"); if (!text) return;
      addAnno({ kind: "sticky", x, y, w: 16, h: 8, color: "#FFEB3B", text });
    } else if (commentTool === "highlight") {
      addAnno({ kind: "highlight", x: x - 8, y: y - 1.5, w: 16, h: 3, color: "rgba(255, 235, 59, 0.5)" });
    } else if (commentTool === "underline") {
      addAnno({ kind: "underline", x: x - 8, y, w: 16, h: 0.5, color: "#1E88E5" });
    } else if (commentTool === "strike") {
      addAnno({ kind: "strike", x: x - 8, y, w: 16, h: 0.5, color: "#EF5350" });
    }
    setCommentTool("none");
  };

  return (
    <>
      <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadAndInsertImage(f); }} />
      <input ref={watermarkImgRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadWatermarkImage(f); }} />

      <EditorShell
        accent="#CC3333"
        topBar={<>
          <button onClick={back} style={iconBtn}>‹</button>
          <button onClick={undo} title="Undo (Ctrl+Z)" style={iconBtn}>↶</button>
          <button onClick={redo} title="Redo" style={iconBtn}>↷</button>
          <input value={title} onChange={(e) => { setTitle(e.target.value); schedule(); }} style={titleInput} />
          <button onClick={() => setShareOpen(true)} style={iconBtn} aria-label="Share / collaborate">👥</button>
          <button onClick={() => setDocToolsOpen(true)} style={iconBtn} aria-label="Document tools">≡</button>
          <SyncBadge status={sync} />
        </>}
        content={
          <div style={{ background: "#EEF0F4", minHeight: "100%", display: "flex", flexDirection: "column" }}>
            {/* Format strip */}
            <FormatStrip
              doc={doc}
              onPageStyle={(style) => updateDoc({ style })}
              onPageSize={(size) => updateDoc({ size })}
              onOrient={(orientation) => updateDoc({ orientation })}
              onZoom={(z) => setZoom(z)}
              zoom={zoom}
              onTab={(t) => setTab(t)}
              onPageless={(pageless) => updateDoc({ pageless })}
              onFont={(font) => {
                updateDoc({ font });
                // Apply to any current selection + default for next keystroke,
                // otherwise new text stays in the previous font.
                try {
                  pageRef.current?.focus();
                  document.execCommand("styleWithCSS", false, "true");
                  document.execCommand("fontName", false, font);
                } catch { /* ignore */ }
              }}
              onExportPdf={() => {
                const flat = doc.pages.map((p) => `<section style="break-after:page;">${p.html}</section>`).join("");
                exportAsPdf(title.replace(/\.[^.]+$/, ""), flat);
              }}
              onInsertPageBreak={() => { addPage(active + 1); setActive(active + 1); }}
              onWordCount={() => {
                const text = doc.pages.map((p) => p.html.replace(/<[^>]+>/g, " ")).join(" ").trim();
                const words = text ? text.split(/\s+/).length : 0;
                const chars = text.length;
                toast(`${words} words · ${chars} characters · ${doc.pages.length} pages`);
              }}
            />

            {/* Page area — Word-style continuous scroll: every page rendered
                stacked vertically. Pageless mode = single big canvas. */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 24px", display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: Math.min(aspectW, 920) * zoom, transform: `scale(${zoom})`, transformOrigin: "top center", display: "flex", flexDirection: "column", gap: doc.pageless ? 0 : 24 }}>
                {(doc.pageless ? [doc.pages[0] || { html: "" }] : doc.pages).map((p, idx) => (
                  <div key={idx} ref={(el) => { pageRefs.current[idx] = el; }} onClick={(e) => onPageClickAt(idx, e)}
                    style={{
                      width: "100%",
                      ...(doc.pageless ? { minHeight: 800 } : { aspectRatio }),
                      backgroundColor: doc.color || "#fff",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden",
                      position: "relative", margin: "0 auto",
                      transform: p.rotation ? `rotate(${p.rotation}deg)` : "none",
                      transformOrigin: "center",
                      ...pageBgStyle(doc.style),
                      cursor: commentTool !== "none" && commentTool !== "drawing" ? "crosshair" : "default",
                      outline: idx === active && !doc.pageless ? "2px solid rgba(204,51,51,0.4)" : "none", outlineOffset: -2,
                    }}>
                    {/* Header */}
                    {doc.header && <div style={{ position: "absolute", top: 16, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "#666", fontFamily: "Georgia,serif" }}>{doc.header}</div>}

                    {/* Watermark */}
                    {doc.watermark && (doc.watermark.text || doc.watermark.image) && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        pointerEvents: "none", opacity: doc.watermark.opacity ?? 0.15,
                        transform: `rotate(${doc.watermark.rotation ?? -30}deg)`,
                      }}>
                        {doc.watermark.image
                          ? <img src={doc.watermark.image} alt="" style={{ maxWidth: "70%", maxHeight: "70%" }} />
                          : <div style={{ fontSize: 96, fontWeight: 900, color: doc.watermark.color || "#999", whiteSpace: "nowrap" }}>{doc.watermark.text}</div>}
                      </div>
                    )}

                    {/* Editable content */}
                    <div
                      ref={(el) => { pageBodyRefs.current[idx] = el; if (idx === active) pageRef.current = el; }}
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setActive(idx)}
                      onInput={(e) => onPageInput(idx, (e.currentTarget as HTMLDivElement).innerHTML)}
                      style={{
                        width: "100%",
                        ...(doc.pageless ? { minHeight: 800 } : { height: "100%" }),
                        padding: "7% 7%",
                        color: "#111", fontSize: "min(2.4vw, 15px)", lineHeight: 1.7,
                        outline: "none", fontFamily: doc.font || "Georgia, serif",
                        // Paged mode: hide overflow so the page cannot scroll.
                        // An effect below moves overflowing content to the next page.
                        overflowY: doc.pageless ? "visible" : "hidden",
                        position: "relative", zIndex: 1, boxSizing: "border-box",
                      }}
                    />

                    {/* Annotations layer */}
                    {(p.annotations || []).map((a) => (
                      <AnnotationOverlay key={a.id} anno={a}
                        onUpdate={(patch) => { setActive(idx); updateAnno(a.id, patch); }}
                        onDelete={() => { setActive(idx); deleteAnno(a.id); }}
                      />
                    ))}

                    {/* Stamps layer */}
                    {(p.stamps || []).map((s) => (
                      <StampOverlay key={s.id} stamp={s}
                        onUpdate={(patch) => { setActive(idx); updateStamp(s.id, patch); }}
                        onDelete={() => { setActive(idx); deleteStamp(s.id); }}
                      />
                    ))}

                    {/* Form fields */}
                    {(p.fields || []).map((f) => (
                      <FieldOverlay key={f.id} field={f}
                        onUpdate={(patch) => { setActive(idx); updateField(f.id, patch); }}
                        onDelete={() => { setActive(idx); deleteField(f.id); }}
                      />
                    ))}

                    {/* Footer */}
                    {(doc.footer || doc.pageNumbers) && (
                      <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 56px", fontSize: 11, color: "#666", fontFamily: "Georgia,serif" }}>
                        <span>{doc.footer || ""}</span>
                        {doc.pageNumbers && <span>Page {idx + 1} of {doc.pages.length}</span>}
                      </div>
                    )}

                    {/* Page label between pages (Word-style) */}
                    {!doc.pageless && (
                      <div style={{ position: "absolute", top: -22, right: 0, fontSize: 10, color: "#888", fontWeight: 700 }}>Page {idx + 1}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Page strip */}
            <PageStrip pages={doc.pages} active={active} onSelect={setActive} onAdd={() => addPage()} onDelete={deletePage} />
          </div>
        }
        bottomBar={
          <div style={{ display: "flex", justifyContent: "space-around", padding: "6px 10px max(6px, env(safe-area-inset-bottom))" }}>
            <ToolBtn icon="✎" label="Edit" onClick={() => setTab("edit")} />
            <ToolBtn icon="💬" label="Comment" onClick={() => setTab("comment")} />
            <ToolBtn icon="✍" label="Fill & Sign" onClick={() => setTab("fill")} />
            <ToolBtn icon="▦" label="Pages" onClick={() => setTab("pages")} />
            <ToolBtn icon="⊞" label="More" onClick={() => setTab("more")} />
          </div>
        }
      />

      {tab && (
        <ToolsTabsSheet
          tab={tab} onTab={setTab} onClose={() => setTab(null)}
          doc={doc}
          page={page}
          active={active}
          onAddText={() => { insertHtml('<p>Click to edit text</p>'); setTab(null); }}
          onAddImage={() => { setTab(null); photoRef.current?.click(); }}
          onAddDate={() => { insertHtml(`<p>${new Date().toLocaleDateString()}</p>`); setTab(null); }}
          onAddPageNumber={() => { updateDoc({ pageNumbers: !doc.pageNumbers }); setTab(null); toast.success(doc.pageNumbers ? "Page numbers off" : "Page numbers on"); }}
          onAddSignatureField={() => { addField("signature"); setTab(null); }}
          onCommentTool={(t) => { setCommentTool(t); setTab(null); toast(t === "none" ? "Tool off" : `Tap on the page to add ${t}`); }}
          onDrawingMode={() => { setTab(null); toast("Drawing — coming next iteration"); }}
          onAddStamp={(s) => { addStamp(s); setTab(null); }}
          onAddSignature={() => { const t = prompt("Type your signature:"); if (t) addStamp("signature", t); setTab(null); }}
          onAddInitials={() => { const t = prompt("Initials:"); if (t) addStamp("initials", t); setTab(null); }}
          onAddTextField={() => { addField("text"); setTab(null); }}
          onAddCheckbox={() => { addField("checkbox"); setTab(null); }}
          onAddDateField={() => { addField("date"); setTab(null); }}
          onPageInsert={(at) => { addPage(at); setTab(null); }}
          onPageDelete={() => { deletePage(active); setTab(null); }}
          onPageRotate={() => { rotatePage(active); setTab(null); }}
          onPageMoveUp={() => { movePage(active, active - 1); setTab(null); }}
          onPageMoveDown={() => { movePage(active, active + 1); setTab(null); }}
          onSetWatermarkText={() => {
            const t = prompt("Watermark text (leave blank to remove):", doc.watermark?.text || "");
            if (t === null) return;
            updateDoc({ watermark: t.trim() ? { text: t.trim(), opacity: 0.15, color: "#999", rotation: -30 } : undefined });
            setTab(null);
          }}
          onSetWatermarkImage={() => { setTab(null); watermarkImgRef.current?.click(); }}
          onSetHeader={() => { const h = prompt("Header text (blank to remove):", doc.header || ""); if (h === null) return; updateDoc({ header: h }); setTab(null); }}
          onSetFooter={() => { const f = prompt("Footer text (blank to remove):", doc.footer || ""); if (f === null) return; updateDoc({ footer: f }); setTab(null); }}
          onAddBookmark={() => { const n = prompt("Bookmark name:"); if (!n) return; updateDoc({ bookmarks: [...(doc.bookmarks || []), { name: n, page: active }] }); setTab(null); toast.success("Bookmark added"); }}
        />
      )}

      {docToolsOpen && (
        <DocToolsSheet
          title={title} doc={doc} noteId={initialNote.id}
          onClose={() => setDocToolsOpen(false)}
          onRename={(t) => { setTitle(t); schedule(); }}
          onRestoreVersion={(html) => { const d = parseDoc(html); setDoc(d); schedule(); toast.success("Version restored"); }}
          onTrash={async () => { if (!confirm("Move to trash?")) return; const r = await trashNote(initialNote.id); if (r.ok) { toast.success("Trashed"); back(); } else toast.error(r.error); }}
        />
      )}

      {shareOpen && (
        <ShareNoteModal noteId={initialNote.id} noteTitle={title} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   FORMAT STRIP
   ════════════════════════════════════════════════════════════ */

function FormatStrip({ doc, onPageStyle, onPageSize, onOrient, onZoom, zoom, onPageless, onFont, onExportPdf, onInsertPageBreak, onWordCount }: {
  doc: Doc;
  onPageStyle: (s: PageStyle) => void;
  onPageSize: (s: PageSize) => void;
  onOrient: (o: PageOri) => void;
  onZoom: (z: number) => void;
  zoom: number;
  onTab: (t: ToolTab) => void;
  onPageless: (p: boolean) => void;
  onFont: (f: string) => void;
  onExportPdf: () => void;
  onInsertPageBreak: () => void;
  onWordCount: () => void;
}) {
  const exec = (cmd: string, value?: string) => { document.execCommand(cmd, false, value); };
  const insertHtmlAtCursor = (html: string) => { document.execCommand("insertHTML", false, html); };
  const [open, setOpen] = useState<"font" | "paragraph" | "page" | "zoom" | "insert" | "layout" | "review" | null>(null);
  const close = () => setOpen(null);
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 8, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#FAFBFC", borderBottom: "1px solid #ddd", boxShadow: "0 1px 0 rgba(0,0,0,0.04)", whiteSpace: "nowrap", overflowX: "auto" }}>
      {/* ── FONT GROUP ── */}
      <RibbonGroup label="Font" icon="A" open={open === "font"} onToggle={() => setOpen(open === "font" ? null : "font")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 240 }}>
          <select value={doc.font} onChange={(e) => onFont(e.target.value)} style={{ ...selStyle, fontFamily: doc.font, padding: "6px 10px" }}>
            {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
          </select>
          <select onChange={(e) => exec("fontSize", e.target.value)} defaultValue="3" style={{ ...selStyle, padding: "6px 10px" }}>
            {["8","10","12","14","18","24","36"].map((s, i) => <option key={s} value={i + 1}>{s} pt</option>)}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <ChipBtn onClick={() => exec("bold")} style={{ fontWeight: 900 }}>B</ChipBtn>
            <ChipBtn onClick={() => exec("italic")} style={{ fontStyle: "italic" }}>I</ChipBtn>
            <ChipBtn onClick={() => exec("underline")} style={{ textDecoration: "underline" }}>U</ChipBtn>
            <ChipBtn onClick={() => exec("strikeThrough")} style={{ textDecoration: "line-through" }}>S</ChipBtn>
            <ChipBtn onClick={() => exec("superscript")}>X²</ChipBtn>
            <ChipBtn onClick={() => exec("subscript")}>X₂</ChipBtn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#555" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>Text:
              <input type="color" onChange={(e) => exec("foreColor", e.target.value)} style={pickerStyle} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>Highlight:
              <input type="color" onChange={(e) => exec("hiliteColor", e.target.value)} style={pickerStyle} />
            </label>
          </div>
        </div>
      </RibbonGroup>

      {/* ── PARAGRAPH GROUP ── */}
      <RibbonGroup label="Paragraph" icon="¶" open={open === "paragraph"} onToggle={() => setOpen(open === "paragraph" ? null : "paragraph")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Alignment</div>
          <div style={{ display: "flex", gap: 6 }}>
            <ChipBtn onClick={() => { exec("justifyLeft"); close(); }}>⇤</ChipBtn>
            <ChipBtn onClick={() => { exec("justifyCenter"); close(); }}>≡</ChipBtn>
            <ChipBtn onClick={() => { exec("justifyRight"); close(); }}>⇥</ChipBtn>
            <ChipBtn onClick={() => { exec("justifyFull"); close(); }}>⇔</ChipBtn>
          </div>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Lists & indent</div>
          <div style={{ display: "flex", gap: 6 }}>
            <ChipBtn onClick={() => { exec("insertUnorderedList"); close(); }}>•</ChipBtn>
            <ChipBtn onClick={() => { exec("insertOrderedList"); close(); }}>1.</ChipBtn>
            <ChipBtn onClick={() => { exec("indent"); close(); }}>→</ChipBtn>
            <ChipBtn onClick={() => { exec("outdent"); close(); }}>←</ChipBtn>
          </div>
        </div>
      </RibbonGroup>

      {/* ── PAGE GROUP ── */}
      <RibbonGroup label="Page" icon="📄" open={open === "page"} onToggle={() => setOpen(open === "page" ? null : "page")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Layout mode</div>
          <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: 2 }}>
            <button onClick={() => { onPageless(false); close(); }} style={{ ...modeBtn, flex: 1, background: !doc.pageless ? "#CC3333" : "transparent", color: !doc.pageless ? "#fff" : "#111" }}>📄 Pages</button>
            <button onClick={() => { onPageless(true); close(); }} style={{ ...modeBtn, flex: 1, background: doc.pageless ? "#CC3333" : "transparent", color: doc.pageless ? "#fff" : "#111" }}>📜 Pageless</button>
          </div>
          <label style={{ fontSize: 11, color: "#555" }}>Background<br />
            <select value={doc.style} onChange={(e) => onPageStyle(e.target.value as PageStyle)} style={{ ...selStyle, marginTop: 4, width: "100%" }}>
              <option value="blank">Blank</option><option value="lined">Lined</option><option value="grid">Grid</option><option value="staff">Music staff</option>
            </select>
          </label>
          {!doc.pageless && (
            <>
              <label style={{ fontSize: 11, color: "#555" }}>Size<br />
                <select value={doc.size} onChange={(e) => onPageSize(e.target.value as PageSize)} style={{ ...selStyle, marginTop: 4, width: "100%" }}>
                  <option value="A4">A4 (210 × 297mm)</option><option value="Letter">Letter (8.5 × 11in)</option><option value="Legal">Legal (8.5 × 14in)</option>
                </select>
              </label>
              <label style={{ fontSize: 11, color: "#555" }}>Orientation<br />
                <select value={doc.orientation} onChange={(e) => onOrient(e.target.value as PageOri)} style={{ ...selStyle, marginTop: 4, width: "100%" }}>
                  <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                </select>
              </label>
            </>
          )}
        </div>
      </RibbonGroup>

      {/* ── INSERT GROUP ── */}
      <RibbonGroup label="Insert" icon="✚" open={open === "insert"} onToggle={() => setOpen(open === "insert" ? null : "insert")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Table</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[[2,2],[3,3],[4,4],[5,5],[3,2],[2,3]].map(([r,c]) => (
              <button key={`${r}x${c}`} onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0;">';
                  for (let i=0;i<r;i++){ html+="<tr>"; for (let j=0;j<c;j++) html+='<td style="border:1px solid #999;padding:6px;min-width:40px;">&nbsp;</td>'; html+="</tr>"; }
                  html+="</table><p></p>";
                  insertHtmlAtCursor(html); close();
                }}
                style={{ padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{r}×{c}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Elements</div>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = prompt("URL:"); if (!u) return; const t = prompt("Link text:", u) || u; insertHtmlAtCursor(`<a href="${u}" target="_blank">${t}</a>`); close(); }} style={insertRowBtn}>🔗 Link…</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { insertHtmlAtCursor('<hr style="border:none;border-top:1px solid #999;margin:12px 0;" />'); close(); }} style={insertRowBtn}>━ Horizontal rule</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onInsertPageBreak(); close(); }} style={insertRowBtn}>⤵ Page break</button>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Special characters</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["©","®","™","°","±","×","÷","≈","≠","≤","≥","→","←","↑","↓","★","☆","•","§","¶","€","£","¥","₦"].map((ch) => (
              <button key={ch} onMouseDown={(e) => e.preventDefault()} onClick={() => insertHtmlAtCursor(ch)}
                style={{ width: 26, height: 26, border: "1px solid #ddd", borderRadius: 4, background: "#fff", color: "#111", cursor: "pointer", fontSize: 13 }}>{ch}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Headings</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["H1","H2","H3","P"].map((h) => (
              <button key={h} onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("formatBlock", h === "P" ? "p" : `h${h[1]}`); close(); }}
                style={{ flex: 1, padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{h}</button>
            ))}
          </div>
        </div>
      </RibbonGroup>

      {/* ── LAYOUT GROUP ── */}
      <RibbonGroup label="Layout" icon="⚟" open={open === "layout"} onToggle={() => setOpen(open === "layout" ? null : "layout")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Line spacing</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[["1.0","1"],["1.15","1.15"],["1.5","1.5"],["2.0","2"],["2.5","2.5"]].map(([label,v]) => (
              <button key={v} onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const sel = document.getSelection(); const node = sel?.anchorNode as HTMLElement | null;
                  const block = (node?.nodeType === 1 ? node : node?.parentElement)?.closest("p,div,li,h1,h2,h3,h4") as HTMLElement | null;
                  if (block) block.style.lineHeight = v;
                  close();
                }}
                style={{ padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Margins (body padding)</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[["Narrow","3%"],["Normal","7%"],["Wide","12%"]].map(([label,v]) => (
              <button key={label} onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  document.querySelectorAll<HTMLDivElement>('[contenteditable="true"]').forEach((el) => { el.style.padding = `${v} ${v}`; });
                  close();
                }}
                style={{ padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Columns</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[1,2,3].map((n) => (
              <button key={n} onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  document.querySelectorAll<HTMLDivElement>('[contenteditable="true"]').forEach((el) => {
                    el.style.columnCount = String(n);
                    el.style.columnGap = n > 1 ? "24px" : "";
                  });
                  close();
                }}
                style={{ flex: 1, padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{n}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Text direction</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("styleWithCSS","true"); document.querySelectorAll<HTMLDivElement>('[contenteditable="true"]').forEach((el) => { el.style.direction = "ltr"; }); close(); }} style={{ flex: 1, padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>LTR</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => { document.querySelectorAll<HTMLDivElement>('[contenteditable="true"]').forEach((el) => { el.style.direction = "rtl"; }); close(); }} style={{ flex: 1, padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>RTL</button>
          </div>
        </div>
      </RibbonGroup>

      {/* ── REVIEW GROUP ── */}
      <RibbonGroup label="Review" icon="✓" open={open === "review"} onToggle={() => setOpen(open === "review" ? null : "review")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("removeFormat"); exec("unlink"); close(); }} style={insertRowBtn}>⌫ Clear formatting</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onWordCount(); close(); }} style={insertRowBtn}>📊 Word count</button>
          <button onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const find = prompt("Find:"); if (!find) return;
              const replace = prompt(`Replace "${find}" with:`, "");
              if (replace === null) return;
              let count = 0;
              document.querySelectorAll<HTMLDivElement>('[contenteditable="true"]').forEach((el) => {
                const before = el.innerHTML;
                const after = before.split(find).join(replace);
                if (before !== after) { count += (before.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))||[]).length; el.innerHTML = after; el.dispatchEvent(new Event("input",{bubbles:true})); }
              });
              toast.success(`${count} replacement${count===1?"":"s"}`);
              close();
            }}
            style={insertRowBtn}>🔍 Find & Replace…</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("selectAll"); close(); }} style={insertRowBtn}>⎘ Select all</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("copy"); toast.success("Copied"); close(); }} style={insertRowBtn}>⧉ Copy</button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("cut"); close(); }} style={insertRowBtn}>✂ Cut</button>
        </div>
      </RibbonGroup>

      {/* ── ZOOM GROUP ── */}
      <RibbonGroup label={`${Math.round(zoom * 100)}%`} icon="⚲" open={open === "zoom"} onToggle={() => setOpen(open === "zoom" ? null : "zoom")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <button onClick={() => onZoom(Math.max(0.4, zoom - 0.1))} style={zoomChip}>−</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111", minWidth: 56, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => onZoom(Math.min(3, zoom + 0.1))} style={zoomChip}>+</button>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => (
              <button key={z} onClick={() => { onZoom(z); close(); }} style={{ ...zoomChip, width: "auto", padding: "0 8px", fontSize: 11, background: zoom === z ? "#CC3333" : "#fff", color: zoom === z ? "#fff" : "#111" }}>{Math.round(z * 100)}%</button>
            ))}
            <button onClick={() => { onZoom(1); close(); }} style={{ ...zoomChip, width: "auto", padding: "0 10px", fontSize: 10 }}>Fit</button>
          </div>
        </div>
      </RibbonGroup>

      <div style={{ flex: 1 }} />

      {/* Single prominent action */}
      <button onClick={onExportPdf} style={{ padding: "6px 14px", background: "#EF5350", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>📄 Export PDF</button>
    </div>
  );
}

/** Compact ribbon group — pill button with chevron, opens a popover panel on click.
 *  The popover uses position:fixed (anchored to the button's bounding rect) so
 *  it escapes the format strip's overflow:auto clip and renders above everything. */
function RibbonGroup({ label, icon, open, onToggle, children }: { label: string; icon: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !btnRef.current) { setPos(null); return; }
    const r = btnRef.current.getBoundingClientRect();
    // Try to align popover's left with the button. If it would overflow the
    // viewport on the right, push it back so it stays on screen.
    const POPOVER_W = 280;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - POPOVER_W - 8);
    setPos({ top: r.bottom + 6, left });
  }, [open]);

  return (
    <>
      <button ref={btnRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px", background: open ? "#fff" : "transparent",
        border: open ? "1px solid #CC3333" : "1px solid #ddd",
        color: "#111", borderRadius: 6, cursor: "pointer",
        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
      }}>
        <span style={{ fontSize: 13 }}>{icon}</span>{label}<span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>
      {open && pos && (
        <>
          <div
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggle}
            style={{ position: "fixed", inset: 0, zIndex: 140 }}
          />
          <div onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top, left: pos.left,
              minWidth: 240, maxWidth: 320,
              zIndex: 141,
              background: "#fff", border: "1px solid #ddd", borderRadius: 8,
              padding: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
              maxHeight: "70vh", overflowY: "auto",
            }}>
            {children}
          </div>
        </>
      )}
    </>
  );
}
const pickerStyle: React.CSSProperties = { width: 28, height: 24, border: "1px solid #ddd", borderRadius: 4, padding: 0, background: "none" };

const FONT_FAMILIES = [
  { label: "Calibri",         value: "Calibri, 'Helvetica Neue', Helvetica, sans-serif" },
  { label: "Arial",           value: "Arial, sans-serif" },
  { label: "Helvetica",       value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana",         value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma",          value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS",    value: "'Trebuchet MS', sans-serif" },
  { label: "Georgia",         value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Cambria",         value: "Cambria, Georgia, serif" },
  { label: "Garamond",        value: "Garamond, Georgia, serif" },
  { label: "Palatino",        value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { label: "Courier New",     value: "'Courier New', Courier, monospace" },
  { label: "Consolas",        value: "Consolas, 'Courier New', monospace" },
  { label: "Comic Sans MS",   value: "'Comic Sans MS', cursive" },
  { label: "Brush Script",    value: "'Brush Script MT', cursive" },
  { label: "Impact",          value: "Impact, Charcoal, sans-serif" },
];
const modeBtn: React.CSSProperties = { padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 };
const selStyle: React.CSSProperties = { fontSize: 11, border: "1px solid #ddd", borderRadius: 4, padding: "3px 6px", background: "#fff", color: "#111", cursor: "pointer" };
const zoomChip: React.CSSProperties = { width: 24, height: 24, border: "1px solid #ddd", borderRadius: 4, background: "#fff", color: "#111", cursor: "pointer", fontWeight: 700 };
const insertRowBtn: React.CSSProperties = { textAlign: "left", padding: "6px 10px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#111", fontWeight: 600 };
const tabChip = (color: string): React.CSSProperties => ({ fontSize: 11, padding: "4px 10px", background: "transparent", color, border: `1px solid ${color}`, borderRadius: 4, cursor: "pointer", fontWeight: 700 });

function ChipBtn({ onClick, children, style, active }: { onClick: () => void; children: React.ReactNode; style?: React.CSSProperties; active?: boolean }) {
  // onMouseDown preventDefault keeps focus inside the contentEditable so
  // execCommand has an actual selection to operate on.
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ width: 26, height: 26, borderRadius: 4, border: "none", cursor: "pointer", background: active ? "#FFCDD2" : "#fff", color: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, ...style }}
    >{children}</button>
  );
}
function Sep() { return <span style={{ width: 1, height: 18, background: "#ddd", margin: "0 4px" }} />; }
function ToolBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#B0BEC5", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 6px", minWidth: 52, borderRadius: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 700 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   ANNOTATION OVERLAY (highlight / underline / strike / sticky)
   ════════════════════════════════════════════════════════════ */

function AnnotationOverlay({ anno, onUpdate, onDelete }: { anno: Annotation; onUpdate: (p: Partial<Annotation>) => void; onDelete: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sx: number; sy: number; rect: DOMRect | null } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    const rect = ref.current?.parentElement?.getBoundingClientRect() || null;
    drag.current = { x: e.clientX, y: e.clientY, sx: anno.x, sy: anno.y, rect };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current?.rect) return;
    const { x, y, sx, sy, rect } = drag.current;
    const dx = ((e.clientX - x) / rect.width) * 100;
    const dy = ((e.clientY - y) / rect.height) * 100;
    onUpdate({ x: Math.max(0, Math.min(100 - anno.w, sx + dx)), y: Math.max(0, Math.min(100 - anno.h, sy + dy)) });
  };
  const onUp = (e: React.PointerEvent) => { drag.current = null; try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {} };

  if (anno.kind === "sticky") {
    return (
      <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        style={{ position: "absolute", left: `${anno.x}%`, top: `${anno.y}%`, zIndex: 5, cursor: "grab", touchAction: "none" }}>
        <div style={{ background: anno.color || "#FFEB3B", padding: "8px 10px", borderRadius: 4, fontSize: 11, color: "#111", maxWidth: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", position: "relative" }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>📌</div>
          <div style={{ wordBreak: "break-word" }}>{anno.text}</div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#EF5350", color: "#fff", border: "1px solid #fff", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>×</button>
        </div>
      </div>
    );
  }
  // highlight / underline / strike — flat coloured rect
  return (
    <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      onDoubleClick={(e) => { e.stopPropagation(); onDelete(); }}
      title="Double-click to delete"
      style={{
        position: "absolute", left: `${anno.x}%`, top: `${anno.y}%`,
        width: `${anno.w}%`, height: `${Math.max(0.6, anno.h)}%`,
        background: anno.kind === "highlight" ? anno.color : "transparent",
        borderBottom: anno.kind === "underline" ? `2px solid ${anno.color}` : undefined,
        borderTop: anno.kind === "strike" ? `2px solid ${anno.color}` : undefined,
        cursor: "grab", touchAction: "none", zIndex: 4,
      }}
    />
  );
}

/* ════════════════════════════════════════════════════════════
   STAMP OVERLAY
   ════════════════════════════════════════════════════════════ */

function StampOverlay({ stamp, onUpdate, onDelete }: { stamp: Stamp; onUpdate: (p: Partial<Stamp>) => void; onDelete: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useRef<"move" | "resize" | null>(null);
  const start = useRef<{ x: number; y: number; sx: number; sy: number; sw: number; sh: number; rect: DOMRect | null } | null>(null);
  const [selected, setSelected] = useState(false);

  const onDown = (e: React.PointerEvent, m: "move" | "resize") => {
    e.stopPropagation(); e.preventDefault(); setSelected(true);
    const rect = ref.current?.parentElement?.getBoundingClientRect() || null;
    mode.current = m;
    start.current = { x: e.clientX, y: e.clientY, sx: stamp.x, sy: stamp.y, sw: stamp.w, sh: stamp.h, rect };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!mode.current || !start.current?.rect) return;
    const { x, y, sx, sy, sw, sh, rect } = start.current;
    const dx = ((e.clientX - x) / rect.width) * 100;
    const dy = ((e.clientY - y) / rect.height) * 100;
    if (mode.current === "move") onUpdate({ x: Math.max(0, Math.min(100 - stamp.w, sx + dx)), y: Math.max(0, Math.min(100 - stamp.h, sy + dy)) });
    else onUpdate({ w: Math.max(8, Math.min(100 - stamp.x, sw + dx)), h: Math.max(4, Math.min(100 - stamp.y, sh + dy)) });
  };
  const onUp = (e: React.PointerEvent) => { mode.current = null; try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {} };

  const isText = stamp.kind === "signature" || stamp.kind === "initials";
  return (
    <div ref={ref}
      onPointerDown={(e) => onDown(e, "move")}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onClick={(e) => { e.stopPropagation(); setSelected(true); }}
      style={{ position: "absolute", left: `${stamp.x}%`, top: `${stamp.y}%`, width: `${stamp.w}%`, height: `${stamp.h}%`, cursor: "grab", touchAction: "none", zIndex: 6, display: "flex", alignItems: "center", justifyContent: "center", outline: selected ? "2px dashed #1E88E5" : "none" }}>
      {isText ? (
        <div style={{ fontFamily: "'Brush Script MT', cursive", color: stamp.color || "#1E88E5", fontSize: 36, transform: stamp.rotation ? `rotate(${stamp.rotation}deg)` : "none", whiteSpace: "nowrap" }}>{stamp.text}</div>
      ) : (
        <div style={{
          padding: "8px 16px", border: `3px solid ${stamp.color || "#EF5350"}`,
          color: stamp.color || "#EF5350", fontWeight: 900, fontSize: 18, letterSpacing: 2,
          textTransform: "uppercase", borderRadius: 4, transform: `rotate(${stamp.rotation ?? -8}deg)`,
          background: "rgba(255,255,255,0.7)", whiteSpace: "nowrap",
        }}>{stamp.text}</div>
      )}
      {selected && (
        <>
          <div onPointerDown={(e) => onDown(e, "resize")} onPointerMove={onMove} onPointerUp={onUp}
            style={{ position: "absolute", right: -6, bottom: -6, width: 12, height: 12, background: "#1E88E5", border: "2px solid #fff", borderRadius: 2, cursor: "nwse-resize", touchAction: "none" }} />
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ position: "absolute", top: -22, right: -6, width: 22, height: 22, background: "#EF5350", color: "#fff", border: "2px solid #fff", borderRadius: "50%", cursor: "pointer", fontSize: 12, fontWeight: 800 }}>×</button>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FORM FIELD OVERLAY
   ════════════════════════════════════════════════════════════ */

function FieldOverlay({ field, onUpdate, onDelete }: { field: FormField; onUpdate: (p: Partial<FormField>) => void; onDelete: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sx: number; sy: number; rect: DOMRect | null } | null>(null);
  const [selected, setSelected] = useState(false);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return; // clicking the input lets user type
    e.stopPropagation(); e.preventDefault(); setSelected(true);
    const rect = ref.current?.parentElement?.getBoundingClientRect() || null;
    drag.current = { x: e.clientX, y: e.clientY, sx: field.x, sy: field.y, rect };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current?.rect) return;
    const { x, y, sx, sy, rect } = drag.current;
    const dx = ((e.clientX - x) / rect.width) * 100;
    const dy = ((e.clientY - y) / rect.height) * 100;
    onUpdate({ x: Math.max(0, Math.min(100 - field.w, sx + dx)), y: Math.max(0, Math.min(100 - field.h, sy + dy)) });
  };
  const onUp = (e: React.PointerEvent) => { drag.current = null; try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {} };

  return (
    <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      style={{ position: "absolute", left: `${field.x}%`, top: `${field.y}%`, width: `${field.w}%`, height: `${field.h}%`, cursor: "grab", touchAction: "none", zIndex: 5, outline: selected ? "2px dashed #1E88E5" : "1px dashed rgba(30,136,229,0.4)", background: "rgba(30,136,229,0.05)" }}>
      {field.type === "checkbox" ? (
        <input type="checkbox" checked={field.value === "true"} onChange={(e) => onUpdate({ value: e.target.checked ? "true" : "" })} style={{ width: "100%", height: "100%" }} />
      ) : field.type === "date" ? (
        <input type="date" value={field.value} onChange={(e) => onUpdate({ value: e.target.value })} style={{ width: "100%", height: "100%", border: "none", background: "transparent", padding: 4, fontSize: 12 }} />
      ) : field.type === "signature" ? (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Brush Script MT', cursive", fontSize: 22, color: "#1E88E5" }}>
          {field.value || "(sign here)"}
        </div>
      ) : (
        <input type="text" value={field.value} onChange={(e) => onUpdate({ value: e.target.value })} placeholder={field.label || "Type here"} style={{ width: "100%", height: "100%", border: "none", background: "transparent", padding: 4, fontSize: 13, fontFamily: "Georgia,serif" }} />
      )}
      {selected && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: -18, right: -8, width: 20, height: 20, background: "#EF5350", color: "#fff", border: "2px solid #fff", borderRadius: "50%", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>×</button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE STRIP
   ════════════════════════════════════════════════════════════ */

function PageStrip({ pages, active, onSelect, onAdd, onDelete }: { pages: Page[]; active: number; onSelect: (i: number) => void; onAdd: () => void; onDelete: (i: number) => void }) {
  return (
    <div style={{ position: "sticky", bottom: 0, zIndex: 7, display: "flex", gap: 8, padding: "8px 12px", overflowX: "auto", borderTop: "1px solid #ddd", background: "#fff", boxShadow: "0 -1px 0 rgba(0,0,0,0.04)" }}>
      {pages.map((p, i) => (
        <button key={i} onClick={() => onSelect(i)} onDoubleClick={() => onDelete(i)} title="Double-click to delete"
          style={{ flexShrink: 0, width: 50, height: 64, borderRadius: 4, background: "#fff", border: active === i ? "2px solid #CC3333" : "1px solid #ddd", position: "relative", cursor: "pointer", padding: 0 }}>
          <span style={{ position: "absolute", top: 2, right: 4, fontSize: 9, color: "#CC3333", fontWeight: 800 }}>{i + 1}</span>
        </button>
      ))}
      <button onClick={onAdd} style={{ flexShrink: 0, width: 36, height: 64, borderRadius: 4, background: "#FAFAFA", color: "#CC3333", border: "1px dashed rgba(204,51,51,0.4)", fontSize: 22, cursor: "pointer" }}>+</button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TOOLS TABBED SHEET
   ════════════════════════════════════════════════════════════ */

interface ToolsSheetProps {
  tab: ToolTab; onTab: (t: ToolTab) => void; onClose: () => void;
  doc: Doc; page: Page; active: number;
  onAddText: () => void; onAddImage: () => void; onAddDate: () => void; onAddPageNumber: () => void; onAddSignatureField: () => void;
  onCommentTool: (t: CommentTool) => void; onDrawingMode: () => void;
  onAddStamp: (s: StampType) => void; onAddSignature: () => void; onAddInitials: () => void;
  onAddTextField: () => void; onAddCheckbox: () => void; onAddDateField: () => void;
  onPageInsert: (at: number) => void; onPageDelete: () => void; onPageRotate: () => void; onPageMoveUp: () => void; onPageMoveDown: () => void;
  onSetWatermarkText: () => void; onSetWatermarkImage: () => void;
  onSetHeader: () => void; onSetFooter: () => void;
  onAddBookmark: () => void;
}

function ToolsTabsSheet(p: ToolsSheetProps) {
  const tabs: ToolTab[] = ["edit", "comment", "fill", "pages", "more"];
  return (
    <div onClick={p.onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 130, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "82dvh", overflowY: "auto", background: "#0A0E1A", borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", gap: 4, padding: "10px 12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "sticky", top: 0, background: "#0A0E1A", zIndex: 1 }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => p.onTab(t)} style={{
              padding: "10px 14px", border: "none", cursor: "pointer", background: "transparent",
              color: p.tab === t ? "#CC3333" : "#8892A4",
              borderBottom: p.tab === t ? "2px solid #CC3333" : "2px solid transparent",
              fontSize: 13, fontWeight: 800, textTransform: "capitalize",
            }}>{t === "fill" ? "Fill & Sign" : t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={p.onClose} style={{ background: "none", border: "none", color: "#8892A4", fontSize: 20, cursor: "pointer", padding: "6px 12px" }}>✕</button>
        </div>
        <div style={{ padding: 14 }}>
          {p.tab === "edit" && <EditTab p={p} />}
          {p.tab === "comment" && <CommentTab p={p} />}
          {p.tab === "fill" && <FillTab p={p} />}
          {p.tab === "pages" && <PagesTab p={p} />}
          {p.tab === "more" && <MoreTab p={p} />}
        </div>
      </div>
    </div>
  );
}

function EditTab({ p }: { p: ToolsSheetProps }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      <DTile icon="📝" label="Add text" onClick={p.onAddText} />
      <DTile icon="🖼" label="Add image" onClick={p.onAddImage} />
      <DTile icon="📅" label="Insert date" onClick={p.onAddDate} />
      <DTile icon="#" label={p.doc.pageNumbers ? "Hide page numbers" : "Show page numbers"} onClick={p.onAddPageNumber} />
    </div>
  );
}
function CommentTab({ p }: { p: ToolsSheetProps }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Markup tools</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
        <DTile icon="🖌" label="Highlight" onClick={() => p.onCommentTool("highlight")} />
        <DTile icon="—" label="Underline" onClick={() => p.onCommentTool("underline")} />
        <DTile icon="✗" label="Strikethrough" onClick={() => p.onCommentTool("strike")} />
        <DTile icon="📌" label="Sticky note" onClick={() => p.onCommentTool("sticky")} />
      </div>
      <DTile icon="🛑" label="Cancel tool" onClick={() => p.onCommentTool("none")} />
    </div>
  );
}
function FillTab({ p }: { p: ToolsSheetProps }) {
  const stamps: { kind: StampType; label: string }[] = [
    { kind: "approved", label: "Approved" }, { kind: "draft", label: "Draft" }, { kind: "confidential", label: "Confidential" },
    { kind: "void", label: "Void" }, { kind: "paid", label: "Paid" }, { kind: "received", label: "Received" },
    { kind: "sample", label: "Sample" }, { kind: "urgent", label: "Urgent" }, { kind: "reviewed", label: "Reviewed" },
  ];
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Form fields</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
        <DTile icon="📝" label="Text field" onClick={p.onAddTextField} />
        <DTile icon="☑" label="Checkbox" onClick={p.onAddCheckbox} />
        <DTile icon="📅" label="Date field" onClick={p.onAddDateField} />
        <DTile icon="✍" label="Signature field" onClick={p.onAddSignatureField} />
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Sign</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
        <DTile icon="✍" label="My signature" onClick={p.onAddSignature} />
        <DTile icon="A.B." label="My initials" onClick={p.onAddInitials} />
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Stamps</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {stamps.map((s) => (
          <button key={s.kind} onClick={() => p.onAddStamp(s.kind)} style={{
            padding: "10px 8px", borderRadius: 8,
            background: "#fff", color: stampColor(s.kind),
            border: `2px solid ${stampColor(s.kind)}`,
            fontWeight: 900, fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
            cursor: "pointer", transform: "rotate(-3deg)",
          }}>{s.label}</button>
        ))}
      </div>
    </div>
  );
}
function PagesTab({ p }: { p: ToolsSheetProps }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      <DTile icon="＋" label="Insert page before" onClick={() => p.onPageInsert(p.active)} />
      <DTile icon="＋" label="Insert page after" onClick={() => p.onPageInsert(p.active + 1)} />
      <DTile icon="↻" label="Rotate 90°" onClick={p.onPageRotate} />
      <DTile icon="🗑" label="Delete this page" onClick={p.onPageDelete} />
      <DTile icon="↑" label="Move up" onClick={p.onPageMoveUp} />
      <DTile icon="↓" label="Move down" onClick={p.onPageMoveDown} />
    </div>
  );
}
function MoreTab({ p }: { p: ToolsSheetProps }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Branding</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
        <DTile icon="💧" label={p.doc.watermark?.text ? `Watermark: ${p.doc.watermark.text.slice(0,12)}` : "Add text watermark"} onClick={p.onSetWatermarkText} />
        <DTile icon="🖼" label="Image watermark" onClick={p.onSetWatermarkImage} />
        <DTile icon="◤" label={p.doc.header ? `Header: ${p.doc.header.slice(0,12)}` : "Set header"} onClick={p.onSetHeader} />
        <DTile icon="◣" label={p.doc.footer ? `Footer: ${p.doc.footer.slice(0,12)}` : "Set footer"} onClick={p.onSetFooter} />
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Navigation</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        <DTile icon="🔖" label={`Bookmarks (${p.doc.bookmarks?.length || 0})`} onClick={p.onAddBookmark} />
      </div>
    </div>
  );
}

function DTile({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "12px 8px", borderRadius: 10, background: "#111827", border: "1px solid rgba(255,255,255,0.05)", color: "#E8EDF5", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   DOC TOOLS SHEET (≡ menu)
   ════════════════════════════════════════════════════════════ */

function DocToolsSheet({ title, doc, noteId, onClose, onRename, onRestoreVersion, onTrash }: {
  title: string; doc: Doc; noteId: string; onClose: () => void;
  onRename: (t: string) => void; onRestoreVersion: (html: string) => void; onTrash: () => void;
}) {
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const flat = doc.pages.map((p) => `<section style="break-after:page;">${p.html}</section>`).join("");
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/notes/${noteId}`); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); } };

  const Row = ({ icon, label, hint, onClick, danger }: { icon: string; label: string; hint?: string; onClick?: () => void; danger?: boolean }) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "13px 18px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", color: danger ? "#EF5350" : "#E8EDF5", textAlign: "left" }}>
      <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#8892A4" }}>{hint}</div>}
      </div>
      <span style={{ color: "#5A6478" }}>›</span>
    </button>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 130, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "90dvh", overflowY: "auto", background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "#CC3333", color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>P</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>Pages: {doc.pages.length} · {doc.size} {doc.orientation}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
          <Row icon="💾" label="Save As / Export" onClick={() => { onClose(); setSaveAsOpen(true); }} />
          <Row icon="↗" label="Share / Copy link" onClick={() => { onClose(); copyLink(); }} />
          <Row icon="🖨" label="Print" onClick={() => { onClose(); window.print(); }} />
          <div style={{ borderTop: "6px solid #05080F" }} />
          <Row icon="⟲" label="Version History" onClick={() => { onClose(); setVersionsOpen(true); }} />
          <Row icon="🔒" label="Encrypt" onClick={async () => {
            onClose();
            const pw = prompt("Password (4+ chars):"); if (!pw || pw.length < 4) return;
            if (prompt("Re-enter:") !== pw) { toast.error("Mismatch"); return; }
            const cipher = await encryptHtml(JSON.stringify(doc), pw);
            onRestoreVersion(JSON.stringify({ pages: [{ html: `<div style="padding:40px;color:#666;"><h1>🔒 Encrypted</h1><p>${cipher}</p></div>` }] }));
            toast.success("Encrypted — Save to persist");
          }} />
          <Row icon="🔓" label="Decrypt" onClick={async () => {
            onClose();
            const inner = doc.pages?.[0]?.html?.match(/<p>([^<]+)<\/p>/)?.[1] || "";
            if (!isEncrypted(inner)) { toast.error("Not encrypted"); return; }
            const pw = prompt("Password:"); if (!pw) return;
            try { const plain = await decryptHtml(inner, pw); onRestoreVersion(plain); } catch (e) { toast.error((e as Error).message); }
          }} />
          <div style={{ borderTop: "6px solid #05080F" }} />
          <Row icon="🗑" label="Move to Trash" danger onClick={() => { onClose(); onTrash(); }} />
          <div style={{ height: "calc(12px + env(safe-area-inset-bottom))" }} />
        </div>
      </div>
      {saveAsOpen && <SaveAsSheet title={title} html={flat} onClose={() => setSaveAsOpen(false)} onRename={onRename} />}
      {versionsOpen && <VersionsSheet noteId={noteId} onClose={() => setVersionsOpen(false)} onRestore={(v) => { onRestoreVersion(v.html); setVersionsOpen(false); }} />}
    </>
  );
}

function SaveAsSheet({ title, html, onClose, onRename }: { title: string; html: string; onClose: () => void; onRename: (t: string) => void }) {
  const [name, setName] = useState(title.replace(/\.[^.]+$/, ""));
  const formats = [
    { ext: ".pdf", label: "PDF", color: "#EF5350", run: exportAsPdf },
    { ext: ".docx", label: "Word", color: "#2B5797", run: exportAsDoc },
    { ext: ".md", label: "Markdown", color: "#00897B", run: exportAsMarkdown },
    { ext: ".txt", label: "Plain text", color: "#8892A4", run: exportAsTxt },
    { ext: ".html", label: "HTML", color: "#FF7043", run: exportAsHtml },
    { ext: ".png", label: "Image", color: "#AB47BC", run: (t: string, h: string) => exportAsImage(t, h) },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 135, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderRadius: "16px 16px 0 0", maxHeight: "86dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>💾 Save As</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 14, outline: "none", marginBottom: 16 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {formats.map((f) => (
              <button key={f.ext} onClick={() => { const n = name.trim() || "document"; onRename(n + f.ext); f.run(n, html); onClose(); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, color: "#E8EDF5", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 40, height: 40, borderRadius: 8, background: f.color, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{f.ext.replace(".", "").toUpperCase()}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>{name}{f.ext}</div>
                </div>
                <span style={{ color: "#5A6478" }}>⬇</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function VersionsSheet({ noteId, onClose, onRestore }: { noteId: string; onClose: () => void; onRestore: (v: NoteVersion) => void }) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  useEffect(() => { setVersions(listVersions(noteId)); }, [noteId]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 135, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderRadius: "16px 16px 0 0", maxHeight: "80dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>⟲ Version History</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {versions.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#5A6478" }}>No versions yet</div>}
        {versions.map((v, i) => (
          <button key={v.at} onClick={() => onRestore(v)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 18px", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.04)", color: "#E8EDF5", textAlign: "left", cursor: "pointer" }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: i === 0 ? "rgba(102,187,106,0.15)" : "#111827", color: i === 0 ? "#66BB6A" : "#8892A4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{i === 0 ? "★" : `#${i + 1}`}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{v.title}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>{new Date(v.at).toLocaleString()}</div>
            </div>
            <span style={{ color: "#5A6478" }}>Restore</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */

function pageBgStyle(style: PageStyle): React.CSSProperties {
  if (style === "lined") return { backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 31px, #c7d6e5 31px, #c7d6e5 32px)" };
  if (style === "grid") return { backgroundImage: "linear-gradient(to right, #dbe3ed 1px, transparent 1px), linear-gradient(to bottom, #dbe3ed 1px, transparent 1px)", backgroundSize: "24px 24px" };
  if (style === "staff") return { backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 8px, #8892A4 8px, #8892A4 9px, transparent 9px, transparent 17px, #8892A4 17px, #8892A4 18px, transparent 18px, transparent 26px, #8892A4 26px, #8892A4 27px, transparent 27px, transparent 35px, #8892A4 35px, #8892A4 36px, transparent 36px, transparent 90px)" };
  return {};
}
function stampLabel(k: StampType): string {
  return ({ approved: "Approved", draft: "Draft", confidential: "Confidential", void: "Void", paid: "Paid", received: "Received", sample: "Sample", urgent: "Urgent", reviewed: "Reviewed", signature: "Signature", initials: "Initials" } as const)[k];
}
function stampColor(k: StampType): string {
  return ({ approved: "#43A047", draft: "#FF9800", confidential: "#EF5350", void: "#9E9E9E", paid: "#43A047", received: "#1E88E5", sample: "#AB47BC", urgent: "#EF5350", reviewed: "#1E88E5", signature: "#1E88E5", initials: "#1E88E5" } as const)[k];
}

const iconBtn: React.CSSProperties = { background: "none", border: "none", color: "#E8EDF5", width: 38, height: 38, borderRadius: 10, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" };
const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: "#E8EDF5", fontSize: 15, fontWeight: 700, padding: "6px 10px", fontFamily: "'Nunito', sans-serif", borderRadius: 6 };
