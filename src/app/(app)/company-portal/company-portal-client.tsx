"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCompany, submitEvaluation, type CompanyOrg, type CompanyPlacement } from "@/app/actions/company-portal";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#FF7043",
  green: "#66BB6A",
  red: "#EF5350",
};

interface Props {
  company: CompanyOrg | null;
  initialPlacements: CompanyPlacement[];
}

export default function CompanyPortalClient({ company, initialPlacements }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [evalPlacement, setEvalPlacement] = useState<CompanyPlacement | null>(null);

  if (!company) return <CreateForm pending={pending} err={err} setErr={setErr} startTransition={startTransition} onCreated={() => router.refresh()} />;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: company.logo_url ? `url(${company.logo_url}) center/cover` : `${C.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          {!company.logo_url && "🏢"}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{company.name}</h1>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>
            {company.industry ?? "—"} · {company.hq_city ?? ""} · Capacity: {initialPlacements.length}/{company.intern_capacity}
          </div>
        </div>
        {company.verified && (
          <span style={{ padding: "4px 12px", background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44`, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
            ✓ Verified
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
        <Stat label="Active" value={String(initialPlacements.filter((p) => p.status === "active").length)} color={C.green} />
        <Stat label="Completed" value={String(initialPlacements.filter((p) => p.status === "completed").length)} color={C.accent} />
        <Stat label="Pending Eval" value={String(initialPlacements.filter((p) => p.status === "active" && !p.recommend_hire).length)} color="#FFC107" />
        <Stat label="Recommended" value={String(initialPlacements.filter((p) => p.recommend_hire).length)} color="#AB47BC" />
      </div>

      {/* Placements */}
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.dim, textTransform: "uppercase", letterSpacing: 2 }}>Placed Interns ({initialPlacements.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {initialPlacements.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            No interns placed yet. Admin will assign interns here.
          </div>
        ) : (
          initialPlacements.map((p) => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {p.intern_avatar ? (
                <img src={p.intern_avatar} alt="" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  {p.intern_name[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.intern_name}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{p.role_title ?? "Intern"} · Started {p.start_date ?? "—"}</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: p.status === "active" ? `${C.green}22` : p.status === "completed" ? `${C.accent}22` : `${C.dim}22`, color: p.status === "active" ? C.green : p.status === "completed" ? C.accent : C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                {p.status}
              </span>
              {p.recommend_hire && (
                <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                  ⭐ Recommended
                </span>
              )}
              <button onClick={() => setEvalPlacement(p)} style={{ padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Evaluate
              </button>
            </div>
          ))
        )}
      </div>

      {evalPlacement && <EvalModal placement={evalPlacement} onClose={() => setEvalPlacement(null)} onSubmit={() => { setEvalPlacement(null); router.refresh(); }} />}
    </div>
  );
}

function EvalModal({ placement, onClose, onSubmit }: { placement: CompanyPlacement; onClose: () => void; onSubmit: () => void }) {
  const [stage, setStage] = useState<"midterm" | "final">("midterm");
  const [scores, setScores] = useState({ technical: 3, punctuality: 3, communication: 3, initiative: 3, teamwork: 3, professionalism: 3 });
  const [comments, setComments] = useState("");
  const [hire, setHire] = useState<"yes" | "no" | "maybe">("maybe");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await submitEvaluation({ placement_id: placement.id, stage, ...scores, comments, recommend_hire: stage === "final" ? hire : undefined });
      if (!res.ok) { setErr(res.error); return; }
      onSubmit();
    });
  }

  const fields = [
    { k: "technical" as const, label: "Technical Skills" },
    { k: "punctuality" as const, label: "Punctuality" },
    { k: "communication" as const, label: "Communication" },
    { k: "initiative" as const, label: "Initiative" },
    { k: "teamwork" as const, label: "Teamwork" },
    { k: "professionalism" as const, label: "Professionalism" },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>Evaluate {placement.intern_name}</h2>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 16 }}>{placement.role_title ?? "Intern"}</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["midterm", "final"] as const).map((s) => (
            <button key={s} onClick={() => setStage(s)} style={{ flex: 1, padding: "8px 12px", background: stage === s ? C.accent : "transparent", color: stage === s ? "#fff" : C.dim, border: `1px solid ${stage === s ? C.accent : C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
              {s} Review
            </button>
          ))}
        </div>

        {fields.map((f) => (
          <div key={f.k} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: C.text, marginBottom: 5 }}>{f.label}</label>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScores((s) => ({ ...s, [f.k]: n }))}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    background: scores[f.k] >= n ? C.accent : "transparent",
                    color: scores[f.k] >= n ? "#fff" : C.dim,
                    border: `1px solid ${scores[f.k] >= n ? C.accent : C.border}`,
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

        <label style={{ display: "block", fontSize: 12, color: C.text, marginBottom: 5, marginTop: 12 }}>Comments</label>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Overall notes on performance…" style={{ width: "100%", padding: "9px 12px", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />

        {stage === "final" && (
          <>
            <label style={{ display: "block", fontSize: 12, color: C.text, marginBottom: 5, marginTop: 12 }}>Would you hire this intern?</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["yes", "maybe", "no"] as const).map((v) => (
                <button key={v} onClick={() => setHire(v)} style={{ flex: 1, padding: "8px 12px", background: hire === v ? (v === "yes" ? C.green : v === "no" ? C.red : "#FFC107") : "transparent", color: hire === v ? "#fff" : C.dim, border: `1px solid ${hire === v ? (v === "yes" ? C.green : v === "no" ? C.red : "#FFC107") : C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
                  {v}
                </button>
              ))}
            </div>
          </>
        )}

        {err && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 14px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={pending} style={{ flex: 2, padding: "10px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {pending ? "Submitting…" : "Submit Evaluation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateForm({ pending, err, setErr, startTransition, onCreated }: { pending: boolean; err: string | null; setErr: (e: string | null) => void; startTransition: (cb: () => void) => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", industry: "", size_range: "1-10", hq_city: "", website: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Company name required"); return; }
    startTransition(async () => {
      const res = await createCompany(form);
      if (!res.ok) { setErr(res.error); return; }
      onCreated();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "40px 20px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "inline-block", background: "rgba(255,112,67,0.12)", border: "1px solid rgba(255,112,67,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>
        🏢 Company Portal
      </div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Host verified interns.</h1>
      <p style={{ margin: "6px 0 24px", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
        Evaluate SIWES/internship candidates. Submit digital ITF-compliant evaluations. Recommend for hire.
      </p>

      <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <Field label="Company name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Acme Corp." style={inp} /></Field>
        <Field label="Industry (optional)"><input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="Fintech, Healthcare…" style={inp} /></Field>
        <Field label="Team size"><select value={form.size_range} onChange={(e) => setForm((f) => ({ ...f, size_range: e.target.value }))} style={inp}><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201+">201+</option></select></Field>
        <Field label="HQ city"><input value={form.hq_city} onChange={(e) => setForm((f) => ({ ...f, hq_city: e.target.value }))} placeholder="Lagos" style={inp} /></Field>
        <Field label="Website (optional)"><input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://" style={inp} /></Field>
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <button type="submit" disabled={pending} style={{ width: "100%", padding: "12px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 8 }}>
          {pending ? "Creating…" : "Create Company →"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
