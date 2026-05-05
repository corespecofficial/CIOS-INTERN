"use client";

/**
 * Host-portal sidebar. Per-org, mono-role (host-side) — no role filtering
 * needed, just a fixed list of host-only sections. Visual parity with the
 * main app sidebar: brand block at top (CIOS Platform · COSPRONOS x
 * CORESPEC), then the org context card, then nav items.
 */

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";

const LOGO_URL = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface Props {
  orgSlug: string;
  orgName: string;
  memberRole: "owner" | "org_admin" | "instructor" | "student" | null;
  isSuperAdmin: boolean;
}

const ITEMS: { href: string; label: string; icon: string }[] = [
  { href: "", label: "Dashboard", icon: "📊" },
  { href: "/members", label: "Members", icon: "👥" },
  { href: "/lessons", label: "Lessons", icon: "📚" },
  { href: "/assignments", label: "Assignments", icon: "📝" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/announcements", label: "Announcements", icon: "📣" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/files", label: "Files", icon: "📁" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function HostNav({ orgSlug, orgName, memberRole, isSuperAdmin }: Props) {
  const pathname = usePathname();
  const base = `/o/${orgSlug}`;

  return (
    <nav
      data-portal-sidebar
      style={{
        width: 240,
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        background: "#0F1626",
        borderRight: "1px solid #1F2937",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* CIOS Platform brand — matches the main app sidebar so the
          host portal doesn't feel like a different product. */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px",
          borderBottom: "1px solid #1F2937",
          textDecoration: "none",
        }}
      >
        <img
          src={LOGO_URL}
          alt="CIOS"
          width={36}
          height={36}
          style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, objectFit: "cover", aspectRatio: "1 / 1" }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", whiteSpace: "nowrap" }}>CIOS Platform</div>
          <div style={{ fontSize: 10, color: "#5A6478", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            COSPRONOS &times; CORESPEC
          </div>
        </div>
      </Link>

      {/* Org context card */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1F2937" }}>
        <Link href="/o" style={{ fontSize: 10, color: "#5A6478", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          ← All my orgs
        </Link>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginTop: 6, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={orgName}>
          {orgName}
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            padding: "2px 8px",
            borderRadius: 999,
            background: isSuperAdmin ? "rgba(239,83,80,0.10)" : "rgba(38,166,154,0.10)",
            color: isSuperAdmin ? "#EF5350" : "#26A69A",
            border: `1px solid ${isSuperAdmin ? "rgba(239,83,80,0.30)" : "rgba(38,166,154,0.30)"}`,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {isSuperAdmin ? "Super Admin · view-only" : (memberRole ?? "guest").replace("_", " ")}
        </div>
      </div>

      {/* Inner nav padding wrapper */}
      <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {ITEMS.map((it) => {
          const href = `${base}${it.href}`;
          const active = it.href === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={it.href}>
              <Link
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  color: active ? "#E8EDF5" : "#8892A4",
                  background: active ? "#1E2937" : "transparent",
                  textDecoration: "none",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      </div>
      <div style={{ padding: "12px", borderTop: "1px solid #1F2937", fontSize: 11, color: "#5A6478" }}>
        <Link href="/dashboard" style={{ color: "#5A6478", textDecoration: "none" }}>
          ↩ Back to CIOS
        </Link>
      </div>
    </nav>
  );
}
