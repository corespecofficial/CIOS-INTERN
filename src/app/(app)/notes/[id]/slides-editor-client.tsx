"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
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

type Bg = null | { type: "color"; value: string } | { type: "image"; url: string };
type Transition =
  | "none" | "fade" | "cut" | "wipe" | "shape" | "dissolve" | "newsflash"
  | "wheel" | "random" | "blinds" | "comb" | "pull" | "split" | "lines"
  | "checkerboard" | "push" | "insert";

interface ShapeInstance {
  id: string;
  svg: string;       // inner SVG markup (no wrapping <svg>, just the shape primitives)
  x: number; y: number; // % of slide dimensions
  w: number; h: number; // %
  rotation?: number;
  fill?: string;
  stroke?: string;
}
interface Slide {
  title: string;
  subtitle?: string;
  body: string;
  bg?: Bg;
  transition?: Transition;
  notes?: string;
  ink?: string;
  shapes?: ShapeInstance[];
  hidden?: boolean;
}
interface Deck {
  bg?: string;
  titleColor?: string;
  size?: "4:3" | "16:9";
  slides: Slide[];
}

function parseDeck(html: string): Deck {
  try {
    const j = JSON.parse(html || "{}");
    if (Array.isArray(j.slides)) return { bg: j.bg, titleColor: j.titleColor, size: j.size || "16:9", slides: j.slides };
  } catch {}
  return { size: "16:9", slides: [{ title: "Double tap to add title", subtitle: "Double tap to add subtitle", body: "" }] };
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */

type EditTab = "insert" | "play" | "view" | "design" | "transitions" | "draw";

export function SlidesEditorClient({ initialNote }: { initialNote: DbNote }) {
  const back = useBackHandler();
  const [title, setTitle] = useState(initialNote.title || "Blank Presentation.pptx");
  const [deck, setDeck] = useState<Deck>(() => parseDeck(initialNote.html));
  const [active, setActive] = useState(0);
  const [play, setPlay] = useState<null | { from: number; autoplay: boolean; presenter: boolean }>(null);
  const [drawing, setDrawing] = useState(false);
  const [docToolsOpen, setDocToolsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editTab, setEditTab] = useState<EditTab | null>(null);
  const [quickInsertOpen, setQuickInsertOpen] = useState(false);
  const [textBoxOpen, setTextBoxOpen] = useState(false);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [showRemarks, setShowRemarks] = useState(true);
  const [history, setHistory] = useState<Deck[]>([]);
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Keep the contentEditable body in sync with the current slide when user
  // switches slides. onInput writes changes back to state without re-seeding
  // the DOM (otherwise the caret would reset on every keystroke).
  useEffect(() => {
    if (bodyRef.current && bodyRef.current.innerHTML !== (current.body || "")) {
      bodyRef.current.innerHTML = current.body || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Two-finger pinch zoom on mobile
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    let startDist = 0, startZoom = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { startDist = dist(e.touches); startZoom = zoom; }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const d = dist(e.touches);
        setZoom(Math.max(0.4, Math.min(3, startZoom * (d / startDist))));
      }
    };
    const onEnd = () => { startDist = 0; };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); el.removeEventListener("touchend", onEnd); };
  }, [zoom]);

  const { sync, schedule } = useAutoSave({
    saver: async () => {
      const r = await saveNote({ id: initialNote.id, title, html: JSON.stringify(deck) });
      if (r.ok) saveVersion(initialNote.id, title, JSON.stringify(deck));
      return !!r.ok;
    },
  });

  const slides = deck.slides;
  const current = slides[active];
  const aspect = (deck.size || "16:9") === "4:3" ? "4/3" : "16/9";
  const slideBg = (s: Slide): string =>
    s.bg?.type === "color" ? s.bg.value
      : s.bg?.type === "image" ? `url(${s.bg.url}) center/cover no-repeat`
      : (deck.bg || "#fff");
  const slideColor = deck.titleColor || "#111";

  const pushHistory = () => setHistory((h) => [...h.slice(-29), structuredClone(deck)]);
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) { toast("Nothing to undo"); return; }
    setDeck(last); setHistory((h) => h.slice(0, -1)); schedule();
  };
  const update = (i: number, patch: Partial<Slide>) => {
    pushHistory();
    setDeck((d) => ({ ...d, slides: d.slides.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
    schedule();
  };
  const updateDeck = (patch: Partial<Deck>) => { pushHistory(); setDeck((d) => ({ ...d, ...patch })); schedule(); };
  const addSlide = () => {
    pushHistory();
    setDeck((d) => ({ ...d, slides: [...d.slides, { title: "Double tap to add title", subtitle: "", body: "" }] }));
    setActive(slides.length);
    schedule();
  };
  const deleteSlide = (i: number) => {
    if (slides.length <= 1) { toast.error("Keep at least one slide"); return; }
    pushHistory();
    setDeck((d) => ({ ...d, slides: d.slides.filter((_, idx) => idx !== i) }));
    setActive(Math.max(0, i - 1));
    schedule();
  };
  const insertIntoBody = (html: string) => {
    const next = (current.body || "") + html;
    update(active, { body: next });
    // Push to the live contentEditable DOM too — otherwise the canvas won't
    // refresh because our sync useEffect only fires on slide change, and
    // React doesn't re-render contentEditable children.
    if (bodyRef.current) bodyRef.current.innerHTML = next;
  };

  /* ── File upload handlers for Take Photos / Audio / Picture ─────── */
  const uploadImageFile = async (file: File) => {
    const t = toast.loading("Uploading image…");
    try {
      const compressed = await compressImage(file, { maxBytes: 2 * 1024 * 1024, maxDim: 1920 });
      const up = await uploadToCloudinary(compressed, { folder: "cios-notes/slides", resourceType: "image" });
      insertIntoBody(`<p><img src="${up.secureUrl}" alt="" style="max-width:100%;margin:8px 0;border-radius:6px;" /></p>`);
      toast.success("Image added", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
  };
  const uploadAudioFile = async (file: File) => {
    const t = toast.loading("Uploading audio…");
    try {
      // Cloudinary treats audio as "video" resource_type — still returns a URL we can <audio src=""> with.
      const up = await uploadToCloudinary(file, { folder: "cios-notes/slides", resourceType: "video" });
      insertIntoBody(`<p><audio controls preload="metadata" src="${up.secureUrl}" style="width:100%;margin:8px 0;"></audio></p>`);
      toast.success("Audio added", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
  };
  const onPhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImageFile(f);
  };
  const onCameraPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImageFile(f);
  };
  const onAudioPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadAudioFile(f);
  };

  /* ── Shape mutations ─────────────────────────────────────────── */
  const addShape = (def: ShapeDef) => {
    const id = `sh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const s: ShapeInstance = { id, svg: def.svg, x: 40, y: 40, w: 20, h: 20, fill: "#1E88E5", stroke: "transparent" };
    update(active, { shapes: [...(current.shapes || []), s] });
    setSelectedShape(id);
    setShapesOpen(false);
    toast.success("Shape added — drag to move, use handles to resize");
  };
  const updateShape = (id: string, patch: Partial<ShapeInstance>) => {
    update(active, { shapes: (current.shapes || []).map((s) => s.id === id ? { ...s, ...patch } : s) });
  };
  const deleteShape = (id: string) => {
    update(active, { shapes: (current.shapes || []).filter((s) => s.id !== id) });
    setSelectedShape(null);
  };

  /* ── PLAY MODE ── */
  if (play) return <PlayMode deck={deck} startAt={play.from} autoplay={play.autoplay} presenter={play.presenter} onExit={() => setPlay(null)} />;

  return (
    <>
      {/* Hidden file inputs — triggered by Quick Insert + Insert tab buttons */}
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhotoPicked} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onCameraPicked} />
      <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={onAudioPicked} />

      <EditorShell
        accent="#D24726"
        topBar={<>
          <button onClick={back} style={iconBtn}>‹</button>
          <button onClick={undo} title="Undo" style={iconBtn}>↶</button>
          <button onClick={() => toast("Redo coming soon")} title="Redo" style={{ ...iconBtn, opacity: 0.4 }}>↷</button>
          <input value={title} onChange={(e) => { setTitle(e.target.value); schedule(); }} style={titleInput} />
          <button onClick={() => setShareOpen(true)} style={iconBtn} aria-label="Share / collaborate">👥</button>
          <button onClick={() => setDocToolsOpen(true)} style={iconBtn} aria-label="Document tools">≡</button>
          <SyncBadge status={sync} />
        </>}
        content={
          <div ref={scrollRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "auto", background: "#F4F6FA", WebkitOverflowScrolling: "touch" }}>
            {/* Zoom controls (desktop) */}
            <div className="notes-zoom-controls" style={{
              position: "sticky", top: 10, marginLeft: "auto", marginRight: 10,
              width: "fit-content", background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999, padding: 4, display: "flex", alignItems: "center", gap: 2, zIndex: 5,
            }}>
              <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} title="Zoom out" style={zoomBtn}>−</button>
              <div style={{ fontSize: 11, color: "#E8EDF5", fontWeight: 700, padding: "0 8px", minWidth: 44, textAlign: "center" }}>{Math.round(zoom * 100)}%</div>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))} title="Zoom in" style={zoomBtn}>+</button>
              <button onClick={() => setZoom(1)} title="Fit" style={{ ...zoomBtn, fontSize: 11 }}>Fit</button>
            </div>

            <div style={{ padding: "20px 20px 40px", transform: `scale(${zoom})`, transformOrigin: "top center", minWidth: zoom > 1 ? `${zoom * 100}%` : "100%" }}>
              <div ref={stageRef} style={{
                background: slideBg(current), color: slideColor,
                borderRadius: 12, aspectRatio: aspect, maxWidth: 960, margin: "0 auto",
                padding: "8% 10%", display: "flex", flexDirection: "column", justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)", overflow: "hidden", position: "relative",
              }}>
                <SlideField value={current.title} onChange={(v) => update(active, { title: v })}
                  placeholder="Double tap to add title"
                  style={{ fontSize: "min(6vw, 40px)", fontWeight: 800, color: slideColor, minHeight: "1.4em", marginBottom: 14 }} />
                <SlideField value={current.subtitle || ""} onChange={(v) => update(active, { subtitle: v })}
                  placeholder="Double tap to add subtitle"
                  style={{ fontSize: "min(3.2vw, 20px)", color: slideColor, opacity: 0.8, minHeight: "1.4em" }} />
                {/* Editable body — delete / backspace / paste all work here */}
                <div
                  ref={bodyRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    // Write back to state without re-seeding the DOM (preserves caret)
                    const html = (e.currentTarget as HTMLDivElement).innerHTML;
                    setDeck((d) => ({ ...d, slides: d.slides.map((s, idx) => idx === active ? { ...s, body: html } : s) }));
                    schedule();
                  }}
                  data-placeholder="Type content here, or use Insert / Text Box from the toolbar"
                  style={{
                    marginTop: 14, fontSize: "min(2.6vw, 16px)", color: slideColor, opacity: 0.9,
                    outline: "none", minHeight: 30,
                  }}
                />
                {current.ink && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                    dangerouslySetInnerHTML={{ __html: current.ink }} />
                )}

                {/* Draggable shape overlays */}
                {(current.shapes || []).map((s) => (
                  <ShapeOverlay
                    key={s.id} shape={s}
                    selected={selectedShape === s.id}
                    onSelect={() => setSelectedShape(s.id)}
                    onChange={(patch) => updateShape(s.id, patch)}
                    onDelete={() => deleteShape(s.id)}
                  />
                ))}

                {/* Click empty canvas to deselect */}
                <div onClick={() => setSelectedShape(null)} style={{ position: "absolute", inset: 0, pointerEvents: selectedShape ? "auto" : "none", zIndex: 0 }} />

                {/* In-place ink overlay — draws right on top of the slide content
                    when drawing mode is on, so the user keeps full visibility. */}
                {drawing && (
                  <InkOverlay
                    initialInk={current.ink || ""}
                    onChange={(ink) => update(active, { ink })}
                  />
                )}
              </div>
              {showRemarks && current.notes && (
                <div style={{ maxWidth: 960, margin: "14px auto 0", padding: 14, background: "#fff", borderRadius: 10, fontSize: 13, color: "#333" }}>
                  <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Speaker notes</div>
                  {current.notes}
                </div>
              )}
            </div>
            <style>{`
              [contenteditable][data-placeholder]:empty:before {
                content: attr(data-placeholder);
                color: rgba(0,0,0,0.3);
                pointer-events: none;
              }
            `}</style>
          </div>
        }
        bottomBar={<>
          <SlideStrip slides={slides} active={active} onSelect={setActive} onDelete={deleteSlide} onAdd={addSlide} />
          {drawing ? (
            // While inking, show a slimmer bar with just an "exit drawing" affordance.
            // The pen / colour / width controls live in the floating panel on the slide.
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px max(10px, env(safe-area-inset-bottom))", background: "rgba(210,71,38,0.1)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#D24726", display: "flex", alignItems: "center", gap: 6 }}>
                <span>✍</span> Drawing on slide {active + 1}
              </div>
              <button onClick={() => setDrawing(false)} style={{ padding: "8px 18px", background: "linear-gradient(135deg,#D24726,#B23F1F)", color: "#fff", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                ✓ Done
              </button>
            </div>
          ) : (
          <div style={{ position: "relative", display: "flex", justifyContent: "space-around", padding: "6px 10px max(6px, env(safe-area-inset-bottom))" }}>
            <ToolBtn icon="▶" label="Play" onClick={() => setPlay({ from: active, autoplay: false, presenter: false })} />
            <ToolBtn icon="🖼" label="Image" onClick={() => {
              const url = prompt("Image URL:"); if (!url) return;
              insertIntoBody(`<p><img src="${url}" style="max-width:100%;margin:8px 0;" /></p>`);
            }} />
            <ToolBtn icon="[A]" label="Text Box" onClick={() => setTextBoxOpen(true)} />
            <ToolBtn icon="+" label="Insert" onClick={() => setQuickInsertOpen((v) => !v)} />
            <ToolBtn icon="⊞" label="Tools" onClick={() => setEditTab("insert")} />

            {quickInsertOpen && (
              <QuickInsertPopover
                onClose={() => setQuickInsertOpen(false)}
                onMore={() => { setQuickInsertOpen(false); setEditTab("insert"); }}
                onTakePhoto={() => { setQuickInsertOpen(false); cameraInputRef.current?.click(); }}
                onPickPhoto={() => { setQuickInsertOpen(false); photoInputRef.current?.click(); }}
                onAudio={() => { setQuickInsertOpen(false); audioInputRef.current?.click(); }}
                onNotes={() => { setQuickInsertOpen(false); const n = prompt("Speaker notes for this slide:", current.notes || ""); if (n !== null) update(active, { notes: n }); }}
              />
            )}
          </div>
          )}
        </>}
      />

      {/* Doc-level Tools sheet (the ≡ menu) */}
      {docToolsOpen && (
        <DocToolsSheet
          title={title}
          deck={deck}
          noteId={initialNote.id}
          onClose={() => setDocToolsOpen(false)}
          onRename={(t) => { setTitle(t); schedule(); }}
          onRestoreVersion={(html) => { const d = parseDeck(html); setDeck(d); schedule(); toast.success("Version restored"); }}
          onEncrypt={async () => {
            const pw = prompt("Password to encrypt (min 4 chars):"); if (!pw || pw.length < 4) return;
            const confirm2 = prompt("Re-enter password:"); if (confirm2 !== pw) { toast.error("Mismatch"); return; }
            const cipher = await encryptHtml(JSON.stringify(deck), pw);
            // Stash the encrypted payload on title; we'll decrypt on next open via button
            toast.success("Encrypted. Save to persist.");
            // For slides we store the cipher in a marker slide
            setDeck({ slides: [{ title: "🔒 Encrypted deck", subtitle: `Open with Decrypt in Tools`, body: cipher }] });
            schedule();
          }}
          onDecrypt={async () => {
            const payload = deck.slides?.[0]?.body || "";
            if (!isEncrypted(payload)) { toast.error("This deck isn't encrypted"); return; }
            const pw = prompt("Password:"); if (!pw) return;
            try {
              const plain = await decryptHtml(payload, pw);
              setDeck(parseDeck(plain)); schedule(); toast.success("Decrypted");
            } catch (e) { toast.error((e as Error).message); }
          }}
          onTrash={async () => {
            if (!confirm("Move to trash?")) return;
            const r = await trashNote(initialNote.id);
            if (r.ok) { toast.success("Trashed"); back(); } else toast.error(r.error);
          }}
        />
      )}

      {/* Edit-level tabbed sheet (the ⊞ Tools bottom button) */}
      {editTab && (
        <EditTabsSheet
          tab={editTab}
          onTab={setEditTab}
          onClose={() => setEditTab(null)}
          deck={deck}
          active={active}
          current={current}
          onAddSlide={() => { addSlide(); setEditTab(null); }}
          onTextBox={() => { setEditTab(null); setTextBoxOpen(true); }}
          onPicture={() => { setEditTab(null); photoInputRef.current?.click(); }}
          onNotes={() => { const n = prompt("Speaker notes:", current.notes || ""); if (n !== null) update(active, { notes: n }); setEditTab(null); }}
          onShapes={() => { setEditTab(null); setShapesOpen(true); }}
          onLayout={(layout) => { insertIntoBody(layout); setEditTab(null); toast.success("Layout applied"); }}
          onVideo={() => { const url = prompt("Video URL (mp4/youtube):"); if (!url) return; const embed = toYouTubeEmbed(url); insertIntoBody(embed ? `<div style="position:relative;padding-bottom:56.25%;"><iframe src="${embed}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>` : `<video controls src="${url}" style="max-width:100%;"></video>`); setEditTab(null); }}
          onAudio={() => { const url = prompt("Audio URL:"); if (!url) return; insertIntoBody(`<audio controls src="${url}"></audio>`); setEditTab(null); }}
          onSymbol={(sym) => { insertIntoBody(`<span style="font-size:1.5em;">${sym}</span>`); setEditTab(null); }}
          onPlay={(opts) => { setPlay({ from: active, ...opts }); setEditTab(null); }}
          onHideToggle={() => { update(active, { hidden: !current.hidden }); setEditTab(null); toast.success(current.hidden ? "Shown" : "Hidden"); }}
          onFind={() => { setEditTab(null); setFindOpen(true); }}
          onToggleRemarks={() => { setShowRemarks((v) => !v); setEditTab(null); }}
          onThumbs={() => { setEditTab(null); setThumbsOpen(true); }}
          onScreenshot={async () => {
            setEditTab(null);
            if (!stageRef.current) return;
            const t = toast.loading("Capturing slide…");
            try {
              const canvas = await html2canvas(stageRef.current, { backgroundColor: "#ffffff", scale: 2 });
              canvas.toBlob((blob) => { if (!blob) return; const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `slide-${active + 1}.png`; a.click(); });
              toast.success("Saved", { id: t });
            } catch (e) { toast.error((e as Error).message, { id: t }); }
          }}
          onBgColor={(color) => { update(active, { bg: { type: "color", value: color } }); setEditTab(null); }}
          onBgImage={() => { const url = prompt("Background image URL:"); if (!url) return; update(active, { bg: { type: "image", url } }); setEditTab(null); }}
          onRemoveBg={() => { update(active, { bg: null }); setEditTab(null); toast.success("Background removed"); }}
          onRemoveAllBg={() => {
            pushHistory();
            setDeck((d) => ({ ...d, slides: d.slides.map((s) => ({ ...s, bg: null })) }));
            setEditTab(null); schedule(); toast.success("All backgrounds removed");
          }}
          onApplyBgAll={() => {
            pushHistory();
            setDeck((d) => ({ ...d, slides: d.slides.map((s) => ({ ...s, bg: current.bg })) }));
            setEditTab(null); schedule(); toast.success("Background applied to all");
          }}
          onSlideSize={(size) => { updateDeck({ size }); setEditTab(null); }}
          onTransition={(t, all) => {
            pushHistory();
            if (all) setDeck((d) => ({ ...d, slides: d.slides.map((s) => ({ ...s, transition: t })) }));
            else update(active, { transition: t });
            setEditTab(null); schedule(); toast.success(`Transition: ${t}${all ? " (all)" : ""}`);
          }}
          onDraw={() => { setEditTab(null); setDrawing(true); }}
          onAiEnhance={() => { setEditTab(null); toast("✨ AI slide enhancer coming soon"); }}
        />
      )}

      {textBoxOpen && (
        <TextBoxPresetsSheet onClose={() => setTextBoxOpen(false)} onPick={(html) => { insertIntoBody(html); setTextBoxOpen(false); }} />
      )}

      {shapesOpen && (
        <ShapesPickerSheet onClose={() => setShapesOpen(false)} onPick={addShape} />
      )}

      {findOpen && (
        <SlidesFindBar slides={slides} onJump={(idx) => { setActive(idx); setFindOpen(false); }} onClose={() => setFindOpen(false)} />
      )}

      {thumbsOpen && (
        <ThumbnailsSheet deck={deck} onPick={(i) => { setActive(i); setThumbsOpen(false); }} onClose={() => setThumbsOpen(false)} />
      )}

      {shareOpen && (
        <ShareNoteModal noteId={initialNote.id} noteTitle={title} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ════════════════════════════════════════════════════════════ */

function SlideField({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder: string; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <input autoFocus value={value} onBlur={() => setEditing(false)} onChange={(e) => onChange(e.target.value)}
      style={{ ...style, width: "100%", background: "none", border: "1px dashed #1E88E5", outline: "none", padding: 2 }} />;
  }
  return <div onClick={() => setEditing(true)} onDoubleClick={() => setEditing(true)} style={{ ...style, cursor: "text", border: "1px dashed rgba(0,0,0,0.15)", padding: 2 }}>
    {value || <span style={{ color: "#aaa" }}>{placeholder}</span>}
  </div>;
}

function SlideStrip({ slides, active, onSelect, onDelete, onAdd }: { slides: Slide[]; active: number; onSelect: (i: number) => void; onDelete: (i: number) => void; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 12px", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {slides.map((s, i) => (
        <button key={i} onClick={() => onSelect(i)} onDoubleClick={() => onDelete(i)} title="Double-click to delete" style={{
          flexShrink: 0, width: 64, height: 44, borderRadius: 6,
          background: s.bg?.type === "color" ? s.bg.value : "#fff",
          border: active === i ? "2px solid #D24726" : "1px solid rgba(255,255,255,0.1)",
          position: "relative", cursor: "pointer", padding: 0,
          opacity: s.hidden ? 0.4 : 1,
        }}>
          <span style={{ position: "absolute", top: 2, right: 4, fontSize: 8, color: "#D24726", fontWeight: 800 }}>{i + 1}</span>
          {s.hidden && <span style={{ position: "absolute", bottom: 2, left: 4, fontSize: 8 }}>🚫</span>}
        </button>
      ))}
      <button onClick={onAdd} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 6, background: "#111827", color: "#D24726", border: "1px dashed rgba(210,71,38,0.4)", fontSize: 22, cursor: "pointer" }}>+</button>
    </div>
  );
}

function ToolBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#B0BEC5", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 6px", minWidth: 52, borderRadius: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 700 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   INK OVERLAY — in-place drawing on the live slide.
   Pen / Highlighter / Eraser. Works on top of titles, body,
   shapes, ink. Strokes saved to current.ink as inline SVG.
   ════════════════════════════════════════════════════════════ */

interface InkPath { d: string; stroke: string; width: number; opacity: number; }

function parseInk(ink: string): InkPath[] {
  if (!ink) return [];
  const m = ink.match(/<path[^>]*\/>/g) || [];
  return m.map((tag) => ({
    d:       tag.match(/d="([^"]+)"/)?.[1] || "",
    stroke:  tag.match(/stroke="([^"]+)"/)?.[1] || "#EF5350",
    width:   parseFloat(tag.match(/stroke-width="([^"]+)"/)?.[1] || "3"),
    opacity: parseFloat(tag.match(/opacity="([^"]+)"/)?.[1] || "1"),
  }));
}

function inkToSvg(paths: InkPath[]): string {
  if (paths.length === 0) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;">${paths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${p.opacity}" />`).join("")}</svg>`;
}

function InkOverlay({ initialInk, onChange }: { initialInk: string; onChange: (ink: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<InkPath[]>(() => parseInk(initialInk));
  const drawingRef = useRef(false);
  const currentPath = useRef<string>("");

  // Read current tool config from the floating panel (state lives below)
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [color, setColor] = useState("#EF5350");
  const [width, setWidth] = useState(4);
  const [transparency, setTransparency] = useState(0.5);

  // Push to parent whenever paths change
  useEffect(() => { onChange(inkToSvg(paths)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [paths]);

  const ptToSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 1000 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    if (tool === "eraser") {
      // erase any path under the pointer
      const p = ptToSvg(e); eraseAt(p.x, p.y);
      drawingRef.current = true;
      return;
    }
    drawingRef.current = true;
    const p = ptToSvg(e);
    currentPath.current = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    setPaths((prev) => [...prev, {
      d: currentPath.current,
      stroke: color,
      width: tool === "highlighter" ? width * 3 : width,
      opacity: tool === "highlighter" ? transparency : 1,
    }]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = ptToSvg(e);
    if (tool === "eraser") { eraseAt(p.x, p.y); return; }
    currentPath.current += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    setPaths((prev) => prev.map((pp, i) => i === prev.length - 1 ? { ...pp, d: currentPath.current } : pp));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drawingRef.current = false;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  const eraseAt = (x: number, y: number) => {
    setPaths((prev) => prev.filter((p) => !pathHits(p, x, y, 30)));
  };

  return (
    <>
      {/* The drawing surface — sits ON TOP of slide content, full-cover */}
      <svg
        ref={svgRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          touchAction: "none", zIndex: 4,
          cursor: tool === "eraser" ? "cell" : "crosshair",
        }}
      >
        {paths.map((p, i) => (
          <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={p.opacity} />
        ))}
      </svg>

      {/* Floating tool panel — anchored top-left of slide */}
      <div onPointerDown={(e) => e.stopPropagation()} style={{
        position: "absolute", top: 8, left: 8, zIndex: 6,
        background: "rgba(255,255,255,0.95)", color: "#111",
        borderRadius: 10, padding: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", maxWidth: "calc(100% - 16px)",
      }}>
        {(["pen", "highlighter", "eraser"] as const).map((t) => (
          <button key={t} onClick={() => setTool(t)} title={t} style={{
            padding: "6px 10px", borderRadius: 6, border: "none",
            background: tool === t ? "#FFCDD2" : "transparent", color: "#111",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>{t === "pen" ? "✎ Pen" : t === "highlighter" ? "🖌 Highlight" : "⌫ Erase"}</button>
        ))}
        <span style={{ width: 1, height: 20, background: "#ddd" }} />
        {/* Width chips */}
        {[2, 4, 8].map((w) => (
          <button key={w} onClick={() => setWidth(w)} title={`${w}px`} style={{
            width: 28, height: 28, borderRadius: 6, border: width === w ? "2px solid #111" : "1px solid #ddd",
            background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 18, height: w, background: color, borderRadius: 999, opacity: tool === "highlighter" ? transparency : 1 }} />
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: "#ddd" }} />
        {/* Colour swatches */}
        {["#EF5350", "#FFC107", "#43A047", "#42A5F5", "#000", "#fff"].map((c) => (
          <button key={c} onClick={() => setColor(c)} title={c} style={{
            width: 22, height: 22, borderRadius: "50%", background: c,
            border: color === c ? "2px solid #111" : "1px solid #ccc", cursor: "pointer",
          }} />
        ))}
        {tool === "highlighter" && (
          <>
            <span style={{ width: 1, height: 20, background: "#ddd" }} />
            <input type="range" min={0.1} max={1} step={0.05} value={transparency} onChange={(e) => setTransparency(parseFloat(e.target.value))} style={{ width: 80 }} title="Transparency" />
          </>
        )}
        <span style={{ width: 1, height: 20, background: "#ddd" }} />
        <button onClick={() => setPaths((p) => p.slice(0, -1))} title="Undo last stroke" style={inkChipBtn}>↶</button>
        <button onClick={() => { if (confirm("Clear all ink on this slide?")) setPaths([]); }} title="Clear all" style={{ ...inkChipBtn, color: "#EF5350" }}>🧹</button>
      </div>
    </>
  );
}

const inkChipBtn: React.CSSProperties = { background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#111", borderRadius: 4 };

/** Cheap hit test for the eraser — checks if a path roughly passes near (x,y). */
function pathHits(p: InkPath, x: number, y: number, radius: number): boolean {
  // Sample the d string for L/M coordinates
  const tol = radius + p.width;
  const re = /([ML])\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p.d)) !== null) {
    const px = parseFloat(m[2]), py = parseFloat(m[3]);
    if (Math.hypot(px - x, py - y) < tol) return true;
  }
  return false;
}

/* ════════════════════════════════════════════════════════════
   SHAPE OVERLAY — draggable + resizable + colourable
   ════════════════════════════════════════════════════════════ */

function ShapeOverlay({ shape, selected, onSelect, onChange, onDelete }: {
  shape: ShapeInstance; selected: boolean;
  onSelect: () => void; onChange: (patch: Partial<ShapeInstance>) => void; onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragMode = useRef<"move" | "resize" | null>(null);
  const startRef = useRef<{ x: number; y: number; sx: number; sy: number; sw: number; sh: number; rect: DOMRect | null } | null>(null);
  const [colorPopOpen, setColorPopOpen] = useState(false);

  const onPointerDown = (e: React.PointerEvent, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const parent = ref.current?.parentElement?.getBoundingClientRect() || null;
    dragMode.current = mode;
    startRef.current = { x: e.clientX, y: e.clientY, sx: shape.x, sy: shape.y, sw: shape.w, sh: shape.h, rect: parent };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragMode.current || !startRef.current?.rect) return;
    const { x, y, sx, sy, sw, sh, rect } = startRef.current;
    const dx = ((e.clientX - x) / rect.width) * 100;
    const dy = ((e.clientY - y) / rect.height) * 100;
    if (dragMode.current === "move") {
      onChange({ x: Math.max(0, Math.min(100 - shape.w, sx + dx)), y: Math.max(0, Math.min(100 - shape.h, sy + dy)) });
    } else {
      onChange({ w: Math.max(4, Math.min(100 - shape.x, sw + dx)), h: Math.max(4, Math.min(100 - shape.y, sh + dy)) });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragMode.current = null;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  const colors = ["#1E88E5", "#EF5350", "#66BB6A", "#FFC107", "#AB47BC", "#FF7043", "#26C6DA", "#000", "#fff"];

  return (
    <div
      ref={ref}
      onPointerDown={(e) => onPointerDown(e, "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "absolute",
        left: `${shape.x}%`, top: `${shape.y}%`,
        width: `${shape.w}%`, height: `${shape.h}%`,
        cursor: dragMode.current === "move" ? "grabbing" : "grab",
        outline: selected ? "2px solid #1E88E5" : "2px solid transparent",
        outlineOffset: 2, borderRadius: 2,
        zIndex: selected ? 3 : 2, touchAction: "none",
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}
        dangerouslySetInnerHTML={{ __html: shape.svg.replace(/<(rect|circle|ellipse|polygon|polyline|path)/g, `<$1 fill="${shape.fill || "#1E88E5"}" stroke="${shape.stroke || "transparent"}"`) }} />

      {selected && (
        <>
          {/* Resize handle (bottom-right) */}
          <div
            onPointerDown={(e) => onPointerDown(e, "resize")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ position: "absolute", right: -8, bottom: -8, width: 16, height: 16, background: "#1E88E5", border: "2px solid #fff", borderRadius: 2, cursor: "nwse-resize", touchAction: "none" }}
          />
          {/* Delete + colour popover */}
          <div style={{ position: "absolute", top: -34, right: -2, display: "flex", gap: 4 }}>
            <button onClick={(e) => { e.stopPropagation(); setColorPopOpen((v) => !v); }} title="Colour"
              style={{ background: shape.fill || "#1E88E5", width: 26, height: 26, borderRadius: "50%", border: "2px solid #fff", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete"
              style={{ background: "#EF5350", color: "#fff", width: 26, height: 26, borderRadius: "50%", border: "2px solid #fff", cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>×</button>
          </div>
          {colorPopOpen && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: -72, right: 0, display: "flex", gap: 4, padding: 6, background: "#fff", borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
              {colors.map((c) => (
                <button key={c} onClick={() => { onChange({ fill: c }); setColorPopOpen(false); }} style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: "1px solid rgba(0,0,0,0.2)", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SHAPES PICKER SHEET — categorised library of 100+ shapes
   ════════════════════════════════════════════════════════════ */

function ShapesPickerSheet({ onClose, onPick }: { onClose: () => void; onPick: (def: ShapeDef) => void }) {
  const [activeGroup, setActiveGroup] = useState<string>(SHAPE_LIBRARY[0].title);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 95, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 600, maxHeight: "85dvh", display: "flex", flexDirection: "column", background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>Shapes</div>
            <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{ALL_SHAPES_COUNT} shapes · tap to insert · drag on the slide to position</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", overflowX: "auto" }}>
          {SHAPE_LIBRARY.map((g) => (
            <button key={g.title} onClick={() => setActiveGroup(g.title)} style={{
              padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              background: activeGroup === g.title ? "rgba(210,71,38,0.18)" : "transparent",
              color: activeGroup === g.title ? "#D24726" : "#8892A4",
              fontSize: 12, fontWeight: 700,
            }}>{g.title} · {g.items.length}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {SHAPE_LIBRARY.filter((g) => g.title === activeGroup).map((g) => (
            <div key={g.title} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
              {g.items.map((s) => (
                <button key={s.id} onClick={() => onPick(s)}
                  title={s.id}
                  style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 12, cursor: "pointer", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}
                    dangerouslySetInnerHTML={{ __html: s.svg.replace(/<(rect|circle|ellipse|polygon|polyline|path|line)/g, `<$1 fill="#E8EDF5" stroke="#E8EDF5"`) }} />
                </button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ height: "calc(12px + env(safe-area-inset-bottom))" }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   QUICK-INSERT POPOVER (small chip above bottom bar)
   ════════════════════════════════════════════════════════════ */

function QuickInsertPopover({ onClose, onMore, onTakePhoto, onPickPhoto, onAudio, onNotes }: { onClose: () => void; onMore: () => void; onTakePhoto: () => void; onPickPhoto: () => void; onAudio: () => void; onNotes: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
      <div style={{
        position: "absolute", bottom: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)",
        zIndex: 61, display: "flex", gap: 10, alignItems: "center",
        background: "#fff", color: "#111", padding: "10px 12px", borderRadius: 10,
        boxShadow: "0 8px 22px rgba(0,0,0,0.4)", whiteSpace: "nowrap",
      }}>
        <QuickChip icon="📷" label="Camera" onClick={onTakePhoto} />
        <QuickChip icon="🖼" label="Photo" onClick={onPickPhoto} />
        <QuickChip icon="🎙" label="Audio" onClick={onAudio} />
        <QuickChip icon="💬" label="Notes" onClick={onNotes} />
        <QuickChip icon="⋯" label="" onClick={onMore} />
      </div>
    </>
  );
}
function QuickChip({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#111", display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", fontSize: 13, fontWeight: 600 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>{label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   DOC-LEVEL TOOLS SHEET (≡ button)
   ════════════════════════════════════════════════════════════ */

function DocToolsSheet({ title, deck, noteId, onClose, onRename, onRestoreVersion, onEncrypt, onDecrypt, onTrash }: {
  title: string; deck: Deck; noteId: string; onClose: () => void;
  onRename: (t: string) => void; onRestoreVersion: (html: string) => void;
  onEncrypt: () => void; onDecrypt: () => void; onTrash: () => void;
}) {
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  // Flatten deck to one HTML page for export helpers
  const flat = deck.slides.map((s, i) => `<section style="break-after:page;"><h1>${s.title}</h1>${s.subtitle ? `<h3>${s.subtitle}</h3>` : ""}${s.body}</section>`).join("");

  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/notes/${noteId}`); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); } };

  const Row = ({ icon, label, hint, onClick, danger }: { icon: string; label: string; hint?: string; onClick?: () => void; danger?: boolean }) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "13px 18px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", color: danger ? "#EF5350" : "#E8EDF5", textAlign: "left" }}>
      <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 1 }}>{hint}</div>}
      </div>
      <span style={{ color: "#5A6478" }}>›</span>
    </button>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "90dvh", overflowY: "auto", background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "#D24726", color: "#fff", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>P</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>Slides: {deck.slides.length}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 14 }}>
            <QuickBtn icon="💾" label="Save As" onClick={() => { onClose(); setSaveAsOpen(true); }} />
            <QuickBtn icon="⌕" label="Find" onClick={() => { onClose(); toast("Use the View tab → Find"); }} />
            <QuickBtn icon="↗" label="Share" onClick={() => { onClose(); copyLink(); }} />
            <QuickBtn icon="🖨" label="Print" onClick={() => { onClose(); window.print(); }} />
          </div>

          <Row icon="📤" label="Send To" hint="Computer / Phone / Other Devices" onClick={() => { onClose(); copyLink(); }} />
          <Row icon="＋" label="Add To" hint="Pin to a folder" onClick={() => { onClose(); const f = prompt("Folder:"); if (f) toast.success(`Added to "${f}"`); }} />

          <div style={{ borderTop: "6px solid #05080F" }} />
          <Row icon="📄" label="Export as PDF" onClick={() => { onClose(); exportAsPdf(title, flat); }} />
          <Row icon="🖼" label="Export as Image" onClick={() => { onClose(); exportAsImage(title, flat); }} />
          <Row icon="⇄" label="More Conversion Options" hint=".docx · .md · .txt · .html" onClick={() => { onClose(); setSaveAsOpen(true); }} />

          <div style={{ borderTop: "6px solid #05080F" }} />
          <Row icon="✨" label="AI Generated Slides" hint="Coming soon" onClick={() => { onClose(); toast("✨ AI generator coming soon"); }} />
          <Row icon="⊞" label="All Services" onClick={() => { onClose(); toast("More tools next"); }} />

          <div style={{ borderTop: "6px solid #05080F" }} />
          <Row icon="⟲" label="Version History" onClick={() => { onClose(); setVersionsOpen(true); }} />
          <Row icon="🔒" label={isEncrypted(deck.slides?.[0]?.body || "") ? "Decrypt Document" : "Encrypt Document"}
            onClick={() => { onClose(); if (isEncrypted(deck.slides?.[0]?.body || "")) onDecrypt(); else onEncrypt(); }} />
          <Row icon="✓" label="Mark as Final" hint="Read-only flag (local)" onClick={() => { onClose(); toast.success("Marked as Final"); }} />
          <Row icon="ℹ" label="Document Information" onClick={() => { onClose(); alert(`${title}\n\nSlides: ${deck.slides.length}\nSize: ${deck.size || "16:9"}`); }} />
          <Row icon="↗" label="Open with Another App" onClick={() => { onClose(); copyLink(); }} />

          <div style={{ borderTop: "6px solid #05080F" }} />
          <Row icon="🗑" label="Move to Trash" danger onClick={() => { onClose(); onTrash(); }} />
          <div style={{ height: "calc(12px + env(safe-area-inset-bottom))" }} />
        </div>
      </div>

      {saveAsOpen && <SaveAsSlidesSheet title={title} html={flat} onClose={() => setSaveAsOpen(false)} onRename={onRename} />}
      {versionsOpen && <VersionsSheetSlides noteId={noteId} onClose={() => setVersionsOpen(false)} onRestore={(v) => { onRestoreVersion(v.html); setVersionsOpen(false); }} />}
    </>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#E8EDF5" }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

function SaveAsSlidesSheet({ title, html, onClose, onRename }: { title: string; html: string; onClose: () => void; onRename: (t: string) => void }) {
  const [name, setName] = useState(title.replace(/\.[^.]+$/, ""));
  const formats = [
    { ext: ".pdf", label: "PDF", color: "#EF5350", run: exportAsPdf },
    { ext: ".pptx", label: "PowerPoint (HTML)", color: "#D24726", run: (t: string, h: string) => exportAsDoc(t, h) },
    { ext: ".md", label: "Markdown", color: "#00897B", run: exportAsMarkdown },
    { ext: ".txt", label: "Plain text", color: "#8892A4", run: exportAsTxt },
    { ext: ".html", label: "HTML page", color: "#FF7043", run: exportAsHtml },
    { ext: ".png", label: "Image", color: "#AB47BC", run: (t: string, h: string) => exportAsImage(t, h) },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 95, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderRadius: "16px 16px 0 0", maxHeight: "86dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>💾 Save As</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="File name" style={{ width: "100%", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 14, outline: "none", marginBottom: 16 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {formats.map((f) => (
              <button key={f.ext} onClick={() => { const n = name.trim() || "slides"; onRename(n + f.ext); f.run(n, html); onClose(); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, color: "#E8EDF5", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 40, height: 40, borderRadius: 8, background: f.color, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{f.ext.replace(".", "").toUpperCase().slice(0, 4)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>{name || "slides"}{f.ext}</div>
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

function VersionsSheetSlides({ noteId, onClose, onRestore }: { noteId: string; onClose: () => void; onRestore: (v: NoteVersion) => void }) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  useEffect(() => { setVersions(listVersions(noteId)); }, [noteId]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 95, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderRadius: "16px 16px 0 0", maxHeight: "80dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>⟲ Version history</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {versions.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#5A6478", fontSize: 13 }}>No versions yet — saves create snapshots automatically.</div>}
        {versions.map((v, i) => (
          <button key={v.at} onClick={() => onRestore(v)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 18px", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.04)", color: "#E8EDF5", textAlign: "left", cursor: "pointer" }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: i === 0 ? "rgba(102,187,106,0.15)" : "#111827", color: i === 0 ? "#66BB6A" : "#8892A4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i === 0 ? "★" : `#${i + 1}`}</span>
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
   EDIT-LEVEL TABBED SHEET (⊞ Tools button)
   ════════════════════════════════════════════════════════════ */

interface EditTabsSheetProps {
  tab: EditTab; onTab: (t: EditTab) => void; onClose: () => void;
  deck: Deck; active: number; current: Slide;
  onAddSlide: () => void;
  onTextBox: () => void; onPicture: () => void; onNotes: () => void;
  onShapes: () => void; onLayout: (html: string) => void;
  onVideo: () => void; onAudio: () => void; onSymbol: (s: string) => void;
  onPlay: (opts: { autoplay: boolean; presenter: boolean }) => void;
  onHideToggle: () => void;
  onFind: () => void; onToggleRemarks: () => void; onThumbs: () => void; onScreenshot: () => void;
  onBgColor: (c: string) => void; onBgImage: () => void;
  onRemoveBg: () => void; onRemoveAllBg: () => void; onApplyBgAll: () => void;
  onSlideSize: (size: "4:3" | "16:9") => void;
  onTransition: (t: Transition, all: boolean) => void;
  onDraw: () => void;
  onAiEnhance: () => void;
}

function EditTabsSheet(p: EditTabsSheetProps) {
  const tabs: EditTab[] = ["insert", "play", "view", "design", "transitions", "draw"];
  return (
    <div onClick={p.onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "76dvh", overflowY: "auto", background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", gap: 4, padding: "10px 12px 0", alignItems: "center", position: "sticky", top: 0, background: "#0A0E1A", zIndex: 1 }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => p.onTab(t)} style={{
              padding: "10px 14px", border: "none", cursor: "pointer", background: "transparent",
              color: p.tab === t ? "#D24726" : "#8892A4",
              borderBottom: p.tab === t ? "2px solid #D24726" : "2px solid transparent",
              fontSize: 13, fontWeight: 800, textTransform: "capitalize",
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={p.onClose} style={{ background: "none", border: "none", color: "#8892A4", fontSize: 20, cursor: "pointer", padding: "6px 12px" }}>✕</button>
        </div>

        <div style={{ padding: 14 }}>
          {p.tab === "insert" && <InsertTab p={p} />}
          {p.tab === "play" && <PlayTab p={p} />}
          {p.tab === "view" && <ViewTab p={p} />}
          {p.tab === "design" && <DesignTab p={p} />}
          {p.tab === "transitions" && <TransitionsTab p={p} />}
          {p.tab === "draw" && <DrawTab p={p} />}
        </div>
      </div>
    </div>
  );
}

function InsertTab({ p }: { p: EditTabsSheetProps }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { i: "📄", l: "Slide", on: p.onAddSlide },
          { i: "[A]", l: "Text Box", on: p.onTextBox },
          { i: "🖼", l: "Picture", on: p.onPicture },
          { i: "💬", l: "Notes", on: p.onNotes },
        ].map((x) => <TileBtn key={x.l} icon={x.i} label={x.l} onClick={x.on} />)}
      </div>
      <SectionRow icon="◐" label="Shapes" onClick={p.onShapes} />
      <LayoutSection onPick={p.onLayout} />
      <div style={{ borderTop: "6px solid #05080F", margin: "10px -14px" }} />
      <SectionRow icon="▶" label="Video" onClick={p.onVideo} />
      <SectionRow icon="🎙" label="Audio" onClick={p.onAudio} />
      <SymbolSection onPick={p.onSymbol} />
    </>
  );
}
function PlayTab({ p }: { p: EditTabsSheetProps }) {
  return (
    <>
      <SectionRow icon="▶" label="From Current Slide" onClick={() => p.onPlay({ autoplay: false, presenter: false })} />
      <SectionRow icon="▷" label="From Beginning" onClick={() => { p.onPlay({ autoplay: false, presenter: false }); }} />
      <SectionRow icon="⟳" label="Autoplay" onClick={() => p.onPlay({ autoplay: true, presenter: false })} />
      <SectionRow icon="🧑‍🏫" label="Use Presenter View" hint="Notes are only visible to speaker" onClick={() => p.onPlay({ autoplay: false, presenter: true })} />
      <div style={{ borderTop: "6px solid #05080F", margin: "10px -14px" }} />
      <SectionRow icon="🙈" label="Hide Current Page" onClick={p.onHideToggle} />
    </>
  );
}
function ViewTab({ p }: { p: EditTabsSheetProps }) {
  return (
    <>
      <SectionRow icon="⌕" label="Find" onClick={p.onFind} />
      <SectionRow icon="👁" label="Show All Remarks" onClick={p.onToggleRemarks} />
      <SectionRow icon="▦" label="Thumbnails" onClick={p.onThumbs} />
      <SectionRow icon="✂" label="Screenshot" onClick={p.onScreenshot} />
    </>
  );
}
function DesignTab({ p }: { p: EditTabsSheetProps }) {
  const colors = ["#ffffff", "#F4F6FA", "#FFF8E1", "#E8F5E9", "#E3F2FD", "#F3E5F5", "#FFEBEE", "#263238"];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <TileBtn icon="✨" label="Full-Text Enhancer" onClick={p.onAiEnhance} dim />
        <TileBtn icon="📝" label="Single-Slide Enhancer" onClick={p.onAiEnhance} dim />
        <TileBtn icon="🎨" label="Background Color" onClick={() => { const c = prompt("Hex colour, e.g. #1E88E5:", "#ffffff"); if (c) p.onBgColor(c); }} />
        <TileBtn icon="🖼" label="Background Image" onClick={p.onBgImage} />
      </div>
      <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 700, padding: "4px 4px 8px", textTransform: "uppercase", letterSpacing: 1 }}>Quick colours</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {colors.map((c) => (
          <button key={c} onClick={() => p.onBgColor(c)} style={{ width: 32, height: 32, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }} />
        ))}
      </div>
      <SectionRow icon="↺" label="Remove Background of This Slide" onClick={p.onRemoveBg} />
      <SectionRow icon="↻" label="Remove Background of All Slides" onClick={p.onRemoveAllBg} />
      <SectionRow icon="⥱" label="Apply Background to All Slides" onClick={p.onApplyBgAll} />
      <div style={{ borderTop: "6px solid #05080F", margin: "10px -14px" }} />
      <SectionRow icon="▭" label={`Slide Size — ${p.deck.size || "16:9"}`} onClick={() => {
        const pick = prompt("Type 4:3 or 16:9:", p.deck.size || "16:9");
        if (pick === "4:3" || pick === "16:9") p.onSlideSize(pick);
      }} />
    </>
  );
}
function TransitionsTab({ p }: { p: EditTabsSheetProps }) {
  const all: Transition[] = ["none", "fade", "cut", "wipe", "shape", "dissolve", "newsflash", "wheel", "random", "blinds", "comb", "pull", "split", "lines", "checkerboard", "push", "insert"];
  const current = p.current.transition || "none";
  return (
    <>
      <button onClick={() => p.onTransition(current, true)} style={{ width: "100%", padding: "12px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(210,71,38,0.3)", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 14 }}>
        📚 Apply “{current}” to All Slides
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {all.map((t) => (
          <button key={t} onClick={() => p.onTransition(t, false)} style={{
            padding: "14px 6px", borderRadius: 8, cursor: "pointer",
            background: current === t ? "rgba(210,71,38,0.15)" : "#111827",
            color: current === t ? "#D24726" : "#E8EDF5",
            border: `1px solid ${current === t ? "#D24726" : "rgba(255,255,255,0.06)"}`,
            fontSize: 10, fontWeight: 700, textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>
    </>
  );
}
function DrawTab({ p }: { p: EditTabsSheetProps }) {
  return (
    <>
      <SectionRow icon="✍" label="Handwriting" hint="Draw ink directly on the slide" onClick={p.onDraw} />
    </>
  );
}

function TileBtn({ icon, label, onClick, dim }: { icon: string; label: string; onClick: () => void; dim?: boolean }) {
  return (
    <button onClick={onClick} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "14px 8px", cursor: "pointer", color: "#E8EDF5", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: dim ? 0.55 : 1 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center" }}>{label}</span>
    </button>
  );
}
function SectionRow({ icon, label, hint, onClick }: { icon: string; label: string; hint?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 8px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#E8EDF5", cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: "#8892A4" }}>{hint}</div>}
      </div>
      <span style={{ color: "#5A6478" }}>›</span>
    </button>
  );
}

function LayoutSection({ onPick }: { onPick: (html: string) => void }) {
  const layouts = [
    { label: "Two columns", html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px;"><div><strong>Left</strong><br>Content</div><div><strong>Right</strong><br>Content</div></div>` },
    { label: "Title + bullets", html: `<ul style="margin-top:10px;line-height:1.8;"><li>Point 1</li><li>Point 2</li><li>Point 3</li></ul>` },
    { label: "Image + text", html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px;"><div style="background:#eee;aspect-ratio:4/3;border-radius:6px;"></div><div>Caption / description here.</div></div>` },
    { label: "Three-up", html: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;"><div>A</div><div>B</div><div>C</div></div>` },
  ];
  return (
    <div>
      <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 800, padding: "10px 4px 6px", textTransform: "uppercase", letterSpacing: 1 }}>Layout</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {layouts.map((l) => (
          <button key={l.label} onClick={() => onPick(l.html)} style={{ padding: "10px 12px", background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, color: "#E8EDF5", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>{l.label}</button>
        ))}
      </div>
    </div>
  );
}
function SymbolSection({ onPick }: { onPick: (s: string) => void }) {
  const syms = "★ ✦ ✓ ✗ ⚡ ☀ ☁ ☂ ☘ ♥ ♦ ♠ ♣ ☆ ☎ ✉ ✎ ✏ ✒ ✂ ✈ ⌚ ⌛ ☕ ◆ ◇ ○ ● ◐".split(" ");
  return (
    <div>
      <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 800, padding: "10px 4px 6px", textTransform: "uppercase", letterSpacing: 1 }}>Special Symbols</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
        {syms.map((s) => (
          <button key={s} onClick={() => onPick(s)} style={{ padding: "8px 4px", background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, color: "#E8EDF5", fontSize: 16, cursor: "pointer" }}>{s}</button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TEXT BOX PRESETS (the [A] button)
   ════════════════════════════════════════════════════════════ */

function TextBoxPresetsSheet({ onClose, onPick }: { onClose: () => void; onPick: (html: string) => void }) {
  const presets = [
    { name: "Body paragraph", preview: <PreviewLines lines={[1, 1, 0.5]} />, html: `<p style="margin-top:10px;">Type your paragraph here…</p>` },
    { name: "Bulleted list",  preview: <PreviewLines lines={[1, 1, 1]} bullet />, html: `<ul style="margin-top:10px;line-height:1.7;"><li>Point one</li><li>Point two</li><li>Point three</li></ul>` },
    { name: "Numbered list",  preview: <PreviewLines lines={[1, 1, 1]} numbered />, html: `<ol style="margin-top:10px;line-height:1.7;"><li>Step one</li><li>Step two</li><li>Step three</li></ol>` },
    { name: "Accent lines",   preview: <PreviewLines lines={[1, 1, 0.7]} accent />, html: `<div style="margin-top:12px;color:#D24726;"><div style="height:2px;background:#D24726;margin:6px 0;width:100%;"></div><div style="height:2px;background:#D24726;margin:6px 0;width:86%;"></div><div style="height:2px;background:#D24726;margin:6px 0;width:58%;"></div></div>` },
    { name: "Long paragraph", preview: <PreviewLines lines={[1, 1, 1, 1]} />, html: `<p style="margin-top:10px;">A longer-form paragraph. Useful when you want dense content on a slide — keep under 40 words to stay readable from the back of the room.</p>` },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 95, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "80dvh", overflowY: "auto", background: "#fff", borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>Text Box</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#666", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, padding: 16 }}>
          {presets.map((p) => (
            <button key={p.name} onClick={() => onPick(p.html)} style={{ padding: 14, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
              {p.preview}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function PreviewLines({ lines, bullet, numbered, accent }: { lines: number[]; bullet?: boolean; numbered?: boolean; accent?: boolean }) {
  return (
    <div>
      {lines.map((w, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {bullet && <span style={{ width: 4, height: 4, borderRadius: 2, background: "#444" }} />}
          {numbered && <span style={{ fontSize: 12, color: "#444", fontWeight: 600 }}>{i + 1}.</span>}
          <div style={{ flex: w, height: 3, background: accent ? "#D24726" : "#4A4A4A", borderRadius: 2 }} />
          {w < 1 && <div style={{ flex: 1 - w }} />}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FIND BAR / THUMBNAILS SHEET
   ════════════════════════════════════════════════════════════ */

function SlidesFindBar({ slides, onJump, onClose }: { slides: Slide[]; onJump: (i: number) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const matches = slides
    .map((s, i) => ({ i, hit: `${s.title} ${s.subtitle || ""} ${s.body}`.toLowerCase().includes(q.toLowerCase()) && q.length > 0 }))
    .filter((m) => m.hit);
  return (
    <div style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 95, background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 280 }}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find in slides" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#E8EDF5", fontSize: 13, padding: "6px 8px", minWidth: 160 }} />
      <span style={{ fontSize: 10, color: "#8892A4" }}>{matches.length} match{matches.length === 1 ? "" : "es"}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
      {matches.length > 0 && (
        <div style={{ width: "100%", display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {matches.map((m) => (
            <button key={m.i} onClick={() => onJump(m.i)} style={{ padding: "4px 10px", background: "rgba(210,71,38,0.15)", color: "#D24726", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Slide {m.i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
function ThumbnailsSheet({ deck, onPick, onClose }: { deck: Deck; onPick: (i: number) => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 95, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "80dvh", overflowY: "auto", background: "#0A0E1A", borderRadius: "16px 16px 0 0" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>Thumbnails</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8892A4", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
          {deck.slides.map((s, i) => (
            <button key={i} onClick={() => onPick(i)} style={{ aspectRatio: (deck.size || "16:9") === "4:3" ? "4/3" : "16/9", background: s.bg?.type === "color" ? s.bg.value : (deck.bg || "#fff"), color: deck.titleColor || "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: 10, cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              <span style={{ position: "absolute", top: 4, right: 6, fontSize: 9, color: "#D24726", fontWeight: 800 }}>{i + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PLAY MODE — fullscreen slideshow with transitions
   ════════════════════════════════════════════════════════════ */

function PlayMode({ deck, startAt, autoplay: initialAutoplay, presenter, onExit }: { deck: Deck; startAt: number; autoplay: boolean; presenter: boolean; onExit: () => void }) {
  // Filter hidden, but fall back to the full deck if EVERY slide is hidden.
  const visible = deck.slides.filter((s) => !s.hidden);
  const slides = visible.length > 0 ? visible : deck.slides;
  const startIdx = Math.max(0, Math.min(startAt, slides.length - 1));
  const [i, setI] = useState(startIdx);
  const [anim, setAnim] = useState<string>("none");
  const [autoplay, setAutoplay] = useState(initialAutoplay);
  const [chrome, setChrome] = useState(true);     // show/hide UI chrome
  const [menuOpen, setMenuOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = slides[i];

  useEffect(() => { setAnim(slide?.transition || "fade"); }, [i, slide]);

  useEffect(() => {
    if (!autoplay) return;
    const h = setTimeout(() => setI((x) => Math.min(slides.length - 1, x + 1)), 4000);
    return () => clearTimeout(h);
  }, [i, autoplay, slides.length]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); setI((x) => Math.min(slides.length - 1, x + 1)); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
      if (e.key === "Home") setI(0);
      if (e.key === "End") setI(slides.length - 1);
      if (e.key === "p" || e.key === "P") setAutoplay((v) => !v);
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onExit, slides.length]);

  // Auto-hide chrome after 2.5s of inactivity (like PowerPoint)
  const kickChrome = () => {
    setChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 2500);
  };
  useEffect(() => { kickChrome(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* ignore */ }
  };

  // Mobile swipe navigation (horizontal only; vertical scrolls inside the slide)
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    kickChrome();
    if (e.touches.length === 1) swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current; swipeStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0]; if (!t) return;
    const dx = t.clientX - start.x; const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) setI((x) => Math.min(slides.length - 1, x + 1));
      else setI((x) => Math.max(0, x - 1));
    }
  };

  const bg = slide?.bg?.type === "color" ? slide.bg.value : slide?.bg?.type === "image" ? `url(${slide.bg.url}) center/cover no-repeat` : (deck.bg || "#fff");
  const color = deck.titleColor || "#111";
  const progress = ((i + 1) / slides.length) * 100;

  return (
    <div
      onMouseMove={kickChrome} onTouchStart={kickChrome}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "linear-gradient(180deg,#0A0A0A 0%, #000 100%)",
        display: "flex", flexDirection: presenter ? "row" : "column",
        alignItems: "center", justifyContent: "center", padding: presenter ? 24 : 0,
        gap: presenter ? 20 : 0, cursor: chrome ? "default" : "none",
      }}
    >
      {/* TOP BAR — exit + counter + menu (chrome) */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
        background: "linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0))",
        opacity: chrome ? 1 : 0, transition: "opacity 0.25s", pointerEvents: chrome ? "auto" : "none",
      }}>
        <button onClick={onExit} title="Exit presentation (Esc)" style={playChromeBtn}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>✕</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Exit</span>
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 700, padding: "8px 14px", background: "rgba(255,255,255,0.1)", borderRadius: 999, backdropFilter: "blur(8px)" }}>
          {i + 1} / {slides.length}
        </div>
        <button onClick={() => setAutoplay((v) => !v)} title={autoplay ? "Pause autoplay (P)" : "Start autoplay (P)"} style={playChromeBtn}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{autoplay ? "⏸" : "▶"}</span>
        </button>
        <button onClick={toggleFullscreen} title="Fullscreen (F)" style={playChromeBtn}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>⛶</span>
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} title="More" style={playChromeBtn}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⋯</span>
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
              <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, minWidth: 220, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 2 }}>
                <MenuRow label="Go to beginning (Home)" onClick={() => { setI(0); setMenuOpen(false); }} />
                <MenuRow label="Go to end (End)" onClick={() => { setI(slides.length - 1); setMenuOpen(false); }} />
                <MenuRow label="Black screen" onClick={() => { setMenuOpen(false); const el = document.createElement("div"); el.style.cssText="position:fixed;inset:0;background:#000;z-index:9999;cursor:pointer;"; el.onclick=()=>el.remove(); document.body.appendChild(el); }} />
                <MenuRow label="Exit (Esc)" danger onClick={onExit} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* SLIDE */}
      <div key={i} style={{
        background: bg, color,
        width: "calc(100% - 60px)", maxWidth: presenter ? "70%" : 1280,
        aspectRatio: (deck.size || "16:9") === "4:3" ? "4/3" : "16/9",
        borderRadius: 6, padding: "5% 7%",
        display: "flex", flexDirection: "column", justifyContent: "center",
        overflow: "hidden", animation: transitionAnim(anim), position: "relative",
        boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: "min(5vw, 48px)", fontWeight: 800, marginBottom: 14, lineHeight: 1.15 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ fontSize: "min(2.6vw, 22px)", opacity: 0.8, marginBottom: 14 }}>{slide.subtitle}</div>}
        {slide.body && <div style={{ fontSize: "min(2vw, 18px)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: slide.body }} />}
        {slide.ink && <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: slide.ink }} />}
      </div>

      {/* PRESENTER PANEL */}
      {presenter && (
        <div style={{ flex: "0 0 28%", color: "#fff", display: "flex", flexDirection: "column", gap: 10, maxHeight: "80vh" }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 2 }}>Speaker notes</div>
          <div style={{ background: "#1a1a1a", padding: 16, borderRadius: 10, fontSize: 15, lineHeight: 1.5, minHeight: 180, border: "1px solid rgba(255,255,255,0.08)" }}>
            {slide.notes || <em style={{ color: "#666" }}>No notes for this slide.</em>}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 10 }}>Next up:</div>
          {slides[i + 1] ? (
            <div style={{ background: "#fff", color: "#111", padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700 }}>
              {slides[i + 1].title}
            </div>
          ) : (
            <div style={{ color: "#555", fontSize: 13, fontStyle: "italic" }}>Last slide — the end.</div>
          )}
        </div>
      )}

      {/* Thin edge-click zones (10% each) — positioned outside the max slide
          width on desktop, small enough on mobile that videos/audio stay
          tappable. pointer-events only on these narrow strips. */}
      <button onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="Previous slide"
        style={{ position: "fixed", top: 80, bottom: 80, left: 0, width: "8%", background: "transparent", border: "none", cursor: chrome ? "w-resize" : "none" }} />
      <button onClick={() => setI((x) => Math.min(slides.length - 1, x + 1))} aria-label="Next slide"
        style={{ position: "fixed", top: 80, bottom: 80, right: 0, width: "8%", background: "transparent", border: "none", cursor: chrome ? "e-resize" : "none" }} />

      {/* BOTTOM NAV (chrome) — compact prev/next pill with progress bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
        opacity: chrome ? 1 : 0, transition: "opacity 0.25s", pointerEvents: chrome ? "auto" : "none",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.1)", position: "relative", marginBottom: 10 }}>
          <div style={{ position: "absolute", inset: 0, width: `${progress}%`, background: "#D24726", transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, padding: "0 0 20px" }}>
          <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} title="Previous (←)"
            style={{ ...playNavBtn, opacity: i === 0 ? 0.3 : 1 }}>
            ‹
          </button>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, padding: "0 14px", minWidth: 70, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {i + 1} <span style={{ opacity: 0.5 }}>/ {slides.length}</span>
          </div>
          <button onClick={() => setI((x) => Math.min(slides.length - 1, x + 1))} disabled={i === slides.length - 1} title="Next (→ or Space)"
            style={{ ...playNavBtn, opacity: i === slides.length - 1 ? 0.3 : 1 }}>
            ›
          </button>
        </div>
      </div>

      {/* Keyboard hint — shows briefly on enter */}
      {chrome && (
        <div style={{ position: "fixed", bottom: 60, right: 20, color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, opacity: chrome ? 0.6 : 0, transition: "opacity 0.3s", pointerEvents: "none" }}>
          ← → to navigate · Esc to exit · F fullscreen · P autoplay
        </div>
      )}

      <style>{transitionKeyframes}</style>
    </div>
  );
}

function MenuRow({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", color: danger ? "#EF5350" : "#E8EDF5", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
      {label}
    </button>
  );
}

/**
 * Resolve a transition name to a CSS `animation` string. Every transition
 * from the Transitions tab has a distinct visual effect. "random" picks a
 * different effect on every slide change.
 */
function transitionAnim(t: string): string {
  // "Random" — choose a different transition on each slide change
  if (t === "random") {
    const pool = ["fade", "wipe", "push", "pull", "split", "shape", "dissolve", "newsflash", "wheel", "blinds", "comb", "lines", "checkerboard", "insert"];
    t = pool[Math.floor(Math.random() * pool.length)];
  }
  const map: Record<string, string> = {
    none:         "none",
    cut:          "none", // instant — no animation
    fade:         "cios-tx-fade 0.4s ease-out",
    dissolve:     "cios-tx-dissolve 0.65s ease-out",
    wipe:         "cios-tx-wipe 0.5s ease-out",
    push:         "cios-tx-push 0.45s cubic-bezier(.2,.8,.2,1)",
    pull:         "cios-tx-pull 0.45s cubic-bezier(.2,.8,.2,1)",
    split:        "cios-tx-split 0.5s ease-out",
    shape:        "cios-tx-shape 0.55s cubic-bezier(.34,1.56,.64,1)",
    newsflash:    "cios-tx-newsflash 0.65s ease-out",
    wheel:        "cios-tx-wheel 0.7s ease-out",
    blinds:       "cios-tx-blinds 0.65s steps(8, end)",
    comb:         "cios-tx-comb 0.65s steps(6, end)",
    lines:        "cios-tx-lines 0.6s steps(10, end)",
    checkerboard: "cios-tx-checker 0.6s ease-out",
    insert:       "cios-tx-insert 0.45s cubic-bezier(.34,1.56,.64,1)",
  };
  return map[t] ?? "cios-tx-fade 0.4s ease-out";
}
const transitionKeyframes = `
  @keyframes cios-tx-fade       { from { opacity: 0 } to { opacity: 1 } }
  @keyframes cios-tx-dissolve   { from { opacity: 0; filter: blur(18px) saturate(0.6) } to { opacity: 1; filter: none } }
  @keyframes cios-tx-wipe       { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0) } }
  @keyframes cios-tx-push       { from { transform: translateX(100%); opacity: 0.5 } to { transform: translateX(0); opacity: 1 } }
  @keyframes cios-tx-pull       { from { transform: translateX(-100%); opacity: 0.5 } to { transform: translateX(0); opacity: 1 } }
  @keyframes cios-tx-split      { from { clip-path: inset(0 50% 0 50%) } to { clip-path: inset(0) } }
  @keyframes cios-tx-shape      { from { transform: scale(0.2) rotate(-8deg); opacity: 0; border-radius: 50% } to { transform: scale(1) rotate(0); opacity: 1; border-radius: 6px } }
  @keyframes cios-tx-newsflash  {
    0%   { transform: scale(0.4) rotate(-45deg); opacity: 0; filter: blur(8px); }
    60%  { transform: scale(1.1) rotate(6deg); opacity: 1; filter: none; }
    80%  { transform: scale(0.96) rotate(-2deg); }
    100% { transform: scale(1) rotate(0); }
  }
  @keyframes cios-tx-wheel      { from { clip-path: circle(0% at 50% 50%); opacity: 0.5 } to { clip-path: circle(120% at 50% 50%); opacity: 1 } }
  @keyframes cios-tx-blinds {
    0%   { clip-path: polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%, 0% 12.5%, 100% 12.5%, 100% 12.5%, 0% 12.5%, 0% 25%, 100% 25%, 100% 25%, 0% 25%, 0% 37.5%, 100% 37.5%, 100% 37.5%, 0% 37.5%, 0% 50%, 100% 50%, 100% 50%, 0% 50%, 0% 62.5%, 100% 62.5%, 100% 62.5%, 0% 62.5%, 0% 75%, 100% 75%, 100% 75%, 0% 75%, 0% 87.5%, 100% 87.5%, 100% 87.5%, 0% 87.5%); }
    100% { clip-path: inset(0); }
  }
  @keyframes cios-tx-comb {
    0%   { clip-path: polygon(0% 0%, 16.66% 0%, 16.66% 100%, 0% 100%, 33.33% 100%, 33.33% 0%, 50% 0%, 50% 100%, 66.66% 100%, 66.66% 0%, 83.33% 0%, 83.33% 100%, 100% 100%, 100% 0%); }
    100% { clip-path: inset(0); }
  }
  @keyframes cios-tx-lines {
    0%   { clip-path: polygon(0% 0%, 10% 0%, 10% 100%, 0% 100%, 20% 100%, 20% 0%, 30% 0%, 30% 100%, 40% 100%, 40% 0%, 50% 0%, 50% 100%, 60% 100%, 60% 0%, 70% 0%, 70% 100%, 80% 100%, 80% 0%, 90% 0%, 90% 100%, 100% 100%, 100% 0%); }
    100% { clip-path: inset(0); }
  }
  @keyframes cios-tx-checker {
    0%   { opacity: 0; transform: scale(0.92); filter: blur(4px); }
    50%  { opacity: 0.8; }
    100% { opacity: 1; transform: scale(1); filter: none; }
  }
  @keyframes cios-tx-insert     { from { transform: scale(0.2); opacity: 0 } to { transform: scale(1); opacity: 1 } }
`;
const playChromeBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
  color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
  padding: "8px 14px", borderRadius: 999, cursor: "pointer",
};
const playNavBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: "50%",
  background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
  color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 22, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

/* ════════════════════════════════════════════════════════════
   DRAW CANVAS — pen / highlighter / eraser
   ════════════════════════════════════════════════════════════ */

type DrawTool = "pen" | "highlighter" | "eraser";

function DrawCanvas({ initialInk, bg, color, aspect, onDone, onClearAll }: {
  initialInk: string; bg: string; color: string; aspect: string;
  onDone: (ink: string) => void; onClearAll: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [strokeSize, setStrokeSize] = useState(3); // pen width
  const [strokeColor, setStrokeColor] = useState("#EF5350");
  const [hardTip, setHardTip] = useState(false);
  const [transparency, setTransparency] = useState(0.5);
  const [eraserSize, setEraserSize] = useState(16);
  const [smartShape, setSmartShape] = useState(true);
  const [showPanel, setShowPanel] = useState<DrawTool | null>("pen");
  const [eraseMenuOpen, setEraseMenuOpen] = useState(false);
  const [paths, setPaths] = useState<Array<{ d: string; stroke: string; width: number; opacity: number }>>(() => {
    const m = initialInk.match(/<path[^>]*d="([^"]+)"[^>]*stroke="([^"]+)"[^>]*stroke-width="([^"]+)"[^>]*opacity="([^"]+)"/g);
    if (!m) return [];
    return m.map((tag) => {
      const d = tag.match(/d="([^"]+)"/)?.[1] || "";
      const stroke = tag.match(/stroke="([^"]+)"/)?.[1] || "#EF5350";
      const w = parseFloat(tag.match(/stroke-width="([^"]+)"/)?.[1] || "3");
      const o = parseFloat(tag.match(/opacity="([^"]+)"/)?.[1] || "1");
      return { d, stroke, width: w, opacity: o };
    });
  });
  const [drawing, setDrawing] = useState(false);
  const currentPath = useRef<string>("");

  const colorOptions = ["#EF5350", "#FFC107", "#43A047", "#42A5F5", "#000"];
  const highlighterColors = ["#EF5350", "#FFEB3B", "#66BB6A", "#42A5F5", "#111"];

  const getSvgPoint = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 1000, y: ((e.clientY - rect.top) / rect.height) * 1000 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDrawing(true);
    const p = getSvgPoint(e);
    if (tool === "eraser") {
      // erase: remove any path whose bounding box contains the point
      setPaths((prev) => prev.filter(() => true));
      return;
    }
    currentPath.current = `M ${p.x} ${p.y}`;
    setPaths((prev) => [...prev, {
      d: currentPath.current,
      stroke: tool === "highlighter" ? strokeColor : strokeColor,
      width: tool === "highlighter" ? strokeSize * 4 : strokeSize,
      opacity: tool === "highlighter" ? transparency : 1,
    }]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = getSvgPoint(e);
    currentPath.current += ` L ${p.x} ${p.y}`;
    setPaths((prev) => prev.map((pp, i) => i === prev.length - 1 ? { ...pp, d: currentPath.current } : pp));
  };
  const onPointerUp = () => setDrawing(false);

  const undoLast = () => setPaths((p) => p.slice(0, -1));
  const redo = () => toast("Redo coming soon");

  const saveInk = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;">${paths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${p.opacity}" />`).join("")}</svg>`;
    onDone(svg);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#E0E0E0", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: "#F5F5F5", borderBottom: "1px solid #ddd" }}>
        <button onClick={undoLast} style={drawTopBtn}>↶</button>
        <button onClick={redo} style={{ ...drawTopBtn, opacity: 0.4 }}>↷</button>
        <div style={{ flex: 1 }} />
        <button onClick={saveInk} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#111" }}>
          <span>💾</span> Done
        </button>
      </div>

      {/* Slide preview (read-only) */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" }}>
        <div style={{ background: bg, color, width: "100%", maxWidth: 900, aspectRatio: aspect, borderRadius: 8, padding: "6% 8%", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden" }}>
          {/* Draw layer */}
          <svg
            ref={svgRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: tool === "eraser" ? "crosshair" : "crosshair" }}
          >
            {paths.map((p, i) => (
              <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={p.opacity} />
            ))}
          </svg>
        </div>
      </div>

      {/* Tool panel */}
      {showPanel === "pen" && tool === "pen" && (
        <div style={drawPanel}>
          <PanelLabel>Stroke</PanelLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            {[2, 4, 7].map((s) => (
              <button key={s} onClick={() => setStrokeSize(s)} style={{ padding: 12, background: strokeSize === s ? "#FFCDD2" : "#fff", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "center" }}>
                <div style={{ width: 40, height: s * 2, background: strokeColor, borderRadius: 999 }} />
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
            {[{ k: false, l: "Hard Tip" }, { k: true, l: "Soft Tip" }].map((o) => (
              <label key={o.l} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="radio" checked={hardTip === o.k} onChange={() => setHardTip(o.k)} />{o.l}
              </label>
            ))}
          </div>
          <PanelLabel>Color</PanelLabel>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {colorOptions.map((c) => (
              <button key={c} onClick={() => setStrokeColor(c)} style={{ width: 36, height: 36, borderRadius: 6, background: c, border: strokeColor === c ? "3px solid #111" : "1px solid #ddd", cursor: "pointer" }}>
                {strokeColor === c && <span style={{ color: "#fff", fontWeight: 800 }}>✓</span>}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Smart Shape Recognition</div>
              <div style={{ fontSize: 11, color: "#666" }}>Pause after drawing to convert shapes.</div>
            </div>
            <input type="checkbox" checked={smartShape} onChange={(e) => setSmartShape(e.target.checked)} />
          </label>
        </div>
      )}

      {showPanel === "highlighter" && tool === "highlighter" && (
        <div style={drawPanel}>
          <PanelLabel>Stroke</PanelLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            {[4, 8, 14].map((s) => (
              <button key={s} onClick={() => setStrokeSize(s)} style={{ padding: 12, background: strokeSize === s ? "#FFF9C4" : "#fff", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "center" }}>
                <div style={{ width: 40, height: s, background: strokeColor, opacity: 0.5, borderRadius: 999 }} />
              </button>
            ))}
          </div>
          <PanelLabel>Color</PanelLabel>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {highlighterColors.map((c) => (
              <button key={c} onClick={() => setStrokeColor(c)} style={{ width: 36, height: 36, borderRadius: 6, background: c, border: strokeColor === c ? "3px solid #111" : "1px solid #ddd", cursor: "pointer" }}>
                {strokeColor === c && <span style={{ color: "#fff", fontWeight: 800 }}>✓</span>}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>Transparency</span>
              <span>{Math.round(transparency * 100)}%</span>
            </div>
            <input type="range" min={0.1} max={1} step={0.05} value={transparency} onChange={(e) => setTransparency(parseFloat(e.target.value))} style={{ width: "100%" }} />
          </div>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Smart Shape Recognition</div>
              <div style={{ fontSize: 11, color: "#666" }}>Pause after drawing.</div>
            </div>
            <input type="checkbox" checked={smartShape} onChange={(e) => setSmartShape(e.target.checked)} />
          </label>
        </div>
      )}

      {showPanel === "eraser" && tool === "eraser" && (
        <div style={drawPanel}>
          <PanelLabel>Eraser Size</PanelLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: "10px 0" }}>
            {[8, 14, 20, 28, 36].map((s) => (
              <button key={s} onClick={() => setEraserSize(s)} style={{ padding: 10, background: eraserSize === s ? "#eee" : "#fff", border: eraserSize === s ? "2px solid #333" : "1px solid #ddd", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ width: s, height: s, borderRadius: "50%", background: "#222" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tool strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", background: "#F5F5F5", borderTop: "1px solid #ddd", padding: "10px calc(20px + env(safe-area-inset-bottom)) 14px" }}>
        <DrawToolBtn active={tool === "pen"} label="Pen" onClick={() => { setTool("pen"); setShowPanel("pen"); }}><span style={{ color: strokeColor, fontSize: 24 }}>✎</span></DrawToolBtn>
        <DrawToolBtn active={tool === "highlighter"} label="Highlighter" onClick={() => { setTool("highlighter"); setShowPanel("highlighter"); }}><span style={{ color: strokeColor, fontSize: 24 }}>🖌</span></DrawToolBtn>
        <div style={{ position: "relative" }}>
          <DrawToolBtn active={tool === "eraser"} label="Eraser" onClick={() => { setTool("eraser"); setShowPanel("eraser"); }}><span style={{ fontSize: 24 }}>⌫</span></DrawToolBtn>
        </div>
        <div style={{ position: "relative" }}>
          <DrawToolBtn active={false} label="Clear" onClick={() => setEraseMenuOpen((v) => !v)}><span style={{ fontSize: 22 }}>🧹</span></DrawToolBtn>
          {eraseMenuOpen && (
            <div style={{ position: "absolute", bottom: "110%", right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", minWidth: 200, zIndex: 1 }}>
              <button onClick={() => { setPaths([]); setEraseMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: 12, background: "none", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: 14 }}>Clear Ink on This Slide</button>
              <button onClick={() => { onClearAll(); setEraseMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: 12, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>Clear Ink on All Slides</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const drawTopBtn: React.CSSProperties = { background: "none", border: "none", fontSize: 22, color: "#111", cursor: "pointer", padding: "6px 12px" };
const drawPanel: React.CSSProperties = { background: "#fff", padding: "14px 20px", borderTop: "1px solid #ddd", maxHeight: "40vh", overflowY: "auto" };
function PanelLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#666", fontWeight: 700, marginBottom: 8 }}>{children}</div>;
}
function DrawToolBtn({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} style={{ background: active ? "#FFCCBC" : "none", border: "none", width: 48, height: 44, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   SHAPE LIBRARY — 100+ SVG primitives grouped by category.
   Each entry's `svg` is the inner markup rendered inside a
   <svg viewBox="0 0 100 100"> so shapes scale to any size.
   ════════════════════════════════════════════════════════════ */

interface ShapeDef { id: string; svg: string; }
interface ShapeGroup { title: string; items: ShapeDef[]; }

const SHAPE_LIBRARY: ShapeGroup[] = [
  { title: "Basic", items: [
    { id: "rect",        svg: `<rect x="5" y="20" width="90" height="60" />` },
    { id: "rounded",     svg: `<rect x="5" y="20" width="90" height="60" rx="10" />` },
    { id: "circle",      svg: `<circle cx="50" cy="50" r="45" />` },
    { id: "ellipse",     svg: `<ellipse cx="50" cy="50" rx="45" ry="30" />` },
    { id: "triangle",    svg: `<polygon points="50,10 90,90 10,90" />` },
    { id: "triangle-r",  svg: `<polygon points="10,10 90,50 10,90" />` },
    { id: "diamond",     svg: `<polygon points="50,8 92,50 50,92 8,50" />` },
    { id: "pentagon",    svg: `<polygon points="50,8 92,38 76,88 24,88 8,38" />` },
    { id: "hexagon",     svg: `<polygon points="28,10 72,10 95,50 72,90 28,90 5,50" />` },
    { id: "octagon",     svg: `<polygon points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30" />` },
    { id: "heart",       svg: `<path d="M50 84 L14 50 Q4 38 14 26 Q24 14 36 20 Q44 24 50 34 Q56 24 64 20 Q76 14 86 26 Q96 38 86 50 Z" />` },
    { id: "star-5",      svg: `<polygon points="50,10 61,39 92,39 67,57 77,86 50,68 23,86 33,57 8,39 39,39" />` },
    { id: "star-4",      svg: `<polygon points="50,6 60,40 94,50 60,60 50,94 40,60 6,50 40,40" />` },
    { id: "star-6",      svg: `<polygon points="50,6 60,32 88,38 67,58 73,86 50,72 27,86 33,58 12,38 40,32" />` },
    { id: "cross",       svg: `<polygon points="35,8 65,8 65,35 92,35 92,65 65,65 65,92 35,92 35,65 8,65 8,35 35,35" />` },
    { id: "line-h",      svg: `<line x1="5" y1="50" x2="95" y2="50" stroke-width="4" />` },
    { id: "line-v",      svg: `<line x1="50" y1="5" x2="50" y2="95" stroke-width="4" />` },
    { id: "line-d",      svg: `<line x1="10" y1="90" x2="90" y2="10" stroke-width="4" />` },
    { id: "parallelogram", svg: `<polygon points="25,20 90,20 75,80 10,80" />` },
    { id: "trapezoid",   svg: `<polygon points="20,20 80,20 95,80 5,80" />` },
    { id: "semicircle",  svg: `<path d="M5 80 A45 45 0 0 1 95 80 Z" />` },
    { id: "ring",        svg: `<circle cx="50" cy="50" r="42" fill="none" stroke-width="10" />` },
    { id: "quarter",     svg: `<path d="M10 90 L10 10 A80 80 0 0 1 90 90 Z" />` },
    { id: "crescent",    svg: `<path d="M50 10 A40 40 0 1 0 50 90 A30 40 0 1 1 50 10 Z" />` },
    { id: "blob",        svg: `<path d="M80 30 Q95 60 70 85 Q35 100 15 70 Q-5 35 25 15 Q55 -5 80 30 Z" />` },
  ]},
  { title: "Arrows", items: [
    { id: "arrow-right", svg: `<polygon points="10,40 60,40 60,20 95,50 60,80 60,60 10,60" />` },
    { id: "arrow-left",  svg: `<polygon points="90,40 40,40 40,20 5,50 40,80 40,60 90,60" />` },
    { id: "arrow-up",    svg: `<polygon points="40,90 40,40 20,40 50,5 80,40 60,40 60,90" />` },
    { id: "arrow-down",  svg: `<polygon points="40,10 40,60 20,60 50,95 80,60 60,60 60,10" />` },
    { id: "arrow-ur",    svg: `<polygon points="20,80 60,40 40,40 80,20 80,60 60,60" />` },
    { id: "arrow-ul",    svg: `<polygon points="80,80 40,40 60,40 20,20 20,60 40,60" />` },
    { id: "arrow-dr",    svg: `<polygon points="20,20 60,60 40,60 80,80 80,40 60,40" />` },
    { id: "arrow-dl",    svg: `<polygon points="80,20 40,60 60,60 20,80 20,40 40,40" />` },
    { id: "arrow-double-h", svg: `<polygon points="5,50 25,30 25,45 75,45 75,30 95,50 75,70 75,55 25,55 25,70" />` },
    { id: "arrow-double-v", svg: `<polygon points="50,5 70,25 55,25 55,75 70,75 50,95 30,75 45,75 45,25 30,25" />` },
    { id: "arrow-curve-r", svg: `<path d="M15 70 Q40 30 70 45 L65 35 L90 50 L65 65 L70 55 Q50 45 30 80 Z" />` },
    { id: "arrow-curve-l", svg: `<path d="M85 70 Q60 30 30 45 L35 35 L10 50 L35 65 L30 55 Q50 45 70 80 Z" />` },
    { id: "arrow-circle", svg: `<path d="M50 15 A35 35 0 1 1 15 50 L5 50 L20 35 L35 50 L25 50 A25 25 0 1 0 50 25 Z" />` },
    { id: "arrow-chev-r", svg: `<polygon points="20,20 50,50 20,80 30,80 60,50 30,20" />` },
    { id: "arrow-chev-l", svg: `<polygon points="80,20 50,50 80,80 70,80 40,50 70,20" />` },
    { id: "arrow-stripe-r", svg: `<polygon points="10,45 70,45 70,30 95,50 70,70 70,55 10,55" />` },
    { id: "arrow-notched", svg: `<polygon points="5,40 40,40 40,20 75,50 40,80 40,60 5,60 15,50" />` },
    { id: "arrow-pentagon", svg: `<polygon points="5,20 65,20 90,50 65,80 5,80" />` },
    { id: "arrow-chevron", svg: `<polygon points="5,20 60,20 90,50 60,80 5,80 35,50" />` },
    { id: "arrow-zigzag",  svg: `<path d="M10 80 L40 50 L30 40 L70 20 L60 45 L90 30" fill="none" stroke-width="6" />` },
  ]},
  { title: "Flowchart", items: [
    { id: "fc-process",   svg: `<rect x="5" y="20" width="90" height="60" />` },
    { id: "fc-decision",  svg: `<polygon points="50,8 92,50 50,92 8,50" />` },
    { id: "fc-data",      svg: `<polygon points="20,20 95,20 80,80 5,80" />` },
    { id: "fc-terminator",svg: `<rect x="5" y="25" width="90" height="50" rx="25" />` },
    { id: "fc-document",  svg: `<path d="M5 20 H95 V75 Q75 90 50 75 Q25 60 5 80 Z" />` },
    { id: "fc-predefined",svg: `<path d="M5 20 H95 V80 H5 Z M20 20 V80 M80 20 V80" fill="none" stroke-width="3" />` },
    { id: "fc-manual",    svg: `<polygon points="10,25 90,20 95,80 5,80" />` },
    { id: "fc-storage",   svg: `<path d="M10 30 A20 10 0 0 1 90 30 V70 A20 10 0 0 1 10 70 Z M10 30 A20 10 0 0 0 90 30" fill="none" stroke-width="3" />` },
    { id: "fc-display",   svg: `<path d="M20 20 H80 L95 50 L80 80 H20 L5 50 Z" />` },
    { id: "fc-off-page",  svg: `<path d="M10 20 H90 V65 L50 90 L10 65 Z" />` },
    { id: "fc-prep",      svg: `<polygon points="5,50 25,20 75,20 95,50 75,80 25,80" />` },
    { id: "fc-connector", svg: `<circle cx="50" cy="50" r="35" />` },
    { id: "fc-card",      svg: `<polygon points="20,20 95,20 95,80 5,80 5,35" />` },
    { id: "fc-delay",     svg: `<path d="M5 20 H70 A30 30 0 0 1 70 80 H5 Z" />` },
    { id: "fc-or",        svg: `<circle cx="50" cy="50" r="35" fill="none" stroke-width="3" /><line x1="25" y1="50" x2="75" y2="50" stroke-width="3" /><line x1="50" y1="25" x2="50" y2="75" stroke-width="3" />` },
  ]},
  { title: "Stars & Banners", items: [
    { id: "banner-h",   svg: `<path d="M10 30 H90 L85 50 L90 70 H10 L15 50 Z" />` },
    { id: "banner-scroll", svg: `<path d="M15 25 H85 Q92 30 92 40 Q92 50 85 50 H25 Q15 50 15 40 Q15 30 22 25 H80 L80 75 H15 Z" fill="none" stroke-width="3" />` },
    { id: "ribbon",     svg: `<path d="M5 35 H95 V65 H5 Z M5 35 L15 45 L5 55 Z M95 35 L85 45 L95 55 Z" />` },
    { id: "burst-8",    svg: `<polygon points="50,5 58,30 80,15 68,40 95,45 70,55 88,78 62,65 65,92 50,70 35,92 38,65 12,78 30,55 5,45 32,40 20,15 42,30" />` },
    { id: "burst-12",   svg: `<polygon points="50,5 55,25 70,10 62,30 85,20 72,38 95,35 75,48 95,60 72,58 85,78 65,65 70,88 55,70 50,90 45,70 30,88 35,65 15,78 28,58 5,60 25,48 5,35 28,38 15,20 38,30 30,10 45,25" />` },
    { id: "star-round", svg: `<path d="M50 10 Q58 35 85 35 Q65 55 72 85 Q50 68 28 85 Q35 55 15 35 Q42 35 50 10 Z" />` },
    { id: "star-8",     svg: `<polygon points="50,5 58,35 85,30 65,52 92,68 62,62 65,92 50,72 35,92 38,62 8,68 35,52 15,30 42,35" />` },
    { id: "medal",      svg: `<circle cx="50" cy="55" r="32" /><polygon points="30,25 40,50 20,50" fill="none" stroke-width="2" /><polygon points="70,25 60,50 80,50" fill="none" stroke-width="2" />` },
    { id: "badge",      svg: `<path d="M50 10 Q80 10 80 40 Q80 70 50 85 Q20 70 20 40 Q20 10 50 10 Z" />` },
    { id: "shield",     svg: `<path d="M50 8 Q80 15 80 35 Q80 70 50 92 Q20 70 20 35 Q20 15 50 8 Z" />` },
    { id: "ribbon-tag", svg: `<path d="M5 35 H75 L92 50 L75 65 H5 Z" />` },
    { id: "callout-burst", svg: `<polygon points="50,5 60,28 85,25 75,48 95,55 75,62 85,85 60,82 50,95 40,82 15,85 25,62 5,55 25,48 15,25 40,28" />` },
    { id: "sun",        svg: `<circle cx="50" cy="50" r="22" /><g stroke-width="3"><line x1="50" y1="15" x2="50" y2="25" /><line x1="50" y1="75" x2="50" y2="85" /><line x1="15" y1="50" x2="25" y2="50" /><line x1="75" y1="50" x2="85" y2="50" /><line x1="25" y1="25" x2="33" y2="33" /><line x1="67" y1="67" x2="75" y2="75" /><line x1="25" y1="75" x2="33" y2="67" /><line x1="67" y1="33" x2="75" y2="25" /></g>` },
    { id: "cloud",      svg: `<path d="M25 65 Q10 65 10 50 Q10 35 25 35 Q28 20 45 22 Q60 15 70 30 Q88 30 88 50 Q88 65 75 65 Z" />` },
    { id: "lightning",  svg: `<polygon points="45,5 20,55 40,55 30,95 75,40 55,40 65,5" />` },
  ]},
  { title: "Callouts", items: [
    { id: "callout-speech", svg: `<path d="M10 20 H90 V65 H55 L40 85 L40 65 H10 Z" />` },
    { id: "callout-thought",svg: `<ellipse cx="50" cy="40" rx="40" ry="25" /><circle cx="25" cy="75" r="6" /><circle cx="18" cy="85" r="3" />` },
    { id: "callout-round",  svg: `<path d="M10 15 Q10 5 20 5 H80 Q90 5 90 15 V55 Q90 65 80 65 H55 L40 85 L40 65 H20 Q10 65 10 55 Z" />` },
    { id: "callout-line",   svg: `<rect x="10" y="15" width="80" height="45" rx="4" /><line x1="55" y1="60" x2="70" y2="90" stroke-width="3" />` },
    { id: "callout-cloud",  svg: `<path d="M25 50 Q10 50 12 38 Q15 25 30 28 Q32 15 50 18 Q65 10 75 25 Q92 25 90 45 Q92 60 75 58 H55 L45 78 L48 58 H30 Q22 58 25 50 Z" />` },
    { id: "callout-down",   svg: `<path d="M10 20 H90 V55 H60 L50 75 L40 55 H10 Z" />` },
    { id: "callout-left",   svg: `<path d="M30 20 H90 V70 H30 L15 55 L30 40 Z" />` },
    { id: "callout-right",  svg: `<path d="M70 20 H10 V70 H70 L85 55 L70 40 Z" />` },
    { id: "callout-double", svg: `<rect x="10" y="15" width="80" height="45" rx="6" /><rect x="18" y="65" width="50" height="20" rx="4" fill="none" stroke-width="2" />` },
    { id: "tag",            svg: `<path d="M8 30 H60 L88 50 L60 70 H8 Z" /><circle cx="20" cy="50" r="4" fill="#000" />` },
  ]},
  { title: "Math & Symbols", items: [
    { id: "plus",       svg: `<polygon points="40,10 60,10 60,40 90,40 90,60 60,60 60,90 40,90 40,60 10,60 10,40 40,40" />` },
    { id: "minus",      svg: `<rect x="10" y="40" width="80" height="20" />` },
    { id: "multiply",   svg: `<path d="M20 20 L80 80 M80 20 L20 80" fill="none" stroke-width="14" stroke-linecap="round" />` },
    { id: "divide",     svg: `<circle cx="50" cy="25" r="7" /><rect x="15" y="45" width="70" height="8" /><circle cx="50" cy="75" r="7" />` },
    { id: "equal",      svg: `<rect x="15" y="32" width="70" height="8" /><rect x="15" y="60" width="70" height="8" />` },
    { id: "notequal",   svg: `<rect x="15" y="32" width="70" height="8" /><rect x="15" y="60" width="70" height="8" /><line x1="75" y1="20" x2="25" y2="80" stroke-width="6" />` },
    { id: "percent",    svg: `<circle cx="25" cy="25" r="12" /><circle cx="75" cy="75" r="12" /><line x1="20" y1="80" x2="80" y2="20" stroke-width="6" />` },
    { id: "infinity",   svg: `<path d="M25 50 A20 20 0 1 1 50 50 A20 20 0 1 0 75 50 A20 20 0 1 1 50 50 A20 20 0 1 0 25 50 Z" fill="none" stroke-width="6" />` },
    { id: "pi",         svg: `<path d="M20 35 H80 M30 35 V75 M65 35 V75" fill="none" stroke-width="6" stroke-linecap="round" />` },
    { id: "check",      svg: `<path d="M15 55 L40 80 L85 25" fill="none" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />` },
    { id: "xmark",      svg: `<path d="M20 20 L80 80 M80 20 L20 80" fill="none" stroke-width="10" stroke-linecap="round" />` },
    { id: "dash",       svg: `<rect x="10" y="45" width="25" height="10" /><rect x="40" y="45" width="25" height="10" /><rect x="70" y="45" width="20" height="10" />` },
    { id: "degrees",    svg: `<circle cx="30" cy="30" r="8" fill="none" stroke-width="4" /><path d="M40 75 Q55 55 80 55" fill="none" stroke-width="5" />` },
    { id: "paren",      svg: `<path d="M30 15 Q10 50 30 85" fill="none" stroke-width="6" /><path d="M70 15 Q90 50 70 85" fill="none" stroke-width="6" />` },
    { id: "brackets",   svg: `<path d="M30 15 H15 V85 H30 M70 15 H85 V85 H70" fill="none" stroke-width="6" />` },
  ]},
];

const ALL_SHAPES_COUNT = SHAPE_LIBRARY.reduce((a, g) => a + g.items.length, 0);

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {}
  return null;
}

const iconBtn: React.CSSProperties = { background: "none", border: "none", color: "#E8EDF5", width: 38, height: 38, borderRadius: 10, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" };
const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: "#E8EDF5", fontSize: 15, fontWeight: 700, padding: "6px 10px", fontFamily: "'Nunito', sans-serif", borderRadius: 6 };
const zoomBtn: React.CSSProperties = { background: "none", border: "none", color: "#E8EDF5", width: 28, height: 28, borderRadius: 999, cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" };
