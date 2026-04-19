"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOfficerAccess, type GovOfficer, type GovAgency, type NationalStats } from "@/app/actions/gov-portal";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#10B981",
  red: "#EF5350",
};

interface Props {
  officer: GovOfficer | null;
  agencies: GovAgency[];
  stats: NationalStats | null;
}

export default function GovPortalClient({ officer, agencies, stats }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!officer) {
    return <RequestAccess agencies={agencies} pending={pending} startTransition={startTransition} err={err} setErr={setErr} onRequested={() => router.refresh()} />;
  }

  if (officer.status === "pending") {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "60px 20px", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>⏳</div>
        <h1 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 800 }}>Access pending</h1>
        <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.7 }}>
          Your {officer.agency_name} officer request is under review. Approval typically takes 1–3 business days.
          <br />Once approved, you&apos;ll see the national registry and compliance dashboards here.
        </p>
      </div>
    );
  }

  if (officer.status === "suspended") {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "60px 20px", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>🚫</div>
        <h1 style={{ color: C.red, fontSize: 22 }}>Access suspended</h1>
        <p style={{ color: C.dim, fontSize: 14 }}>Contact platform admin for reinstatement.</p>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .gov-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        @media (max-width: 900px) { .gov-stats { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "inline-block", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>
          🏦 {officer.agency_code} Portal
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>National Registry</h1>
        <p style={{ margin: "4px 0 0", color: C.dim, fontSize: 13 }}>
          {officer.agency_name} · {officer.role_title ?? "Officer"} {officer.region ? `· ${officer.region}` : ""}
        </p>
      </div>

      {stats && (
        <div className="gov-stats" style={{ marginBottom: 24 }}>
          <Stat label="Total Interns" value={stats.total_interns.toLocaleString()} color="#4DA8FF" />
          <Stat label="Institutions" value={stats.active_institutions.toLocaleString()} color="#AB47BC" />
          <Stat label="Companies" value={stats.active_companies.toLocaleString()} color="#FF7043" />
          <Stat label="Certificates" value={stats.certificates_issued.toLocaleString()} color="#FFC107" />
          <Stat label="Compliance" value={`${stats.compliant_percentage}%`} color={C.accent} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginTop: 24 }}>
        <ActionCard emoji="📋" title="National Registry" description="Search and verify any intern in the national database." />
        <ActionCard emoji="📊" title="Compliance Reports" description="Generate SIWES, NYSC, and NABCO compliance reports." />
        <ActionCard emoji="🏛" title="Institution Oversight" description="View all registered institutions and their cohort data." />
        <ActionCard emoji="🏢" title="Company Accreditation" description="Manage accredited companies and placement approvals." />
        <ActionCard emoji="💰" title="Allowance Disbursement" description="Approve monthly allowances for eligible participants." />
        <ActionCard emoji="🚨" title="Fraud Detection" description="Flagged certificates and duplicate registrations." />
      </div>

      <div style={{ marginTop: 24, padding: 18, background: `rgba(16,185,129,0.06)`, border: `1px solid ${C.accent}33`, borderRadius: 10, fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
        💡 Full registry search, compliance PDF export, and API integration with legacy government systems are in the next release. Approved officers will be notified via email.
      </div>
    </div>
  );
}

function ActionCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, cursor: "default" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{title}</div>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

function RequestAccess({ agencies, pending, startTransition, err, setErr, onRequested }: { agencies: GovAgency[]; pending: boolean; startTransition: (cb: () => void) => void; err: string | null; setErr: (e: string | null) => void; onRequested: () => void }) {
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
  const [role, setRole] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [region, setRegion] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!agencyId) { setErr("Select an agency"); return; }
    startTransition(async () => {
      const res = await requestOfficerAccess({ agency_id: agencyId, role_title: role, officer_id: officerId, region });
      if (!res.ok) { setErr(res.error); return; }
      onRequested();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "40px 20px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "inline-block", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>
        🏦 Government Portal
      </div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Request officer access.</h1>
      <p style={{ margin: "6px 0 24px", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
        For verified officers of NYSC, ITF, NABCO, YEA. Your access will be reviewed and approved by platform admin within 1–3 business days.
      </p>

      <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <label style={lbl}>Agency</label>
        <select value={agencyId} onChange={(e) => setAgencyId(e.target.value)} style={inp}>
          {agencies.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
        </select>

        <label style={lbl}>Your role (e.g. Compliance Officer)</label>
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Compliance Officer" style={inp} />

        <label style={lbl}>Officer ID (optional)</label>
        <input value={officerId} onChange={(e) => setOfficerId(e.target.value)} placeholder="E.g. ITF/COM/2024/12345" style={inp} />

        <label style={lbl}>Region / State</label>
        <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Lagos, Abuja, National…" style={inp} />

        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>{err}</div>}

        <button type="submit" disabled={pending} style={{ width: "100%", padding: "12px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 8 }}>
          {pending ? "Submitting…" : "Submit Request →"}
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 };
