"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppStore, getRoleLabel } from "@/store/use-app-store";
import { useCurrentUser } from "@/lib/use-current-user";
import { useServerNotifications } from "@/lib/use-server-notifications";
import { UserButton } from "@clerk/nextjs";

export function Header() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const storeRole = useAppStore((s) => s.role);
  const user = useCurrentUser();
  // Show preview role if super admin is previewing, otherwise show real Clerk role
  const role = user.role === "super_admin" ? storeRole : user.role;
  const { notifications: notifsList, unread: unreadCount, markRead: markAsRead, markAll: markAllRead, justArrived, enableBrowserNotifications } = useServerNotifications(user.id || null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 56,
        minHeight: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "#111827",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Left: Search — opens Cmd+K palette */}
      <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
        <input
          type="text"
          readOnly
          onFocus={(e) => { e.target.blur(); window.dispatchEvent(new CustomEvent("cios:open-palette")); }}
          onClick={() => window.dispatchEvent(new CustomEvent("cios:open-palette"))}
          placeholder="🔍  Search pages, actions, people…"
          style={{
            width: "100%",
            padding: "8px 70px 8px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "#1A2332",
            color: "#E8EDF5",
            fontSize: 13,
            outline: "none",
            cursor: "pointer",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10,
            color: "#5A6478",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            padding: "2px 6px",
            background: "rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }}
        >
          Cmd+K
        </span>
      </div>

      {/* Right side items */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginLeft: 16,
        }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "#8892A4",
            fontSize: 18,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {theme === "dark" ? "\u{1F319}" : "\u2600"}
        </button>

        {/* Notification bell with dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            style={{
              position: "relative",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: "none",
              background: showDropdown ? "rgba(30,136,229,0.1)" : "transparent",
              color: "#8892A4",
              fontSize: 18,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <span style={{ display: "inline-block", animation: justArrived ? "bellShake 0.6s ease-in-out" : undefined }}>
              {"\u{1F514}"}
            </span>
            <style>{`@keyframes bellShake { 0%,100% { transform: rotate(0); } 20% { transform: rotate(-16deg); } 40% { transform: rotate(14deg); } 60% { transform: rotate(-10deg); } 80% { transform: rotate(8deg); } }`}</style>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "#E53935",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "0 4px",
                  lineHeight: 1,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <>
              {/* Backdrop on mobile — taps outside close panel */}
              <div className="cios-notif-backdrop" onClick={() => setShowDropdown(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "none" }} />
              <style>{`
                @media (max-width: 768px) {
                  .cios-notif-backdrop { display: block !important; }
                  .cios-notif-panel {
                    position: fixed !important;
                    top: 56px !important;
                    left: 8px !important;
                    right: 8px !important;
                    width: auto !important;
                    max-width: none !important;
                    max-height: calc(100dvh - 80px) !important;
                  }
                }
              `}</style>
            <div className="cios-notif-panel" style={{
              position: "absolute", top: 46, right: 0, width: 360, maxHeight: 480,
              background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
              zIndex: 1000, display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>Notifications</span>
                <button onClick={() => markAllRead()} style={{ background: "none", border: "none", color: "#1E88E5", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Mark all read
                </button>
              </div>

              {/* Browser permission nudge */}
              <BrowserPermNudge onEnable={enableBrowserNotifications} />

              {/* List */}
              <div style={{ flex: 1, overflowY: "auto", maxHeight: 380 }}>
                {notifsList.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#8892A4", fontSize: 13 }}>No notifications</div>
                ) : notifsList.map(n => {
                  const icon = { message: "💬", task: "📋", achievement: "🏆", fine: "💸", info: "🔔", success: "✅", warning: "⚠️", error: "🚨", system: "⚙️" }[n.type] || "🔔";
                  const color = { message: "#1E88E5", task: "#AB47BC", achievement: "#FFC107", fine: "#EF5350", info: "#1E88E5", success: "#66BB6A", warning: "#FFC107", error: "#EF5350", system: "#8892A4" }[n.type] || "#1E88E5";
                  const ms = Date.now() - new Date(n.created_at).getTime();
                  const mins = Math.floor(ms / 60000);
                  const time = mins < 1 ? "now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.action_url) { window.location.href = n.action_url; setShowDropdown(false); }
                      }}
                      style={{
                        padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start",
                        background: n.is_read ? "transparent" : "rgba(30,136,229,0.06)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer", transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? "transparent" : "rgba(30,136,229,0.06)")}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${color}22`, color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0,
                      }}>{icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                          {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1E88E5", flexShrink: 0 }} />}
                        </div>
                        {n.message && <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.message}</div>}
                        <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4 }}>{time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <Link href="/notifications" onClick={() => setShowDropdown(false)} style={{
                padding: "12px 16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.07)",
                color: "#1E88E5", fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                View all notifications
              </Link>
            </div>
            </>
          )}
        </div>

        {/* Role badge pill */}
        <span
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 999,
            background: "rgba(30,136,229,0.15)",
            color: "#1E88E5",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          {getRoleLabel(role)}
        </span>

        {/* User avatar — Clerk UserButton with sign out */}
        {user.isSignedIn ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            <UserButton appearance={{ elements: { avatarBox: { width: 36, height: 36, border: "2px solid #1E88E5", borderRadius: "50%" } } }} />
          </div>
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #1E88E5, #AB47BC)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            border: "2px solid #1E88E5", cursor: "pointer",
          }}>
            {user.initials}
          </div>
        )}
      </div>
    </header>
  );
}

function BrowserPermNudge({ onEnable }: { onEnable: () => Promise<NotificationPermission> }) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) { setPerm("unsupported"); return; }
    setPerm(Notification.permission);
  }, []);

  const test = () => {
    try {
      const n = new Notification("🔔 CIOS test", {
        body: "Notifications are working — you'll see alerts like this for new messages and activity.",
        icon: "/icon-192.png",
        badge: "/badge-72.png",
      });
      setTimeout(() => { try { n.close(); } catch {} }, 5000);
    } catch { /* denied at OS level */ }
  };

  if (perm === null || perm === "unsupported") return null;

  if (perm === "granted") {
    // Show a tiny confirmation row with a test button
    return (
      <div style={{ padding: "8px 14px", background: "rgba(102,187,106,0.06)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
        <span style={{ color: "#66BB6A" }}>✓ Desktop notifications enabled</span>
        <div style={{ flex: 1 }} />
        <button onClick={test} style={{ background: "transparent", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Test</button>
      </div>
    );
  }

  if (perm === "denied") {
    return (
      <div style={{ padding: "10px 14px", background: "rgba(239,83,80,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>🔕</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>Notifications blocked</div>
            <div style={{ fontSize: 10, color: "#8892A4" }}>You&apos;ll miss alerts for messages & activity.</div>
          </div>
          <button onClick={() => setHelpOpen(!helpOpen)} style={{ background: "#EF5350", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Re-enable</button>
        </div>
        {helpOpen && (
          <div style={{ marginTop: 10, padding: 10, background: "rgba(0,0,0,0.25)", borderRadius: 8, fontSize: 11, color: "#B0BEC5", lineHeight: 1.55 }}>
            <strong style={{ color: "#E8EDF5" }}>How to re-enable</strong>
            <ol style={{ margin: "6px 0 0 16px", padding: 0 }}>
              <li>Click the <strong>🔒 lock icon</strong> in your browser&apos;s address bar</li>
              <li>Find <strong>Notifications</strong> → switch to <strong>Allow</strong></li>
              <li>Reload this page</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  // default / not asked yet
  return (
    <div style={{ padding: "10px 14px", background: "rgba(30,136,229,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ fontSize: 18 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>Enable desktop notifications</div>
        <div style={{ fontSize: 10, color: "#8892A4" }}>Get alerts when the tab is in the background.</div>
      </div>
      <button onClick={async () => setPerm(await onEnable())} style={{ background: "#1E88E5", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Enable</button>
    </div>
  );
}
