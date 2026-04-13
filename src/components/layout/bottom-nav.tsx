"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "Home", href: "/dashboard", icon: "🏠" },
  { label: "Learn", href: "/courses", icon: "📚" },
  { label: "Chats", href: "/messages", icon: "💬" },
  { label: "Tasks", href: "/tasks", icon: "✅" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav-mobile" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 800,
      height: 64, background: "rgba(17,24,39,0.97)", backdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex",
      alignItems: "center", justifyContent: "space-around", padding: "0 8px",
    }}>
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "8px 12px", borderRadius: 12, textDecoration: "none",
            color: active ? "#1E88E5" : "#5A6478", fontSize: 10, fontWeight: 700,
            transition: "color 0.2s", minWidth: 56,
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("cios:open-palette"))}
        aria-label="Open navigation menu"
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          padding: "8px 12px", borderRadius: 12, background: "transparent", border: "none",
          color: "#5A6478", fontSize: 10, fontWeight: 700, cursor: "pointer", minWidth: 56,
        }}
      >
        <span style={{ fontSize: 20 }}>⋯</span>
        <span>More</span>
      </button>
    </nav>
  );
}
