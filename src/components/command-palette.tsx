"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";
import { useCurrentUser } from "@/lib/use-current-user";

const RECENTS_KEY = "cios-palette-recents";
function loadRecents(): string[] { try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]"); } catch { return []; } }
function pushRecent(href: string) {
  try {
    const cur = loadRecents().filter((h) => h !== href);
    cur.unshift(href);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(cur.slice(0, 6)));
  } catch {}
}

interface Cmd {
  id: string;
  label: string;
  emoji: string;
  href: string;
  group: string;
  keywords?: string;
  // if absent, visible to all roles
  roles?: string[];
}

const INTERN_ROLES = ["intern", "team_lead"];
const ADMIN_ROLES = ["admin", "super_admin"];
const MOD_ROLES = ["admin", "super_admin", "moderator"];
const ALL_STAFF = ["admin", "super_admin", "moderator", "instructor", "finance", "support", "team_lead"];

const COMMANDS: Cmd[] = [
  // ── Universal ────────────────────────────────────────────────────────────
  { id: "dash",      label: "Dashboard",        emoji: "🏠", href: "/dashboard",     group: "Navigate" },
  { id: "msg",       label: "Messages",          emoji: "💬", href: "/messages",      group: "Navigate", keywords: "chat dm" },
  { id: "notif",     label: "Notifications",     emoji: "🔔", href: "/notifications", group: "Navigate" },
  { id: "settings",  label: "Settings",          emoji: "⚙️", href: "/settings",      group: "Navigate" },
  { id: "profile",   label: "Profile",           emoji: "👤", href: "/profile",       group: "Navigate" },
  { id: "help",      label: "Help & Support",    emoji: "💬", href: "/help",          group: "Navigate", keywords: "faq ticket contact" },
  { id: "ann",       label: "Announcements",     emoji: "📣", href: "/announcements", group: "Navigate" },
  { id: "cal",       label: "Calendar",          emoji: "🗓️", href: "/calendar",      group: "Navigate", keywords: "schedule events" },
  { id: "opps",      label: "Opportunities",     emoji: "💼", href: "/opportunities", group: "Navigate" },
  { id: "comm",      label: "Community",         emoji: "👥", href: "/community",     group: "Navigate" },
  { id: "leader",    label: "Leaderboard",       emoji: "🏆", href: "/leaderboard",   group: "Navigate", keywords: "rank" },

  // ── Intern / Team Lead ───────────────────────────────────────────────────
  { id: "projects",  label: "Projects",          emoji: "📁", href: "/projects",      group: "Navigate", keywords: "assignments eagle", roles: [...INTERN_ROLES, ...ADMIN_ROLES, "moderator"] },
  { id: "tasks",     label: "Tasks",             emoji: "✅", href: "/tasks",         group: "Navigate", keywords: "todo",              roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "courses",   label: "Courses",           emoji: "📚", href: "/courses",       group: "Navigate", keywords: "learning",          roles: [...INTERN_ROLES, "instructor", ...ADMIN_ROLES] },
  { id: "classroom", label: "Classroom",         emoji: "🎓", href: "/classroom",     group: "Navigate", keywords: "live class",        roles: [...INTERN_ROLES, "instructor", ...ADMIN_ROLES] },
  { id: "wallet",    label: "Wallet",            emoji: "💰", href: "/wallet",        group: "Navigate", keywords: "money payouts",     roles: [...INTERN_ROLES, ...ADMIN_ROLES, "finance"] },
  { id: "badges",    label: "Badges",            emoji: "🎖️", href: "/badges",        group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "missions",  label: "Missions",          emoji: "🎯", href: "/missions",      group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "streaks",   label: "Streaks",           emoji: "🔥", href: "/streaks",       group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "certs",     label: "Certificates",      emoji: "🎓", href: "/certificates",  group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "myanal",    label: "My Analytics",      emoji: "📊", href: "/my-analytics",  group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "perf",      label: "Performance",       emoji: "📈", href: "/performance",   group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "prod",      label: "Productivity Hub",  emoji: "⚡", href: "/productivity",  group: "Navigate",                               roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "planner",   label: "Planner",           emoji: "🗒️", href: "/planner",       group: "Navigate",                               roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "alarms",    label: "Alarms & Clock",    emoji: "⏰", href: "/alarms",        group: "Navigate",                               roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "reminders", label: "Reminders",         emoji: "🔔", href: "/reminders",     group: "Navigate",                               roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "focus",     label: "Focus Mode",        emoji: "🧘", href: "/focus-mode",    group: "Navigate",                               roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "notes",     label: "Notes",             emoji: "📝", href: "/notes",         group: "Navigate",                               roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "docs",      label: "Documents",         emoji: "📄", href: "/documents",     group: "Navigate",                               roles: [...INTERN_ROLES, ...ALL_STAFF] },
  { id: "ai",        label: "AI Hub",            emoji: "🤖", href: "/ai-hub",        group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES, "instructor"] },
  { id: "peer",      label: "Peer Review",       emoji: "🤝", href: "/peer-review",   group: "Navigate",                               roles: [...INTERN_ROLES] },
  { id: "buddy",     label: "Study Buddy",       emoji: "📖", href: "/study-buddy",   group: "Navigate",                               roles: [...INTERN_ROLES] },
  { id: "mentor",    label: "Mentorship",        emoji: "🧑‍🏫", href: "/mentorship",   group: "Navigate",                               roles: [...INTERN_ROLES, "mentor"] },
  { id: "alumni-p",  label: "Alumni",            emoji: "🎓", href: "/alumni",        group: "Navigate",                               roles: ["alumni", ...ADMIN_ROLES] },
  { id: "mktplace",  label: "Marketplace",       emoji: "🛒", href: "/marketplace",   group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES, "alumni"] },
  { id: "creative",  label: "Creative Space",    emoji: "🏫", href: "/creative-space", group: "Navigate",                              roles: [...INTERN_ROLES, "instructor", ...ADMIN_ROLES] },
  { id: "wellness",    label: "Wellness",          emoji: "💚", href: "/wellness",        group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "rewards",     label: "Rewards Hub",       emoji: "🏆", href: "/gamification",    group: "Navigate", keywords: "xp spin wheel missions badges",      roles: [...INTERN_ROLES] },
  { id: "achieve",     label: "Achievements",      emoji: "⭐", href: "/achievements",    group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "levels",      label: "Levels",            emoji: "📈", href: "/levels",          group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "live",        label: "Live Classes",       emoji: "📡", href: "/live",            group: "Navigate",                               roles: [...INTERN_ROLES, "instructor", ...ADMIN_ROLES] },
  { id: "teams",       label: "Team Challenges",    emoji: "⚔️", href: "/teams",           group: "Navigate",                               roles: [...INTERN_ROLES, "instructor", ...ADMIN_ROLES] },
  { id: "hackathons",  label: "Hackathons",         emoji: "🚀", href: "/hackathons",      group: "Navigate",                               roles: [...INTERN_ROLES, ...ADMIN_ROLES, "mentor", "alumni"] },
  { id: "library",     label: "Library",            emoji: "📚", href: "/library",         group: "Navigate", keywords: "resources books courses vault",      roles: [...INTERN_ROLES, "instructor", ...ADMIN_ROLES, "alumni"] },
  { id: "lib-upload", label: "Upload to Library",  emoji: "📤", href: "/library/upload",  group: "Navigate", keywords: "upload resource",                    roles: ["instructor", ...ADMIN_ROLES] },
  { id: "lib-admin",  label: "Library Admin",       emoji: "📚", href: "/library/admin",   group: "Navigate",                                              roles: [...ADMIN_ROLES, "instructor"] },
  { id: "lib-purch",  label: "My Library Purchases",emoji: "🛒", href: "/library/my-purchases", group: "Navigate",                                         roles: [...INTERN_ROLES, ...ADMIN_ROLES, "alumni"] },
  { id: "checklist",  label: "Checklists",          emoji: "✅", href: "/checklist",       group: "Navigate", keywords: "todo progress sign off milestones",  roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "cl-tmpl",    label: "Checklist Templates", emoji: "📋", href: "/checklist/templates", group: "Navigate",                                          roles: [...INTERN_ROLES, ...ADMIN_ROLES] },
  { id: "compliance",  label: "Compliance",         emoji: "📋", href: "/compliance",      group: "Navigate",                                               roles: [...INTERN_ROLES, "alumni", "mentor"] },
  { id: "appeals",     label: "Appeals",            emoji: "⚖️", href: "/appeals",         group: "Navigate",                               roles: [...INTERN_ROLES, "alumni", "mentor"] },
  { id: "guardian",    label: "Guardian Portal",    emoji: "👨‍👩‍👧", href: "/guardian",        group: "Navigate",                               roles: [...INTERN_ROLES] },
  { id: "startup",     label: "Startup Hub",        emoji: "💡", href: "/startup",         group: "Navigate",                               roles: [...INTERN_ROLES, "alumni"] },
  { id: "rewards-hist",label: "Rewards History",    emoji: "📜", href: "/rewards-history", group: "Navigate",                               roles: [...INTERN_ROLES] },

  // ── Recruiter ────────────────────────────────────────────────────────────
  { id: "rec-hub",     label: "Recruiter Hub",      emoji: "🏢", href: "/recruiter",              group: "Navigate", roles: ["recruiter", ...ADMIN_ROLES] },
  { id: "rec-tp",      label: "Talent Pool",         emoji: "🌟", href: "/recruiter/talent-pool",  group: "Navigate", roles: ["recruiter", ...ADMIN_ROLES] },
  { id: "rec-int",     label: "Interviews",           emoji: "🎯", href: "/recruiter/interviews",   group: "Navigate", roles: ["recruiter", ...ADMIN_ROLES] },
  { id: "rec-opps",    label: "Post Opportunity",     emoji: "📢", href: "/recruiter/opportunities",group: "Navigate", roles: ["recruiter", ...ADMIN_ROLES] },
  { id: "talent-pub",  label: "Talent Directory",     emoji: "🔍", href: "/talent",                 group: "Navigate", roles: ["recruiter", ...ADMIN_ROLES] },

  // ── Instructor ───────────────────────────────────────────────────────────
  { id: "inst",        label: "Instructor Portal",   emoji: "🎓", href: "/instructor",              group: "Navigate", roles: ["instructor", ...ADMIN_ROLES] },
  { id: "inst-course", label: "Create Course",        emoji: "➕", href: "/instructor/create-course",group: "Navigate", roles: ["instructor", ...ADMIN_ROLES] },
  { id: "inst-studs",  label: "My Students",          emoji: "👥", href: "/instructor/students",     group: "Navigate", roles: ["instructor", ...ADMIN_ROLES] },
  { id: "cs-apply",    label: "Apply: Creative Space",emoji: "🏫", href: "/creative-space/apply",    group: "Navigate", roles: ["instructor"] },
  { id: "cs-manage",   label: "Manage Creative Space",emoji: "🏫", href: "/creative-space/manage",   group: "Navigate", roles: ["instructor"] },

  // ── Team Lead ────────────────────────────────────────────────────────────
  { id: "tl",          label: "Team Lead Portal",    emoji: "👥", href: "/team-lead",              group: "Navigate", roles: ["team_lead", ...ADMIN_ROLES] },

  // ── Mentor ────────────────────────────────────────────────────────────────
  { id: "mentor-port", label: "Mentor Portal",        emoji: "🧑‍🏫", href: "/mentor",               group: "Navigate", roles: ["mentor"] },
  { id: "mentor-sess", label: "Mentor Sessions",      emoji: "📅",  href: "/mentor/sessions",       group: "Navigate", roles: ["mentor"] },

  // ── Alumni ────────────────────────────────────────────────────────────────
  { id: "alum-dir",    label: "Alumni Directory",     emoji: "🎓", href: "/alumni/directory",       group: "Navigate", roles: ["alumni", ...ADMIN_ROLES] },
  { id: "alum-comm",   label: "Alumni Community",     emoji: "👥", href: "/community",              group: "Navigate", roles: ["alumni"] },

  // ── Finance / Support / Moderator ─────────────────────────────────────────
  { id: "finance",     label: "Finance Dashboard",    emoji: "💸", href: "/finance",                group: "Navigate", roles: ["finance", ...ADMIN_ROLES] },
  { id: "support-p",   label: "Support Portal",       emoji: "🎧", href: "/support",                group: "Navigate", roles: ["support", ...ADMIN_ROLES] },
  { id: "mod-port",    label: "Moderator Portal",     emoji: "🛡️", href: "/moderator",              group: "Navigate", roles: ["moderator", ...ADMIN_ROLES] },

  // ── Admin ────────────────────────────────────────────────────────────────
  { id: "admin",         label: "Admin Panel",              emoji: "🛡️", href: "/admin",                         group: "Admin", roles: MOD_ROLES },
  { id: "adm-users",     label: "Admin · Users",            emoji: "👥", href: "/admin/users",                   group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-comp",      label: "Admin · Compliance",       emoji: "📋", href: "/admin/compliance",              group: "Admin", roles: MOD_ROLES },
  { id: "adm-comp-rep",  label: "Admin · Compliance Reports",emoji: "📊",href: "/admin/compliance-reports",      group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-proj",      label: "Admin · Projects",         emoji: "📁", href: "/admin/projects",                group: "Admin", roles: MOD_ROLES },
  { id: "adm-well",      label: "Admin · Wellness",         emoji: "💚", href: "/admin/wellness",                group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-fin",       label: "Admin · Finance",          emoji: "💸", href: "/admin/finance",                 group: "Admin", roles: [...ADMIN_ROLES, "finance"] },
  { id: "adm-wdraw",     label: "Admin · Withdrawals",      emoji: "💳", href: "/admin/withdrawals",             group: "Admin", roles: [...ADMIN_ROLES, "finance"] },
  { id: "adm-promos",    label: "Admin · Promotions",       emoji: "🎖", href: "/admin/promotions",              group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-integ",     label: "Admin · Integrations",     emoji: "🔌", href: "/admin/integrations",            group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-broad",     label: "Admin · Broadcast",        emoji: "📢", href: "/admin/broadcast",               group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-announce",  label: "Admin · Announcements",    emoji: "📣", href: "/admin/announcement-control",    group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-appeals",   label: "Admin · Appeals",          emoji: "⚖️", href: "/admin/appeals",                group: "Admin", roles: MOD_ROLES },
  { id: "adm-mentors",   label: "Admin · Mentors",          emoji: "🧑‍🏫",href: "/admin/mentors",               group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-alumni",    label: "Admin · Alumni",           emoji: "🎓", href: "/admin/alumni",                  group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-hack",      label: "Admin · Hackathons",       emoji: "🏆", href: "/admin/hackathons",              group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-spaces",    label: "Admin · Creative Spaces",  emoji: "🏫", href: "/admin/creative-spaces",         group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-engage",    label: "Admin · Engagement",       emoji: "📊", href: "/admin/engagement",              group: "Admin", roles: MOD_ROLES },
  { id: "adm-msg",       label: "Admin · Message Control",  emoji: "💬", href: "/admin/message-control",         group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-audit",     label: "Admin · Audit Logs",       emoji: "📝", href: "/admin/audit-logs",              group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-activity",  label: "Admin · Activity Monitor", emoji: "📡", href: "/admin/activity-monitor",        group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-security",  label: "Admin · Security Center",  emoji: "🔒", href: "/admin/security-center",         group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-obs",       label: "Admin · Observability",    emoji: "🔭", href: "/admin/observability",           group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-analytics", label: "Admin · Analytics",        emoji: "📈", href: "/analytics",                    group: "Admin", roles: ADMIN_ROLES },
  { id: "adm-status",    label: "System Status",            emoji: "🟢", href: "/status",                       group: "Admin", roles: ADMIN_ROLES },
  { id: "super",         label: "Super Admin",              emoji: "👑", href: "/super-admin",                   group: "Admin", roles: ["super_admin"] },
  { id: "sa-users",      label: "Super Admin · Users",      emoji: "👥", href: "/super-admin/users",             group: "Admin", roles: ["super_admin"] },
  { id: "sa-ai",         label: "Super Admin · AI Access",  emoji: "🤖", href: "/super-admin/ai-access",         group: "Admin", roles: ["super_admin"] },
  { id: "sa-xp",         label: "Super Admin · XP Rules",   emoji: "⚡", href: "/super-admin/xp-rules",          group: "Admin", roles: ["super_admin"] },
  { id: "sa-email",      label: "Super Admin · Email",      emoji: "✉️", href: "/super-admin/email-settings",    group: "Admin", roles: ["super_admin"] },
  { id: "sa-rec",        label: "Super Admin · Recruiter Requests",emoji:"🏢",href:"/super-admin/recruiter-requests",group:"Admin",roles:["super_admin"] },

  // ── Quick actions ────────────────────────────────────────────────────────
  { id: "new-task",  label: "New task",              emoji: "➕", href: "/tasks?new=1",    group: "Quick action" },
  { id: "new-event", label: "New calendar event",    emoji: "➕", href: "/calendar?new=1", group: "Quick action" },
  { id: "new-note",  label: "New note",              emoji: "➕", href: "/notes?new=1",    group: "Quick action" },
  { id: "new-msg",   label: "New message",           emoji: "✉️", href: "/messages?new=1", group: "Quick action" },
];

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Respect the preview role for super admins
  const storeRole = useAppStore((s) => s.role);
  const user = useCurrentUser();
  const effectiveRole = user.role === "super_admin" ? storeRole : user.role;

  // Role-filtered command list
  const visibleCommands = useMemo(
    () => COMMANDS.filter((c) => !c.roles || c.roles.includes(effectiveRole ?? "")),
    [effectiveRole],
  );

  useEffect(() => { if (pathname && visibleCommands.some((c) => c.href === pathname)) pushRecent(pathname); }, [pathname, visibleCommands]);
  useEffect(() => { if (open) setRecents(loadRecents()); }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen((o) => !o); return;
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cios:open-palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("cios:open-palette", onOpen); };
  }, [open]);

  useEffect(() => {
    if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      const recentCmds = recents.map((href) => {
        const c = visibleCommands.find((x) => x.href === href);
        return c ? { ...c, group: "Recent" } : null;
      }).filter(Boolean) as Cmd[];
      const others = visibleCommands.filter((c) => !recents.includes(c.href));
      return [...recentCmds, ...others];
    }
    return visibleCommands.filter((c) =>
      c.label.toLowerCase().includes(query) ||
      c.group.toLowerCase().includes(query) ||
      (c.keywords || "").toLowerCase().includes(query),
    );
  }, [q, recents, visibleCommands]);

  const go = (c: Cmd) => { setOpen(false); router.push(c.href); };

  if (!open) return null;

  const grouped: Record<string, Cmd[]> = {};
  for (const c of filtered) (grouped[c.group] ||= []).push(c);
  let flatIdx = -1;

  return (
    <div onClick={(e) => e.target === e.currentTarget && setOpen(false)} className="cios-palette-backdrop" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh", zIndex: 500,
    }}>
      <style>{`@media (max-width: 768px){ .cios-palette-backdrop { padding-top: 0 !important; } .cios-palette-panel { width: 100vw !important; height: 100vh !important; border-radius: 0 !important; max-height: 100vh !important; } .cios-palette-list { max-height: calc(100vh - 120px) !important; } }`}</style>
      <div className="cios-palette-panel" style={{ width: "min(640px, 92vw)", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", boxShadow: "0 25px 80px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter" && filtered[active]) { e.preventDefault(); go(filtered[active]); }
            }}
            placeholder="Search pages, actions…"
            style={{ flex: 1, background: "transparent", color: "#E8EDF5", border: "none", outline: "none", fontSize: 15 }}
          />
          <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, background: "rgba(255,255,255,0.06)", color: "#8892A4", fontWeight: 700, letterSpacing: 1 }}>ESC</span>
        </div>
        <div className="cios-palette-list" style={{ maxHeight: "55vh", overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 && <div style={{ padding: "32px 20px", textAlign: "center", color: "#5A6478", fontSize: 13 }}>No matches.</div>}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#5A6478", letterSpacing: 1.5, textTransform: "uppercase", padding: "10px 12px 4px" }}>{group}</div>
              {items.map((c) => {
                flatIdx++;
                const isActive = flatIdx === active;
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setActive(filtered.indexOf(c))}
                    onClick={() => go(c)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: isActive ? "rgba(30,136,229,0.15)" : "transparent",
                      border: "none", borderRadius: 8, cursor: "pointer", color: "#E8EDF5", fontSize: 13, textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{c.emoji}</span>
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {isActive && <span style={{ fontSize: 11, color: "#8892A4" }}>↵</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 14, fontSize: 11, color: "#5A6478" }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
          <span style={{ marginLeft: "auto" }}>⌘K / Ctrl+K to toggle</span>
        </div>
      </div>
    </div>
  );
}
