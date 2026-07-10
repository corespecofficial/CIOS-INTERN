import Link from "next/link";
import type React from "react";
import { getOrgContextOr404, requireOrgRole } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

const MODULES: Record<string, { title: string; eyebrow: string; icon: string; desc: string }> = {
  "": { title: "Admin Control Center", eyebrow: "ORG ADMIN", icon: "🛡️", desc: "Private controls for this organization only." },
  hackathons: { title: "Hackathons", eyebrow: "ORG ADMIN", icon: "🏆", desc: "Manage org hackathon activity and participation." },
  engagement: { title: "Engagement controls", eyebrow: "ORG ADMIN", icon: "🎯", desc: "Tune XP, streaks, nudges, and participation rules for this org." },
  "note-templates": { title: "Note templates", eyebrow: "ORG ADMIN", icon: "📑", desc: "Create reusable notes for org staff and interns." },
  "creative-spaces": { title: "Organization Spaces", eyebrow: "ORG ADMIN", icon: "🏫", desc: "Review this org's marketplace identity and tenant settings." },
  wellness: { title: "Wellness", eyebrow: "ORG ADMIN", icon: "💚", desc: "Monitor wellness check-ins and support signals inside this org." },
  compliance: { title: "Compliance Engine", eyebrow: "ORG ADMIN", icon: "🛡️", desc: "Create and track compliance tasks for this org." },
  appeals: { title: "Appeals Panel", eyebrow: "ORG ADMIN", icon: "📋", desc: "Handle intern and staff appeals in this org." },
  withdrawals: { title: "Withdrawals", eyebrow: "ORG FINANCE", icon: "💸", desc: "Review org-scoped withdrawal requests." },
  finance: { title: "Finance", eyebrow: "ORG FINANCE", icon: "💰", desc: "View org revenue, rewards, and fine activity." },
  users: { title: "Manage Users", eyebrow: "ORG ADMIN", icon: "👥", desc: "Manage interns, staff, and per-org roles." },
  mentors: { title: "Mentors", eyebrow: "ORG ADMIN", icon: "🧑‍🏫", desc: "Coordinate mentors assigned to this org." },
  alumni: { title: "Alumni", eyebrow: "ORG ADMIN", icon: "🎓", desc: "Track alumni attached to this org." },
  "company-docs": { title: "Company Library", eyebrow: "ORG ADMIN", icon: "📚", desc: "Org-private documents, playbooks, and resources." },
  projects: { title: "Manage Projects", eyebrow: "ORG ADMIN", icon: "📋", desc: "Manage org projects and submissions." },
  "contact-allocation": { title: "Contact Allocation", eyebrow: "ORG OPS", icon: "🔗", desc: "Assign org conversations and leads to staff." },
  "message-control": { title: "Message Control", eyebrow: "ORG OPS", icon: "🔒", desc: "Set org messaging policy, mutes, and moderation controls." },
  "audit-logs": { title: "Audit Logs", eyebrow: "ORG OPS", icon: "📜", desc: "Every important org action, scoped to this tenant." },
  "security-center": { title: "Security Center", eyebrow: "ORG OPS", icon: "🚨", desc: "Review security signals for this org only." },
  "activity-monitor": { title: "Activity Monitor", eyebrow: "ORG OPS", icon: "📈", desc: "Monitor recent org activity and engagement." },
  "compliance-reports": { title: "Compliance", eyebrow: "ORG OPS", icon: "📤", desc: "Generate org-scoped compliance reporting." },
  observability: { title: "Observability", eyebrow: "ORG OPS", icon: "🩺", desc: "Inspect tenant health and operational status." },
};

const STAFF_ROLES = ["owner", "org_admin", "instructor", "moderator", "finance", "support", "mentor"] as const;

export default async function OrgAdminModulePage({
  params,
}: {
  params: Promise<{ orgSlug: string; adminPath?: string[] }>;
}) {
  const { orgSlug, adminPath = [] } = await params;
  const ctx = await getOrgContextOr404(orgSlug);
  requireOrgRole(ctx, STAFF_ROLES);

  const key = adminPath.join("/");
  const mod = MODULES[key] ?? {
    title: titleize(adminPath.at(-1) || "Admin"),
    eyebrow: "ORG ADMIN",
    icon: "🛡️",
    desc: "Org-scoped admin workspace.",
  };

  const sb = supabaseAdmin();
  const [members, active, lessons, assignments, auditRows] = await Promise.all([
    sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id).eq("status", "active"),
    sb.from("courses").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    sb.from("org_assignments").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    sb.from("org_audit_log")
      .select("id, action, target, created_at, users:actor_id(name)")
      .eq("org_id", ctx.org.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const audits = (auditRows.data || []) as Array<{
    id: string;
    action: string;
    target: string | null;
    created_at: string;
    users: { name: string | null } | null;
  }>;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <section style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.16), rgba(30,136,229,0.08))",
        border: "1px solid rgba(171,71,188,0.26)",
        borderRadius: 16,
        padding: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <div style={{ fontSize: 42, flexShrink: 0 }}>{mod.icon}</div>
          <div style={{ minWidth: 0 }}>
            <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, background: "rgba(171,71,188,0.22)", color: "#EC5CFF", fontSize: 11, fontWeight: 900, letterSpacing: 0.6 }}>
              {mod.eyebrow}
            </span>
            <h1 style={{ margin: "8px 0 4px", color: "#E8EDF5", fontSize: 30, fontWeight: 900 }}>{mod.title}</h1>
            <p style={{ margin: 0, color: "#A9B4C7", fontSize: 15 }}>{mod.desc}</p>
            <p style={{ margin: "8px 0 0", color: "#6F7D95", fontSize: 13 }}>{ctx.org.name}</p>
          </div>
        </div>
        <Link href={`/o/${orgSlug}/admin/users`} style={buttonPrimary}>Manage users</Link>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Stat label="Members" value={members.count ?? 0} color="#1E88E5" />
        <Stat label="Active" value={active.count ?? 0} color="#66BB6A" />
        <Stat label="Courses" value={lessons.count ?? 0} color="#FFC107" />
        <Stat label="Assignments" value={assignments.count ?? 0} color="#EF5350" />
      </div>

      <section style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: "#E8EDF5", fontSize: 18 }}>Quick Actions</h2>
          <Link href={`/o/${orgSlug}/audit`} style={linkStyle}>Full log →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {[
            ["👥", "Manage Users", `/o/${orgSlug}/admin/users`],
            ["📚", "Create Course", `/o/${orgSlug}/instructor/create-course`],
            ["📣", "Broadcast", `/o/${orgSlug}/announcements`],
            ["🔒", "Security", `/o/${orgSlug}/admin/security-center`],
            ["📜", "Audit Logs", `/o/${orgSlug}/admin/audit-logs`],
            ["📁", "Files", `/o/${orgSlug}/files`],
          ].map(([icon, label, href]) => (
            <Link key={href} href={href} style={actionTile}>
              <span style={{ fontSize: 30 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section style={panel}>
        <h2 style={{ margin: "0 0 14px", color: "#E8EDF5", fontSize: 18 }}>Recent org activity</h2>
        {audits.length === 0 ? (
          <p style={{ color: "#8892A4", margin: 0 }}>No recent activity.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {audits.map((row) => (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ color: "#E8EDF5", fontWeight: 800 }}>{row.action}</div>
                  <div style={{ color: "#6F7D95", fontSize: 12 }}>{row.users?.name || "System"}{row.target ? ` · ${row.target}` : ""}</div>
                </div>
                <time style={{ color: "#8892A4", fontSize: 12 }}>{new Date(row.created_at).toLocaleDateString()}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ ...panel, borderLeft: `4px solid ${color}` }}>
      <div style={{ color: color, fontSize: 30, fontWeight: 900 }}>{value.toLocaleString()}</div>
      <div style={{ color: "#A9B4C7", fontSize: 13 }}>{label}</div>
    </div>
  );
}

function titleize(input: string) {
  return input.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

const panel: React.CSSProperties = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 22,
};

const buttonPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
  color: "#fff",
  textDecoration: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const linkStyle: React.CSSProperties = {
  color: "#1E88E5",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
};

const actionTile: React.CSSProperties = {
  minHeight: 112,
  background: "#0A0E1A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  color: "#A9B4C7",
  textDecoration: "none",
  fontWeight: 800,
};
