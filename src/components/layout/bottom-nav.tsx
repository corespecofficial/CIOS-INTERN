"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser, roleCanAccess } from "@/lib/use-current-user";

// Inner pages (2+ path segments) don't need the bottom nav —
// they show a back arrow in the header instead.

const ITEMS = [
  { label: "Home", href: "/dashboard", icon: "🏠" },
  { label: "Projects", href: "/projects", icon: "📁" },
  { label: "Chats", href: "/messages", icon: "💬" },
  { label: "Tasks", href: "/tasks", icon: "✅" },
];

export function BottomNav() {
  const pathname = usePathname();
  const me = useCurrentUser();
  const isInnerPage = (pathname ?? "").split("/").filter(Boolean).length >= 2;
  if (isInnerPage) return null;
  // useCurrentUser() returns role="intern" until Clerk hydrates. If we
  // render the link list during that window, Next.js prefetches /dashboard
  // etc.; by the time Clerk reports the real role (e.g. public_user) the
  // prefetch has already triggered middleware → denied → bounce loop.
  if (!me.isLoaded) return null;
  // Filter to items the role can actually reach.
  const visible = ITEMS.filter((it) => roleCanAccess(me.role, it.href));
  if (visible.length === 0) return null;

  return (
    <nav className="bottom-nav-mobile" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 800,
      height: 64, background: "var(--bg-secondary)", backdropFilter: "blur(16px)",
      borderTop: "1px solid var(--border-default)", display: "flex",
      alignItems: "center", justifyContent: "space-around", padding: "0 8px",
    }}>
      {visible.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "8px 12px", borderRadius: 12, textDecoration: "none",
            color: active ? "var(--accent-blue, #1E88E5)" : "var(--text-muted)", fontSize: 10, fontWeight: 700,
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
          color: "var(--text-muted)", fontSize: 10, fontWeight: 700, cursor: "pointer", minWidth: 56,
        }}
      >
        <span style={{ fontSize: 20 }}>⋯</span>
        <span>More</span>
      </button>
    </nav>
  );
}
