/**
 * Super-admin "all creative-host orgs" index. Paginated, denormalized counts —
 * never fetches member rows inline. At 100 orgs this is overkill, but the
 * index is built to scale to 10k orgs without changing.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { OrgStatusControls } from "./org-status-controls";

export const dynamic = "force-dynamic";

interface OrgRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  member_count: number;
  created_at: string;
  owner: { id: string; name: string; email: string } | null;
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
  let query = sb
    .from("creative_orgs")
    .select("id, slug, name, status, plan, member_count, created_at, owner:users!creative_orgs_owner_user_id_fkey(id, name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, count } = await query;
  const orgs = (data || []) as unknown as OrgRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ maxWidth: 1100, padding: "32px 40px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px 0" }}>Creative-host orgs</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 24px 0" }}>
        {total} total · super-admin sees every org
      </p>

      <form style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input name="q" defaultValue={q ?? ""} placeholder="Search by name…" style={{ flex: 1, padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }} />
        <select name="status" defaultValue={status ?? ""} style={{ padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
        <button type="submit" style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Filter</button>
      </form>

      {orgs.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>No orgs match.</div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
          {orgs.map((o, i) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid #1F2937" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <Link href={`/o/${o.slug}`} style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", textDecoration: "none" }}>{o.name}</Link>
                  <span style={{ fontSize: 11, color: "#5A6478", fontFamily: "ui-monospace, monospace" }}>/{o.slug}</span>
                  <Status value={o.status} />
                </div>
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>
                  Owner: {o.owner?.name ?? "—"} · {o.owner?.email ?? "—"} · {o.plan} plan · created {new Date(o.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{o.member_count}</div>
                <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5 }}>members</div>
              </div>
              <Link href={`/o/${o.slug}`} style={{ padding: "6px 12px", background: "transparent", color: "#1E88E5", border: "1px solid #1E88E5", borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Preview →</Link>
              <OrgStatusControls orgId={o.id} status={o.status} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          {page > 1 && <Link href={`?page=${page - 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`} style={pagerStyle}>← Prev</Link>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`?page=${page + 1}${q ? `&q=${q}` : ""}${status ? `&status=${status}` : ""}`} style={pagerStyle}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

function Status({ value }: { value: string }) {
  const colors: Record<string, string> = { active: "#26A69A", suspended: "#FF8A80", archived: "#5A6478" };
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${colors[value] || "#5A6478"}22`, color: colors[value] || "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{value}</span>;
}

const pagerStyle: React.CSSProperties = { display: "inline-block", padding: "6px 12px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#8892A4", fontSize: 12, textDecoration: "none" };
