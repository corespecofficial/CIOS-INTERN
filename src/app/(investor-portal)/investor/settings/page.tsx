import Link from "next/link";
import { getMyInvestorProfile } from "@/app/actions/investor";

export const dynamic = "force-dynamic";

const ACCENT = "#10B981";
const INK = "#F8FAFC";
const DIM = "#94A3B8";

export default async function InvestorSettingsPage() {
  const res = await getMyInvestorProfile();
  const p = res.ok ? res.data : null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ padding: 22, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: INK }}>Profile</h2>
        <p style={{ margin: 0, fontSize: 12, color: DIM }}>How founders see you when you express interest.</p>
        <Row label="Name" value={p?.full_name ?? "—"} />
        <Row label="Headline" value={p?.headline ?? "—"} />
        <Row label="Country" value={p?.country ?? "—"} />
        <Row label="LinkedIn" value={p?.linkedin_url ?? "—"} />
      </div>

      <div style={{ padding: 22, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: INK }}>Thesis & cheque</h2>
        <p style={{ margin: 0, fontSize: 12, color: DIM }}>Drives your deal-flow filtering.</p>
        <Row label="Accreditation" value={p?.accreditation ?? "—"} />
        <Row label="Organisation" value={p?.org_name ?? "—"} />
        <Row label="Cheque range (USD)" value={p?.cheque_min_usd && p?.cheque_max_usd ? `$${p.cheque_min_usd.toLocaleString()} – $${p.cheque_max_usd.toLocaleString()}` : "—"} />
        <Row label="Categories" value={p?.preferred_categories?.join(", ") || "—"} />
        <Row label="Stages" value={p?.preferred_stages?.join(", ") || "—"} />
        <Row label="Geographies" value={p?.preferred_geos?.join(", ") || "—"} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Link
          href="/investor/onboarding"
          style={{
            padding: "11px 22px",
            borderRadius: 12,
            background: `linear-gradient(135deg, ${ACCENT}, #059669)`,
            color: "#fff",
            fontSize: 13,
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "0 12px 26px -10px rgba(16,185,129,0.6)",
          }}
        >
          Re-run onboarding to edit
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 10 }}>
      <div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, color: INK }}>{value}</div>
    </div>
  );
}
