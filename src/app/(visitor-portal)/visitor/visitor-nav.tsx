"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/use-app-store";

const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface NavItem {
  emoji: string;
  label: string;
  href: string;
  section: string;
}

const ITEMS: NavItem[] = [
  { emoji: "🏠", label: "Overview",        href: "",              section: "MAIN" },
  { emoji: "🔍", label: "Explore",         href: "/explore",      section: "MAIN" },
  { emoji: "📨", label: "My applications", href: "/applications", section: "MAIN" },
  { emoji: "👤", label: "Profile",         href: "/profile",      section: "MAIN" },
  { emoji: "🔔", label: "Notifications",   href: "/notifications", section: "MAIN" },
  { emoji: "⚙️", label: "Settings",        href: "/settings",     section: "MAIN" },
  { emoji: "🛒", label: "Marketplace",     href: "/marketplace",  section: "DISCOVER" },
  { emoji: "🏫", label: "Creative spaces", href: "/creative-space", section: "DISCOVER" },
  { emoji: "💼", label: "Opportunities",   href: "/opportunities", section: "DISCOVER" },
  { emoji: "🏆", label: "Hackathons",      href: "/hackathons",   section: "DISCOVER" },
  { emoji: "🎓", label: "Mentorship",      href: "/mentorship",   section: "DISCOVER" },
  { emoji: "🚀", label: "Startups",        href: "/startups",     section: "DISCOVER" },
];

export function VisitorNav({ name }: { name: string }) {
  const pathname = usePathname() || "";
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const [hydrated, setHydrated] = useState(false);

  // Restore collapsed state from localStorage on first mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cios-sidebar-collapsed");
      if (saved !== null) setSidebarCollapsed(saved === "true");
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next = !collapsed;
    setSidebarCollapsed(next);
    try { localStorage.setItem("cios-sidebar-collapsed", String(next)); } catch {}
  }

  const sidebarWidth = collapsed ? 64 : 240;
  const base = "/visitor";
  const isActive = (href: string) => {
    const full = `${base}${href}`;
    return href === "" ? pathname === base : pathname === full || pathname.startsWith(`${full}/`);
  };

  // Group items by section.
  const sections: { label: string; items: NavItem[] }[] = [];
  let last = "";
  for (const it of ITEMS) {
    if (it.section !== last) { sections.push({ label: it.section, items: [] }); last = it.section; }
    sections[sections.length - 1].items.push(it);
  }

  return (
    <aside
      data-tour="visitor-sidebar"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary, #0F1626)",
        borderRight: "1px solid var(--border-default, #1F2937)",
        transition: hydrated ? "width 0.2s ease" : "none",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      {/* Brand header — mirrors the (app) sidebar look */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "16px 14px" : "16px", borderBottom: "1px solid var(--border-default, #1F2937)" }}>
        <img src={LOGO_URL} alt="CIOS" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} />
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #E8EDF5)", whiteSpace: "nowrap" }}>CIOS Platform</div>
            <div style={{ fontSize: 10, color: "var(--text-muted, #5A6478)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              COSPRONOS &times; CORESPEC
            </div>
          </div>
        )}
      </div>

      {/* YOUR ROLE pill */}
      {!collapsed && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-default, #1F2937)" }}>
          <div style={{ fontSize: 9, color: "var(--text-muted, #5A6478)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, fontWeight: 700 }}>
            Your role
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(30,136,229,0.10)", border: "1px solid rgba(30,136,229,0.30)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#26A69A", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#1E88E5", fontWeight: 700 }}>Public User</span>
          </div>
        </div>
      )}

      {/* Nav sections */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }} aria-label="Visitor navigation">
        {sections.map((section) => (
          <div key={section.label} style={{ marginBottom: 14 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, color: "var(--text-muted, #5A6478)", textTransform: "uppercase", letterSpacing: 0.6, padding: "0 10px 6px", fontWeight: 700 }}>
                {section.label}
              </div>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((it) => {
                const active = isActive(it.href);
                const full = `${base}${it.href}`;
                return (
                  <li key={it.href || "_root"}>
                    <Link
                      href={full}
                      title={collapsed ? it.label : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: collapsed ? "10px 12px" : "10px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        textDecoration: "none",
                        color: active ? "var(--text-primary, #E8EDF5)" : "var(--text-muted, #8892A4)",
                        background: active ? "rgba(255,255,255,0.06)" : "transparent",
                        fontWeight: active ? 700 : 500,
                        justifyContent: collapsed ? "center" : "flex-start",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1, width: 18, textAlign: "center" }}>{it.emoji}</span>
                      {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: switch intent + collapse */}
      <div style={{ padding: 10, borderTop: "1px solid var(--border-default, #1F2937)", display: "flex", flexDirection: "column", gap: 6 }}>
        {!collapsed && (
          <Link href="/onboarding/intent" style={{ fontSize: 11, color: "var(--text-muted, #5A6478)", textDecoration: "none", padding: "6px 8px", display: "block" }}>
            ↻ Switch intent
          </Link>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 10px",
            background: "transparent",
            border: "1px solid var(--border-default, #1F2937)",
            borderRadius: 8,
            color: "var(--text-muted, #8892A4)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span>{collapsed ? "▶" : "◀"}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
        {!collapsed && (
          <div style={{ fontSize: 10, color: "var(--text-muted, #5A6478)", textAlign: "center", marginTop: 2 }} title={name}>
            {name}
          </div>
        )}
      </div>
    </aside>
  );
}
