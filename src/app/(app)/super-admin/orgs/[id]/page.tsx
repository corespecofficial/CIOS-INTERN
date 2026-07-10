import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { OrgStatusControls } from "../org-status-controls";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SuperAdminOrgDetailPage({ params }: Props) {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") redirect("/dashboard");
  const { id } = await params;
  const sb = supabaseAdmin();

  const { data: orgData } = await sb
    .from("creative_orgs")
    .select("id, slug, name, status, plan, member_count, active_intern_count, staff_count, intern_limit, org_type, module_flags, last_activity_at, created_at, owner:users!creative_orgs_owner_user_id_fkey(id, name, email)")
    .eq("id", id)
    .maybeSingle();
  if (!orgData) notFound();

  const org = orgData as {
    id: string;
    slug: string;
    name: string;
    status: "active" | "suspended" | "archived";
    plan: string;
    member_count: number;
    active_intern_count: number | null;
    staff_count: number | null;
    intern_limit: number | null;
    org_type: string | null;
    module_flags: Record<string, boolean> | null;
    last_activity_at: string | null;
    created_at: string;
    owner: { id: string; name: string; email: string } | null;
  };

  const [membersRes, auditRes, eventsRes] = await Promise.all([
    sb.from("org_members")
      .select("id, role, status, joined_at, user:users!org_members_user_id_fkey(id, name, email)")
      .eq("org_id", org.id)
      .order("joined_at", { ascending: false })
      .limit(100),
    sb.from("org_audit_log")
      .select("id, action, target, meta, created_at, actor:users!org_audit_log_actor_id_fkey(name, email)")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20),
    sb.from("platform_org_events")
      .select("id, event_type, metadata, created_at")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const members = (membersRes.data || []) as Array<{ id: string; role: string; status: string; joined_at: string; user: { id: string; name: string | null; email: string | null } | null }>;
  const audit = (auditRes.data || []) as Array<{ id: string; action: string; target: string | null; meta: Record<string, unknown> | null; created_at: string; actor: { name: string | null; email: string | null } | null }>;
  const events = (eventsRes.data || []) as Array<{ id: string; event_type: string; metadata: Record<string, unknown> | null; created_at: string }>;
  const roleCounts = members.reduce<Record<string, number>>((acc, member) => {
    if (member.status === "active") acc[member.role] = (acc[member.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 1180, padding: "32px 40px" }}>
      <Link href="/super-admin/orgs" style={{ color: "#8892A4", fontSize: 12, textDecoration: "none" }}>Back to org operations</Link>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", margin: "12px 0 18px" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>{org.name}</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: 0 }}>
            /{org.slug} · {org.org_type || "creative_space"} · {org.plan} plan · created {new Date(org.created_at).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href={`/o/${org.slug}`} style={buttonLink}>Preview staff portal</Link>
          <Link href={`/s/${org.slug}`} style={buttonGhost}>Preview intern portal</Link>
          <OrgStatusControls orgId={org.id} status={org.status} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Metric title="Status" value={org.status} />
        <Metric title="Interns" value={`${org.active_intern_count ?? 0}/${org.intern_limit ?? 50}`} />
        <Metric title="Staff" value={org.staff_count ?? 0} />
        <Metric title="Members" value={org.member_count ?? 0} />
        <Metric title="Last activity" value={org.last_activity_at ? new Date(org.last_activity_at).toLocaleDateString() : "-"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16, alignItems: "start" }}>
        <section style={panelStyle}>
          <h2 style={sectionTitle}>Members</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.entries(roleCounts).map(([role, count]) => (
              <span key={role} style={pillStyle}>{labelRole(role)}: {count}</span>
            ))}
          </div>
          <div style={{ display: "grid" }}>
            {members.map((member) => (
              <div key={member.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px 110px", gap: 10, padding: "10px 0", borderTop: "1px solid #1F2937", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 700 }}>{member.user?.name || "Unknown"}</div>
                  <div style={{ color: "#5A6478", fontSize: 11 }}>{member.user?.email || "-"}</div>
                </div>
                <span style={pillStyle}>{labelRole(member.role)}</span>
                <span style={{ color: member.status === "active" ? "#26A69A" : "#8892A4", fontSize: 11, textTransform: "uppercase" }}>{member.status}</span>
              </div>
            ))}
          </div>
        </section>

        <aside style={panelStyle}>
          <h2 style={sectionTitle}>Settings & Modules</h2>
          <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.7, marginBottom: 12 }}>
            Owner: <strong style={{ color: "#E8EDF5" }}>{org.owner?.name ?? "-"}</strong><br />
            {org.owner?.email ?? "-"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(org.module_flags ?? {}).map(([key, enabled]) => (
              <span key={key} style={{ ...pillStyle, color: enabled ? "#26A69A" : "#5A6478" }}>{key}</span>
            ))}
          </div>
        </aside>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Timeline title="Audit" items={audit.map((row) => ({ id: row.id, title: row.action, body: row.target || row.actor?.email || "-", at: row.created_at }))} />
        <Timeline title="Platform Events" items={events.map((row) => ({ id: row.id, title: row.event_type, body: String(row.metadata?.role ?? row.metadata?.name ?? row.id), at: row.created_at }))} />
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 22, color: "#E8EDF5", fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Timeline({ title, items }: { title: string; items: Array<{ id: string; title: string; body: string; at: string }> }) {
  return (
    <section style={panelStyle}>
      <h2 style={sectionTitle}>{title}</h2>
      {items.length === 0 ? (
        <div style={{ color: "#5A6478", fontSize: 12 }}>No rows yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <div key={item.id} style={{ borderTop: "1px solid #1F2937", paddingTop: 10 }}>
              <div style={{ color: "#E8EDF5", fontSize: 12, fontWeight: 800 }}>{item.title}</div>
              <div style={{ color: "#5A6478", fontSize: 11, marginTop: 2 }}>{item.body} · {new Date(item.at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function labelRole(role: string) {
  if (role === "student") return "Intern";
  if (role === "org_admin") return "Org admin";
  return role.charAt(0).toUpperCase() + role.slice(1).replace("_", " ");
}

const panelStyle: React.CSSProperties = { background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, margin: "0 0 12px" };
const pillStyle: React.CSSProperties = { display: "inline-flex", padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,0.05)", color: "#8892A4", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 800 };
const buttonLink: React.CSSProperties = { padding: "8px 12px", background: "transparent", color: "#1E88E5", border: "1px solid #1E88E5", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" };
const buttonGhost: React.CSSProperties = { padding: "8px 12px", background: "#111827", color: "#8892A4", border: "1px solid #1F2937", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" };
