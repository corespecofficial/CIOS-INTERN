"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { graduateIntern, reviewAlumniStory } from "@/app/actions/alumni";

type InternRow = { id: string; name: string | null; avatar_url: string | null; email: string | null; xp: number; performance: number; level: number; role: string; graduated_at: string | null; cohort_number: number | null };
type StoryRow = { id: string; user_id: string; title: string; body: string; company: string | null; role: string | null; status: string; created_at: string; author?: { name?: string | null; avatar_url?: string | null } | null };

export function AdminAlumniClient({ interns, pendingStories }: { interns: InternRow[]; pendingStories: StoryRow[] }) {
  const [tab, setTab] = useState<"graduate" | "stories">("graduate");
  const [search, setSearch] = useState("");
  const [cohort, setCohort] = useState<number | "">("");
  const [rows, setRows] = useState(interns);
  const [stories, setStories] = useState(pendingStories);
  const [pending, start] = useTransition();

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || (r.name || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
  });

  const graduate = (id: string) => start(async () => {
    if (!confirm("Graduate this intern? This moves them to the alumni role.")) return;
    const r = await graduateIntern(id, cohort ? +cohort : undefined);
    if (!r.ok) { toast.error(r.error); return; }
    setRows((prev) => prev.map((row) => row.id === id ? { ...row, role: "alumni", graduated_at: new Date().toISOString() } : row));
    toast.success("Intern graduated! 🎓");
  });

  const reviewStory = (id: string, approve: boolean) => start(async () => {
    const r = await reviewAlumniStory(id, approve);
    if (!r.ok) { toast.error(r.error); return; }
    setStories((prev) => prev.filter((s) => s.id !== id));
    toast.success(approve ? "Story approved and published!" : "Story rejected.");
  });

  const graduatable = filtered.filter((r) => r.role === "intern");
  const graduates = filtered.filter((r) => r.role === "alumni");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>🎓 Alumni Management</h1>
      <p style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>Graduate interns, review stories, and manage the alumni network.</p>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[
          { k: "graduate", label: `Graduate Interns (${graduatable.length} eligible)` },
          { k: "stories", label: `Review Stories (${stories.length} pending)` },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)} style={{ flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", background: tab === t.k ? "rgba(255,193,7,0.15)" : "transparent", color: tab === t.k ? "#FFC107" : "#8892A4", border: "none" }}>{t.label}</button>
        ))}
      </div>

      {tab === "graduate" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ ...inp, flex: 1, minWidth: 200 }} />
            <input type="number" value={cohort} onChange={(e) => setCohort(e.target.value ? +e.target.value : "")} placeholder="Cohort # (optional)" style={{ ...inp, width: 160 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFC107", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Interns ready to graduate ({graduatable.length})</div>
            {graduatable.length === 0 && <div style={{ padding: 20, color: "#8892A4", fontSize: 13 }}>No interns match the search.</div>}
            {graduatable.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{r.name || "Unnamed"}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>{r.email} · Lv {r.level} · {r.xp.toLocaleString()} XP · {r.performance}%</div>
                </div>
                <button onClick={() => graduate(r.id)} disabled={pending} style={{ padding: "6px 14px", background: "rgba(255,193,7,0.12)", color: "#FFC107", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  🎓 Graduate
                </button>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#66BB6A", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Already graduated ({graduates.length})</div>
            {graduates.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#111827", border: "1px solid rgba(102,187,106,0.12)", borderRadius: 10, marginBottom: 6, opacity: 0.7 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{r.name || "Unnamed"}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>Graduated {r.graduated_at ? new Date(r.graduated_at).toLocaleDateString() : "—"} {r.cohort_number ? `· Cohort ${r.cohort_number}` : ""}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", background: "rgba(102,187,106,0.12)", color: "#66BB6A", borderRadius: 99 }}>Alumni</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "stories" && (
        <div style={{ display: "grid", gap: 12 }}>
          {stories.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>No pending stories to review.</div>}
          {stories.map((s) => {
            const a = Array.isArray(s.author) ? s.author[0] : s.author;
            return (
              <div key={s.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>by {a?.name || "Unknown"} · {s.role && s.company ? `${s.role} @ ${s.company}` : s.company || s.role || "—"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => reviewStory(s.id, true)} disabled={pending} style={{ padding: "6px 12px", background: "rgba(102,187,106,0.12)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                    <button onClick={() => reviewStory(s.id, false)} disabled={pending} style={{ padding: "6px 12px", background: "rgba(239,83,80,0.1)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: "8px 10px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };
