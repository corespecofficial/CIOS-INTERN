"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";

const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const ACCENT = "#10B981";

const NAV: { href: string; label: string; emoji: string; section: "MAIN" | "ACCOUNT"; exact?: boolean }[] = [
  { href: "/investor/dashboard",  label: "Dashboard",  emoji: "\u{1F4CA}", section: "MAIN", exact: true },
  { href: "/investor/dealflow",   label: "Deal flow",  emoji: "\u{1F4C8}", section: "MAIN" },
  { href: "/investor/watchlist",  label: "Watchlist",  emoji: "\u2B50",     section: "MAIN" },
  { href: "/investors",           label: "Public board", emoji: "\u{1F30D}", section: "MAIN" },
  { href: "/investor/settings",   label: "Settings",   emoji: "\u2699",     section: "ACCOUNT" },
];

const SECTION_LABEL: Record<"MAIN" | "ACCOUNT", string> = {
  MAIN: "Investing",
  ACCOUNT: "Account",
};

export function InvestorNav({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cios-sidebar-collapsed");
      if (saved !== null) setSidebarCollapsed(saved === "true");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mobile) {
    return (
      <div
        className="investor-mobile-tabs"
        style={{
          display: "none",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          gap: 6,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "#0F172A",
        } as React.CSSProperties}
      >
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                whiteSpace: "nowrap", flexShrink: 0, textDecoration: "none",
                background: active ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)",
                color: active ? ACCENT : "#94A3B8",
                border: active ? `1px solid ${ACCENT}55` : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: 14 }}>{n.emoji}</span>
              {n.label}
            </Link>
          );
        })}
      </div>
    );
  }

  const sidebarWidth = collapsed ? 64 : 240;

  const groups: { label: "MAIN" | "ACCOUNT"; items: typeof NAV }[] = [];
  for (const item of NAV) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.section) last.items.push(item);
    else groups.push({ label: item.section, items: [item] });
  }

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: "100dvh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        background: "#0F172A",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        transition: "width 0.18s ease",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "16px 14px" : "16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <img src={LOGO_URL} alt="CIOS" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#F8FAFC", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
              CIOS <span style={{ color: ACCENT, fontWeight: 700 }}>· Investor</span>
            </div>
            <div style={{ fontSize: 10, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Africa-first capital
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "8px 6px" : "8px 10px" }}>
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 10px 4px" }}>
                {SECTION_LABEL[group.label]}
              </div>
            )}
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: collapsed ? "8px 0" : "8px 10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? ACCENT : "#CBD5E1",
                    background: active ? "rgba(16,185,129,0.10)" : "transparent",
                    borderLeft: active ? `3px solid ${ACCENT}` : "3px solid transparent",
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={() => toggleSidebar()}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: "100%", padding: "8px 0", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)", background: "transparent",
            color: "#94A3B8", fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>{collapsed ? "→" : "←"}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
