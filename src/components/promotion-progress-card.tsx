"use client";

import { useEffect, useState } from "react";
import { getMyPromotionStatus } from "@/app/actions/promotions";

interface Status {
  readiness: number;
  reason: string;
  nextRole: string | null;
  nextRank: string;
  pending: boolean;
}

export function PromotionProgressCard() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    (async () => {
      const r = await getMyPromotionStatus();
      if (r.ok && r.data) setStatus(r.data);
    })();
  }, []);

  if (!status) return null;
  if (!status.nextRole) {
    // Top of ladder
    return (
      <div style={{ background: "linear-gradient(135deg, rgba(255,193,7,0.14), rgba(255,112,67,0.08))", border: "1px solid rgba(255,193,7,0.35)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#FFC107", marginBottom: 6 }}>🏆 TOP RANK ACHIEVED</div>
        <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700 }}>You're at the top of the CIOS career ladder. Keep mentoring others.</div>
      </div>
    );
  }

  const color = status.readiness >= 90 ? "#66BB6A" : status.readiness >= 75 ? "#FFC107" : "#1E88E5";

  return (
    <div style={{ background: `linear-gradient(135deg, ${color}1a, #111827)`, border: `1px solid ${color}40`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: color, marginBottom: 4 }}>🎖 PROMOTION READINESS</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
            Next rank: <span style={{ color: color }}>{status.nextRank}</span>
          </div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>
            Role track: <span style={{ color: "#B0BEC5", textTransform: "capitalize" }}>{status.nextRole.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{status.readiness}</div>
          <div style={{ fontSize: 9, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>SCORE</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${status.readiness}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}dd)`, transition: "width 0.6s ease", borderRadius: 4 }} />
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "#8892A4" }}>
        💡 {status.reason}
      </div>

      {status.pending ? (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 8, fontSize: 12, color: "#FFC107", fontWeight: 600 }}>
          ⏳ Your promotion is pending admin review. You'll get a notification when it's decided.
        </div>
      ) : status.readiness >= 75 ? (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(102,187,106,0.08)", border: "1px solid rgba(102,187,106,0.25)", borderRadius: 8, fontSize: 12, color: "#66BB6A", fontWeight: 600 }}>
          🚀 Eligible for promotion! The system will recommend you on the next nightly scan.
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 11, color: "#5A6478" }}>
          Need <strong style={{ color: "#E8EDF5" }}>{75 - status.readiness} more points</strong> to unlock a promotion recommendation. Keep up tasks, attendance, and streak.
        </div>
      )}
    </div>
  );
}
