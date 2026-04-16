"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, useTransition } from "react";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { listMyNotes, saveNote, trashNote, type DbNote } from "@/app/actions/notes";
import { ShareNoteModal } from "@/components/notes/share-modal";
import { NOTE_TEMPLATES, templateById, type NoteTemplate, type TemplateCategory } from "@/lib/notes-templates";
import { listActiveTemplates, amIPremium, type NoteTemplateRow } from "@/app/actions/note-templates";

type Tab = "home" | "files" | "scan" | "discover";
type DocType = "doc" | "slides" | "table" | "pdf";

export default function NotesPage() {
  const [tab, setTab] = useState<Tab>("home");
  const [notes, setNotes] = useState<DbNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [templateFor, setTemplateFor] = useState<DocType | null>(null);

  // Stale-while-revalidate: hydrate from localStorage instantly, then refresh
  // in the background so the recent list never "loads" on visit.
  useEffect(() => {
    try {
      const cached = localStorage.getItem("cios-notes-cache");
      if (cached) {
        const parsed = JSON.parse(cached) as DbNote[];
        if (Array.isArray(parsed) && parsed.length) {
          setNotes(parsed);
          setLoading(false);
        }
      }
    } catch { /* ignore quota / parse errors */ }

    listMyNotes().then((r) => {
      if (r.ok) {
        const fresh = r.data || [];
        setNotes(fresh);
        try { localStorage.setItem("cios-notes-cache", JSON.stringify(fresh)); } catch {}
      }
      setLoading(false);
    });
  }, []);

  // Body class — makes the parent CIOS <main> stop scrolling so our own
  // flex layout (locked top · scrolling content · locked bottom) owns the
  // viewport. Same technique as the editor.
  useEffect(() => {
    document.body.classList.add("cios-notes-active");
    return () => { document.body.classList.remove("cios-notes-active"); };
  }, []);

  return (
    <div className="notes-shell" style={{
      height: "100%", minHeight: 0,
      display: "flex", flexDirection: "column",
      background: "#0A0E1A",
    }}>
      {/* LOCKED HEADER — never scrolls. */}
      <header style={{
        flexShrink: 0, padding: "12px 16px 8px",
        background: "#0A0E1A", borderBottom: "1px solid rgba(255,255,255,0.04)",
        zIndex: 10,
      }}>
        <GlobalTopBar />
        <div className="notes-desktop-tabs" style={{
          display: "flex", gap: 4, padding: 4, marginTop: 10,
          background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
          width: "fit-content",
        }}>
          {([
            ["home", "Home", "⌂"],
            ["files", "Files", "▤"],
            ["scan", "AI", "✨"],
            ["discover", "Discover", "◫"],
          ] as const).map(([k, label, icon]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: tab === k ? "linear-gradient(135deg,#EF5350,#C62828)" : "transparent",
              color: tab === k ? "#fff" : "#8892A4",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              <span style={{ fontSize: 15 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* SCROLLABLE CONTENT — the only thing that scrolls. */}
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px 120px" }}>
          {tab === "home" && <HomeTab notes={notes} loading={loading} />}
          {tab === "files" && <FilesTab notes={notes} />}
          {tab === "scan" && <ScanTab />}
          {tab === "discover" && <DiscoverTab />}
        </div>
      </main>

      {(tab === "home" || tab === "files") && (
        <button onClick={() => setNewOpen(true)} aria-label="New document" className="notes-fab" style={{
          position: "fixed", right: 20, bottom: 92, zIndex: 40,
          width: 56, height: 56, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg,#EF5350,#C62828)",
          color: "#fff", fontSize: 28, fontWeight: 300, cursor: "pointer",
          boxShadow: "0 8px 24px rgba(239,83,80,0.5)",
        }}>+</button>
      )}

      <BottomNav tab={tab} onChange={setTab} />

      {newOpen && !templateFor && <NewDocSheet onClose={() => setNewOpen(false)} onPick={(t) => setTemplateFor(t)} />}
      {templateFor && <TemplatePicker docType={templateFor} onClose={() => { setTemplateFor(null); setNewOpen(false); }} onBack={() => setTemplateFor(null)} />}

      {/* Body-scoped layout overrides for the CIOS shell around us. */}
      <style>{`
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
        @media (min-width: 901px) {
          .notes-mobile-bottomnav { display: none !important; }
          .notes-fab { bottom: 28px !important; right: 32px !important; }
        }
        @media (max-width: 900px) {
          .notes-desktop-tabs { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/** Single shared top bar — avatar + search + icons. Lives in the shell,
 *  NOT inside each tab component, so the tabs can just render content. */
function GlobalTopBar() {
  const router = useRouter();
  const { user } = useUser();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={() => router.push("/dashboard")} aria-label="Back to CIOS" className="notes-global-back" style={{
        background: "#111827", border: "none", color: "#E8EDF5",
        width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 18, flexShrink: 0,
      }}>‹</button>
      {user?.imageUrl && <img src={user.imageUrl} alt="" width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
      <div style={{ flex: 1, background: "#111827", borderRadius: 999, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#5A6478" }}>⚲</span>
        <input placeholder="Search" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#E8EDF5", fontSize: 13 }} />
      </div>
      <button style={iconBtn}>⌑</button>
    </div>
  );
}

function HomeTab({ notes, loading }: { notes: DbNote[]; loading: boolean }) {
  const [scope, setScope] = useState<"device" | "recent" | "shared" | "starred">("recent");
  const filtered = notes.filter((n) => !n.trashed_at).filter((n) => {
    if (scope === "starred") return n.starred;
    if (scope === "shared") return n.status === "shared";
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 18, padding: "0 4px", overflowX: "auto" }}>
        {([["device","This Device"], ["recent","Recent"], ["shared","Shared"], ["starred","Starred"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setScope(k)}
            style={{
              background: "none", border: "none", padding: "10px 0",
              fontSize: 15, fontWeight: scope === k ? 800 : 600,
              color: scope === k ? "#E8EDF5" : "#5A6478",
              borderBottom: scope === k ? "2px solid #1E88E5" : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>{label}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 8px" }}>
        <div style={{ fontSize: 12, color: "#8892A4", fontWeight: 700 }}>Earlier</div>
        <div style={{ display: "flex", gap: 18, color: "#5A6478", fontSize: 14 }}>
          <span>⚲</span><span>▦</span><span>○</span>
        </div>
      </div>
      {loading && <div style={{ padding: 40, textAlign: "center", color: "#5A6478", fontSize: 13 }}>Loading…</div>}
      {!loading && filtered.length === 0 && <EmptyState emoji="📄" title="No documents yet" hint="Tap the red + button to create one." />}
      {!loading && filtered.length > 0 && filtered.map((n) => <NoteRow key={n.id} note={n} />)}
    </div>
  );
}

function FilesTab({ notes }: { notes: DbNote[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const count = notes.filter((n) => !n.trashed_at).length;

  const openFromLink = () => start(async () => {
    const url = prompt("Paste a note URL (must be a /notes/<id> link from this workspace):");
    if (!url) return;
    const match = url.match(/\/notes\/([0-9a-f-]{8,})/i);
    if (!match) { toast.error("That URL doesn't look like a CIOS note link"); return; }
    router.push(`/notes/${match[1]}`);
  });

  /** Import any external cloud-storage file as a linked note.
   *  User pastes a share URL; we create a note that embeds a clickable
   *  link to the source + a place for their own notes beside it.
   *  Works for any provider without needing OAuth / SDK per provider. */
  const importFromCloud = (provider: { name: string; hostMatch: RegExp; brand: string }) => start(async () => {
    const url = prompt(`Paste the ${provider.name} share link:\n\nEnable "Anyone with the link" sharing first so your peers can open it.`);
    if (!url) return;
    try { new URL(url); } catch { toast.error("That doesn't look like a URL"); return; }
    if (!provider.hostMatch.test(url)) {
      if (!confirm(`That URL isn't a standard ${provider.name} link. Import it anyway?`)) return;
    }
    const title = `${provider.name} — shared file`;
    const html = `<div style="padding:8px 0;">
      <h1 style="margin:0 0 8px;color:${provider.brand};">${provider.name} share</h1>
      <p><a href="${url}" target="_blank" rel="noreferrer" style="color:#42A5F5;">Open the original file ↗</a></p>
      <hr />
      <h3>My notes on this</h3>
      <p><em>Write your notes, highlights, or follow-up actions below…</em></p>
    </div>`;
    const r = await saveNote({ title, html, icon: "doc", tags: ["cloud", provider.name.toLowerCase().replace(/\s+/g, "-")], status: "draft", starred: false, pinned: false });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Imported from ${provider.name}`);
    router.push(`/notes/${r.data!.id}`);
  });

  const importImage = () => fileRef.current?.click();

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const t = toast.loading("Uploading image…");
    try {
      const compressed = await compressImage(f, { maxBytes: 2 * 1024 * 1024, maxDim: 1920 });
      const up = await uploadToCloudinary(compressed, { folder: "cios-notes/imports", resourceType: "image" });
      const html = `<h1>${f.name.replace(/\.[^.]+$/, "")}</h1><p><img src="${up.secureUrl}" alt="${f.name}" /></p><p><em>Imported image — add your notes here.</em></p>`;
      const r = await saveNote({ title: f.name, html, icon: "doc", tags: ["imported"], status: "draft", starred: false, pinned: false });
      if (!r.ok) { toast.error(r.error, { id: t }); return; }
      toast.success("Image imported", { id: t });
      router.push(`/notes/${r.data!.id}`);
    } catch (err) {
      toast.error((err as Error).message, { id: t });
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFilePicked} />
      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 10 }}>
        <FileRow icon="📁" color="#FFC107" title="Local File" subtitle={`${count} note${count === 1 ? "" : "s"} on this device`} onClick={() => toast.success("You're already viewing local notes")} />
        <FileRow icon="☁" color="#42A5F5" title="Open from link" subtitle="Paste a shared note URL" onClick={openFromLink} />
        <FileRow icon="🖼" color="#26C6DA" title="Import Image" subtitle={pending ? "Importing…" : "Drop any photo into a new note"} onClick={importImage} />
        <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "18px 4px 6px" }}>Cloud storage</div>
        <div style={{ background: "linear-gradient(135deg,rgba(30,136,229,0.15),rgba(30,136,229,0.05))", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>☁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>CIOS Drive</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>Auto-synced when you save</div>
          </div>
          <span style={{ padding: "4px 10px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>ON</span>
        </div>
        <FileRow iconUrl="https://cdn.simpleicons.org/googledrive/4285F4" color="#4285F4" title="Google Drive"
          subtitle="Paste a Drive share link to reference it here"
          onClick={() => importFromCloud({ name: "Google Drive", brand: "#4285F4", hostMatch: /(drive|docs)\.google\.com/i })} />
        <FileRow iconUrl={"data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0078D4"><path d="M13.5 5.5c-2.6 0-4.9 1.5-6 3.8-.3-.1-.7-.1-1-.1A3.5 3.5 0 0 0 3 12.7a4 4 0 0 0-2 3.4A4 4 0 0 0 5 20h13.5a4.5 4.5 0 0 0 .8-8.9A6.5 6.5 0 0 0 13.5 5.5z"/></svg>')} color="#0078D4" title="OneDrive"
          subtitle="Paste a OneDrive / SharePoint link"
          onClick={() => importFromCloud({ name: "OneDrive", brand: "#0078D4", hostMatch: /(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i })} />
        <FileRow iconUrl="https://cdn.simpleicons.org/dropbox/0061FF" color="#0061FF" title="Dropbox"
          subtitle="Paste a Dropbox share link"
          onClick={() => importFromCloud({ name: "Dropbox", brand: "#0061FF", hostMatch: /(dropbox\.com|db\.tt)/i })} />
        <FileRow iconUrl="https://cdn.simpleicons.org/box/0061D5" color="#0061D5" title="Box"
          subtitle="Paste a Box share link"
          onClick={() => importFromCloud({ name: "Box", brand: "#0061D5", hostMatch: /box\.com/i })} />
      </div>
    </div>
  );
}

function ScanTab() {
  const features: Array<[string, string, string]> = [
    ["✍", "AI Writer", "Draft essays, emails, outlines from a prompt"],
    ["📝", "Summarize", "Condense any document into key points"],
    ["🔤", "Rewrite", "Improve tone, clarity, grammar"],
    ["🌐", "Translate", "100+ languages, tone-aware"],
    ["❓", "Ask anything", "Q&A about your notes and files"],
    ["🧠", "Study Buddy", "Quiz yourself from notes"],
    ["📑", "OCR Scan", "Photos & PDFs → editable text"],
    ["🗣", "Transcribe", "Audio & video → transcript"],
    ["🎨", "Image Gen", "Generate images from a prompt"],
    ["📊", "Chart from text", "Turn data prose into a chart"],
    ["🧾", "Slide from doc", "Auto-build a slide deck"],
    ["🔍", "Proofread", "Spelling, grammar, style"],
  ];
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ background: "linear-gradient(135deg,#1E1B4B,#111827)", border: "1px solid rgba(239,83,80,0.2)", borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#EF5350", letterSpacing: 1, textTransform: "uppercase" }}>✨ AI Features</div>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#FFB74D", background: "rgba(255,183,77,0.12)", border: "1px solid rgba(255,183,77,0.3)", padding: "2px 6px", borderRadius: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Coming soon</span>
        </div>
        <div style={{ fontSize: 14, color: "#E8EDF5", marginTop: 4 }}>Write, summarize, translate, and more — powered by AI.</div>
      </div>
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {features.slice(0, 8).map(([e, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, margin: "0 auto 6px", borderRadius: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{e}</div>
              <div style={{ fontSize: 11, color: "#E8EDF5", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        {features.slice(8).map(([e, l, h]) => (
          <div key={l} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{e}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{l}</div>
            <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{h}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5", margin: "24px 4px 10px" }}>Recent</div>
      <EmptyState emoji="✨" title="No AI history yet" hint="Tap any feature above to get started." compact />
    </div>
  );
}

function DiscoverTab() {
  const categories: Array<[string, string, string]> = [
    ["🖼", "Process Image", "Edit, compress, enhance photos"],
    ["📄", "PDF Tools", "Merge, split, convert, sign"],
    ["📃", "Process Document", "Edit Word, Excel, slides"],
    ["▶", "Video & Audio", "Trim, convert, transcribe"],
    ["📸", "Scan Photos", "Camera & multi-page scan"],
    ["💼", "Office Work", "Templates & productivity"],
    ["☁", "CIOS Cloud", "Sync & share across devices"],
    ["⊞", "All Services", "Full catalog"],
    ["🔗", "Connect Drive", "Google Drive, OneDrive, Dropbox"],
    ["📤", "Bulk Export", "Export many files at once"],
    ["🎓", "Learning Hub", "Tutorials & guides"],
    ["🛠", "Workflow Automations", "Chain tools together"],
  ];
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ background: "linear-gradient(135deg,#0E1F3B,#111827)", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#1E88E5", letterSpacing: 1, textTransform: "uppercase" }}>◫ Discover</div>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#FFB74D", background: "rgba(255,183,77,0.12)", border: "1px solid rgba(255,183,77,0.3)", padding: "2px 6px", borderRadius: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Coming soon</span>
        </div>
        <div style={{ fontSize: 14, color: "#E8EDF5", marginTop: 4 }}>Explore every tool CIOS offers — scan, convert, edit, and more.</div>
      </div>
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {categories.slice(0, 8).map(([e, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, margin: "0 auto 6px", borderRadius: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{e}</div>
              <div style={{ fontSize: 11, color: "#E8EDF5", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        {categories.slice(8).map(([e, l, h]) => (
          <div key={l} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{e}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{l}</div>
            <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{h}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5", margin: "24px 4px 10px" }}>All tools</div>
      <ToolsCatalog />
    </div>
  );
}

function ToolsCatalog() {
  type Tool = [string, string, string]; // [emoji, label, href]
  // Every tool links somewhere real in the CIOS app — no dead tiles.
  const sections: Array<{ title: string; items: Tool[]; extras: Tool[] }> = [
    {
      title: "Photo Scan",
      items: [
        ["🖼", "Scan Photos",    "/notes?tab=scan"],
        ["🗎", "Image to PDF",   "/notes?tab=scan"],
        ["W",  "Image to Word",  "/ai-hub"],
        ["📋", "Image to Text",  "/ai-hub"],
      ],
      extras: [
        ["📷", "Camera Capture", "/notes?tab=scan"],
        ["🔳", "QR Scanner",     "/notes?tab=scan"],
        ["📑", "Multi-page scan","/notes?tab=scan"],
        ["🌐", "Translate photo","/ai-hub"],
      ],
    },
    {
      title: "Image processing",
      items: [
        ["🗜", "Compress Image",    "/ai-hub"],
        ["✨", "Auto Remove BG",    "/ai-hub"],
        ["✂",  "Image Eraser",      "/ai-hub"],
        ["✍", "Remove Handwriting","/ai-hub"],
      ],
      extras: [
        ["🎨", "Colorize",       "/ai-hub"],
        ["🖌", "Upscale",        "/ai-hub"],
        ["🔆", "Enhance",        "/ai-hub"],
        ["🪄", "AI retouch",     "/ai-hub"],
      ],
    },
    {
      title: "Document processing",
      items: [
        ["▤",  "Merge Documents",      "/notes"],
        ["📤", "Export as Scanned PDF","/notes"],
        ["📉", "Reduce File Size",     "/notes"],
        ["🎧", "AI Read Aloud",        "/notes"],
      ],
      extras: [
        ["📝", "Summarise",      "/ai-hub"],
        ["🔤", "Translate doc",  "/ai-hub"],
        ["🔍", "Extract data",   "/ai-hub"],
        ["📊", "Doc analytics",  "/ai-hub"],
      ],
    },
  ];
  const [expanded, setExpanded] = useState<string | null>(null);

  const renderTile = ([e, l, href]: Tool) => (
    <Link key={l} href={href} style={{ textDecoration: "none" }}>
      <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, cursor: "pointer" }}>
        <div style={{ width: 38, height: 38, margin: "0 auto 4px", borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{e}</div>
        <div style={{ fontSize: 10, color: "#E8EDF5", fontWeight: 600 }}>{l}</div>
      </div>
    </Link>
  );

  return (
    <div>
      {sections.map((s) => {
        const isExpanded = expanded === s.title;
        const items = isExpanded ? [...s.items, ...s.extras] : s.items;
        return (
          <div key={s.title} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5" }}>{s.title}</div>
              <button
                onClick={() => setExpanded(isExpanded ? null : s.title)}
                style={{ background: "none", border: "none", fontSize: 11, color: "#1E88E5", cursor: "pointer", fontWeight: 700 }}>
                {isExpanded ? "Less ‹" : "More ›"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {items.map(renderTile)}
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function NoteRow({ note }: { note: DbNote }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const meta = docMeta(note.icon || "doc");
  const rowClick = () => router.push(`/notes/${note.id}`);

  const trash = () => start(async () => {
    if (!confirm("Move to trash?")) return;
    const r = await trashNote(note.id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Moved to trash");
    window.location.reload();
  });

  const toggleStar = () => start(async () => {
    const r = await saveNote({ id: note.id, title: note.title, html: note.html, starred: !note.starred });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(note.starred ? "Unstarred" : "★ Starred");
    window.location.reload();
  });

  const rename = () => start(async () => {
    const name = prompt("Rename document:", note.title);
    if (!name?.trim() || name === note.title) return;
    const r = await saveNote({ id: note.id, title: name.trim(), html: note.html });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Renamed");
    window.location.reload();
  });

  const duplicate = () => start(async () => {
    const r = await saveNote({
      title: `${note.title} (copy)`, html: note.html, icon: note.icon,
      tags: note.tags, status: "draft", starred: false, pinned: false,
    });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Duplicated");
    router.push(`/notes/${r.data!.id}`);
  });

  const share = async () => {
    const url = `${window.location.origin}/notes/${note.id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy"); }
  };

  return (
    <div onClick={rowClick} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{meta.letter}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title || "Untitled"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: "#5A6478" }}>⟁ This Device</span>
          <span style={{ padding: "1px 6px", background: "rgba(255,255,255,0.05)", color: "#8892A4", fontSize: 9, borderRadius: 4, fontWeight: 700 }}>Local</span>
          {note.starred && <span style={{ color: "#FFC107", fontSize: 12 }}>★</span>}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); rowClick(); }} aria-label="Open" style={iconGhost}>↗</button>
      <button onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }} disabled={busy} aria-label="More options" style={iconGhost}>⋮</button>

      {menuOpen && (
        <>
          {/* Backdrop — clicks elsewhere close the menu */}
          <div onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 80 }} />
          <div onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: "calc(100% - 6px)", right: 16, zIndex: 81,
              minWidth: 200, background: "#111827", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,0.5)", overflow: "hidden",
            }}>
            <MenuItem icon="↗" label="Open" onClick={() => { setMenuOpen(false); rowClick(); }} />
            <MenuItem icon={note.starred ? "★" : "☆"} label={note.starred ? "Unstar" : "Star"} onClick={() => { setMenuOpen(false); toggleStar(); }} />
            <MenuItem icon="✎" label="Rename" onClick={() => { setMenuOpen(false); rename(); }} />
            <MenuItem icon="⎘" label="Duplicate" onClick={() => { setMenuOpen(false); duplicate(); }} />
            <MenuItem icon="🔗" label="Copy link" onClick={() => { setMenuOpen(false); share(); }} />
            <MenuItem icon="👥" label="Share with intern…" onClick={() => { setMenuOpen(false); setShareOpen(true); }} />
            <MenuDivider />
            <MenuItem icon="🗑" label="Move to trash" danger onClick={() => { setMenuOpen(false); trash(); }} />
          </div>
        </>
      )}
      {shareOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ShareNoteModal noteId={note.id} noteTitle={note.title} onClose={() => setShareOpen(false)} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%",
      padding: "11px 16px", background: "transparent", border: "none",
      color: danger ? "#EF5350" : "#E8EDF5", fontSize: 13, fontWeight: 600,
      cursor: "pointer", textAlign: "left",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <span style={{ width: 20, textAlign: "center", fontSize: 15 }}>{icon}</span>
      {label}
    </button>
  );
}
function MenuDivider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />;
}

function FileRow({ icon, iconUrl, color, title, subtitle, href, onClick, disabled, badge }: { icon?: string; iconUrl?: string; color: string; title: string; subtitle?: string; href?: string; onClick?: () => void; disabled?: boolean; badge?: string }) {
  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)", opacity: disabled ? 0.55 : 1, cursor: (href || onClick) && !disabled ? "pointer" : "default" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: iconUrl ? 6 : 0 }}>
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" width={22} height={22} style={{ display: "block" }} />
        ) : (
          <span style={{ color, fontSize: 18, fontWeight: 800 }}>{icon}</span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {badge && <span style={{ padding: "3px 8px", background: "rgba(255,193,7,0.15)", color: "#FFC107", borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>{badge}</span>}
      {!badge && <span style={{ color: "#5A6478", fontSize: 16 }}>›</span>}
    </div>
  );
  if (href && !disabled) return <Link href={href} style={{ textDecoration: "none" }}>{content}</Link>;
  if (onClick && !disabled) return <button onClick={onClick} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", display: "block", width: "100%" }}>{content}</button>;
  return <div>{content}</div>;
}

function EmptyState({ emoji, title, hint, compact }: { emoji: string; title: string; hint: string; compact?: boolean }) {
  return (
    <div style={{ padding: compact ? 24 : 60, textAlign: "center", color: "#5A6478" }}>
      <div style={{ fontSize: compact ? 32 : 48, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#8892A4" }}>{hint}</div>
    </div>
  );
}

function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ key: Tab; label: string; icon: string }> = [
    { key: "home", label: "Home", icon: "⌂" },
    { key: "files", label: "Files", icon: "▤" },
    { key: "scan", label: "AI", icon: "✨" },
    { key: "discover", label: "Discover", icon: "◫" },
  ];
  return (
    <nav className="notes-mobile-bottomnav" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30,
      background: "rgba(10,14,26,0.95)", backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      display: "flex", justifyContent: "space-around",
      padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
    }}>
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button key={it.key} onClick={() => onChange(it.key)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: active ? "#EF5350" : "#5A6478",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "4px 10px", minWidth: 52,
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{it.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ═════════════════════════════════════════════════════════════
   NEW DOC SHEET + TEMPLATE PICKER (shared mobile + desktop)
   ═════════════════════════════════════════════════════════════ */

function NewDocSheet({ onClose, onPick }: { onClose: () => void; onPick: (t: DocType) => void }) {
  const [desktopOnly, setDesktopOnly] = useState<string | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const types: Array<{ k: DocType; label: string; color: string; letter: string; mobileOk: boolean }> = [
    { k: "doc",    label: "Docs",   color: "#2B5797", letter: "W", mobileOk: true  },
    { k: "slides", label: "Slides", color: "#D24726", letter: "P", mobileOk: false },
    { k: "table",  label: "Table",  color: "#107C41", letter: "S", mobileOk: false },
    { k: "pdf",    label: "PDF",    color: "#CC3333", letter: "🗎", mobileOk: false },
  ];

  const handlePick = (t: typeof types[number]) => {
    if (isMobile && !t.mobileOk) {
      setDesktopOnly(t.label);
      return;
    }
    onPick(t.k);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0D1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>{desktopOnly ? "Desktop Only" : "New"}</div>
          <button onClick={desktopOnly ? () => setDesktopOnly(null) : onClose} style={{ ...iconGhost, color: "#E8EDF5" }}>✕</button>
        </div>

        {desktopOnly ? (
          /* ── Desktop-only notice ── */
          <div style={{ textAlign: "center", padding: "24px 8px 16px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🖥️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginBottom: 8 }}>
              {desktopOnly} is desktop only
            </div>
            <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, marginBottom: 20 }}>
              {desktopOnly} editing requires a larger screen for the best experience.
              Please open CIOS on a desktop or laptop to create {desktopOnly.toLowerCase()} documents.
            </div>
            <button onClick={() => setDesktopOnly(null)} style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#EF5350,#C62828)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              ← Go back
            </button>
          </div>
        ) : (
          /* ── Normal doc type picker ── */
          <>
            <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Office Documents</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {types.map((t) => {
                const dimmed = isMobile && !t.mobileOk;
                return (
                  <button key={t.k} onClick={() => handlePick(t)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", position: "relative" }}>
                    <div style={{ width: 54, height: 54, margin: "0 auto 6px", borderRadius: 10, background: t.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 800, opacity: dimmed ? 0.5 : 1 }}>{t.letter}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: dimmed ? "#5A6478" : "#E8EDF5" }}>{t.label}</div>
                    {dimmed && (
                      <div style={{ position: "absolute", top: 2, right: 6, fontSize: 9, fontWeight: 800, color: "#FFC107", background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 4, padding: "1px 4px", letterSpacing: 0.3 }}>DESKTOP</div>
                    )}
                  </button>
                );
              })}
            </div>
            {isMobile && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                <span style={{ fontSize: 11, color: "#B0BEC5", lineHeight: 1.5 }}>
                  <strong style={{ color: "#FFC107" }}>Slides, Table & PDF</strong> are available on desktop. On mobile, only <strong style={{ color: "#E8EDF5" }}>Docs</strong> is fully supported.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TemplatePicker({ docType, onClose, onBack }: { docType: DocType; onClose: () => void; onBack: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [custom, setCustom] = useState<NoteTemplateRow[]>([]);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    listActiveTemplates().then((r) => { if (r.ok) setCustom(r.data!); });
    amIPremium().then(setIsPremium);
  }, []);

  const create = (opts: { bundledId?: string | null; custom?: NoteTemplateRow }) => start(async () => {
    let title = titleFor(docType, null);
    let html = "";
    let tags: string[] = [];
    if (opts.custom) {
      if (opts.custom.is_premium && !isPremium) {
        toast.error("💎 This is a premium template. Upgrade to unlock.");
        return;
      }
      title = `${opts.custom.name}.docx`;
      html = opts.custom.html;
      tags = [opts.custom.category.toLowerCase(), "custom"];
    } else if (opts.bundledId) {
      const tpl = templateById(opts.bundledId);
      if (tpl) { title = `${tpl.name}.docx`; html = tpl.html; tags = [tpl.category.toLowerCase()]; }
    }
    const r = await saveNote({ title, html, icon: docType, tags, status: "draft", starred: false, pinned: false });
    if (!r.ok) { toast.error(r.error); return; }
    onClose();
    router.push(`/notes/${r.data!.id}`);
  });

  // Filter bundled + custom by the selected doc type first.
  const bundledForType = NOTE_TEMPLATES.filter((t) => t.docType === docType);
  const customForType = custom.filter((c) => c.doc_type === docType);
  const allCategories = Array.from(new Set<string>([
    ...bundledForType.map((t) => t.category as string),
    ...customForType.map((c) => c.category),
  ]));
  const itemsFor = (cat: string) => {
    type Item = { kind: "bundled"; tpl: NoteTemplate } | { kind: "custom"; tpl: NoteTemplateRow };
    const items: Item[] = [
      ...bundledForType.filter((t) => t.category === cat).map((tpl) => ({ kind: "bundled" as const, tpl })),
      ...customForType.filter((c) => c.category === cat).map((tpl) => ({ kind: "custom" as const, tpl })),
    ];
    return expanded === cat ? items : items.slice(0, 4);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0A0E1A", zIndex: 160, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "#0A0E1A", zIndex: 1 }}>
        <button onClick={expanded ? () => setExpanded(null) : onBack} style={iconGhost}>{expanded ? "‹" : "✕"}</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>
          {expanded ? expanded : "Select Template"}
        </div>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: "24px 24px 48px", maxWidth: 1280, margin: "0 auto" }}>

        {(expanded ? [expanded] : allCategories).map((cat, catIdx) => {
          const items = itemsFor(cat);
          const totalInCat = bundledForType.filter((t) => t.category === cat).length + customForType.filter((c) => c.category === cat).length;
          if (items.length === 0) return null;
          const showBlank = !expanded && catIdx === 0;
          return (
            <div key={cat} style={{ marginTop: catIdx === 0 ? 6 : 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>{cat}</div>
                {!expanded && totalInCat > items.length && (
                  <button onClick={() => setExpanded(cat)} style={{ background: "none", border: "none", fontSize: 12, color: "#1E88E5", cursor: "pointer", fontWeight: 700 }}>
                    More ›
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {showBlank && (
                  <button onClick={() => create({ bundledId: null })} disabled={pending} title="Blank Template"
                    style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    <div style={{
                      width: "100%", aspectRatio: "3/4", borderRadius: 10,
                      background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px dashed rgba(30,136,229,0.4)",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "#F4F6FA", color: "#1E88E5",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 36, fontWeight: 300,
                      }}>+</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5", marginTop: 6 }}>Blank Template</div>
                    <div style={{ fontSize: 10, color: "#8892A4" }}>Start from scratch</div>
                  </button>
                )}
                {items.map((item) => {
                  if (item.kind === "bundled") {
                    const tpl = item.tpl;
                    return (
                      <button key={`b-${tpl.id}`} onClick={() => create({ bundledId: tpl.id })} disabled={pending}
                        title={tpl.name}
                        style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                        <TemplateThumb tpl={tpl} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.name}</div>
                        <div style={{ fontSize: 10, color: "#8892A4" }}>{tpl.category}</div>
                      </button>
                    );
                  }
                  const c = item.tpl;
                  const locked = c.is_premium && !isPremium;
                  return (
                    <button key={`c-${c.id}`} onClick={() => create({ custom: c })} disabled={pending}
                      title={locked ? `💎 Premium — upgrade to unlock` : c.name}
                      style={{ background: "none", border: "none", cursor: locked ? "not-allowed" : "pointer", textAlign: "left", padding: 0, opacity: locked ? 0.65 : 1 }}>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", border: `1px solid ${c.accent}33` }}>
                        <div style={{ position: "absolute", inset: 0, transform: "scale(0.22)", transformOrigin: "top left", width: 816, minHeight: 1088, pointerEvents: "none" }}
                          dangerouslySetInnerHTML={{ __html: c.html }} />
                        {c.is_premium && (
                          <div style={{ position: "absolute", top: 6, left: 6, padding: "3px 7px", background: "linear-gradient(135deg,#FFC107,#FF7043)", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 4, letterSpacing: 0.5 }}>💎 PREMIUM</div>
                        )}
                        <div style={{ position: "absolute", top: 6, right: 6, padding: "2px 6px", background: c.accent, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 4, letterSpacing: 0.5 }}>
                          {c.category.toUpperCase()}
                        </div>
                        {locked && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(10,14,26,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🔒</div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "#8892A4" }}>{c.category}{locked ? " · Premium" : ""}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders a real mini-preview of a template by scaling its HTML body down
 * with CSS transform. Gives users a genuine "this is what it'll look like"
 * feel without needing pre-rendered image assets.
 */
function TemplateThumb({ tpl }: { tpl: NoteTemplate }) {
  // Render previews tailored to each doc type. Docs = scaled-down page.
  // Slides = mini slide. Table = mini grid. PDF = styled page preview.
  const badge = (
    <div style={{ position: "absolute", top: 6, right: 6, padding: "2px 6px", background: tpl.accent, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 4, letterSpacing: 0.5, zIndex: 2 }}>
      {(tpl.category as string).toUpperCase()}
    </div>
  );

  if (tpl.docType === "slides") {
    let deck: { bg?: string; titleColor?: string; slides?: Array<{ title: string; subtitle?: string; body?: string; bg?: string }> } = {};
    try { deck = JSON.parse(tpl.html); } catch {}
    const first = deck.slides?.[0];
    const bg = first?.bg || deck.bg || "#fff";
    const titleColor = deck.titleColor || "#111";
    // Portrait 3:4 card, but render a 16:9 slide centered inside.
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden", background: "#F4F6FA", border: `1px solid ${tpl.accent}33`, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
        {badge}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
          <div style={{ width: "100%", aspectRatio: "16/9", background: bg, borderRadius: 4, padding: "8% 10%", display: "flex", flexDirection: "column", justifyContent: "center", color: titleColor, overflow: "hidden" }}>
            <div style={{ fontSize: "min(3.4vw, 14px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {first?.title || "Untitled"}
            </div>
            {first?.subtitle && (
              <div style={{ fontSize: "min(2.2vw, 10px)", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {first.subtitle}
              </div>
            )}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 6, left: 6, padding: "2px 6px", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 4, zIndex: 2 }}>
          {deck.slides?.length || 0} slides
        </div>
      </div>
    );
  }

  if (tpl.docType === "table") {
    let data: { sheets?: Array<{ name: string; rows: string[][] }> } = {};
    try { data = JSON.parse(tpl.html); } catch {}
    const rows = (data.sheets?.[0]?.rows || []).slice(0, 6);
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden", background: "#fff", border: `1px solid ${tpl.accent}33`, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
        {badge}
        <div style={{ padding: 10, fontSize: 7, color: "#111", fontFamily: "Arial, sans-serif" }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: tpl.accent, marginBottom: 4, marginTop: 14 }}>{data.sheets?.[0]?.name || "Sheet1"}</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.slice(0, 4).map((cell, ci) => (
                    <td key={ci} style={{ border: "1px solid #ddd", padding: "2px 3px", background: ri === 0 ? "#F4F6FA" : "#fff", fontWeight: ri === 0 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 30 }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tpl.docType === "pdf") {
    let cfg: { style?: string; color?: string } = {};
    try { cfg = JSON.parse(tpl.html); } catch {}
    const style = cfg.style || "blank";
    const bg: React.CSSProperties = style === "lined"
      ? { backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 10px, #c7d6e5 10px, #c7d6e5 11px)" }
      : style === "grid" ? { backgroundImage: "linear-gradient(to right, #dbe3ed 1px, transparent 1px), linear-gradient(to bottom, #dbe3ed 1px, transparent 1px)", backgroundSize: "10px 10px" }
      : style === "staff" ? { backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 4px, #8892A4 4px, #8892A4 5px, transparent 5px, transparent 9px, #8892A4 9px, #8892A4 10px, transparent 10px, transparent 35px)" }
      : {};
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden", background: cfg.color || "#fff", border: `1px solid ${tpl.accent}33`, boxShadow: "0 4px 14px rgba(0,0,0,0.25)", ...bg }}>
        {badge}
      </div>
    );
  }

  // Default — document: render the HTML scaled-down.
  const PAGE_W = 816;
  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "3/4",
      borderRadius: 10, overflow: "hidden", background: "#fff",
      border: `1px solid ${tpl.accent}33`,
      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: PAGE_W, minHeight: PAGE_W * (4/3),
        transform: `scale(var(--scale, 0.22))`, transformOrigin: "top left",
        pointerEvents: "none",
      }}
      ref={(el) => {
        if (!el) return;
        const cardWidth = (el.parentElement?.clientWidth || 170);
        const scale = cardWidth / PAGE_W;
        el.style.setProperty("--scale", String(scale));
      }}
      dangerouslySetInnerHTML={{ __html: tpl.html }}
      />
      {badge}
    </div>
  );
}

/* Helpers */
function docMeta(type: string): { color: string; letter: string } {
  if (type === "slides" || type === "pptx") return { color: "#D24726", letter: "P" };
  if (type === "table" || type === "xlsx")  return { color: "#107C41", letter: "S" };
  if (type === "pdf")                        return { color: "#CC3333", letter: "P" };
  return { color: "#2B5797", letter: "W" };
}
function titleFor(docType: DocType, template: string | null): string {
  const base = docType === "doc" ? "Document" : docType === "slides" ? "Slides" : docType === "table" ? "Spreadsheet" : "PDF";
  const ext = docType === "doc" ? ".docx" : docType === "slides" ? ".pptx" : docType === "table" ? ".xlsx" : ".pdf";
  return `${base}${template ? " (" + template.replace(/-/g, " ") + ")" : ""}${ext}`;
}

const iconBtn: React.CSSProperties = { background: "#111827", border: "none", color: "#8892A4", width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", flexShrink: 0 };
const iconGhost: React.CSSProperties = { background: "none", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18, padding: 6 };
