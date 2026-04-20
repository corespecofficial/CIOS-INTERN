"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";

const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface NavItem {
  href: string;
  label: string;
  emoji: string;
  exact?: boolean;
  section: "MAIN" | "PIPELINE" | "ACCOUNT";
}

const NAV: NavItem[] = [
  { href: "/recruiter",               label: "Hub",           emoji: "\u{1F3E0}", section: "MAIN", exact: true },
  { href: "/recruiter/dashboard",     label: "Dashboard",     emoji: "\u{1F4CA}", section: "MAIN" },
  { href: "/recruiter/opportunities", label: "Opportunities", emoji: "\u{1F4BC}", section: "PIPELINE" },
  { href: "/recruiter/talent-pool",   label: "Talent Pool",   emoji: "\u{1F31F}", section: "PIPELINE" },
  { href: "/recruiter/interviews",    label: "Interviews",    emoji: "\u{1F3AF}", section: "PIPELINE" },
  { href: "/recruiter/placements",    label: "Placements",    emoji: "\u{1F4BC}", section: "PIPELINE" },
  { href: "/recruiter/messages",      label: "Messages",      emoji: "\u{1F4AC}", section: "PIPELINE" },
  { href: "/recruiter/notifications", label: "Notifications", emoji: "\u{1F514}", section: "PIPELINE" },
  { href: "/recruiter/reports",       label: "Reports",       emoji: "\u{1F4C8}", section: "ACCOUNT" },
  { href: "/recruiter/billing",       label: "Billing",       emoji: "\u{1F4B3}", section: "ACCOUNT" },
  { href: "/recruiter/profile",       label: "Profile",       emoji: "\u{1F3E2}", section: "ACCOUNT" },
  { href: "/recruiter/settings",      label: "Settings",      emoji: "\u2699",     section: "ACCOUNT" },
];

const SECTION_LABEL: Record<NavItem["section"], string> = {
  MAIN: "Main",
  PIPELINE: "Pipeline",
  ACCOUNT: "Account",
};

const ACCENT = "#FB923C";

interface Props {
  /** Mobile horizontal-tab variant. Desktop sidebar is rendered when this is falsy. */
  mobile?: boolean;
}

export function RecruiterNav({ mobile }: Props) {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  // Same persistence key as the intern Sidebar — recruiters and interns share
  // the "I prefer collapsed" preference, so switching contexts feels native.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cios-sidebar-collapsed");
      if (saved !== null) setSidebarCollapsed(saved === "true");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mobile) return <MobileTabs pathname={pathname} />;

  const sidebarWidth = collapsed ? 64 : 240;

  // Group items by section for the visual divider headers.
  const groups: { label: NavItem["section"]; items: NavItem[] }[] = [];
  for (const item of NAV) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.section) last.items.push(item);
    else groups.push({ label: item.section, items: [item] });
  }

  return (
    <aside
      data-portal-sidebar="recruiter"
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
      {/* Header — logo + brand, collapses to logo-only */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "16px 14px" : "16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <img src={LOGO_URL} alt="CIOS" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#F8FAFC", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
              CIOS <span style={{ color: ACCENT, fontWeight: 700 }}>· Recruiter</span>
            </div>
            <div style={{ fontSize: 10, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Africa-first hiring
            </div>
          </div>
        )}
      </div>

      {/* Public board shortcut — keep recruiters one click from the candidate
          experience so they can preview their listing as a buyer would. */}
      {!collapsed && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <Link
            href="/opportunities"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(251,146,60,0.08)",
              border: "1px solid rgba(251,146,60,0.25)",
              color: ACCENT,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <span>Public board</span>
            <span style={{ fontSize: 14 }}>↗</span>
          </Link>
        </div>
      )}

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: collapsed ? "8px 6px" : "8px 10px",
        }}
      >
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
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: collapsed ? "8px 0" : "8px 10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? ACCENT : "#CBD5E1",
                    background: active ? "rgba(251,146,60,0.10)" : "transparent",
                    borderLeft: active ? `3px solid ${ACCENT}` : "3px solid transparent",
                    textDecoration: "none",
                    transition: "background 0.15s ease, color 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(251,146,60,0.05)";
                      (e.currentTarget as HTMLElement).style.color = "#F8FAFC";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#CBD5E1";
                    }
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

      {/* Upgrade CTA + collapse toggle */}
      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
        {!collapsed && (
          <Link
            href="/recruiter/billing"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #FB923C, #F97316)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              textDecoration: "none",
              textAlign: "center",
              boxShadow: "0 10px 24px -10px rgba(251,146,60,0.6)",
            }}
          >
            ⚡ Upgrade plan
          </Link>
        )}
        <button
          onClick={() => toggleSidebar()}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 0",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "transparent",
            color: "#94A3B8",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <span style={{ fontSize: 14 }}>{collapsed ? "→" : "←"}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function MobileTabs({ pathname }: { pathname: string | null }) {
  return (
    <div
      className="recruiter-mobile-tabs"
      style={{
        display: "none",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
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
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
              textDecoration: "none",
              background: active ? "rgba(251,146,60,0.18)" : "rgba(255,255,255,0.04)",
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
