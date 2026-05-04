"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; icon: string }[] = [
  { href: "", label: "Overview", icon: "🏠" },
  { href: "/lessons", label: "Lessons", icon: "📚" },
  { href: "/assignments", label: "Assignments", icon: "📝" },
  { href: "/announcements", label: "Announcements", icon: "📣" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/files", label: "Files", icon: "📁" },
  { href: "/members", label: "Classmates", icon: "👥" },
];

interface Props { orgSlug: string; orgName: string; }

export function StudentNav({ orgSlug, orgName }: Props) {
  const pathname = usePathname();
  const base = `/s/${orgSlug}`;
  return (
    <nav style={{ width: 240, position: "fixed", top: 0, left: 0, bottom: 0, background: "#0F1626", borderRight: "1px solid #1F2937", display: "flex", flexDirection: "column", padding: "20px 12px" }}>
      <div style={{ padding: "0 12px 16px", borderBottom: "1px solid #1F2937", marginBottom: 12 }}>
        <Link href="/s" style={{ fontSize: 11, color: "#5A6478", textDecoration: "none", display: "block" }}>
          ← All my spaces
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", marginTop: 6, lineHeight: 1.2 }}>{orgName}</div>
        <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Student</div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {ITEMS.map((it) => {
          const href = `${base}${it.href}`;
          const active = it.href === "" ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={it.href}>
              <Link
                href={href}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, fontSize: 13, color: active ? "#E8EDF5" : "#8892A4", background: active ? "#1E2937" : "transparent", textDecoration: "none", fontWeight: active ? 700 : 500 }}
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid #1F2937", fontSize: 11, color: "#5A6478" }}>
        <Link href="/dashboard" style={{ color: "#5A6478", textDecoration: "none" }}>↩ Back to CIOS</Link>
      </div>
    </nav>
  );
}
