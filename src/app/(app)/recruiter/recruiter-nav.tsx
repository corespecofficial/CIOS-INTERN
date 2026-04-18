"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/recruiter",               label: "Hub",           emoji: "🏠", exact: true },
  { href: "/recruiter/dashboard",     label: "Dashboard",     emoji: "📊" },
  { href: "/recruiter/opportunities", label: "Opportunities", emoji: "💼" },
  { href: "/recruiter/talent-pool",   label: "Talent Pool",   emoji: "🌟" },
  { href: "/recruiter/interviews",    label: "Interviews",    emoji: "🎯" },
  { href: "/recruiter/messages",      label: "Messages",      emoji: "💬" },
  { href: "/recruiter/notifications", label: "Notifications", emoji: "🔔" },
  { href: "/recruiter/reports",       label: "Reports",       emoji: "📈" },
  { href: "/recruiter/profile",       label: "Profile",       emoji: "🏢" },
  { href: "/recruiter/settings",      label: "Settings",      emoji: "⚙️" },
];

export function RecruiterNav({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();

  // ── Mobile: horizontal scrollable tab strip ──────────────────────────────
  if (mobile) {
    return (
      <div
        className="recruiter-mobile-tabs"
        style={{
          display: "none", // shown via CSS media query
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          gap: 6,
          padding: "10px 16px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 16,
          marginLeft: -20, // bleed to edge (layout has 20px padding)
          marginRight: -20,
          paddingLeft: 16,
          paddingRight: 16,
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
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                flexShrink: 0,
                textDecoration: "none",
                background: active ? "rgba(30,136,229,0.18)" : "rgba(255,255,255,0.05)",
                color: active ? "#1E88E5" : "#8892A4",
                border: active ? "1px solid rgba(30,136,229,0.3)" : "1px solid transparent",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: 15 }}>{n.emoji}</span>
              {n.label}
            </Link>
          );
        })}
      </div>
    );
  }

  // ── Desktop: vertical sidebar ─────────────────────────────────────────────
  return (
    <aside style={{
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14,
      padding: 10,
      height: "fit-content",
      position: "sticky",
      top: 16,
    }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, padding: "6px 10px 10px 10px" }}>
        Recruiter Portal
      </div>
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} style={{
            display: "block",
            padding: "9px 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 2,
            background: active ? "rgba(30,136,229,0.15)" : "transparent",
            color: active ? "#1E88E5" : "#E8EDF5",
            textDecoration: "none",
          }}>
            {n.emoji} {n.label}
          </Link>
        );
      })}
    </aside>
  );
}
