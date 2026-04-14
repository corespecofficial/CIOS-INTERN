"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { resolveReport, type ReportRow } from "@/app/actions/community";
import { timeAgo } from "@/lib/time-format";

export function ReportsQueue({ initial }: { initial: ReportRow[] }) {
  const [rows, setRows] = useState<ReportRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(r: ReportRow, action: "dismiss" | "remove") {
    setBusyId(r.id);
    const note = action === "remove" ? prompt("Optional resolution note (stored on the report):") : null;
    if (action === "remove" && note === null) { setBusyId(null); return; } // user hit Cancel
    const res = await resolveReport(r.id, action, note || undefined);
    setBusyId(null);
    if (!res.ok) { toast.error(res.error); return; }
    setRows((list) => list.filter((x) => x.id !== r.id));
    toast.success(action === "remove" ? "Content removed" : "Dismissed");
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#E8EDF5" }}>🛡 Reports queue</h1>
        <span style={{ fontSize: 12, color: "#8892A4" }}>{rows.length} open</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🕊️</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>No open reports</div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>The community is behaving today.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "rgba(239,83,80,0.12)", color: "#EF5350", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {r.post_id ? "POST" : "COMMENT"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{r.target_title || "—"}</span>
                {r.target_author && <span style={{ fontSize: 11, color: "#8892A4" }}>by {r.target_author}</span>}
                <span style={{ fontSize: 10, color: "#5A6478", marginLeft: "auto" }}>Reported {timeAgo(r.created_at)} by {r.reporter_name || "Unknown"}</span>
              </div>
              {r.target_preview && (
                <div style={{ fontSize: 12, color: "#B0BEC5", background: "#0A0E1A", borderRadius: 8, padding: "8px 10px", marginBottom: 8, maxHeight: 80, overflow: "hidden" }}>
                  {r.target_preview}{r.target_preview.length === 160 && "…"}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#FFC107", marginBottom: 10 }}>
                <b>Reason:</b> {r.reason}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.post_id && (
                  <Link href={`/community/post/${r.post_id}`} style={{ padding: "6px 12px", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#1E88E5", textDecoration: "none", fontWeight: 700 }}>
                    Open →
                  </Link>
                )}
                <button onClick={() => resolve(r, "dismiss")} disabled={busyId === r.id}
                  style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#8892A4", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                  Dismiss
                </button>
                <button onClick={() => resolve(r, "remove")} disabled={busyId === r.id}
                  style={{ padding: "6px 12px", background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.3)", color: "#EF5350", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                  Remove content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
