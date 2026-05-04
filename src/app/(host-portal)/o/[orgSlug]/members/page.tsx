/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string; q?: string; page?: string }>;
}

interface MemberRow {
  id: string;
  role: string;
  status: string;
  joined_at: string;
  user: { id: string; name: string; email: string; avatar_url: string | null } | null;
}

const PAGE_SIZE = 50;

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  org_admin: "Org admins",
  instructor: "Instructors",
  student: "Students",
};

const ROLE_TINTS: Record<string, string> = {
  owner: "#FFC107",
  org_admin: "#A855F7",
  instructor: "#26C6DA",
  student: "#1E88E5",
};

export default async function MembersPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { role: roleFilter, q, page: pageStr } = await searchParams;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseAdmin();

  // Per-role count query — single grouped fetch so the role pills
  // render with live counts even when a filter is applied.
  const { data: roleCountsRaw } = await sb
    .from("org_members")
    .select("role")
    .eq("org_id", ctx.org.id)
    .eq("status", "active");
  const roleCounts: Record<string, number> = { owner: 0, org_admin: 0, instructor: 0, student: 0 };
  for (const r of (roleCountsRaw || []) as { role: string }[]) {
    roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
  }
  const totalActive = Object.values(roleCounts).reduce((a, b) => a + b, 0);

  // Filtered + paginated page of members.
  let pageQuery = sb
    .from("org_members")
    .select(
      "id, role, status, joined_at, user:users!org_members_user_id_fkey(id, name, email, avatar_url)",
      { count: "exact" },
    )
    .eq("org_id", ctx.org.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false })
    .range(from, to);
  if (roleFilter) pageQuery = pageQuery.eq("role", roleFilter);

  const { data: pageData, count } = await pageQuery;
  let members = (pageData || []) as unknown as MemberRow[];
  // Free-text filter (name/email contains q) — applied in JS over the
  // already-narrow page so we don't pay for a full-table scan.
  if (q) {
    const needle = q.toLowerCase();
    members = members.filter((m) =>
      (m.user?.name || "").toLowerCase().includes(needle) ||
      (m.user?.email || "").toLowerCase().includes(needle),
    );
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div style={{ maxWidth: 920 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Members</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 18px 0" }}>
        {totalActive} active in {ctx.org.name}
      </p>

      {/* Role filter chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Link
          href={`/o/${orgSlug}/members${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          style={chipStyle(!roleFilter, "#1E88E5")}
        >
          All ({totalActive})
        </Link>
        {(["owner", "org_admin", "instructor", "student"] as const).map((r) => (
          <Link
            key={r}
            href={`/o/${orgSlug}/members?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            style={chipStyle(roleFilter === r, ROLE_TINTS[r])}
          >
            {ROLE_LABELS[r]} ({roleCounts[r]})
          </Link>
        ))}
      </div>

      {/* Search box — GET form so URL stays bookmarkable + share-able */}
      <form action={`/o/${orgSlug}/members`} method="GET" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Filter by name or email…"
          aria-label="Filter members"
          style={{ flex: 1, padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }}
        />
        <button type="submit" style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Filter</button>
      </form>

      {members.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          {q || roleFilter ? "No members match." : "No members yet."}
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
          {members.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderTop: i === 0 ? "none" : "1px solid #1F2937",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#1E2937",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#8892A4",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {m.user?.avatar_url ? <img src={m.user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (m.user?.name?.[0]?.toUpperCase() ?? "?")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.user?.name ?? "Unknown"}</span>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: `${ROLE_TINTS[m.role] || "#5A6478"}22`, color: ROLE_TINTS[m.role] || "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                    {m.role}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#5A6478" }}>{m.user?.email}</div>
              </div>
              <div style={{ fontSize: 11, color: "#5A6478", whiteSpace: "nowrap" }}>
                Joined {new Date(m.joined_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "center" }}>
          {page > 1 && <Link href={pageHref(orgSlug, page - 1, roleFilter, q)} style={pagerStyle}>← Prev</Link>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={pageHref(orgSlug, page + 1, roleFilter, q)} style={pagerStyle}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

function chipStyle(active: boolean, tint: string): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    background: active ? `${tint}22` : "rgba(255,255,255,0.04)",
    border: `1px solid ${active ? `${tint}55` : "rgba(255,255,255,0.08)"}`,
    color: active ? tint : "#8892A4",
    fontSize: 11,
    fontWeight: 700,
    textDecoration: "none",
  };
}

const pagerStyle: React.CSSProperties = { display: "inline-block", padding: "6px 12px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#8892A4", fontSize: 12, textDecoration: "none" };

function pageHref(slug: string, page: number, role?: string, q?: string): string {
  const parts = [`page=${page}`];
  if (role) parts.push(`role=${encodeURIComponent(role)}`);
  if (q) parts.push(`q=${encodeURIComponent(q)}`);
  return `/o/${slug}/members?${parts.join("&")}`;
}
