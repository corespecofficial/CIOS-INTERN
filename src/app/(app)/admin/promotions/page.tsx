"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { listPendingPromotions, approvePromotion, rejectPromotion, scanForPromotions, type PromotionRecommendation } from "@/app/actions/promotions";
import { BackBar } from "@/components/back-bar";

export default function AdminPromotionsPage() {
  const [rows, setRows] = useState<PromotionRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const refresh = async () => {
    setLoading(true);
    const r = await listPendingPromotions();
    if (r.ok) setRows(r.data!); else toast.error(r.error);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const onApprove = (id: string, name: string | null, toRank: string) => start(async () => {
    if (!confirm(`Promote ${name || "this user"} to ${toRank}?`)) return;
    const r = await approvePromotion(id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`✅ ${name || "User"} promoted`);
    setRows((prev) => prev.filter((x) => x.id !== id));
  });

  const onReject = (id: string) => start(async () => {
    const note = prompt("Reason for rejection (optional):") || "";
    if (!confirm("Reject this recommendation?")) return;
    const r = await rejectPromotion(id, note);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Rejected");
    setRows((prev) => prev.filter((x) => x.id !== id));
  });

  const onScan = () => start(async () => {
    const t = toast.loading("Scanning for new promotion candidates…");
    const r = await scanForPromotions();
    if (!r.ok) { toast.error(r.error, { id: t }); return; }
    toast.success(`Scan done — ${r.data!.created} new recommendation${r.data!.created === 1 ? "" : "s"}`, { id: t });
    refresh();
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/dashboard" label="Back" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🎖 Promotion Recommendations</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0" }}>Review AI-suggested promotions from real intern performance data.</p>
        </div>
        <button onClick={onScan} disabled={pending} style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          🔄 Run scan now
        </button>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center", color: "#8892A4", fontSize: 13 }}>Loading…</div>}
      {!loading && rows.length === 0 && (
        <div style={{ padding: 48, textAlign: "center", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🌱</div>
          <div style={{ fontSize: 14, color: "#E8EDF5", marginBottom: 4, fontWeight: 700 }}>No pending recommendations</div>
          <div style={{ fontSize: 12, color: "#8892A4" }}>The promotion engine scans nightly. You can also run it manually above.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {r.user_avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={r.user_avatar} alt="" width={48} height={48} style={{ borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800 }}>{(r.user_name || "?").slice(0, 2).toUpperCase()}</div>}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>{r.user_name || "Unnamed user"}</div>
                <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>
                  <span style={{ textTransform: "capitalize" }}>{r.from_role.replace(/_/g, " ")}</span>
                  <span style={{ margin: "0 6px", color: "#5A6478" }}>→</span>
                  <span style={{ color: "#1E88E5", fontWeight: 700, textTransform: "capitalize" }}>{r.to_role.replace(/_/g, " ")}</span>
                  <span style={{ margin: "0 6px", color: "#5A6478" }}>·</span>
                  <span>{r.from_rank} → <strong style={{ color: "#FFC107" }}>{r.to_rank}</strong></span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: readinessColor(r.readiness_score), fontFamily: "'Space Grotesk', sans-serif" }}>{r.readiness_score}</div>
                <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>READINESS</div>
              </div>
            </div>

            <div style={{ marginTop: 10, padding: 10, background: "rgba(30,136,229,0.06)", borderLeft: "3px solid #1E88E5", borderRadius: 6, fontSize: 12, color: "#B0BEC5" }}>
              💡 {r.reason}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => onApprove(r.id, r.user_name, r.to_rank)} disabled={pending} style={{ flex: 1, minWidth: 140, padding: "10px 16px", background: "linear-gradient(135deg, #66BB6A, #43A047)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
                ✓ Approve promotion
              </button>
              <button onClick={() => onReject(r.id)} disabled={pending} style={{ padding: "10px 16px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
                ✕ Reject
              </button>
            </div>

            <div style={{ fontSize: 10, color: "#5A6478", marginTop: 8 }}>
              Recommended {new Date(r.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function readinessColor(n: number): string {
  if (n >= 90) return "#66BB6A";
  if (n >= 80) return "#FFC107";
  return "#26C6DA";
}
