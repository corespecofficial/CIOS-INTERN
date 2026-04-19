"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyAsPartner, addClient, type Partner, type PartnerClient, type PartnerPayout } from "@/app/actions/partners";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#7C3AED",
  gold: "#FFC107",
  red: "#EF5350",
  green: "#66BB6A",
};

interface Props {
  partner: Partner | null;
  initialClients: PartnerClient[];
  payouts: PartnerPayout[];
}

export default function PartnersClient({ partner, initialClients, payouts }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!partner) return <ApplyForm pending={pending} err={err} setErr={setErr} startTransition={startTransition} onApplied={() => router.refresh()} />;

  if (partner.status === "pending") {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "60px 20px", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>⏳</div>
        <h1 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 800 }}>Application under review</h1>
        <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.7 }}>
          Your reseller application for <strong style={{ color: C.text }}>{partner.agency_name}</strong> is being reviewed.
          We&apos;ll email you within 3 business days.
        </p>
      </div>
    );
  }

  const activeClients = clients.filter((c) => c.status === "active");
  const totalMrr = activeClients.reduce((s, c) => s + c.monthly_mrr_ngn, 0);
  const myShare = Math.round(totalMrr * (partner.revenue_share_pct / 100));

  function handleAdd(input: { client_org_name: string; client_contact: string; tier: PartnerClient["tier"]; monthly_mrr_ngn: number }) {
    setErr(null);
    startTransition(async () => {
      const res = await addClient(partner!.id, input);
      if (!res.ok) { setErr(res.error); return; }
      if (res.data) setClients((prev) => [res.data!, ...prev]);
      setShowAdd(false);
      router.refresh();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        .ptr-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        @media (max-width: 700px) { .ptr-stats { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ marginBottom: 22, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: `${C.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          🤝
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{partner.agency_name}</h1>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>
            {partner.revenue_share_pct}% revenue share · {activeClients.length} active client{activeClients.length === 1 ? "" : "s"}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: "10px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          + Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="ptr-stats" style={{ marginBottom: 24 }}>
        <Stat label="Active Clients" value={String(activeClients.length)} color={C.accent} />
        <Stat label="Client MRR" value={`₦${totalMrr.toLocaleString()}`} color={C.green} />
        <Stat label="Your Share" value={`₦${myShare.toLocaleString()}/mo`} color={C.gold} />
        <Stat label="Pending Payouts" value={String(payouts.filter((p) => p.status === "pending").length)} color="#4DA8FF" />
      </div>

      {showAdd && <AddForm onClose={() => setShowAdd(false)} onSubmit={handleAdd} pending={pending} err={err} />}

      <h3 style={{ fontSize: 13, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>Your Clients</h3>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {clients.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim }}>No clients yet. Add your first one above.</div>
        ) : (
          clients.map((c, i) => (
            <div key={c.id} style={{ padding: "14px 18px", borderBottom: i < clients.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.client_org_name}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{c.client_contact ?? "—"} · Signed {new Date(c.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: `${C.accent}22`, color: C.accent, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{c.tier}</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.green, minWidth: 100, textAlign: "right" }}>
                ₦{c.monthly_mrr_ngn.toLocaleString()}/mo
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: c.status === "active" ? `${C.green}22` : c.status === "churned" ? `${C.red}22` : `${C.dim}22`, color: c.status === "active" ? C.green : c.status === "churned" ? C.red : C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                {c.status}
              </span>
            </div>
          ))
        )}
      </div>

      {payouts.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, margin: "28px 0 10px" }}>Payout History</h3>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {payouts.map((p, i) => (
              <div key={p.id} style={{ padding: "12px 18px", borderBottom: i < payouts.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 13 }}>
                  {new Date(p.period_start).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>₦{p.share_ngn.toLocaleString()}</div>
                <span style={{ padding: "3px 10px", borderRadius: 999, background: p.status === "paid" ? `${C.green}22` : p.status === "pending" ? `${C.gold}22` : `${C.red}22`, color: p.status === "paid" ? C.green : p.status === "pending" ? C.gold : C.red, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AddForm({ onClose, onSubmit, pending, err }: { onClose: () => void; onSubmit: (input: { client_org_name: string; client_contact: string; tier: PartnerClient["tier"]; monthly_mrr_ngn: number }) => void; pending: boolean; err: string | null }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [tier, setTier] = useState<PartnerClient["tier"]>("starter");
  const [mrr, setMrr] = useState(30000);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, maxWidth: 460, width: "100%" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Add Client Organization</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client org name" style={inp} />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Primary contact email" style={inp} />
        <select value={tier} onChange={(e) => setTier(e.target.value as PartnerClient["tier"])} style={inp}>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <input type="number" value={mrr} onChange={(e) => setMrr(Number(e.target.value) || 0)} placeholder="Monthly MRR (NGN)" style={inp} />
        {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 14px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => name && onSubmit({ client_org_name: name, client_contact: contact, tier, monthly_mrr_ngn: mrr })} disabled={pending || !name} style={{ flex: 2, padding: "10px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {pending ? "Adding…" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplyForm({ pending, err, setErr, startTransition, onApplied }: { pending: boolean; err: string | null; setErr: (e: string | null) => void; startTransition: (cb: () => void) => void; onApplied: () => void }) {
  const [form, setForm] = useState({ agency_name: "", contact_email: "", website: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.agency_name.trim() || !form.contact_email.trim()) { setErr("Agency name and contact email required"); return; }
    startTransition(async () => {
      const res = await applyAsPartner(form);
      if (!res.ok) { setErr(res.error); return; }
      onApplied();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "40px 20px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "inline-block", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>
        🤝 Partner Programme
      </div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Become a CIOS Partner.</h1>
      <p style={{ margin: "6px 0 24px", color: C.dim, fontSize: 14, lineHeight: 1.7 }}>
        L&amp;D agencies and HR consultancies white-label CIOS and earn <strong style={{ color: C.text }}>30% recurring revenue</strong> on every paying client. You bring the relationships — we provide the infrastructure.
      </p>

      <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <label style={lbl}>Agency name</label>
        <input value={form.agency_name} onChange={(e) => setForm((f) => ({ ...f, agency_name: e.target.value }))} placeholder="Your Agency Ltd." style={inp} />
        <label style={lbl}>Primary contact email</label>
        <input value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} type="email" placeholder="founder@agency.com" style={inp} />
        <label style={lbl}>Website (optional)</label>
        <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://" style={inp} />

        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>{err}</div>}

        <button type="submit" disabled={pending} style={{ width: "100%", padding: "12px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 8 }}>
          {pending ? "Submitting…" : "Apply as Partner →"}
        </button>

        <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(102,187,106,0.06)", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 8, fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
          ✓ 30% recurring · ✓ White-label subdomain · ✓ Branded portal · ✓ Co-marketing kit
        </div>
      </form>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 6, letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 };
