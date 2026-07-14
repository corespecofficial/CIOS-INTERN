"use client";

/**
 * Per-organization host sidebar. It mirrors the main CIOS app chrome, but
 * keeps links scoped to /o/[orgSlug] so one tenant never leaks into another.
 */

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const LOGO_URL = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface Props {
  orgSlug: string;
  orgName: string;
  memberRole: "owner" | "org_admin" | "instructor" | "student" | "moderator" | "finance" | "support" | "mentor" | null;
  isSuperAdmin: boolean;
}

type HostRole = NonNullable<Props["memberRole"]>;
type NavItem = {
  href: string;
  label: string;
  icon: string;
  section: string;
  roles?: HostRole[];
  platform?: boolean;
  student?: boolean;
  activeOn?: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  org_admin: "Org admin",
  instructor: "Instructor",
  student: "Intern",
  moderator: "Moderator",
  finance: "Finance",
  support: "Support",
  mentor: "Mentor",
};

const PREVIEW_OPTIONS: Array<{ value: string; label: string; path: (orgSlug: string) => string }> = [
  { value: "org_staff", label: "Org Admin / Staff", path: (slug) => `/o/${slug}` },
  { value: "org_intern", label: "Org Intern", path: (slug) => `/s/${slug}` },
  { value: "org_instructor", label: "Org Instructor", path: (slug) => `/o/${slug}/instructor` },
  { value: "org_moderator", label: "Org Moderator", path: (slug) => `/o/${slug}/chat#moderation` },
  { value: "org_finance", label: "Org Finance", path: (slug) => `/o/${slug}/admin/finance` },
  { value: "org_support", label: "Org Support", path: (slug) => `/o/${slug}/admin/message-control` },
  { value: "org_audit", label: "Org Audit", path: (slug) => `/o/${slug}/admin/audit-logs` },
];

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Dashboard", icon: "📊", section: "MAIN" },
  { href: "/members", label: "Interns & staff", icon: "👥", section: "MAIN", roles: ["owner", "org_admin", "support"] },
  { href: "/announcements", label: "Announcements", icon: "📣", section: "MAIN", roles: ["owner", "org_admin", "instructor", "moderator", "support", "mentor"] },
  { href: "/settings", label: "Settings", icon: "⚙️", section: "MAIN", roles: ["owner", "org_admin"] },

  { href: "", label: "Intern Dashboard", icon: "🏠", section: "INTERN PORTAL", student: true },
  { href: "/classroom", label: "Classroom", icon: "📚", section: "INTERN PORTAL", student: true },
  { href: "/courses", label: "Courses", icon: "🎓", section: "INTERN PORTAL", student: true },
  { href: "/tasks", label: "Tasks", icon: "✅", section: "INTERN PORTAL", student: true },
  { href: "/wallet", label: "Wallet", icon: "💰", section: "INTERN PORTAL", student: true },
  { href: "/rewards-hub", label: "Rewards Hub", icon: "🏆", section: "INTERN PORTAL", student: true },
  { href: "/notes", label: "Notes", icon: "📝", section: "INTERN PORTAL", student: true },
  { href: "/performance", label: "Performance", icon: "📈", section: "INTERN PORTAL", student: true },
  { href: "/chat", label: "Messages", icon: "💬", section: "INTERN PORTAL", student: true },
  { href: "/members", label: "Community", icon: "🌐", section: "INTERN PORTAL", student: true },

  { href: "/lessons", label: "Lessons", icon: "📚", section: "LEARNING", roles: ["owner", "org_admin", "instructor", "mentor"] },
  { href: "/assignments", label: "Assignments", icon: "📝", section: "LEARNING", roles: ["owner", "org_admin", "instructor", "mentor"] },
  { href: "/assignments#submissions", activeOn: "/assignments", label: "Submissions", icon: "📥", section: "LEARNING", roles: ["owner", "org_admin", "instructor"] },
  { href: "/analytics", label: "Analytics", icon: "📈", section: "LEARNING", roles: ["owner", "org_admin", "instructor", "finance", "mentor"] },
  { href: "/analytics#reports", activeOn: "/analytics", label: "Reports", icon: "📋", section: "LEARNING", roles: ["owner", "org_admin", "finance"] },

  { href: "/chat", label: "Chat", icon: "💬", section: "SOCIAL", roles: ["owner", "org_admin", "instructor", "moderator", "support", "mentor"] },
  { href: "/files", label: "Files", icon: "📁", section: "SOCIAL", roles: ["owner", "org_admin", "instructor", "moderator", "finance", "support", "mentor"] },
  { href: "/files#storage", activeOn: "/files", label: "Storage", icon: "🗂️", section: "SOCIAL", roles: ["owner", "org_admin", "support"] },

  { href: "/analytics#finance", activeOn: "/analytics", label: "Finance", icon: "💰", section: "OPERATIONS", roles: ["owner", "org_admin", "finance"] },
  { href: "/members#support", activeOn: "/members", label: "Support desk", icon: "🎫", section: "OPERATIONS", roles: ["owner", "org_admin", "support"] },
  { href: "/chat#moderation", activeOn: "/chat", label: "Moderation", icon: "🛡️", section: "OPERATIONS", roles: ["owner", "org_admin", "moderator"] },
  { href: "/audit#compliance", activeOn: "/audit", label: "Compliance", icon: "✅", section: "OPERATIONS", roles: ["owner", "org_admin", "moderator", "support"] },
  { href: "/audit", label: "Audit logs", icon: "📜", section: "OPERATIONS", roles: ["owner", "org_admin"] },

  { href: "/settings#invites", activeOn: "/settings", label: "Invite codes", icon: "🔐", section: "SETUP", roles: ["owner", "org_admin", "support"] },
  { href: "/settings#modules", activeOn: "/settings", label: "Module control", icon: "🧩", section: "SETUP", roles: ["owner", "org_admin"] },
  { href: "/creative-space/manage", label: "Public listing", icon: "🏫", section: "SETUP", platform: true, roles: ["owner", "org_admin", "instructor"] },
  { href: "/dashboard", label: "Back to CIOS", icon: "↩", section: "SETUP", platform: true },
];

const ORG_PARITY_ITEMS: NavItem[] = [
  { href: "/admin", label: "Admin Panel", icon: "🛡️", section: "ADMIN", roles: ["owner", "org_admin"] },
  { href: "/admin/hackathons", label: "Hackathons", icon: "🏆", section: "ADMIN", roles: ["owner", "org_admin"] },
  { href: "/admin/engagement", label: "Engagement controls", icon: "🎯", section: "ADMIN", roles: ["owner", "org_admin", "moderator"] },
  { href: "/admin/note-templates", label: "Note templates", icon: "📑", section: "ADMIN", roles: ["owner", "org_admin"] },
  { href: "/admin/creative-spaces", label: "Organization Spaces", icon: "🏫", section: "ADMIN", roles: ["owner", "org_admin"] },
  { href: "/admin/wellness", label: "Wellness", icon: "💚", section: "ADMIN", roles: ["owner", "org_admin", "support"] },
  { href: "/admin/compliance", label: "Compliance Engine", icon: "🛡️", section: "ADMIN", roles: ["owner", "org_admin", "moderator"] },
  { href: "/admin/appeals", label: "Appeals Panel", icon: "📋", section: "ADMIN", roles: ["owner", "org_admin", "support"] },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "💸", section: "ADMIN", roles: ["owner", "org_admin", "finance"] },
  { href: "/admin/finance", label: "Finance", icon: "💰", section: "ADMIN", roles: ["owner", "org_admin", "finance"] },
  { href: "/admin/users", label: "Manage Users", icon: "👥", section: "ADMIN", roles: ["owner", "org_admin", "support"] },
  { href: "/admin/mentors", label: "Mentors", icon: "🧑‍🏫", section: "ADMIN", roles: ["owner", "org_admin", "mentor"] },
  { href: "/admin/alumni", label: "Alumni", icon: "🎓", section: "ADMIN", roles: ["owner", "org_admin"] },
  { href: "/admin/company-docs", label: "Company Library", icon: "📚", section: "ADMIN", roles: ["owner", "org_admin", "instructor", "support", "mentor"] },
  { href: "/admin/projects", label: "Manage Projects", icon: "📋", section: "ADMIN", roles: ["owner", "org_admin", "moderator", "instructor"] },

  { href: "/instructor", label: "Instructor Portal", icon: "🎓", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor"] },
  { href: "/instructor/create-course", label: "Create Course", icon: "➕", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor"] },
  { href: "/instructor/students", label: "Students", icon: "👥", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor"] },
  { href: "/instructor/submissions", label: "Submissions", icon: "📥", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor"] },
  { href: "/instructor/schedule-class", label: "Schedule Class", icon: "📅", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor"] },
  { href: "/instructor/quizzes", label: "Quizzes", icon: "❓", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor"] },
  { href: "/instructor/certificates", label: "Certificates", icon: "🏆", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor"] },
  { href: "/instructor/earnings", label: "Earnings", icon: "💰", section: "INSTRUCTOR", roles: ["owner", "org_admin", "instructor", "finance"] },

  { href: "/admin/contact-allocation", label: "Contact Allocation", icon: "🔗", section: "PLATFORM OPS", roles: ["owner", "org_admin", "support"] },
  { href: "/admin/message-control", label: "Message Control", icon: "🔒", section: "PLATFORM OPS", roles: ["owner", "org_admin", "moderator", "support"] },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "📜", section: "PLATFORM OPS", roles: ["owner", "org_admin"] },
  { href: "/admin/security-center", label: "Security Center", icon: "🚨", section: "PLATFORM OPS", roles: ["owner", "org_admin", "moderator"] },
  { href: "/admin/activity-monitor", label: "Activity Monitor", icon: "📈", section: "PLATFORM OPS", roles: ["owner", "org_admin", "moderator", "support"] },
  { href: "/admin/compliance-reports", label: "Compliance", icon: "📤", section: "PLATFORM OPS", roles: ["owner", "org_admin", "moderator"] },
  { href: "/admin/observability", label: "Observability", icon: "🩺", section: "PLATFORM OPS", roles: ["owner", "org_admin"] },
];

function canSeeItem(item: NavItem, role: HostRole | null, isSuperAdmin: boolean) {
  if (isSuperAdmin) return true;
  if (!item.roles) return true;
  return Boolean(role && item.roles.includes(role));
}

function initials(name: string | null | undefined) {
  const parts = (name || "CIOS").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
}

export function HostNav({ orgSlug, orgName, memberRole, isSuperAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const base = `/o/${orgSlug}`;

  useEffect(() => {
    let timeout: number | null = null;
    try {
      const saved = window.localStorage.getItem("cios-org-sidebar-collapsed");
      if (saved !== null) {
        timeout = window.setTimeout(() => setCollapsed(saved === "true"), 0);
      }
    } catch {}
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const width = collapsed ? "64px" : "240px";
    document.documentElement.style.setProperty("--org-sidebar-width", width);
    try {
      window.localStorage.setItem("cios-org-sidebar-collapsed", String(collapsed));
    } catch {}
  }, [collapsed]);

  const sections = useMemo(() => {
    const visible = [...NAV_ITEMS, ...ORG_PARITY_ITEMS].filter((item) => canSeeItem(item, memberRole, isSuperAdmin));
    const grouped: Array<{ label: string; items: NavItem[] }> = [];
    const byLabel = new Map<string, { label: string; items: NavItem[] }>();
    for (const item of visible) {
      let section = byLabel.get(item.section);
      if (!section) {
        section = { label: item.section, items: [] };
        byLabel.set(item.section, section);
        grouped.push(section);
      }
      section.items.push(item);
    }
    return grouped;
  }, [memberRole, isSuperAdmin]);

  const roleLabel = isSuperAdmin ? "Super admin - view-only" : ROLE_LABELS[memberRole ?? ""] ?? "Guest";
  const personName = user?.fullName || user?.username || "CIOS User";

  function switchPreview(value: string) {
    const option = PREVIEW_OPTIONS.find((entry) => entry.value === value);
    if (option) router.push(option.path(orgSlug));
  }

  return (
    <aside
      data-portal-sidebar
      style={{
        width: "var(--org-sidebar-width, 240px)",
        minWidth: "var(--org-sidebar-width, 240px)",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        background: "var(--bg-primary, #0A0E1A)",
        borderRight: "1px solid var(--border-default, #1F2937)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.2s ease, min-width 0.2s ease",
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
          padding: collapsed ? "16px 12px" : "16px",
          borderBottom: "1px solid var(--border-default, #1F2937)",
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
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary, #E8EDF5)", whiteSpace: "nowrap" }}>
              CIOS Platform
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted, #5A6478)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              COSPRONOS &times; CORESPEC
            </div>
          </div>
        )}
      </Link>

      {!collapsed && (
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default, #1F2937)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted, #5A6478)", marginBottom: 8 }}>
            Organization Portal
          </div>
          <Link href="/o" style={{ fontSize: 11, color: "var(--text-tertiary, #8892A4)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            &larr; All my orgs
          </Link>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary, #E8EDF5)",
              marginTop: 8,
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={orgName}
          >
            {orgName}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 8,
              padding: "4px 10px",
              borderRadius: 999,
              background: isSuperAdmin ? "rgba(239,83,80,0.10)" : "rgba(30,136,229,0.10)",
              color: isSuperAdmin ? "#EF5350" : "#1E88E5",
              border: `1px solid ${isSuperAdmin ? "rgba(239,83,80,0.30)" : "rgba(30,136,229,0.30)"}`,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            {roleLabel}
          </div>
          {isSuperAdmin && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted, #5A6478)", marginBottom: 6 }}>
                Preview Portal
              </div>
              <select
                value="org_staff"
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
                  fontWeight: 800,
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
            </div>
          )}
        </div>
      )}

      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: collapsed ? "10px 8px" : "10px 12px",
        }}
      >
        {sections.map((section) => (
          <div key={section.label} style={{ marginBottom: 10 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted, #5A6478)",
                  padding: "10px 10px 5px",
                }}
              >
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const href = item.student ? `/s/${orgSlug}${item.href}` : item.platform ? item.href : `${base}${item.href}`;
              const activePath = item.student
                ? `/s/${orgSlug}${item.activeOn ?? item.href}`
                : item.platform
                ? item.href
                : `${base}${item.activeOn ?? item.href}`;
              const isAnchorVariant = item.href.includes("#");
              const active = !isAnchorVariant && (item.href === ""
                ? pathname === base
                : pathname === activePath || pathname.startsWith(`${activePath}/`));
              return (
                <Link
                  key={`${item.section}-${item.label}`}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: 10,
                    minHeight: 44,
                    padding: collapsed ? "8px 0" : "9px 12px",
                    borderRadius: 9,
                    borderLeft: active ? "3px solid #1E88E5" : "3px solid transparent",
                    background: active ? "rgba(30,136,229,0.10)" : "transparent",
                    color: active ? "#1E88E5" : "var(--text-secondary, #A9B4C7)",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: active ? 800 : 600,
                    transition: "background 0.15s ease, color 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1, width: 24, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border-default, #1F2937)" }}>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          style={{
            width: "100%",
            minHeight: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 9,
            border: "1px solid var(--border-default, #1F2937)",
            background: "transparent",
            color: "var(--text-secondary, #A9B4C7)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <span>{collapsed ? "▶" : "◀"}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <div
        style={{
          padding: collapsed ? "12px 10px" : "12px 16px",
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
            width={36}
            height={36}
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(30,136,229,0.35)" }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1E88E5, #AB47BC)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {initials(personName)}
          </div>
        )}
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--text-primary, #E8EDF5)", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {personName}
            </div>
            <div style={{ color: "var(--text-secondary, #A9B4C7)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {roleLabel}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
