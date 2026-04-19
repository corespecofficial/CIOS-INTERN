"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore, getRoleLabel, type Role } from "@/store/use-app-store";
import { useCurrentUser } from "@/lib/use-current-user";
import { getSidebarBadges, type SidebarBadges } from "@/app/actions/sidebar-badges";

const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const ROLES: Role[] = [
  "intern",
  "team_lead",
  "admin",
  "super_admin",
  "instructor",
  "moderator",
  "finance",
  "support",
  "recruiter",
  "mentor",
  "alumni",
];

interface NavItem {
  emoji: string;
  label: string;
  href: string;
  section: string;
  dataRole: string[];
}

const NAV_ITEMS: NavItem[] = [
  // MAIN
  { emoji: "\u{1F3E0}", label: "Dashboard", href: "/dashboard", section: "MAIN", dataRole: ["all"] },
  { emoji: "\u{1F464}", label: "Profile", href: "/profile", section: "MAIN", dataRole: ["all"] },
  { emoji: "\u{1F514}", label: "Notifications", href: "/notifications", section: "MAIN", dataRole: ["all"] },
  { emoji: "\u2699", label: "Settings", href: "/settings", section: "MAIN", dataRole: ["all"] },
  // LEARNING
  { emoji: "\u{1F4DA}", label: "Classroom", href: "/classroom", section: "LEARNING", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F393}", label: "Courses", href: "/courses", section: "LEARNING", dataRole: ["intern", "team_lead"] },
  { emoji: "\u2705", label: "Tasks", href: "/tasks", section: "LEARNING", dataRole: ["intern", "team_lead"] },
  // SOCIAL
  { emoji: "\u{1F4AC}", label: "Messages", href: "/messages", section: "SOCIAL", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F310}", label: "Community", href: "/community", section: "SOCIAL", dataRole: ["intern", "team_lead"] },
  // PROGRESS
  { emoji: "\u{1F4B0}", label: "Wallet", href: "/wallet", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F3C6}", label: "Rewards Hub", href: "/gamification", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F3C5}", label: "Leaderboard", href: "/leaderboard", section: "PROGRESS", dataRole: ["intern", "team_lead", "instructor", "admin", "super_admin"] },
  { emoji: "\u{1F396}", label: "Badges", href: "/badges", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{2B50}", label: "Achievements", href: "/achievements", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F3AF}", label: "Missions", href: "/missions", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F525}", label: "Streaks", href: "/streaks", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F4E1}", label: "Live classes", href: "/live", section: "PROGRESS", dataRole: ["intern", "team_lead", "instructor", "admin", "super_admin"] },
  { emoji: "\u{1F3F3}", label: "Team challenges", href: "/teams", section: "PROGRESS", dataRole: ["intern", "team_lead", "instructor", "admin", "super_admin"] },
  { emoji: "\u{1F4DD}", label: "Peer review", href: "/peer-review", section: "PROGRESS", dataRole: ["intern", "team_lead", "instructor", "admin", "super_admin"] },
  { emoji: "\u26A1", label: "Productivity Hub", href: "/productivity", section: "PROGRESS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "\u{1F4C6}", label: "Planner", href: "/planner", section: "PROGRESS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "\u23F0", label: "Alarms & Clock", href: "/alarms", section: "PROGRESS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "\u{1F514}", label: "Reminders", href: "/reminders", section: "PROGRESS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "\u{1F3AF}", label: "Focus mode", href: "/focus-mode", section: "PROGRESS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "\u{1F4DD}", label: "Notes", href: "/notes", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "\u{1F4C8}", label: "Performance", href: "/performance", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "🎁", label: "Monthly Wrapped", href: "/wrapped", section: "PROGRESS", dataRole: ["intern", "team_lead", "mentor", "alumni"] },
  { emoji: "🧪", label: "Skills Lab", href: "/skills-lab", section: "PROGRESS", dataRole: ["intern", "team_lead", "mentor", "alumni"] },
  { emoji: "🎙", label: "Speaker Series", href: "/speakers", section: "PROGRESS", dataRole: ["intern", "team_lead", "mentor", "alumni", "admin", "super_admin"] },
  { emoji: "💚", label: "Wellness", href: "/wellness", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "📁", label: "Projects", href: "/projects", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "📚", label: "Library", href: "/library", section: "PROGRESS", dataRole: ["intern", "team_lead", "instructor", "admin", "super_admin"] },
  { emoji: "✅", label: "Checklists", href: "/checklist", section: "PROGRESS", dataRole: ["intern", "team_lead", "admin", "super_admin"] },
  { emoji: "👨‍👩‍👧", label: "Guardian Access", href: "/guardian", section: "PROGRESS", dataRole: ["intern", "team_lead"] },
  { emoji: "⚡", label: "Compliance", href: "/compliance", section: "PROGRESS", dataRole: ["intern", "team_lead", "alumni", "mentor"] },
  { emoji: "📋", label: "Appeals", href: "/appeals", section: "PROGRESS", dataRole: ["intern", "team_lead", "alumni", "mentor"] },
  // TEAM LEAD
  { emoji: "\u{1F465}", label: "Team Management", href: "/team-lead", section: "MANAGEMENT", dataRole: ["team_lead"] },
  // ADMIN
  { emoji: "\u{1F6E1}", label: "Admin Panel", href: "/admin", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "🏆", label: "Hackathons", href: "/admin/hackathons", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1F3AF}", label: "Engagement controls", href: "/admin/engagement", section: "ADMIN", dataRole: ["admin", "super_admin", "moderator"] },
  { emoji: "\u{1F4D1}", label: "Note templates", href: "/admin/note-templates", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "🏫", label: "Creative Spaces", href: "/admin/creative-spaces", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "💚", label: "Wellness", href: "/admin/wellness", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "🛡️", label: "Compliance Engine", href: "/admin/compliance", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "📋", label: "Appeals Panel", href: "/admin/appeals", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "💸", label: "Withdrawals", href: "/admin/withdrawals", section: "ADMIN", dataRole: ["admin", "super_admin", "finance"] },
  { emoji: "💰", label: "Finance", href: "/admin/finance", section: "ADMIN", dataRole: ["admin", "super_admin", "finance"] },
  { emoji: "👥", label: "Manage Users", href: "/admin/users", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "🧑‍🏫", label: "Mentors", href: "/admin/mentors", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "🎓", label: "Alumni", href: "/admin/alumni", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "📚", label: "Company Library", href: "/admin/company-docs", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "📋", label: "Manage Projects", href: "/admin/projects", section: "ADMIN", dataRole: ["admin", "super_admin", "moderator"] },
  { emoji: "📚", label: "Library Admin", href: "/library/admin", section: "ADMIN", dataRole: ["admin", "super_admin", "instructor"] },
  // SUPER ADMIN
  { emoji: "\u{1F451}", label: "Super Admin", href: "/super-admin", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u{1F465}", label: "Manage Users", href: "/super-admin/users", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u{1F331}", label: "Data Seeder", href: "/super-admin/seed", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u2728", label: "AI Settings", href: "/super-admin/ai-settings", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u2709", label: "Email Settings", href: "/super-admin/email-settings", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u26A1", label: "XP & Challenges", href: "/super-admin/xp-rules", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u{1F916}", label: "AI Access", href: "/super-admin/ai-access", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u{1F3E2}", label: "Recruiter Access", href: "/super-admin/recruiter-requests", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u{1F5BC}", label: "Landing Content", href: "/super-admin/landing-settings", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u{1F4E2}", label: "Broadcast", href: "/admin/broadcast", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1F4E3}", label: "Announcements", href: "/announcements", section: "MAIN", dataRole: ["all"] },
  { emoji: "\u{1F6E1}", label: "Announcement Control", href: "/admin/announcement-control", section: "ADMIN", dataRole: ["super_admin"] },
  { emoji: "\u{1F517}", label: "Contact Allocation", href: "/admin/contact-allocation", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1F512}", label: "Message Control", href: "/admin/message-control", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1F4CA}", label: "Analytics", href: "/analytics", section: "ADMIN", dataRole: ["super_admin", "admin"] },
  { emoji: "\u{1F4DC}", label: "Audit Logs", href: "/admin/audit-logs", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1F6A8}", label: "Security Center", href: "/admin/security-center", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1F4C8}", label: "Activity Monitor", href: "/admin/activity-monitor", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1F4E4}", label: "Compliance", href: "/admin/compliance-reports", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "\u{1FA7A}", label: "Observability", href: "/admin/observability", section: "ADMIN", dataRole: ["admin", "super_admin"] },
  { emoji: "🏆", label: "Hackathons", href: "/hackathons", section: "TOOLS", dataRole: ["intern", "team_lead", "admin", "super_admin", "mentor", "alumni"] },
  { emoji: "🚀", label: "My Startup", href: "/startup", section: "TOOLS", dataRole: ["intern", "team_lead", "alumni"] },
  { emoji: "📈", label: "Investor Portal", href: "/investors", section: "TOOLS", dataRole: ["admin", "super_admin"] },
  { emoji: "🛒", label: "Marketplace", href: "/marketplace", section: "TOOLS", dataRole: ["intern", "team_lead", "admin", "super_admin", "mentor", "alumni"] },
  { emoji: "🏫", label: "Creative Spaces", href: "/creative-space", section: "TOOLS", dataRole: ["intern", "team_lead", "admin", "super_admin", "mentor", "alumni", "instructor"] },
  { emoji: "🏢", label: "Corporate Training", href: "/corporate", section: "TOOLS", dataRole: ["admin", "super_admin", "instructor", "recruiter"] },
  { emoji: "\u{1F916}", label: "AI Hub", href: "/ai-hub", section: "TOOLS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "📖", label: "Study Buddy", href: "/study-buddy", section: "TOOLS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "\u{1F4C1}", label: "Documents", href: "/documents", section: "TOOLS", dataRole: ["intern", "team_lead", "admin", "super_admin", "instructor"] },
  { emoji: "\u{1F4BC}", label: "Opportunities", href: "/opportunities", section: "TOOLS", dataRole: ["intern", "team_lead", "admin", "super_admin", "recruiter"] },
  { emoji: "\u{1F3E2}", label: "Recruiter Portal", href: "/recruiter", section: "TOOLS", dataRole: ["recruiter", "admin", "super_admin"] },
  { emoji: "\u{1F31F}", label: "Talent Pool", href: "/talent", section: "TOOLS", dataRole: ["recruiter", "admin", "super_admin"] },
  { emoji: "💼", label: "Placements", href: "/recruiter/placements", section: "RECRUITER", dataRole: ["recruiter", "admin", "super_admin"] },
  { emoji: "\u{1F6E1}", label: "System Status", href: "/status", section: "SYSTEM", dataRole: ["super_admin", "admin"] },
  // INSTRUCTOR
  { emoji: "\u{1F4D6}", label: "My Courses", href: "/instructor", section: "INSTRUCTOR", dataRole: ["instructor"] },
  { emoji: "\u2795", label: "Create Course", href: "/instructor/create-course", section: "INSTRUCTOR", dataRole: ["instructor", "admin", "super_admin"] },
  { emoji: "\u{1F465}", label: "Students", href: "/instructor/students", section: "INSTRUCTOR", dataRole: ["instructor"] },
  { emoji: "🎓", label: "Host a Space", href: "/creative-space/apply", section: "INSTRUCTOR", dataRole: ["instructor"] },
  { emoji: "📋", label: "Manage Spaces", href: "/creative-space/manage", section: "INSTRUCTOR", dataRole: ["instructor"] },
  { emoji: "\u{1F3C6}", label: "Certificates", href: "/certificates", section: "ACHIEVEMENTS", dataRole: ["intern", "team_lead", "instructor", "admin", "super_admin"] },
  { emoji: "\u{1F4CA}", label: "My Analytics", href: "/my-analytics", section: "ACHIEVEMENTS", dataRole: ["intern", "team_lead", "instructor", "admin", "super_admin"] },
  // MODERATOR
  { emoji: "\u{1F6A9}", label: "Mod Queue", href: "/moderator", section: "MODERATION", dataRole: ["moderator"] },
  // FINANCE
  { emoji: "\u{1F4B3}", label: "Transactions", href: "/finance", section: "FINANCE", dataRole: ["finance"] },
  // SUPPORT
  { emoji: "\u{1F3AB}", label: "Support Tickets", href: "/support", section: "SUPPORT", dataRole: ["support"] },
  // MENTOR
  { emoji: "\u{1F9D1}\u200D\u{1F3EB}", label: "Mentor Hub", href: "/mentor", section: "MENTOR", dataRole: ["mentor"] },
  { emoji: "\u{1F4C5}", label: "Sessions", href: "/mentor/sessions", section: "MENTOR", dataRole: ["mentor"] },
  { emoji: "\u{1F465}", label: "Find a Mentor", href: "/mentorship", section: "MENTOR", dataRole: ["mentor", "intern", "team_lead"] },
  // ALUMNI
  { emoji: "\u{1F393}", label: "Alumni Hub", href: "/alumni", section: "ALUMNI", dataRole: ["alumni"] },
  { emoji: "\u{1F4BC}", label: "Opportunities", href: "/opportunities", section: "ALUMNI", dataRole: ["alumni"] },
  { emoji: "\u{1F4AC}", label: "Community", href: "/community", section: "ALUMNI", dataRole: ["alumni"] },
  { emoji: "\u{1F310}", label: "Alumni Directory", href: "/alumni/directory", section: "ALUMNI", dataRole: ["alumni"] },
];

function isItemVisible(item: NavItem, currentRole: Role): boolean {
  if (item.dataRole.includes("all")) return true;
  return item.dataRole.includes(currentRole);
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const storeRole = useAppStore((s) => s.role);
  const setRole = useAppStore((s) => s.setRole);
  const user = useCurrentUser();

  // Restore collapsed state from localStorage on first mount so the
  // sidebar respects the user's last preference after a page refresh.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cios-sidebar-collapsed");
      if (saved !== null) setSidebarCollapsed(saved === "true");
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real role comes from Clerk publicMetadata (source of truth)
  // Super admin can use the store role to "preview" other portals
  const actualRole = user.role;
  const isSuperAdmin = actualRole === "super_admin";
  const role: Role = isSuperAdmin ? storeRole : actualRole;

  const visibleItems = NAV_ITEMS.filter((item) => isItemVisible(item, role));

  // Group by section
  const sections: { label: string; items: NavItem[] }[] = [];
  let lastSection = "";
  for (const item of visibleItems) {
    if (item.section !== lastSection) {
      sections.push({ label: item.section, items: [] });
      lastSection = item.section;
    }
    sections[sections.length - 1].items.push(item);
  }

  const sidebarWidth = collapsed ? 64 : 240;

  // Sidebar unread badges — fetched on mount, then every 60s, plus on focus.
  const [badges, setBadges] = useState<SidebarBadges>({ notifications: 0, messages: 0, announcements: 0, contactRequests: 0, applications: 0 });
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try { const b = await getSidebarBadges(); if (!cancelled) setBadges(b); } catch {}
    };
    refresh();
    // 3-minute poll for sidebar unread badges. Focus listener below picks up
    // anything urgent the moment the tab is re-focused. Was 60s — too chatty
    // for Vercel Hobby when multiple students are browsing.
    const i = setInterval(refresh, 180_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(i); window.removeEventListener("focus", onFocus); };
  }, [pathname]);

  function badgeFor(href: string): number {
    if (href === "/notifications") return badges.notifications;
    if (href === "/messages") return badges.messages;
    if (href === "/announcements") return badges.announcements;
    if (href === "/admin/contact-allocation") return badges.contactRequests;
    if (href === "/recruiter") return badges.applications;
    return 0;
  }

  return (
    <aside
      data-tour="sidebar"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        borderRight: "1px solid var(--border-default)",
        transition: "width 0.2s ease",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "16px 14px" : "16px",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <img
          src={LOGO_URL}
          alt="CIOS"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,
            objectFit: "cover",
          }}
        />
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              CIOS Platform
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              COSPRONOS &times; CORESPEC
            </div>
          </div>
        )}
      </div>

      {/* Role Selector */}
      {!collapsed && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            {isSuperAdmin ? "PREVIEW PORTAL" : "YOUR ROLE"}
          </div>
          {isSuperAdmin ? (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid rgba(171,71,188,0.3)",
                background: "rgba(171,71,188,0.08)",
                color: "#AB47BC",
                fontSize: 12,
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
                appearance: "auto" as React.CSSProperties["appearance"],
              }}
              title="Super Admin: switch portal view for preview"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} style={{ background: "var(--bg-tertiary)", color: "#AB47BC" }}>
                  {getRoleLabel(r)}
                </option>
              ))}
            </select>
          ) : (
            <div
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid rgba(30,136,229,0.2)",
                background: "rgba(30,136,229,0.08)",
                color: "#1E88E5",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#66BB6A" }} />
              {getRoleLabel(actualRole)}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: collapsed ? "8px 6px" : "8px 10px",
        }}
      >
        {sections.map((section, sectionIdx) => (
          <div key={`${section.label}-${sectionIdx}`} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  padding: "8px 10px 4px",
                }}
              >
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-role={item.dataRole.join(",")}
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
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--accent-blue, #1E88E5)" : "var(--text-secondary)",
                    background: isActive ? "rgba(30,136,229,0.08)" : "transparent",
                    borderLeft: isActive ? "3px solid #1E88E5" : "3px solid transparent",
                    transition: "background 0.15s, color 0.15s",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(30,136,229,0.05)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, position: "relative" }}>
                    {item.emoji}
                    {collapsed && badgeFor(item.href) > 0 && (
                      <span style={{
                        position: "absolute", top: -4, right: -8, minWidth: 16, height: 16, padding: "0 4px",
                        background: "#EF5350", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--bg-primary)",
                      }}>{badgeFor(item.href) > 99 ? "99+" : badgeFor(item.href)}</span>
                    )}
                  </span>
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!collapsed && badgeFor(item.href) > 0 && (
                    <span style={{
                      minWidth: 20, height: 20, padding: "0 7px",
                      background: "linear-gradient(135deg, #EF5350, #E53935)",
                      color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(239,83,80,0.4)",
                    }}>{badgeFor(item.href) > 99 ? "99+" : badgeFor(item.href)}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse Button */}
      <div
        style={{
          padding: "8px 10px",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <button
          onClick={() => toggleSidebar()}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 0",
            borderRadius: 8,
            border: "1px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 13,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <span style={{ fontSize: 16 }}>{collapsed ? "\u25B6" : "\u25C0"}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User Footer */}
      <div
        style={{
          padding: collapsed ? "12px 8px" : "12px 16px",
          borderTop: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || "User"}
            style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, objectFit: "cover", border: "2px solid rgba(30,136,229,0.3)" }}
          />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #1E88E5, #AB47BC)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 12, fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {user.initials}
          </div>
        )}
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name || "Intern User"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {getRoleLabel(role)}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
