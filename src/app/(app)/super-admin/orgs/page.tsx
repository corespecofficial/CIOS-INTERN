import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { OrgStatusControls } from "./org-status-controls";
import { OrgsLiveRefresh } from "./orgs-live-refresh";

export const dynamic = "force-dynamic";

interface OrgRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  member_count: number;
  active_intern_count: number | null;
  staff_count: number | null;
  intern_limit: number | null;
  org_type: string | null;
  last_activity_at: string | null;
  created_at: string;
  owner: { id: string; name: string; email: string } | null;
}

interface PlatformLimits {
  max_active_orgs: number;
  max_active_intern_memberships: number;
  reserved_org_seats: number;
  reserved_intern_seats: number;
}

const PAGE_SIZE = 50;

export default async function SuperAdminOrgsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") redirect("/dashboard");

  const { page: pageStr, q, status } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseAdmin();
  const [
    limitsRes,
    activeOrgsRes,
    suspendedOrgsRes,
    archivedOrgsRes,
    internsRes,
    pendingSpacesRes,
    recentEventsRes,
  ] = await Promise.all([
    sb.from("org_platform_limits").select("max_active_orgs, max_active_intern_memberships, reserved_org_seats, reserved_intern_seats").eq("key", "default").maybeSingle(),
    sb.from("creative_orgs").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb.from("creative_orgs").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    sb.from("creative_orgs").select("id", { count: "exact", head: true }).eq("status", "archived"),
    sb.from("org_members").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", "active"),
    sb.from("creative_spaces").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("platform_org_events").select("id, org_id, event_type, metadata, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const limits = (limitsRes.data as PlatformLimits | null) ?? {
    max_active_orgs: 100,
    max_active_intern_memberships: 1000,
    reserved_org_seats: 0,
    reserved_intern_seats: 0,
  };
  const activeOrgCount = activeOrgsRes.count ?? 0;
  const suspendedOrgCount = suspendedOrgsRes.count ?? 0;
  const archivedOrgCount = archivedOrgsRes.count ?? 0;
  const activeInternCount = internsRes.count ?? 0;
  const pendingSpaces = pendingSpacesRes.count ?? 0;
  const effectiveOrgLimit = Math.max(0, limits.max_active_orgs - limits.reserved_org_seats);
  const effectiveInternLimit = Math.max(0, limits.max_active_intern_memberships - limits.reserved_intern_seats);
  const quotaWarnings = [
    quotaWarning("Organization quota", activeOrgCount, effectiveOrgLimit),
    quotaWarning("Intern quota", activeInternCount, effectiveInternLimit),
  ].filter(Boolean) as Array<{ label: string; percent: number; severity: "warning" | "critical"; current: number; limit: number }>;

  let query = sb
    .from("creative_orgs")
    .select("id, slug, name, status, plan, member_count, active_intern_count, staff_count, intern_limit, org_type, last_activity_at, created_at, owner:users!creative_orgs_owner_user_id_fkey(id, name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, count } = await query;
  const orgs = (data || []) as unknown as OrgRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const events = (recentEventsRes.data || []) as Array<{ id: string; org_id: string; event_type: string; metadata: Record<string, unknown> | null; created_at: string }>;

  return (
    <div style={{ maxWidth: 1180, padding: "32px 40px" }}>
      <OrgsLiveRefresh />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px 0" }}>Organization Operations</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: 0 }}>
            Multi-tenant control center for Creative Spaces, staff portals, intern portals, and quota safety.
          </p>
        </div>
        <Link href="/super-admin/orgs/health" style={buttonGhost}>Tenant health</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Metric title="Active orgs" value={`${activeOrgCount}/${effectiveOrgLimit}`} pct={pct(activeOrgCount, effectiveOrgLimit)} tint="#26A69A" note={limits.reserved_org_seats ? `${limits.reserved_org_seats} reserved` : undefined} />
        <Metric title="Active interns" value={`${activeInternCount}/${effectiveInternLimit}`} pct={pct(activeInternCount, effectiveInternLimit)} tint="#1E88E5" note={limits.reserved_intern_seats ? `${limits.reserved_intern_seats} reserved` : undefined} />
        <Metric title="Suspended" value={suspendedOrgCount} tint="#FFA726" />
        <Metric title="Archived" value={archivedOrgCount} tint="#5A6478" />
        <Metric title="Pending applications" value={pendingSpaces} tint="#A855F7" />
      </div>

      {quotaWarnings.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
          {quotaWarnings.map((warning) => (
            <div key={warning.label} style={{
              border: `1px solid ${warning.severity === "critical" ? "#EF5350" : "#FFA726"}`,
              background: warning.severity === "critical" ? "rgba(239,83,80,0.10)" : "rgba(255,167,38,0.10)",
              color: warning.severity === "critical" ? "#FFCDD2" : "#FFE0B2",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: 700,
            }}>
              {warning.label} is at {warning.percent}% ({warning.current}/{warning.limit}). Review pending joins, raise limits, or reserve seats before accepting more organizations/interns.
            </div>
          ))}
        </div>
      )}

      <form style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input name="q" defaultValue={q ?? ""} placeholder="Search by org name..." style={{ flex: 1, padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }} />
        <select name="status" defaultValue={status ?? ""} style={{ padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
        <button type="submit" style={buttonPrimary}>Filter</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, alignItems: "start" }}>
        {orgs.length === 0 ? (
          <div style={emptyStyle}>No orgs match.</div>
        ) : (
          <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
            {orgs.map((o, i) => (
              <div key={o.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px 110px auto auto", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid #1F2937" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <Link href={`/super-admin/orgs/${o.id}`} style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", textDecoration: "none" }}>{o.name}</Link>
                    <span style={{ fontSize: 11, color: "#5A6478", fontFamily: "ui-monospace, monospace" }}>/{o.slug}</span>
                    <Status value={o.status} />
                    <span style={tinyPill}>{o.org_type || "creative_space"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>
                    Owner: {o.owner?.name ?? "-"} · {o.owner?.email ?? "-"} · {o.plan} plan · created {new Date(o.created_at).toLocaleDateString()}
                  </div>
                </div>
                <MiniCount value={o.active_intern_count ?? 0} label={`interns / ${o.intern_limit ?? 50}`} />
                <MiniCount value={o.staff_count ?? 0} label="staff" />
                <Link href={`/o/${o.slug}`} style={buttonLink}>Preview</Link>
                <OrgStatusControls orgId={o.id} status={o.status as "active" | "suspended" | "archived"} />
              </div>
            ))}
          </div>
        )}

        <aside style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 10px" }}>Live platform events</h2>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: "#5A6478" }}>No events yet. This panel refreshes live via Ably and every 30 seconds.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {events.map((event) => (
                <div key={event.id} style={{ paddingBottom: 10, borderBottom: "1px solid #1F2937" }}>
                  <div style={{ fontSize: 12, color: "#E8EDF5", fontWeight: 700 }}>{event.event_type}</div>
                  <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>
                    {String(event.metadata?.name ?? event.metadata?.role ?? event.org_id)} · {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          {page > 1 && <Link href={`?page=${page - 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`} style={pagerStyle}>Prev</Link>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?page=${page + 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`} style={pagerStyle}>Next</Link>}
        </div>
      )}
    </div>
  );
}

function Metric({ title, value, pct: percent, tint, note }: { title: string; value: string | number; pct?: number; tint: string; note?: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 24, color: "#E8EDF5", fontWeight: 900, marginTop: 4 }}>{value}</div>
      {note && <div style={{ fontSize: 10, color: "#5A6478", marginTop: 2 }}>{note}</div>}
      {percent != null && (
        <div style={{ height: 5, background: "#0A0E1A", borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
          <div style={{ width: `${Math.min(100, percent)}%`, height: "100%", background: percent >= 95 ? "#EF5350" : percent >= 80 ? "#FFA726" : tint }} />
        </div>
      )}
    </div>
  );
}

function MiniCount({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const colors: Record<string, string> = { active: "#26A69A", suspended: "#FF8A80", archived: "#5A6478" };
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${colors[value] || "#5A6478"}22`, color: colors[value] || "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{value}</span>;
}

function pct(value: number, max: number) {
  if (!max) return 0;
  return Math.round((value / max) * 100);
}

function quotaWarning(label: string, current: number, limit: number) {
  const percent = pct(current, limit);
  if (percent >= 95) return { label, percent, severity: "critical" as const, current, limit };
  if (percent >= 80) return { label, percent, severity: "warning" as const, current, limit };
  return null;
}

const tinyPill: React.CSSProperties = { fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "rgba(255,255,255,0.05)", color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 };
const buttonPrimary: React.CSSProperties = { padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const buttonGhost: React.CSSProperties = { padding: "8px 12px", background: "#111827", color: "#8892A4", border: "1px solid #1F2937", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" };
const buttonLink: React.CSSProperties = { padding: "6px 12px", background: "transparent", color: "#1E88E5", border: "1px solid #1E88E5", borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: "none", textAlign: "center" };
const pagerStyle: React.CSSProperties = { display: "inline-block", padding: "6px 12px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#8892A4", fontSize: 12, textDecoration: "none" };
const emptyStyle: React.CSSProperties = { background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 };
