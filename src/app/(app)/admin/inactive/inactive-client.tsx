"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { sendCheckIn, type InactiveRow } from "@/app/actions/inactive-interns";

export function InactiveClient({ initial }: { initial: InactiveRow[] }) {
  const [rows, setRows] = useState<InactiveRow[]>(initial);
  const [cutoff, setCutoff] = useState<7 | 14 | 30>(7);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => rows.filter((r) => r.daysInactive >= cutoff), [rows, cutoff]);

  async function checkIn(r: InactiveRow) {
    const custom = prompt(`Send a check-in DM to ${r.name}?\n\n(Leave blank for default message)`, "");
    if (custom === null) return;
    const res = await sendCheckIn(r.id, custom || undefined);
    if (!res.ok) { toast.error(res.error); return; }
    setSentIds((s) => new Set([...s, r.id]));
    toast.success(`Checked in on ${r.name}`);
  }

  async function checkInAll() {
    if (!confirm(`Send check-in DMs to all ${filtered.length} interns?`)) return;
    let ok = 0;
    for (const r of filtered) {
      if (sentIds.has(r.id)) continue;
      const res = await sendCheckIn(r.id);
      if (res.ok) ok++;
    }
    setSentIds(new Set(filtered.map((r) => r.id)));
    toast.success(`Sent ${ok} check-ins`);
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#E8EDF5", flex: 1 }}>💤 Inactive interns</h1>
        <div style={{ display: "flex", gap: 4, padding: 3, background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 999 }}>
          {([7, 14, 30] as const).map((n) => (
            <button key={n} onClick={() => setCutoff(n)} style={{
              padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer",
              background: cutoff === n ? "rgba(255,193,7,0.18)" : "transparent",
              color: cutoff === n ? "#FFC107" : "#8892A4", fontSize: 11, fontWeight: 800,
            }}>{n}+ days</button>
          ))}
        </div>
        <button onClick={checkInAll} disabled={filtered.length === 0} style={{
          padding: "8px 14px", background: "linear-gradient(135deg,#1E88E5,#1565C0)",
          color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer",
        }}>
          Check in on all ({filtered.length})
        </button>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>Everyone&apos;s active</div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>No interns over {cutoff} days without a visit.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              {r.avatarUrl
                ? <img src={r.avatarUrl} alt="" width={42} height={42} style={{ borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>{r.name.charAt(0).toUpperCase()}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#8892A4", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{r.email}</span>
                  <span>·</span>
                  <span>{r.xp} XP</span>
                  <span>·</span>
                  <span>🔥 {r.streak}d streak</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: r.daysInactive > 30 ? "#EF5350" : r.daysInactive > 14 ? "#FF7043" : "#FFC107", fontWeight: 700, minWidth: 80, textAlign: "right" }}>
                {r.daysInactive === 999 ? "Never seen" : `${r.daysInactive}d ago`}
              </div>
              <button onClick={() => checkIn(r)} disabled={sentIds.has(r.id)} style={{
                padding: "6px 12px",
                background: sentIds.has(r.id) ? "rgba(102,187,106,0.12)" : "rgba(30,136,229,0.14)",
                border: `1px solid ${sentIds.has(r.id) ? "rgba(102,187,106,0.3)" : "rgba(30,136,229,0.3)"}`,
                color: sentIds.has(r.id) ? "#66BB6A" : "#1E88E5",
                borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                {sentIds.has(r.id) ? "✓ Sent" : "📨 Check in"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
