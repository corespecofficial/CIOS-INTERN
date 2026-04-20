import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getPublicPortalsOverview } from "@/app/actions/public-portals-overview";

export const dynamic = "force-dynamic";

/**
 * Super-admin-only dashboard that aggregates activity across every public
 * portal. Phase 0 ships the skeleton — each portal tile starts out showing
 * only baseline counts; per-portal KPIs become real as phases 1-7 land.
 */
export default async function SuperAdminPublicPortalsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "super_admin") redirect("/dashboard");

  const res = await getPublicPortalsOverview();
  const data = res.ok ? res.data : null;

  const totalCards = [
    { label: "Public users", value: data?.totals.publicUsers ?? 0, color: "#64748B", href: "/super-admin/users?role=public_user" },
    { label: "Investors", value: data?.totals.investors ?? 0, color: "#10B981", href: "/super-admin/users?role=investor" },
    { label: "Startup founders", value: data?.totals.startupFounders ?? 0, color: "#F97316", href: "/super-admin/users?role=startup_founder" },
    { label: "Partner orgs", value: data?.totals.partnerOrgs ?? 0, color: "#0EA5E9", href: "/super-admin/users?role=partner_org" },
    { label: "Live ephemeral uploads", value: data?.totals.ephemeralUploads24h ?? 0, color: "#FBBF24", href: "#" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 0 60px", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#8892A4", fontWeight: 800, textTransform: "uppercase" }}>
          Super admin · Oversight
        </div>
        <h1 style={{ margin: "6px 0 0", fontSize: 30, fontWeight: 900, letterSpacing: -0.8, color: "#F8FAFC" }}>
          Public Portals
        </h1>
        <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: 14, lineHeight: 1.55, maxWidth: 720 }}>
          Live view of every public-facing portal. Counts, conversion, ephemeral
          uploads, and revenue roll up here. Each tile fills in with real metrics
          as its portal ships (see <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>docs/public-portals-masterplan.md</code>).
        </p>
      </div>

      {!res.ok && (
        <div style={{ padding: "14px 18px", background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.35)", borderRadius: 12, color: "#FCA5A5", fontSize: 13, marginBottom: 18 }}>
          {res.error}
        </div>
      )}

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 28 }}>
        {totalCards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,255,255,0.07)`,
              borderLeft: `3px solid ${c.color}`,
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "transform 120ms ease, background 120ms ease",
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#8892A4", fontWeight: 800 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
              {c.value.toLocaleString()}
            </div>
          </Link>
        ))}
      </div>

      {/* Per-portal tiles */}
      <h2 style={{ fontSize: 14, color: "#94A3B8", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 14px" }}>
        Portal rollout
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {data?.tiles.map((t) => (
          <div
            key={t.id}
            style={{
              padding: 18,
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#F8FAFC", letterSpacing: -0.3 }}>{t.label}</div>
              {t.notes && (
                <span style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 800, color: "#60A5FA", background: "rgba(30,136,229,0.12)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase" }}>
                  {t.notes}
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: 12 }}>
              <Kv label="Users" value={t.publicUsers} />
              <Kv label="Active/wk" value={t.activeThisWeek} />
              <Kv label="New/wk" value={t.signedUpThisWeek} />
              <Kv label="Rev /mo ₦" value={t.revenueThisMonth} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Link href={t.href} style={{ fontSize: 12, color: "#60A5FA", textDecoration: "none", fontWeight: 700 }}>
                Preview portal →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.025)", borderRadius: 8 }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: value == null ? "#475569" : "#E2E8F0", fontFamily: "'Space Grotesk', sans-serif" }}>
        {value == null ? "—" : value.toLocaleString()}
      </div>
    </div>
  );
}
