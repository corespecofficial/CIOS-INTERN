"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { exportAuditLogsAction } from "@/app/actions/audit";
import type { AuditListFilters } from "@/lib/audit";

interface Row {
  id: string; created_at: string; action_code: string | null; action: string; category: string; severity: string;
  summary: string; success: boolean; actor_name: string | null; actor_role: string | null; user_id: string | null;
  ip_address: string | null; browser: string | null; os: string | null; entity_type: string; entity_id: string;
  risk_score: number;
}

const SEVERITY_COLOR: Record<string, string> = {
  info: "#8892A4", notice: "#1E88E5", warning: "#FFC107", critical: "#EF5350",
};
const CATEGORY_LABEL: Record<string, string> = {
  auth: "🔐 Auth", account: "👤 Account", admin: "🛡️ Admin", community: "💬 Community",
  messaging: "✉️ Messaging", learning: "🎓 Learning", finance: "💳 Finance", security: "🚨 Security",
  infrastructure: "⚙️ Infra", general: "📄 General",
};

export function AuditLogsClient({ rows, total, filters }: { rows: Row[]; total: number; filters: AuditListFilters }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(filters.search || "");
  const [pending, start] = useTransition();

  const pageSize = filters.limit || 50;
  const offset = filters.offset || 0;
  const pageNum = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyFilter = (patch: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    params.delete("offset");
    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const gotoPage = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("offset", String((p - 1) * pageSize));
    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const onExport = (format: "csv" | "json") => start(async () => {
    const res = await exportAuditLogsAction({
      search: filters.search, category: filters.category, severity: filters.severity,
      success: filters.success, actionCode: filters.actionCode, from: filters.from, to: filters.to,
    }, format);
    if (!res.ok) { toast.error(res.error); return; }
    const { content, filename, mime } = res.data!;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${format.toUpperCase()}`);
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(239,83,80,0.15)", color: "#EF5350", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>AUDIT LOGS</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Activity trail · {total.toLocaleString()} events</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Every important action — who, what, when, where.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/security-center" style={navPill}>🚨 Security center</Link>
          <Link href="/admin/activity-monitor" style={navPill}>📊 Activity monitor</Link>
          <Link href="/admin/compliance-reports" style={navPill}>📜 Compliance</Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, marginBottom: 14, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8 }}>
        <input placeholder="Search summary…" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") applyFilter({ q }); }}
          style={input} />
        <select value={filters.category || ""} onChange={(e) => applyFilter({ category: e.target.value })} style={input}>
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.severity || ""} onChange={(e) => applyFilter({ severity: e.target.value })} style={input}>
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="notice">Notice</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select value={filters.success || ""} onChange={(e) => applyFilter({ success: e.target.value })} style={input}>
          <option value="">Success & failure</option>
          <option value="true">Success only</option>
          <option value="false">Failures only</option>
        </select>
        <input placeholder="Action code…" value={filters.actionCode || ""} onChange={(e) => applyFilter({ action: e.target.value })} style={input} />
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onExport("csv")} disabled={pending} style={btnSmall}>CSV</button>
          <button onClick={() => onExport("json")} disabled={pending} style={btnSmall}>JSON</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "130px 110px 90px 1fr 130px 90px 60px", padding: "10px 14px", background: "#0A0E1A", fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>Time</div><div>Category</div><div>Severity</div><div>Summary</div><div>Actor</div><div>Action</div><div>Risk</div>
        </div>
        {rows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#8892A4" }}>No events match these filters.</div>}
        {rows.map((r) => (
          <Link key={r.id} href={`/admin/audit-logs/${r.id}`} style={{
            display: "grid", gridTemplateColumns: "130px 110px 90px 1fr 130px 90px 60px",
            padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)",
            textDecoration: "none", color: "#E8EDF5", fontSize: 12, alignItems: "center",
            background: r.severity === "critical" ? "rgba(239,83,80,0.05)" : "transparent",
          }}>
            <div style={{ color: "#8892A4", fontSize: 11 }}>{new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
            <div style={{ fontSize: 11 }}>{CATEGORY_LABEL[r.category] || r.category}</div>
            <div><span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${SEVERITY_COLOR[r.severity] || "#8892A4"}22`, color: SEVERITY_COLOR[r.severity] || "#8892A4", textTransform: "uppercase" }}>{r.severity}</span></div>
            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{!r.success && <span style={{ color: "#EF5350", marginRight: 4 }}>✗</span>}{r.summary}</div>
            <div style={{ fontSize: 11, color: "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.actor_name || "System"}</div>
            <div style={{ fontSize: 10, color: "#8892A4", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.action_code || r.action}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: r.risk_score >= 60 ? "#EF5350" : r.risk_score >= 30 ? "#FFC107" : "#8892A4", textAlign: "right" }}>{r.risk_score}</div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 }}>
          <button disabled={pageNum <= 1} onClick={() => gotoPage(pageNum - 1)} style={btnSmall}>← Prev</button>
          <span style={{ fontSize: 12, color: "#8892A4" }}>Page {pageNum} of {totalPages}</span>
          <button disabled={pageNum >= totalPages} onClick={() => gotoPage(pageNum + 1)} style={btnSmall}>Next →</button>
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = { padding: "8px 10px", fontSize: 12, background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 };
const btnSmall: React.CSSProperties = { padding: "7px 14px", fontSize: 11, fontWeight: 700, background: "#1E88E5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" };
const navPill: React.CSSProperties = { padding: "6px 12px", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#E8EDF5", textDecoration: "none" };
