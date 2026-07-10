import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

const TABLES = [
  "creative_orgs",
  "org_members",
  "org_invites",
  "org_channels",
  "org_announcements",
  "org_lessons",
  "org_assignments",
  "org_files",
  "org_messages",
  "org_audit_log",
  "org_lesson_completions",
  "platform_org_events",
  "org_platform_limits",
] as const;

type HealthSnapshot = {
  tables?: Array<{ name: string; exists: boolean }>;
  rls?: Array<{ name: string; enabled: boolean; policies: number }>;
  functions?: Array<{ name: string; exists: boolean }>;
  orphans?: { spaces_with_missing_org?: number; orgs_with_missing_space?: number };
  count_drift?: number;
  checked_at?: string;
};

export default async function TenantHealthPage() {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") redirect("/dashboard");
  const sb = supabaseAdmin();

  const { data: snapshotData, error: snapshotError } = await sb.rpc("tenant_health_snapshot");
  const snapshot = snapshotData as HealthSnapshot | null;

  const tableChecks = await Promise.all(TABLES.map(async (table) => {
    const { error } = await sb.from(table).select("*", { count: "exact", head: true });
    return { name: table, exists: !error, error: error?.message ?? null };
  }));

  const [orphanSpacesRes, orphanOrgsRes, driftRes] = await Promise.all([
    sb.from("creative_spaces").select("id", { count: "exact", head: true }).not("org_id", "is", null),
    sb.from("creative_orgs").select("id", { count: "exact", head: true }).is("space_id", null),
    sb.from("creative_orgs").select("id, name, member_count, active_intern_count, staff_count"),
  ]);

  const orgs = (driftRes.data || []) as Array<{ id: string; name: string; member_count: number; active_intern_count: number | null; staff_count: number | null }>;
  const driftRows = await Promise.all(orgs.map(async (org) => {
    const [members, interns, staff] = await Promise.all([
      sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "active"),
      sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "active").eq("role", "student"),
      sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "active").neq("role", "student"),
    ]);
    const expectedMembers = members.count ?? 0;
    const expectedInterns = interns.count ?? 0;
    const expectedStaff = staff.count ?? 0;
    const drift = expectedMembers !== org.member_count || expectedInterns !== (org.active_intern_count ?? 0) || expectedStaff !== (org.staff_count ?? 0);
    return { ...org, expectedMembers, expectedInterns, expectedStaff, drift };
  }));

  const effectiveTables = snapshot?.tables ?? tableChecks;
  const driftCount = snapshot?.count_drift ?? driftRows.filter((row) => row.drift).length;

  return (
    <div style={{ maxWidth: 980, padding: "32px 40px" }}>
      <Link href="/super-admin/orgs" style={{ color: "#8892A4", fontSize: 12, textDecoration: "none" }}>Back to org operations</Link>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: "12px 0 4px" }}>Tenant Health</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 20px" }}>
        Read-only checks for tenant migrations, RLS, orphan records, and denormalized count drift.
      </p>

      {snapshotError && (
        <section style={{ ...panelStyle, borderColor: "#92400E", background: "#1A1207" }}>
          <h2 style={titleStyle}>Health RPC needs repair</h2>
          <div style={{ color: "#FDBA74", fontSize: 12 }}>
            The tenant tables are reachable, but `tenant_health_snapshot()` returned an error. Run the latest p397 hotfix block so the health page can read the full RLS/RPC snapshot.
          </div>
          <div style={{ color: "#5A6478", fontSize: 10, marginTop: 6 }}>Supabase error: {snapshotError.message}</div>
        </section>
      )}

      <section style={panelStyle}>
        <h2 style={titleStyle}>Required tables</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          {effectiveTables.map((check) => (
            <div key={check.name} style={{ padding: 10, borderRadius: 8, background: "#0A0E1A", border: "1px solid #1F2937" }}>
              <div style={{ color: check.exists ? "#26A69A" : "#EF5350", fontSize: 12, fontWeight: 800 }}>
                {check.exists ? "OK" : "Missing"} - {check.name}
              </div>
              {"error" in check && check.error && <div style={{ color: "#5A6478", fontSize: 10, marginTop: 4 }}>{check.error}</div>}
            </div>
          ))}
        </div>
      </section>

      {snapshot?.functions && (
        <section style={panelStyle}>
          <h2 style={titleStyle}>Required RPC helpers</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
            {snapshot.functions.map((check) => (
              <div key={check.name} style={{ padding: 10, borderRadius: 8, background: "#0A0E1A", border: "1px solid #1F2937" }}>
                <div style={{ color: check.exists ? "#26A69A" : "#EF5350", fontSize: 12, fontWeight: 800 }}>
                  {check.exists ? "OK" : "Missing"} - {check.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {snapshot?.rls && (
        <section style={panelStyle}>
          <h2 style={titleStyle}>RLS coverage</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {snapshot.rls.map((check) => (
              <div key={check.name} style={{ padding: 10, borderRadius: 8, background: "#0A0E1A", border: "1px solid #1F2937" }}>
                <div style={{ color: check.enabled ? "#26A69A" : "#EF5350", fontSize: 12, fontWeight: 800 }}>
                  {check.enabled ? "Enabled" : "Disabled"} - {check.name}
                </div>
                <div style={{ color: "#5A6478", fontSize: 10, marginTop: 4 }}>{check.policies} policies</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={panelStyle}>
        <h2 style={titleStyle}>Orphans</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
          <Metric label="Spaces with missing org" value={snapshot?.orphans?.spaces_with_missing_org ?? orphanSpacesRes.count ?? 0} />
          <Metric label="Orgs with missing space" value={snapshot?.orphans?.orgs_with_missing_space ?? orphanOrgsRes.count ?? 0} />
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={titleStyle}>Count drift</h2>
        {driftCount === 0 ? (
          <div style={{ color: "#26A69A", fontSize: 13, fontWeight: 700 }}>No count drift detected.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {driftRows.filter((row) => row.drift).map((row) => (
              <div key={row.id} style={{ color: "#E8EDF5", fontSize: 12, padding: 10, borderRadius: 8, background: "#0A0E1A", border: "1px solid #1F2937" }}>
                {row.name}: stored members {row.member_count}, expected {row.expectedMembers}; stored interns {row.active_intern_count ?? 0}, expected {row.expectedInterns}; stored staff {row.staff_count ?? 0}, expected {row.expectedStaff}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 8, padding: 12 }}>
      <div style={{ color: "#8892A4", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 800 }}>{label}</div>
      <div style={{ color: "#E8EDF5", fontSize: 22, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16, marginBottom: 16 };
const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 800, margin: "0 0 12px" };
