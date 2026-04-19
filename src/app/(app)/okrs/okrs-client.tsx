"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOkr, updateKrProgress, deleteOkr, type OKR } from "@/app/actions/okrs";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#66BB6A",
  gold: "#FFC107",
  red: "#EF5350",
};

interface Props {
  initialOkrs: OKR[];
}

export default function OkrsClient({ initialOkrs }: Props) {
  const router = useRouter();
  const [okrs, setOkrs] = useState(initialOkrs);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const active = okrs.filter((o) => o.status === "active");
  const completed = okrs.filter((o) => o.status === "completed");

  function handleCreate(input: {
    objective: string;
    period: "weekly" | "monthly" | "quarterly";
    key_results: { description: string; target: number; unit: string }[];
  }) {
    setErr(null);
    startTransition(async () => {
      const res = await createOkr(input);
      if (!res.ok) { setErr(res.error); return; }
      setShowForm(false);
      router.refresh();
    });
  }

  function handleKrUpdate(krId: string, okrId: string, current: number) {
    startTransition(async () => {
      const res = await updateKrProgress(krId, current);
      if (res.ok) {
        setOkrs((prev) => prev.map((o) => {
          if (o.id !== okrId) return o;
          const krs = o.key_results.map((k) => k.id === krId ? { ...k, current, completed: current >= k.target } : k);
          const pct = Math.round(krs.reduce((s, k) => s + Math.min(100, (k.current / (k.target || 1)) * 100), 0) / krs.length);
          return { ...o, key_results: krs, progress_pct: pct, status: krs.every((k) => k.completed) ? "completed" : o.status };
        }));
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this OKR?")) return;
    startTransition(async () => {
      const res = await deleteOkr(id);
      if (res.ok) setOkrs((prev) => prev.filter((o) => o.id !== id));
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(102,187,106,0.12)", border: "1px solid rgba(102,187,106,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>
            🎯 OKRs
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Objectives & Key Results</h1>
          <p style={{ margin: "4px 0 0", color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
            Set a weekly or monthly objective. Break it into 1–5 measurable key results. Track progress toward each.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
          {showForm ? "✕ Cancel" : "+ New OKR"}
        </button>
      </div>

      {err && (
        <div style={{ color: C.red, fontSize: 13, marginBottom: 12, padding: "8px 12px", background: `${C.red}11`, border: `1px solid ${C.red}44`, borderRadius: 8 }}>{err}</div>
      )}

      {showForm && <OkrForm onSubmit={handleCreate} pending={pending} />}

      {active.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, margin: "28px 0 12px" }}>Active</h2>
          {active.map((okr) => <OkrCard key={okr.id} okr={okr} onUpdate={handleKrUpdate} onDelete={handleDelete} />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, margin: "28px 0 12px" }}>Completed</h2>
          {completed.map((okr) => <OkrCard key={okr.id} okr={okr} onUpdate={handleKrUpdate} onDelete={handleDelete} />)}
        </>
      )}

      {okrs.length === 0 && !showForm && (
        <div style={{ padding: 48, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginTop: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          No OKRs yet. Click &quot;New OKR&quot; to set your first objective.
        </div>
      )}
    </div>
  );
}

function OkrCard({ okr, onUpdate, onDelete }: { okr: OKR; onUpdate: (krId: string, okrId: string, current: number) => void; onDelete: (id: string) => void }) {
  const done = okr.status === "completed";
  return (
    <div style={{ background: C.card, border: `1px solid ${done ? `${C.accent}44` : C.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>
            {okr.period.toUpperCase()} · {new Date(okr.period_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(okr.period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </div>
          <h3 style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>{okr.objective}</h3>
        </div>
        <button onClick={() => onDelete(okr.id)} aria-label="Delete" style={{ background: "transparent", color: C.dim, border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim, marginBottom: 4 }}>
          <span>Progress</span>
          <span style={{ color: done ? C.accent : C.text, fontWeight: 700 }}>{okr.progress_pct}%</span>
        </div>
        <div style={{ height: 8, background: "#0A0E1A", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${okr.progress_pct}%`, background: done ? C.accent : "#1E88E5", transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Key results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {okr.key_results.map((kr) => {
          const pct = Math.min(100, Math.round((kr.current / (kr.target || 1)) * 100));
          return (
            <div key={kr.id} style={{ background: "#0A0E1A", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: kr.completed ? C.accent : C.text, textDecoration: kr.completed ? "line-through" : "none", flex: 1, minWidth: 180 }}>
                  {kr.completed ? "✓ " : ""}{kr.description}
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number"
                    value={kr.current}
                    onChange={(e) => onUpdate(kr.id, okr.id, Number(e.target.value) || 0)}
                    style={{ width: 60, padding: "6px 8px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12 }}
                  />
                  <span style={{ fontSize: 11, color: C.dim }}>/ {kr.target} {kr.unit}</span>
                </div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: kr.completed ? C.accent : "#4DA8FF", transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OkrForm({ onSubmit, pending }: { onSubmit: (input: { objective: string; period: "weekly" | "monthly" | "quarterly"; key_results: { description: string; target: number; unit: string }[] }) => void; pending: boolean }) {
  const [objective, setObjective] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "quarterly">("weekly");
  const [krs, setKrs] = useState<{ description: string; target: number; unit: string }[]>([{ description: "", target: 1, unit: "count" }]);

  function updateKr(i: number, patch: Partial<{ description: string; target: number; unit: string }>) {
    setKrs((prev) => prev.map((k, idx) => idx === i ? { ...k, ...patch } : k));
  }

  function addKr() {
    if (krs.length < 5) setKrs((prev) => [...prev, { description: "", target: 1, unit: "count" }]);
  }

  function removeKr(i: number) {
    if (krs.length > 1) setKrs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    if (!objective.trim()) return;
    const valid = krs.filter((k) => k.description.trim() && k.target > 0);
    if (valid.length === 0) return;
    onSubmit({ objective, period, key_results: valid });
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>New OKR</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Objective</label>
        <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What do you want to achieve this period?" style={inp} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Period</label>
        <select value={period} onChange={(e) => setPeriod(e.target.value as "weekly" | "monthly" | "quarterly")} style={inp}>
          <option value="weekly">Weekly (this Mon–Sun)</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>

      <label style={lbl}>Key Results ({krs.length}/5)</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {krs.map((k, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={k.description} onChange={(e) => updateKr(i, { description: e.target.value })} placeholder="KR description" style={{ ...inp, flex: 1 }} />
            <input type="number" value={k.target} onChange={(e) => updateKr(i, { target: Number(e.target.value) || 1 })} style={{ ...inp, width: 70 }} />
            <input value={k.unit} onChange={(e) => updateKr(i, { unit: e.target.value })} placeholder="unit" style={{ ...inp, width: 80 }} />
            {krs.length > 1 && (
              <button onClick={() => removeKr(i)} style={{ padding: 8, background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}>✕</button>
            )}
          </div>
        ))}
        {krs.length < 5 && (
          <button onClick={addKr} style={{ alignSelf: "flex-start", padding: "7px 14px", background: "transparent", color: C.dim, border: `1px dashed ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
            + Add KR
          </button>
        )}
      </div>

      <button onClick={submit} disabled={pending} style={{ ...btnPrimary, marginTop: 16, width: "100%" }}>
        {pending ? "Saving…" : "Create OKR"}
      </button>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  background: C.accent,
  color: "#fff",
  border: "none",
  borderRadius: 9,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const inp: React.CSSProperties = {
  padding: "8px 12px",
  background: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: C.dim,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 5,
};
