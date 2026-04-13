"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/use-current-user";
import { useServerNotifications, usePrefs } from "@/lib/use-server-notifications";
import { clearAllNotifications } from "@/app/actions/notifications";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "message", label: "💬 Messages" },
  { key: "task", label: "📋 Tasks" },
  { key: "achievement", label: "🏆 Achievements" },
  { key: "fine", label: "💸 Wallet" },
  { key: "warning", label: "⚠️ Warnings" },
  { key: "error", label: "🚨 Critical" },
  { key: "info", label: "🔔 Info" },
] as const;

const ICONS: Record<string, { icon: string; color: string }> = {
  message: { icon: "💬", color: "#1E88E5" },
  task: { icon: "📋", color: "#AB47BC" },
  achievement: { icon: "🏆", color: "#FFC107" },
  fine: { icon: "💸", color: "#EF5350" },
  info: { icon: "🔔", color: "#1E88E5" },
  success: { icon: "✅", color: "#66BB6A" },
  warning: { icon: "⚠️", color: "#FFC107" },
  error: { icon: "🚨", color: "#EF5350" },
  system: { icon: "⚙️", color: "#8892A4" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d}d ago`;
}

export default function NotificationsPage() {
  const user = useCurrentUser();
  const { notifications, unread, markRead, markAll, remove, refresh } = useServerNotifications(user.id || null);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (tab === "unread" && n.is_read) return false;
      if (category !== "all" && n.type !== category) return false;
      if (search && !(`${n.title} ${n.message}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [notifications, tab, category, search]);

  async function onClearAll() {
    if (!confirm("Delete all your notifications? This can't be undone.")) return;
    const r = await clearAllNotifications();
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("All cleared");
    refresh();
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🔔 Notifications</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>{unread} unread · {notifications.length} total</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowSettings(!showSettings)} style={btnGhost}>⚙️ Preferences</button>
          {unread > 0 && <button onClick={() => markAll()} style={btnPrimary}>Mark all read</button>}
          <button onClick={onClearAll} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" }}>🗑 Clear all</button>
        </div>
      </div>

      {showSettings && <PreferencesPanel onClose={() => setShowSettings(false)} />}

      {/* Filter row */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={() => setTab("all")} style={{ ...tabBtn, ...(tab === "all" ? tabBtnActive : {}) }}>All ({notifications.length})</button>
          <button onClick={() => setTab("unread")} style={{ ...tabBtn, ...(tab === "unread" ? tabBtnActive : {}) }}>Unread ({unread})</button>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search notifications…" style={searchInput} />
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)} style={{ ...chip, ...(category === c.key ? chipActive : {}) }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🌤️</div>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0 }}>
            {tab === "unread" ? "All caught up — no unread notifications." : "No notifications match these filters."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((n) => {
            const meta = ICONS[n.type] || ICONS.info;
            return (
              <div
                key={n.id}
                style={{
                  display: "flex", gap: 12, alignItems: "flex-start", padding: 14,
                  background: n.is_read ? "#111827" : "rgba(30,136,229,0.06)",
                  border: `1px solid ${n.is_read ? "rgba(255,255,255,0.05)" : "rgba(30,136,229,0.2)"}`,
                  borderRadius: 10,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${meta.color}22`, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{n.title}</span>
                    {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1E88E5" }} />}
                    <span style={{ fontSize: 10, color: "#5A6478", marginLeft: "auto" }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {n.message && <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5, marginBottom: 6 }}>{n.message}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {n.action_url && (
                      <Link href={n.action_url} onClick={() => markRead(n.id)} style={miniLink}>Open →</Link>
                    )}
                    {!n.is_read && <button onClick={() => markRead(n.id)} style={miniBtn}>Mark read</button>}
                    <button onClick={() => remove(n.id)} style={{ ...miniBtn, color: "#EF5350" }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PreferencesPanel({ onClose: _onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = usePrefs();

  const cats: { key: string; label: string }[] = [
    { key: "message", label: "Messages" },
    { key: "task", label: "Tasks" },
    { key: "achievement", label: "Achievements" },
    { key: "info", label: "General info" },
    { key: "warning", label: "Warnings" },
    { key: "error", label: "Critical (can't be fully muted)" },
  ];

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>Preferences</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label style={prefRow}>
          <input type="checkbox" checked={prefs.toastsOn} onChange={(e) => setPrefs({ ...prefs, toastsOn: e.target.checked })} />
          <span>Show toast pop-ups</span>
        </label>
        <label style={prefRow}>
          <input type="checkbox" checked={prefs.soundOn} onChange={(e) => setPrefs({ ...prefs, soundOn: e.target.checked })} />
          <span>Sound on new notifications</span>
        </label>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Mute categories</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {cats.map((c) => {
            const muted = prefs.mutedCategories.includes(c.key);
            const locked = c.key === "error";
            return (
              <button
                key={c.key}
                disabled={locked}
                onClick={() => {
                  const next = muted ? prefs.mutedCategories.filter((x) => x !== c.key) : [...prefs.mutedCategories, c.key];
                  setPrefs({ ...prefs, mutedCategories: next });
                }}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: muted ? "rgba(239,83,80,0.12)" : "rgba(102,187,106,0.1)",
                  color: muted ? "#EF5350" : "#66BB6A",
                  border: `1px solid ${muted ? "rgba(239,83,80,0.25)" : "rgba(102,187,106,0.25)"}`,
                  cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : 1,
                }}
              >
                {muted ? "🔇" : "🔊"} {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>Quiet from</div>
          <select value={prefs.quietFromHour} onChange={(e) => setPrefs({ ...prefs, quietFromHour: parseInt(e.target.value) })} style={select}>
            {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>Quiet until</div>
          <select value={prefs.quietToHour} onChange={(e) => setPrefs({ ...prefs, quietToHour: parseInt(e.target.value) })} style={select}>
            {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>)}
          </select>
        </div>
      </div>
      <p style={{ fontSize: 10, color: "#5A6478", marginTop: 10 }}>Preferences saved locally per device.</p>
    </div>
  );
}

const tabBtn: React.CSSProperties = { background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const tabBtnActive: React.CSSProperties = { background: "#1E88E5", color: "#fff", border: "none" };
const chip: React.CSSProperties = { padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "#0A0E1A", color: "#8892A4", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer" };
const chipActive: React.CSSProperties = { background: "rgba(30,136,229,0.15)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.3)" };
const searchInput: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#E8EDF5", fontSize: 12, outline: "none" };
const miniBtn: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#8892A4", borderRadius: 6, padding: "3px 10px", fontSize: 10, cursor: "pointer", fontWeight: 700 };
const miniLink: React.CSSProperties = { background: "rgba(30,136,229,0.1)", color: "#1E88E5", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 700, textDecoration: "none" };
const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const prefRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E8EDF5", cursor: "pointer" };
const select: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#E8EDF5", fontSize: 12, outline: "none", fontFamily: "inherit" };
