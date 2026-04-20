"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const CIOS_LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

export const ACCENT = "#8B5CF6";

export interface Recent {
  id: string;
  title: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  updatedAt: number;
}

export const RECENTS_KEY = "cios-ai-hub-recents";
export const RECENTS_EVENT = "cios-ai-hub-recents-updated";

export function readRecents(): Recent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Recent[]) : [];
  } catch {
    return [];
  }
}

export function writeRecents(next: Recent[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next.slice(0, 50)));
    window.dispatchEvent(new Event(RECENTS_EVENT));
  } catch { /* ignore */ }
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recents, setRecents] = useState<Recent[]>([]);
  const hydrated = useRef(false);

  // Hydrate sidebar state + recents from localStorage
  useEffect(() => {
    try {
      const open = localStorage.getItem("cios-ai-hub-sidebar-open");
      if (open !== null) setSidebarOpen(open === "1");
      const more = localStorage.getItem("cios-ai-hub-more-open");
      if (more !== null) setMoreOpen(more === "1");
    } catch { /* ignore */ }
    setRecents(readRecents());
    hydrated.current = true;

    const reload = () => setRecents(readRecents());
    window.addEventListener(RECENTS_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(RECENTS_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  useEffect(() => {
    if (hydrated.current) {
      try { localStorage.setItem("cios-ai-hub-sidebar-open", sidebarOpen ? "1" : "0"); } catch { /* ignore */ }
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (hydrated.current) {
      try { localStorage.setItem("cios-ai-hub-more-open", moreOpen ? "1" : "0"); } catch { /* ignore */ }
    }
  }, [moreOpen]);

  const activeKey = useMemo(() => {
    if (!pathname) return "";
    if (pathname.endsWith("/ai-hub/chat")) return "chat";
    if (pathname.endsWith("/ai-hub/customize")) return "customize";
    if (pathname.endsWith("/ai-hub/chats")) return "chats";
    if (pathname.endsWith("/ai-hub/projects")) return "projects";
    if (pathname.endsWith("/ai-hub/artifacts")) return "artifacts";
    if (pathname.endsWith("/ai-hub/code")) return "code";
    if (pathname.endsWith("/ai-hub/design")) return "design";
    return "";
  }, [pathname]);

  const filteredRecents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recents;
    return recents.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [recents, searchQuery]);

  const loadRecent = useCallback((r: Recent) => {
    try { localStorage.setItem("cios-ai-hub-active-chat", r.id); } catch { /* ignore */ }
    setSearchOpen(false);
    router.push("/ai-hub/chat?c=" + encodeURIComponent(r.id));
  }, [router]);

  const startNewChat = useCallback(() => {
    try { localStorage.removeItem("cios-ai-hub-active-chat"); } catch { /* ignore */ }
    setSearchOpen(false);
    router.push("/ai-hub/chat");
  }, [router]);

  return (
    <div
      data-workspace="ai-hub"
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        color: "#1F2430",
        display: "grid",
        gridTemplateColumns: sidebarOpen ? "260px 1fr" : "64px 1fr",
        fontFamily: "'Nunito', sans-serif",
        zIndex: 9999,
        transition: "grid-template-columns .25s ease",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          background: "#F7F6F3",
          borderRight: "1px solid #EAE7DF",
          display: "flex",
          flexDirection: "column",
          padding: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Brand + toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 12px" }}>
          {sidebarOpen ? (
            <Link href="/ai-hub" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
              <img src={CIOS_LOGO} alt="CIOS" width={26} height={26} style={{ borderRadius: 6 }} />
              <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.2 }}>CIOS</span>
            </Link>
          ) : (
            <Link href="/ai-hub">
              <img src={CIOS_LOGO} alt="CIOS" width={26} height={26} style={{ borderRadius: 6 }} />
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            style={{
              border: "none",
              background: "transparent",
              padding: 6,
              borderRadius: 6,
              cursor: "pointer",
              color: "#4A4A4A",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            {sidebarOpen ? "«" : "»"}
          </button>
        </div>

        {/* Primary actions */}
        <SideBtn open={sidebarOpen} icon="＋" label="New chat" onClick={startNewChat} primary />
        <SideBtn open={sidebarOpen} icon="🔍" label="Search" onClick={() => setSearchOpen(true)} />
        <SideLink open={sidebarOpen} icon="⚙︎" label="Customize" href="/ai-hub/customize" active={activeKey === "customize"} />

        {/* Collapsible: Chats/Projects/Artifacts/Code/Design */}
        {sidebarOpen && (
          <>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#8F8B80",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                marginTop: 14,
                borderRadius: 6,
                width: "100%",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  transform: moreOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform .15s ease",
                  fontSize: 10,
                }}
              >
                ▶
              </span>
              MORE
            </button>
            {moreOpen && (
              <div style={{ display: "grid", gap: 2 }}>
                <SideLink open icon="💬" label="Chats"          href="/ai-hub/chats"          active={activeKey === "chats" || activeKey === "chat"} />
                <SideLink open icon="📁" label="Projects"       href="/ai-hub/projects"       active={activeKey === "projects"} />
                <SideLink open icon="🧩" label="Artifacts"      href="/ai-hub/artifacts"      active={activeKey === "artifacts"} />
                <SideLink open icon="💻" label="Code"           href="/ai-hub/code"           active={activeKey === "code"} />
                <SideLink open icon="🎨" label="Design"         href="/ai-hub/design"         active={activeKey === "design"} />
              </div>
            )}
          </>
        )}

        {/* Recents */}
        {sidebarOpen && (
          <div style={{ marginTop: 18, flex: 1, overflow: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8F8B80", letterSpacing: 0.5, padding: "0 8px 6px" }}>
              RECENTS
            </div>
            {recents.length === 0 && (
              <div style={{ padding: "8px 10px", color: "#9E9A8E", fontSize: 12 }}>No chats yet</div>
            )}
            {recents.map((r) => (
              <button
                key={r.id}
                onClick={() => loadRecent(r)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: 13,
                  color: "#55524A",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#EFECE4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {r.title}
              </button>
            ))}
          </div>
        )}

        {/* Bottom: back to landing */}
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #EAE7DF" }}>
          <Link
            href="/ai-hub"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 8px",
              borderRadius: 8,
              textDecoration: "none",
              color: "#55524A",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            {sidebarOpen && "Back to AI Hub"}
          </Link>
          {sidebarOpen && (
            <div style={{ padding: "6px 2px 0" }}>
              <ThemeToggle compact />
            </div>
          )}
        </div>

        {/* SEARCH PANEL — overlays the sidebar column */}
        {searchOpen && (
          <div
            role="dialog"
            aria-label="Search chats"
            style={{
              position: "absolute",
              inset: 0,
              background: "#fff",
              padding: 18,
              overflowY: "auto",
              zIndex: 3,
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                aria-label="Back"
                title="Back"
                style={{
                  border: "none",
                  background: "#F2F1ED",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#1F2430",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ←
              </button>
              <div style={{ fontWeight: 900, fontSize: 16, color: "#1F2430" }}>Search chats</div>
            </div>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your chat history…"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #EAE7DF",
                fontSize: 14,
                outline: "none",
                marginBottom: 12,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            {searchQuery.trim() === "" ? (
              <div style={{ color: "#9E9A8E", fontSize: 13 }}>Start typing to filter Recents.</div>
            ) : filteredRecents.length === 0 ? (
              <div style={{ color: "#9E9A8E", fontSize: 13 }}>No chats match &ldquo;{searchQuery}&rdquo;.</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {filteredRecents.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => loadRecent(r)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #EAE7DF",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#1F2430",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{r.title}</div>
                    <div style={{ color: "#8F8B80", fontSize: 12, marginTop: 2 }}>
                      {r.messages.length} message{r.messages.length === 1 ? "" : "s"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* MAIN */}
      <section style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {children}
      </section>

      <style>{`
        @keyframes ciosPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50%      { transform: scale(1.12); opacity: 1; }
        }
        @keyframes ciosDots {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%           { opacity: 1;    transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

/* ─────────── Sidebar primitives ─────────── */

function SideBtn({
  icon,
  label,
  onClick,
  open,
  primary,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  open: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: open ? "10px 12px" : "10px 8px",
        margin: "2px 0",
        border: "none",
        background: primary ? "#fff" : "transparent",
        borderRadius: 10,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        color: primary ? "#1F2430" : "#55524A",
        fontWeight: primary ? 800 : 700,
        fontSize: 13,
        boxShadow: primary ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
        justifyContent: open ? "flex-start" : "center",
      }}
      onMouseEnter={(e) => { if (!primary) e.currentTarget.style.background = "#EDEAE0"; }}
      onMouseLeave={(e) => { if (!primary) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      {open && <span>{label}</span>}
    </button>
  );
}

function SideLink({
  icon,
  label,
  href,
  open,
  active,
}: {
  icon: string;
  label: string;
  href: string;
  open: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: open ? "10px 12px" : "10px 8px",
        margin: "2px 0",
        border: "none",
        background: active ? "#EDEAE0" : "transparent",
        borderRadius: 10,
        textDecoration: "none",
        width: "100%",
        color: active ? "#1F2430" : "#55524A",
        fontWeight: active ? 800 : 700,
        fontSize: 13,
        justifyContent: open ? "flex-start" : "center",
      }}
    >
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      {open && <span>{label}</span>}
    </Link>
  );
}
