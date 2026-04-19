"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInstitution, bulkImportStudents, type Institution, type InstitutionStudent } from "@/app/actions/institutions";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  blue: "#1E88E5",
  green: "#66BB6A",
  gold: "#FFC107",
  red: "#EF5350",
};

interface Stats {
  total: number;
  placed: number;
  in_progress: number;
  completed: number;
  avg_compliance: number;
  total_reports: number;
  total_hours: number;
}

interface Props {
  institution: Institution | null;
  initialStudents: InstitutionStudent[];
  stats: Stats | null;
}

export default function InstitutionClient({ institution, initialStudents, stats }: Props) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!institution) return <CreateForm pending={pending} err={err} setErr={setErr} startTransition={startTransition} onCreated={() => router.refresh()} />;

  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setErr(null);
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const hasHeader = lines[0]?.toLowerCase().includes("matric") || lines[0]?.toLowerCase().includes("name");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const rows = dataLines.map((l) => {
        const [matric, name, email, department, level, yearStr] = l.split(",").map((x) => x?.trim() ?? "");
        return { matric, name, email: email || undefined, department: department || undefined, level: level || undefined, year: yearStr ? parseInt(yearStr, 10) : undefined };
      }).filter((r) => r.matric && r.name);
      if (rows.length === 0) { setErr("No valid rows found. Expected columns: matric, name, email, department, level, year"); return; }

      startTransition(async () => {
        const res = await bulkImportStudents(institution!.id, rows);
        if (!res.ok) { setErr(res.error); return; }
        alert(`Imported ${res.data!.imported} · Skipped ${res.data!.skipped}`);
        router.refresh();
      });
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .inst-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        @media (max-width: 700px) { .inst-stats { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "inline-block", background: "rgba(30,136,229,0.12)", border: "1px solid rgba(30,136,229,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#4DA8FF", marginBottom: 12, textTransform: "uppercase" }}>
          🏛 {institution.kind}
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{institution.name}</h1>
        <p style={{ margin: "4px 0 0", color: C.dim, fontSize: 13 }}>
          {institution.city ? `${institution.city}, ` : ""}{institution.state ?? ""} · Seats: {students.length}/{institution.seat_limit}
        </p>
      </div>

      {stats && (
        <div className="inst-stats" style={{ marginBottom: 24 }}>
          <Stat label="Total Students" value={String(stats.total)} color={C.blue} />
          <Stat label="Placed" value={String(stats.placed)} color={C.green} />
          <Stat label="Completed" value={String(stats.completed)} color={C.gold} />
          <Stat label="Avg Compliance" value={`${stats.avg_compliance}%`} color={stats.avg_compliance >= 70 ? C.green : stats.avg_compliance >= 40 ? C.gold : C.red} />
        </div>
      )}

      {/* Import */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700 }}>📥 Bulk Import Students</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim }}>
          CSV columns: <code style={{ background: C.bg, padding: "2px 6px", borderRadius: 4 }}>matric, name, email, department, level, year</code>
        </p>
        <input type="file" accept=".csv" onChange={handleCsv} disabled={pending} style={{ color: C.text, fontSize: 13 }} />
        {err && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{err}</div>}
      </div>

      {/* Students list */}
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.dim, textTransform: "uppercase", letterSpacing: 2 }}>Students ({students.length})</h3>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {students.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim }}>No students yet. Import a CSV above.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 18px", background: C.bg, display: "grid", gridTemplateColumns: "100px 1fr 120px 100px 100px", gap: 10, fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.border}` }}>
              <div>Matric</div>
              <div>Name</div>
              <div>Dept</div>
              <div>Status</div>
              <div>Score</div>
            </div>
            {students.map((s, i) => {
              const statusColor = s.siwes_status === "completed" ? C.green : s.siwes_status === "in_progress" ? C.blue : s.siwes_status === "placed" ? C.gold : C.dim;
              return (
                <div key={s.id} style={{ padding: "12px 18px", borderBottom: i < students.length - 1 ? `1px solid ${C.border}` : "none", display: "grid", gridTemplateColumns: "100px 1fr 120px 100px 100px", gap: 10, fontSize: 12, alignItems: "center" }}>
                  <div style={{ fontFamily: "monospace", color: C.dim }}>{s.matric_number}</div>
                  <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                  <div style={{ color: C.dim }}>{s.department ?? "—"}</div>
                  <div><span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${statusColor}22`, color: statusColor, fontWeight: 700, textTransform: "uppercase" }}>{s.siwes_status.replace("_", " ")}</span></div>
                  <div style={{ fontWeight: 700, color: s.compliance_score >= 70 ? C.green : s.compliance_score >= 40 ? C.gold : C.red }}>{s.compliance_score}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report generator (stub) */}
      {stats && stats.total > 0 && (
        <div style={{ marginTop: 20, padding: 18, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>📄 Reports (coming soon)</h3>
          <p style={{ margin: 0, fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
            ITF monthly compliance report, SIWES completion report, and cohort analytics — generate PDF on demand.
          </p>
        </div>
      )}
    </div>
  );
}

function CreateForm({ pending, err, setErr, startTransition, onCreated }: {
  pending: boolean;
  err: string | null;
  setErr: (e: string | null) => void;
  startTransition: (cb: () => void) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Institution["kind"]>("university");
  const [state, setStateName] = useState("");
  const [city, setCity] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) { setErr("Institution name required"); return; }
    startTransition(async () => {
      const res = await createInstitution({ name, kind, state, city });
      if (!res.ok) { setErr(res.error); return; }
      onCreated();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "40px 20px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "inline-block", background: "rgba(30,136,229,0.12)", border: "1px solid rgba(30,136,229,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#4DA8FF", marginBottom: 12, textTransform: "uppercase" }}>
        🏛 Institution Portal
      </div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Set up your institution.</h1>
      <p style={{ margin: "6px 0 24px", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
        Manage SIWES students, track compliance, and generate ITF-ready reports from one dashboard.
      </p>

      <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <label style={lbl}>Institution name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="University of Lagos" style={inp} />

        <label style={lbl}>Kind</label>
        <select value={kind} onChange={(e) => setKind(e.target.value as Institution["kind"])} style={inp}>
          <option value="university">University</option>
          <option value="polytechnic">Polytechnic</option>
          <option value="college">College</option>
          <option value="high_school">High School</option>
          <option value="ngo">NGO</option>
          <option value="agency">Agency</option>
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lbl}>State</label>
            <input value={state} onChange={(e) => setStateName(e.target.value)} placeholder="Lagos" style={inp} />
          </div>
          <div>
            <label style={lbl}>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Akoka" style={inp} />
          </div>
        </div>

        {err && <div style={{ color: C.red, fontSize: 13, margin: "10px 0" }}>{err}</div>}

        <button type="submit" disabled={pending} style={{ width: "100%", marginTop: 16, padding: "12px 18px", background: "#1E88E5", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          {pending ? "Creating…" : "Create Institution →"}
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 6, letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 14,
  marginBottom: 12,
  outline: "none",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: C.dim,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};
