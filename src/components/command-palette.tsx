"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const RECENTS_KEY = "cios-palette-recents";
function loadRecents(): string[] { try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]"); } catch { return []; } }
function pushRecent(href: string) {
  try {
    const cur = loadRecents().filter((h) => h !== href);
    cur.unshift(href);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(cur.slice(0, 6)));
  } catch {}
}

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  emoji: string;
  href: string;
  group: string;
  keywords?: string;
}

const COMMANDS: Cmd[] = [
  { id: "dash", label: "Dashboard", emoji: "🏠", href: "/dashboard", group: "Navigate" },
  { id: "msg", label: "Messages", emoji: "💬", href: "/messages", group: "Navigate", keywords: "chat dm" },
  { id: "tasks", label: "Tasks", emoji: "✅", href: "/tasks", group: "Navigate", keywords: "todo" },
  { id: "cal", label: "Calendar", emoji: "🗓️", href: "/calendar", group: "Navigate", keywords: "schedule events" },
  { id: "courses", label: "Courses", emoji: "📚", href: "/courses", group: "Navigate", keywords: "learning" },
  { id: "classroom", label: "Classroom", emoji: "🎓", href: "/classroom", group: "Navigate", keywords: "live class" },
  { id: "wallet", label: "Wallet", emoji: "💰", href: "/wallet", group: "Navigate", keywords: "money payouts" },
  { id: "leader", label: "Leaderboard", emoji: "🏆", href: "/leaderboard", group: "Navigate", keywords: "rank" },
  { id: "badges", label: "Badges", emoji: "🎖️", href: "/badges", group: "Navigate" },
  { id: "missions", label: "Missions", emoji: "🎯", href: "/missions", group: "Navigate" },
  { id: "streaks", label: "Streaks", emoji: "🔥", href: "/streaks", group: "Navigate" },
  { id: "prod", label: "Productivity Hub", emoji: "⚡", href: "/productivity", group: "Navigate" },
  { id: "planner", label: "Planner", emoji: "🗒️", href: "/planner", group: "Navigate" },
  { id: "alarms", label: "Alarms & Clock", emoji: "⏰", href: "/alarms", group: "Navigate" },
  { id: "reminders", label: "Reminders", emoji: "🔔", href: "/reminders", group: "Navigate" },
  { id: "focus", label: "Focus mode", emoji: "🧘", href: "/focus-mode", group: "Navigate" },
  { id: "notes", label: "Notes", emoji: "📝", href: "/notes", group: "Navigate" },
  { id: "perf", label: "Performance", emoji: "📈", href: "/performance", group: "Navigate" },
  { id: "comm", label: "Community", emoji: "👥", href: "/community", group: "Navigate" },
  { id: "ann", label: "Announcements", emoji: "📣", href: "/announcements", group: "Navigate" },
  { id: "ai", label: "AI Hub", emoji: "🤖", href: "/ai-hub", group: "Navigate" },
  { id: "docs", label: "Documents", emoji: "📄", href: "/documents", group: "Navigate" },
  { id: "opps", label: "Opportunities", emoji: "💼", href: "/opportunities", group: "Navigate" },
  { id: "certs", label: "Certificates", emoji: "🎓", href: "/certificates", group: "Navigate" },
  { id: "myanal", label: "My Analytics", emoji: "📊", href: "/my-analytics", group: "Navigate" },
  { id: "notif", label: "Notifications", emoji: "🔔", href: "/notifications", group: "Navigate" },
  { id: "settings", label: "Settings", emoji: "⚙️", href: "/settings", group: "Navigate" },
  { id: "profile", label: "Profile", emoji: "👤", href: "/profile", group: "Navigate" },
  { id: "help", label: "Help & Support", emoji: "💬", href: "/help", group: "Navigate", keywords: "faq ticket contact" },
  { id: "admin-promos", label: "Admin · Promotion queue", emoji: "🎖", href: "/admin/promotions", group: "Navigate", keywords: "promote rank admin" },
  { id: "admin-integ", label: "Admin · Integrations", emoji: "🔌", href: "/admin/integrations", group: "Navigate", keywords: "webhooks api tokens" },

  { id: "new-task", label: "New task", emoji: "➕", href: "/tasks?new=1", group: "Quick action" },
  { id: "new-event", label: "New calendar event", emoji: "➕", href: "/calendar?new=1", group: "Quick action" },
  { id: "new-note", label: "New note", emoji: "➕", href: "/notes?new=1", group: "Quick action" },
  { id: "new-msg", label: "New message", emoji: "✉️", href: "/messages?new=1", group: "Quick action" },
];

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (pathname && COMMANDS.some((c) => c.href === pathname)) pushRecent(pathname); }, [pathname]);
  useEffect(() => { if (open) setRecents(loadRecents()); }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cios:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cios:open-palette", onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      const recentCmds = recents.map((href) => {
        const c = COMMANDS.find((x) => x.href === href);
        return c ? { ...c, group: "Recent" } : null;
      }).filter(Boolean) as Cmd[];
      const others = COMMANDS.filter((c) => !recents.includes(c.href));
      return [...recentCmds, ...others];
    }
    return COMMANDS.filter((c) =>
      c.label.toLowerCase().includes(query) ||
      c.group.toLowerCase().includes(query) ||
      (c.keywords || "").toLowerCase().includes(query),
    );
  }, [q]);

  const go = (c: Cmd) => { setOpen(false); router.push(c.href); };

  if (!open) return null;

  const grouped: Record<string, Cmd[]> = {};
  for (const c of filtered) (grouped[c.group] ||= []).push(c);
  let flatIdx = -1;

  return (
    <div onClick={(e) => e.target === e.currentTarget && setOpen(false)} className="cios-palette-backdrop" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh", zIndex: 500,
    }}>
      <style>{`@media (max-width: 768px){ .cios-palette-backdrop { padding-top: 0 !important; } .cios-palette-panel { width: 100vw !important; height: 100vh !important; border-radius: 0 !important; max-height: 100vh !important; } .cios-palette-list { max-height: calc(100vh - 120px) !important; } }`}</style>
      <div className="cios-palette-panel" style={{ width: "min(640px, 92vw)", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", boxShadow: "0 25px 80px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter" && filtered[active]) { e.preventDefault(); go(filtered[active]); }
            }}
            placeholder="Search pages, actions…"
            style={{ flex: 1, background: "transparent", color: "#E8EDF5", border: "none", outline: "none", fontSize: 15 }}
          />
          <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, background: "rgba(255,255,255,0.06)", color: "#8892A4", fontWeight: 700, letterSpacing: 1 }}>ESC</span>
        </div>
        <div className="cios-palette-list" style={{ maxHeight: "55vh", overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 && <div style={{ padding: "32px 20px", textAlign: "center", color: "#5A6478", fontSize: 13 }}>No matches.</div>}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#5A6478", letterSpacing: 1.5, textTransform: "uppercase", padding: "10px 12px 4px" }}>{group}</div>
              {items.map((c) => {
                flatIdx++;
                const isActive = flatIdx === active;
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setActive(filtered.indexOf(c))}
                    onClick={() => go(c)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: isActive ? "rgba(30,136,229,0.15)" : "transparent",
                      border: "none", borderRadius: 8, cursor: "pointer", color: "#E8EDF5", fontSize: 13, textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{c.emoji}</span>
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {isActive && <span style={{ fontSize: 11, color: "#8892A4" }}>↵</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 14, fontSize: 11, color: "#5A6478" }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
          <span style={{ marginLeft: "auto" }}>⌘K / Ctrl+K to toggle</span>
        </div>
      </div>
    </div>
  );
}
