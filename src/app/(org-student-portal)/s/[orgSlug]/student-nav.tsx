"use client";

/**
 * Organization intern sidebar. This intentionally mirrors the main intern
 * portal chrome, while keeping learning links scoped to /s/[orgSlug].
 */

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface Props {
  orgSlug: string;
  orgName: string;
  operationsEnabled: boolean;
  performanceEnabled: boolean;
  growthEnabled: boolean;
}

type NavItem = {
  href: string;
  label: string;
  icon: string;
  section: string;
  platform?: boolean;
  activePrefixes?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Dashboard", icon: "🏠", section: "MAIN" },
  { href: "/profile", label: "Profile", icon: "👤", section: "MAIN", platform: true },
  { href: "/notifications", label: "Notifications", icon: "🔔", section: "MAIN", platform: true },
  { href: "/settings", label: "Settings", icon: "⚙️", section: "MAIN", platform: true },

  { href: "/classroom", label: "Classroom", icon: "📚", section: "LEARNING" },
  { href: "/courses", label: "Courses", icon: "🎓", section: "LEARNING", activePrefixes: ["/courses", "/lessons"] },
  { href: "/tasks", label: "Tasks", icon: "✅", section: "LEARNING", activePrefixes: ["/tasks", "/assignments"] },

  { href: "/chat", label: "Messages", icon: "💬", section: "SOCIAL" },
  { href: "/members", label: "Community", icon: "🌐", section: "SOCIAL" },

  { href: "/wallet", label: "Wallet", icon: "💰", section: "PROGRESS" },
  { href: "/rewards-hub", label: "Rewards Hub", icon: "🏆", section: "PROGRESS" },
  { href: "/notes", label: "Notes", icon: "📝", section: "PROGRESS" },
  { href: "/performance", label: "Performance", icon: "📈", section: "PROGRESS" },

  { href: "/announcements", label: "Announcements", icon: "📣", section: "ORG SPACE" },
  { href: "/files", label: "Files", icon: "📁", section: "ORG SPACE" },
  { href: "/s", label: "All my orgs", icon: "🏫", section: "ORG SPACE", platform: true },
];

const PREVIEW_OPTIONS: Array<{ value: string; label: string; path: (orgSlug: string) => string }> = [
  { value: "org_intern", label: "Org Intern", path: (slug) => `/s/${slug}` },
  { value: "org_staff", label: "Org Admin / Staff", path: (slug) => `/o/${slug}` },
  { value: "org_instructor", label: "Org Instructor", path: (slug) => `/o/${slug}/instructor` },
  { value: "org_moderator", label: "Org Moderator", path: (slug) => `/o/${slug}/chat#moderation` },
  { value: "org_finance", label: "Org Finance", path: (slug) => `/o/${slug}/admin/finance` },
  { value: "org_support", label: "Org Support", path: (slug) => `/o/${slug}/admin/message-control` },
  { value: "org_audit", label: "Org Audit", path: (slug) => `/o/${slug}/admin/audit-logs` },
];

function initials(name: string | null | undefined) {
  const parts = (name || "Intern").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "I";
}

export function StudentNav({ orgSlug, orgName, operationsEnabled, performanceEnabled, growthEnabled }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const base = `/s/${orgSlug}`;
  const isSuperAdmin = user?.publicMetadata?.role === "super_admin";

  useEffect(() => {
    let timeout: number | null = null;
    try {
      const saved = window.localStorage.getItem("cios-student-org-sidebar-collapsed");
      if (saved !== null) timeout = window.setTimeout(() => setCollapsed(saved === "true"), 0);
    } catch {}
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const width = collapsed ? "64px" : "240px";
    document.documentElement.style.setProperty("--student-sidebar-width", width);
    try {
      window.localStorage.setItem("cios-student-org-sidebar-collapsed", String(collapsed));
    } catch {}
  }, [collapsed]);

  const sections: Array<{ label: string; items: NavItem[] }> = [];
  const byLabel = new Map<string, { label: string; items: NavItem[] }>();
  const baseItems = NAV_ITEMS.filter((item) => item.href !== "/performance" || performanceEnabled);
  const items: NavItem[] = operationsEnabled ? [
    ...baseItems.slice(0, 4),
    { href: "/my-day", label: "My Day", icon: "📅", section: "OPERATIONS" },
    { href: "/attendance", label: "Attendance", icon: "✅", section: "OPERATIONS" },
    { href: "/work-sessions", label: "Work Sessions", icon: "⏱", section: "OPERATIONS" },
    { href: "/growth", label: "Growth Workspace", icon: "📈", section: "OPERATIONS" },
    ...baseItems.slice(4),
  ].filter((item) => item.href !== "/growth" || growthEnabled) : baseItems;
  for (const item of items) {
    let section = byLabel.get(item.section);
    if (!section) {
      section = { label: item.section, items: [] };
      byLabel.set(item.section, section);
      sections.push(section);
    }
    section.items.push(item);
  }

  const personName = user?.fullName || user?.username || "Intern User";

  function switchPreview(value: string) {
    const option = PREVIEW_OPTIONS.find((entry) => entry.value === value);
    if (option) router.push(option.path(orgSlug));
  }

  return (
    <aside
      data-portal-sidebar
      style={{
        width: "var(--student-sidebar-width, 240px)",
        minWidth: "var(--student-sidebar-width, 240px)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary, #0A0E1A)",
        borderRight: "1px solid var(--border-default, #1F2937)",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      <Link
        href="/dashboard"
        title="CIOS Platform"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          padding: collapsed ? "16px 14px" : "16px",
          borderBottom: "1px solid var(--border-default, #1F2937)",
          textDecoration: "none",
        }}
      >
        <img
          src={LOGO_URL}
          alt="CIOS"
          style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
        />
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #E8EDF5)", whiteSpace: "nowrap" }}>
              CIOS Platform
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted, #5A6478)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              COSPRONOS &times; CORESPEC
            </div>
          </div>
        )}
      </Link>

      {!collapsed && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-default, #1F2937)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted, #5A6478)", marginBottom: 6 }}>
            Preview Portal
          </div>
          {isSuperAdmin && (
            <select
              value="org_intern"
              onChange={(e) => switchPreview(e.currentTarget.value)}
              title="Super Admin: switch portal preview"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(171,71,188,0.3)",
                background: "rgba(171,71,188,0.08)",
                color: "#AB47BC",
                fontSize: 12,
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {PREVIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} style={{ background: "#111827", color: "#E8EDF5" }}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {!isSuperAdmin && (
          <div
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(171,71,188,0.3)",
              background: "rgba(171,71,188,0.08)",
              color: "#AB47BC",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Intern</span>
            <span aria-hidden>⌄</span>
          </div>
          )}
          <div
            title={orgName}
            style={{
              marginTop: 10,
              color: "var(--text-muted, #5A6478)",
              fontSize: 11,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {orgName}
          </div>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "8px 6px" : "8px 10px" }}>
        {sections.map((section) => (
          <div key={section.label} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted, #5A6478)",
                  padding: "8px 10px 4px",
                }}
              >
                <span>{section.label}</span>
                <span aria-hidden style={{ fontSize: 10 }}>▾</span>
              </div>
            )}
            {section.items.map((item) => {
              const href = item.platform ? item.href : `${base}${item.href}`;
              const activePrefixes = item.activePrefixes ?? [item.href];
              const active = item.platform
                ? pathname === item.href || (item.href !== "/s" && pathname.startsWith(`${item.href}/`))
                : activePrefixes.some((prefix) => {
                    const scoped = `${base}${prefix}`;
                    return prefix === "" ? pathname === base : pathname === scoped || pathname.startsWith(`${scoped}/`);
                  });

              return (
                <Link
                  key={`${item.section}-${item.href}`}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: collapsed ? "8px 0" : "8px 10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--accent-blue, #1E88E5)" : "var(--text-secondary, #A9B4C7)",
                    background: active ? "rgba(30,136,229,0.08)" : "transparent",
                    borderLeft: active ? "3px solid #1E88E5" : "3px solid transparent",
                    transition: "background 0.15s, color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border-default, #1F2937)" }}>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 0",
            borderRadius: 8,
            border: "1px solid var(--border-default, #1F2937)",
            background: "transparent",
            color: "var(--text-secondary, #A9B4C7)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>{collapsed ? "▶" : "◀"}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <div
        style={{
          padding: collapsed ? "12px 8px" : "12px 16px",
          borderTop: "1px solid var(--border-default, #1F2937)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
        }}
      >
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt=""
            style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, objectFit: "cover", border: "2px solid rgba(30,136,229,0.3)" }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              flexShrink: 0,
              background: "linear-gradient(135deg, #1E88E5, #AB47BC)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {initials(personName)}
          </div>
        )}
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #E8EDF5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {personName}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary, #A9B4C7)", whiteSpace: "nowrap" }}>
              Intern
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
