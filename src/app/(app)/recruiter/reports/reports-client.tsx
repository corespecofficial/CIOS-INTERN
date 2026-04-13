"use client";

import toast from "react-hot-toast";
import type { RecruiterKPIs } from "@/app/actions/recruiter";

export function ReportsClient({ kpis }: { kpis: RecruiterKPIs | null }) {
  if (!kpis) return <div style={{ padding: 30, color: "#8892A4" }}>No data.</div>;

  const rows: { label: string; value: string | number }[] = [
    { label: "Active listings",   value: kpis.activeListings },
    { label: "Total listings",    value: kpis.totalListings },
    { label: "Total applicants",  value: kpis.totalApplicants },
    { label: "Shortlisted",       value: kpis.shortlisted },
    { label: "Interviews",        value: kpis.interviewsScheduled },
    { label: "Hires",             value: kpis.hires },
    { label: "Rejected",          value: kpis.rejected },
    { label: "Response rate",     value: `${kpis.responseRatePct}%` },
    { label: "Avg time to hire",  value: kpis.avgTimeToHireDays !== null ? `${kpis.avgTimeToHireDays}d` : "—" },
  ];

  const download = (name: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${name}`);
  };

  const exportCSV = () => {
    const lines = ["metric,value", ...rows.map((r) => `"${r.label}","${r.value}"`)];
    lines.push("");
    lines.push("# Applications by day");
    lines.push("day,count");
    for (const d of kpis.applicationsByDay) lines.push(`${d.day},${d.count}`);
    lines.push("");
    lines.push("# Funnel");
    lines.push("stage,count");
    for (const f of kpis.funnel) lines.push(`${f.stage},${f.count}`);
    lines.push("");
    lines.push("# Top listings");
    lines.push("title,applications,views");
    for (const l of kpis.topListings) lines.push(`"${l.title.replaceAll('"', '""')}",${l.applications},${l.views}`);
    download(`recruiter-report-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"), "text/csv");
  };

  const exportJSON = () => {
    download(`recruiter-report-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(kpis, null, 2), "application/json");
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{r.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1E88E5", fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{r.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px 0" }}>📥 Export</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={exportCSV} style={btnPrimary}>⬇ Export CSV</button>
          <button onClick={exportJSON} style={btnGhost}>⬇ Export JSON</button>
          <button onClick={() => window.print()} style={btnGhost}>🖨 Print / Save PDF</button>
        </div>
        <p style={{ fontSize: 11, color: "#8892A4", marginTop: 10 }}>
          CSV includes headline KPIs + applications/day + hiring funnel + top listings. JSON is the full raw dataset.
        </p>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
