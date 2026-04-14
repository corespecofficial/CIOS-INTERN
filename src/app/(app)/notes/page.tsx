"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { listMyNotes, saveNote, trashNote, type DbNote } from "@/app/actions/notes";

type Tab = "home" | "files" | "scan" | "discover" | "me";
type DocType = "doc" | "slides" | "table" | "pdf";

export default function NotesPage() {
  const [tab, setTab] = useState<Tab>("home");
  const [notes, setNotes] = useState<DbNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [templateFor, setTemplateFor] = useState<DocType | null>(null);

  useEffect(() => {
    listMyNotes().then((r) => { if (r.ok) setNotes(r.data || []); setLoading(false); });
  }, []);

  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      background: "#0A0E1A",
      minHeight: "100vh",
      paddingBottom: 76,
      margin: "-1.5rem -1rem", // escape the parent layout padding for true edge-to-edge
    }}>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 20 }}>
        {tab === "home" && <HomeTab notes={notes} loading={loading} />}
        {tab === "files" && <FilesTab notes={notes} />}
        {tab === "scan" && <ScanTab />}
        {tab === "discover" && <DiscoverTab />}
        {tab === "me" && <MeTab />}
      </div>

      {/* FAB — only on home/files */}
      {(tab === "home" || tab === "files") && (
        <button
          onClick={() => setNewOpen(true)}
          aria-label="New document"
          style={{
            position: "fixed", right: 20, bottom: 92, zIndex: 40,
            width: 56, height: 56, borderRadius: "50%", border: "none",
            background: "linear-gradient(135deg,#EF5350,#C62828)",
            color: "#fff", fontSize: 28, fontWeight: 300, cursor: "pointer",
            boxShadow: "0 8px 24px rgba(239,83,80,0.5)",
          }}
        >
          +
        </button>
      )}

      <BottomNav tab={tab} onChange={setTab} />

      {newOpen && !templateFor && (
        <NewDocSheet
          onClose={() => setNewOpen(false)}
          onPick={(t) => setTemplateFor(t)}
        />
      )}
      {templateFor && (
        <TemplatePicker
          docType={templateFor}
          onClose={() => { setTemplateFor(null); setNewOpen(false); }}
          onBack={() => setTemplateFor(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TABS
   ───────────────────────────────────────────── */

function HomeTab({ notes, loading }: { notes: DbNote[]; loading: boolean }) {
  const [scope, setScope] = useState<"device" | "recent" | "shared" | "starred">("recent");
  const { user } = useUser();
  const filtered = notes.filter((n) => !n.trashed_at).filter((n) => {
    if (scope === "starred") return n.starred;
    if (scope === "shared") return n.status === "shared";
    return true;
  });

  return (
    <div>
      <TopBar avatar={user?.imageUrl || null} />
      <div style={{ display: "flex", gap: 18, padding: "0 16px", marginTop: 10, overflowX: "auto" }}>
        {([["device","This Device"], ["recent","Recent"], ["shared","Shared"], ["starred","Starred"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setScope(k)}
            style={{
              background: "none", border: "none", padding: "10px 0",
              fontSize: 15, fontWeight: scope === k ? 800 : 600,
              color: scope === k ? "#E8EDF5" : "#5A6478",
              borderBottom: scope === k ? "2px solid #1E88E5" : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 8px" }}>
        <div style={{ fontSize: 12, color: "#8892A4", fontWeight: 700 }}>Earlier</div>
        <div style={{ display: "flex", gap: 18, color: "#5A6478", fontSize: 14 }}>
          <span>⚲</span><span>▦</span><span>○</span>
        </div>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center", color: "#5A6478", fontSize: 13 }}>Loading…</div>}
      {!loading && filtered.length === 0 && (
        <EmptyState emoji="📄" title="No documents yet" hint="Tap the red + button to create one." />
      )}
      {!loading && filtered.length > 0 && (
        <div>{filtered.map((n) => <NoteRow key={n.id} note={n} />)}</div>
      )}
    </div>
  );
}

function FilesTab({ notes }: { notes: DbNote[] }) {
  const count = notes.filter((n) => !n.trashed_at).length;
  return (
    <div>
      <TopBar />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <FileRow icon="📁" color="#FFC107" title="Local File" subtitle={`${count} note${count === 1 ? "" : "s"} on this device`} href="/notes?tab=home" />
        <FileRow icon="☁" color="#42A5F5" title="Open from link" subtitle="Paste a shared note URL" disabled />
        <FileRow icon="🖼" color="#26C6DA" title="Import Image" subtitle="Turn a photo into a note with OCR" disabled />

        <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "18px 4px 6px" }}>
          Cloud storage
        </div>
        <div style={{ background: "linear-gradient(135deg,rgba(30,136,229,0.15),rgba(30,136,229,0.05))", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>☁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>CIOS Drive</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>Auto-synced when you save</div>
          </div>
          <span style={{ padding: "4px 10px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>ON</span>
        </div>

        <FileRow icon="G" color="#4285F4" title="Google Drive" disabled badge="Coming" />
        <FileRow icon="O" color="#0078D4" title="OneDrive"     disabled badge="Coming" />
        <FileRow icon="D" color="#0061FF" title="Dropbox"       disabled badge="Coming" />
        <FileRow icon="B" color="#0061D5" title="Box"           disabled badge="Coming" />
      </div>
    </div>
  );
}

function ScanTab() {
  return (
    <div>
      <TopBar />
      <div style={{ padding: 16 }}>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              ["🪪", "ID Cards"], ["📖", "Scan Book"], ["A", "Extract Text"], ["🌐", "Translate Image"],
            ].map(([e, l]) => (
              <div key={l} style={{ textAlign: "center", opacity: 0.6 }}>
                <div style={{ width: 44, height: 44, margin: "0 auto 6px", borderRadius: 10, background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{e}</div>
                <div style={{ fontSize: 11, color: "#B0BEC5", fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, textAlign: "center", opacity: 0.6 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#B0BEC5" }}>From Photos</div>
          </div>
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, textAlign: "center", opacity: 0.6 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#B0BEC5" }}>From Files</div>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5", margin: "24px 4px 10px" }}>Recent</div>
        <EmptyState emoji="📸" title="No scans yet" hint="Scanning is coming soon — we'll OCR any photo or PDF into editable text." compact />
      </div>
    </div>
  );
}

function DiscoverTab() {
  const [mode, setMode] = useState<"ai" | "tools">("ai");
  return (
    <div>
      <TopBar />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, background: "#111827", borderRadius: 999, padding: 4, width: "fit-content", margin: "0 auto 14px" }}>
          {(["ai", "tools"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "6px 16px", borderRadius: 999, border: "none", cursor: "pointer",
              background: mode === m ? "#E8EDF5" : "transparent",
              color: mode === m ? "#0A0E1A" : "#8892A4", fontSize: 12, fontWeight: 800,
            }}>{m === "ai" ? "AI Tools" : "Other Tools"}</button>
          ))}
        </div>

        {mode === "ai" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              ["🖼", "Process Image", "/ai-hub"],
              ["📄", "PDF Tools", "/ai-hub"],
              ["📃", "Process Document", "/ai-hub"],
              ["▶", "Video & Audio", "/ai-hub"],
              ["📸", "Scan Photos", "/notes?tab=scan"],
              ["💼", "Office Work", "/notes"],
              ["☁", "CIOS Cloud", "/notes?tab=files"],
              ["⊞", "All Services", "/ai-hub"],
            ].map(([e, l, href]) => (
              <Link key={l} href={href as string} style={{ textDecoration: "none" }}>
                <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                  <div style={{ width: 36, height: 36, margin: "0 auto 6px", borderRadius: "50%", background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{e}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#B0BEC5", lineHeight: 1.2 }}>{l}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <ToolsCatalog />
        )}
      </div>
    </div>
  );
}

function ToolsCatalog() {
  const sections = [
    { title: "Photo Scan", items: [["🖼", "Scan Photos"], ["🗎", "Image to PDF"], ["W", "Image to Word"], ["📋", "Image to Text"]] },
    { title: "Image processing", items: [["🗜", "Compress Image"], ["✨", "Auto Remove BG"], ["✂", "Image Eraser"], ["✍", "Remove Handwriting"]] },
    { title: "Document processing", items: [["▤", "Merge Documents"], ["📤", "Export as Scanned PDF"], ["📉", "Reduce File Size"], ["🎧", "AI Read Aloud"]] },
  ];
  return (
    <div>
      {sections.map((s) => (
        <div key={s.title} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5" }}>{s.title}</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>More ›</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {s.items.map(([e, l]) => (
              <div key={l} style={{ textAlign: "center", opacity: 0.65 }}>
                <div style={{ width: 36, height: 36, margin: "0 auto 4px", borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{e}</div>
                <div style={{ fontSize: 10, color: "#B0BEC5" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MeTab() {
  const { user } = useUser();
  return (
    <div>
      <TopBar />
      <div style={{ padding: 24, textAlign: "center" }}>
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="" width={80} height={80} style={{ borderRadius: "50%", objectFit: "cover", margin: "0 auto 12px" }} />
        ) : (
          <div style={{ width: 80, height: 80, margin: "0 auto 12px", borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)" }} />
        )}
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5" }}>{user?.fullName || "You"}</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 20 }}>{user?.primaryEmailAddress?.emailAddress}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
          <MeLink href="/profile" emoji="👤" label="Profile" />
          <MeLink href="/gamification" emoji="🏆" label="Rewards & XP" />
          <MeLink href="/notifications" emoji="🔔" label="Notifications" />
          <MeLink href="/help" emoji="❓" label="Help & Support" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REUSABLES
   ───────────────────────────────────────────── */

function TopBar({ avatar }: { avatar?: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 6px", position: "sticky", top: 0, background: "#0A0E1A", zIndex: 10 }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" width={34} height={34} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#111827", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, background: "#111827", borderRadius: 999, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#5A6478" }}>⚲</span>
        <input placeholder="Search" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#E8EDF5", fontSize: 13 }} />
      </div>
      <button style={iconBtn}>⌑</button>
      <Link href="/notifications" style={iconBtn}>🔔</Link>
    </div>
  );
}

function NoteRow({ note }: { note: DbNote }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const meta = docMeta(note.icon || "doc");
  const rowClick = () => router.push(`/notes/${note.id}`);
  const open = (e: React.MouseEvent) => { e.stopPropagation(); rowClick(); };
  const remove = (e: React.MouseEvent) => start(async () => {
    e.stopPropagation();
    if (!confirm("Move to trash?")) return;
    const r = await trashNote(note.id);
    if (r.ok) { toast.success("Moved to trash"); window.location.reload(); }
    else toast.error(r.error);
  });

  return (
    <div onClick={rowClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
        {meta.letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title || "Untitled"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: "#5A6478" }}>⟁ This Device</span>
          <span style={{ padding: "1px 6px", background: "rgba(255,255,255,0.05)", color: "#8892A4", fontSize: 9, borderRadius: 4, fontWeight: 700 }}>Local</span>
          <span style={{ color: note.starred ? "#FFC107" : "#334155", fontSize: 12 }}>★</span>
        </div>
      </div>
      <button onClick={open} aria-label="Open" style={iconGhost}>↗</button>
      <button onClick={remove} disabled={busy} aria-label="More" style={iconGhost}>⋮</button>
    </div>
  );
}

function FileRow({ icon, color, title, subtitle, href, disabled, badge }: { icon: string; color: string; title: string; subtitle?: string; href?: string; disabled?: boolean; badge?: string }) {
  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)", opacity: disabled ? 0.55 : 1 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "22", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {badge && <span style={{ padding: "3px 8px", background: "rgba(255,193,7,0.15)", color: "#FFC107", borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>{badge}</span>}
      {!badge && <span style={{ color: "#5A6478", fontSize: 16 }}>›</span>}
    </div>
  );
  if (href && !disabled) return <Link href={href} style={{ textDecoration: "none" }}>{content}</Link>;
  return <div>{content}</div>;
}

function MeLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#111827", borderRadius: 12, textDecoration: "none", color: "#E8EDF5" }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#5A6478" }}>›</span>
    </Link>
  );
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
    { key: "scan", label: "Scan", icon: "⊡" },
    { key: "discover", label: "Discover", icon: "◫" },
    { key: "me", label: "Me", icon: "◉" },
  ];
  return (
    <nav style={{
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

/* ─────────────────────────────────────────────
   NEW DOC BOTTOM SHEET + TEMPLATE PICKER
   ───────────────────────────────────────────── */

function NewDocSheet({ onClose, onPick }: { onClose: () => void; onPick: (t: DocType) => void }) {
  const types: Array<{ k: DocType; label: string; color: string; letter: string }> = [
    { k: "doc",    label: "Docs",   color: "#2B5797", letter: "W" },
    { k: "slides", label: "Slides", color: "#D24726", letter: "P" },
    { k: "table",  label: "Table",  color: "#107C41", letter: "S" },
    { k: "pdf",    label: "PDF",    color: "#CC3333", letter: "🗎" },
  ];
  return (
    <SheetBackdrop onClose={onClose}>
      <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>New</div>
        <button onClick={onClose} style={{ ...iconGhost, color: "#E8EDF5" }}>✕</button>
      </div>
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Office Documents</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {types.map((t) => (
            <button key={t.k} onClick={() => onPick(t.k)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center" }}>
              <div style={{ width: 54, height: 54, margin: "0 auto 6px", borderRadius: 10, background: t.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 800 }}>
                {t.letter}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
    </SheetBackdrop>
  );
}

function TemplatePicker({ docType, onClose, onBack }: { docType: DocType; onClose: () => void; onBack: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const create = (template: string | null) => start(async () => {
    const r = await saveNote({ title: titleFor(docType, template), html: "", icon: docType, tags: [], status: "draft", starred: false, pinned: false });
    if (!r.ok) { toast.error(r.error); return; }
    onClose();
    router.push(`/notes/${r.data!.id}`);
  });

  const groups: Array<{ title: string; items: Array<{ id: string; name: string; color: string }> }> = [
    { title: "Letters", items: [
      { id: "letter-green", name: "Natural Green", color: "linear-gradient(135deg,#4CAF50,#2E7D32)" },
      { id: "letter-fresh", name: "Fresh Green", color: "linear-gradient(135deg,#26C6DA,#00838F)" },
      { id: "letter-grey",  name: "Simple Grey", color: "linear-gradient(135deg,#90A4AE,#546E7A)" },
    ]},
    { title: "Resumes", items: [
      { id: "resume-bw",    name: "Black & White", color: "linear-gradient(135deg,#263238,#000)" },
      { id: "resume-blue",  name: "Grey Blue",     color: "linear-gradient(135deg,#1E88E5,#1565C0)" },
      { id: "resume-yellow",name: "Yellow Fashion",color: "linear-gradient(135deg,#FFC107,#F57C00)" },
    ]},
    { title: "Education", items: [
      { id: "edu-notes",    name: "Study Notes",   color: "linear-gradient(135deg,#AB47BC,#6A1B9A)" },
      { id: "edu-project",  name: "Project Plan",  color: "linear-gradient(135deg,#EF5350,#C62828)" },
    ]},
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0A0E1A", zIndex: 60, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "#0A0E1A", zIndex: 1 }}>
        <button onClick={onBack} style={iconGhost}>✕</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>Select Template</div>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5", margin: "6px 0 10px" }}>Common</div>
        <button onClick={() => create(null)} disabled={pending} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center" }}>
          <div style={{ width: 120, height: 160, borderRadius: 12, background: "linear-gradient(135deg,#1E88E5,#1565C0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 42, fontWeight: 300 }}>+</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5", marginTop: 8 }}>Blank Template</div>
        </button>

        {groups.map((g) => (
          <div key={g.title} style={{ marginTop: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5" }}>{g.title}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>More ›</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {g.items.map((it) => (
                <button key={it.id} onClick={() => create(it.id)} disabled={pending} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ width: "100%", aspectRatio: "3/4", borderRadius: 10, background: it.color, marginBottom: 6 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SheetBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 0 0", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */

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
