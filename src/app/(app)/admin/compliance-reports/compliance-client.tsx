"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { exportAuditLogsAction } from "@/app/actions/audit";
import type { ComplianceHistoryRow } from "./page";

const TEMPLATES = [
  { key: "monthly_admin", label: "📋 Monthly admin activity", category: "admin" as const, days: 30 },
  { key: "security_incidents", label: "🚨 Security incidents", severity: "critical" as const, days: 30 },
  { key: "financial", label: "💳 Financial actions", category: "finance" as const, days: 30 },
  { key: "discipline", label: "⚖️ User discipline", actionCode: "admin.fine_issued", days: 90 },
];

export function ComplianceClient({ history }: { history: ComplianceHistoryRow[] }) {
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState({ from: "", to: "", category: "", severity: "" });

  const run = (template: typeof TEMPLATES[number], format: "csv" | "json") => start(async () => {
    const from = new Date(Date.now() - (template.days * 86400000)).toISOString();
    const res = await exportAuditLogsAction({
      category: (template as { category?: string }).category as never,
      severity: (template as { severity?: string }).severity as never,
      actionCode: (template as { actionCode?: string }).actionCode,
      from,
    }, format);
    if (!res.ok) { toast.error(res.error); return; }
    download(res.data!.content, res.data!.filename, res.data!.mime);
  });

  const runCustom = (format: "csv" | "json") => start(async () => {
    const res = await exportAuditLogsAction({
      from: custom.from || undefined,
      to: custom.to || undefined,
      category: (custom.category || "") as never,
      severity: (custom.severity || "") as never,
    }, format);
    if (!res.ok) { toast.error(res.error); return; }
    download(res.data!.content, res.data!.filename, res.data!.mime);
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>COMPLIANCE REPORTS</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📜 Generate auditable reports</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Every export is logged in <code style={{ color: "#1E88E5" }}>compliance_exports</code>.</p>
      </div>

      <section style={panel}>
        <h2 style={sectionHeader}>🗂 Templates</h2>
        {TEMPLATES.map((t) => (
          <div key={t.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>last {t.days} days</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button disabled={pending} onClick={() => run(t, "csv")} style={btnSmall}>CSV</button>
              <button disabled={pending} onClick={() => run(t, "json")} style={btnSmall}>JSON</button>
            </div>
          </div>
        ))}
      </section>

      <section style={{ ...panel, marginTop: 14 }}>
        <h2 style={sectionHeader}>🔧 Custom range</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto auto", gap: 8 }}>
          <input type="datetime-local" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} style={input} />
          <input type="datetime-local" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} style={input} />
          <select value={custom.category} onChange={(e) => setCustom({ ...custom, category: e.target.value })} style={input}>
            <option value="">All categories</option>
            <option value="auth">Auth</option><option value="admin">Admin</option><option value="security">Security</option>
            <option value="finance">Finance</option><option value="learning">Learning</option><option value="community">Community</option>
          </select>
          <select value={custom.severity} onChange={(e) => setCustom({ ...custom, severity: e.target.value })} style={input}>
            <option value="">All severities</option>
            <option value="info">Info</option><option value="notice">Notice</option>
            <option value="warning">Warning</option><option value="critical">Critical</option>
          </select>
          <button onClick={() => runCustom("csv")} disabled={pending} style={btnSmall}>CSV</button>
          <button onClick={() => runCustom("json")} disabled={pending} style={btnSmall}>JSON</button>
        </div>
      </section>

      <section style={{ ...panel, marginTop: 14 }}>
        <h2 style={sectionHeader}>📥 Export history</h2>
        {history.length === 0 && <div style={{ fontSize: 12, color: "#8892A4" }}>No exports yet.</div>}
        {history.map((h) => (
          <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
            <div>
              <div style={{ color: "#E8EDF5", fontWeight: 600 }}>{h.report_type} · {h.format.toUpperCase()} · {h.row_count.toLocaleString()} rows</div>
              <div style={{ color: "#8892A4", fontSize: 10 }}>{new Date(h.created_at).toLocaleString()} by {h.users?.name || "—"}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}`);
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
const input: React.CSSProperties = { padding: "8px 10px", fontSize: 12, background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 };
const btnSmall: React.CSSProperties = { padding: "7px 14px", fontSize: 11, fontWeight: 700, background: "#1E88E5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" };
