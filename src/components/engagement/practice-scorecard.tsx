"use client";

import { useEffect, useState } from "react";
import { listMyScorecards, type PracticeScorecard } from "@/app/actions/practice-scorecards";

/** Inline scorecard shown immediately after an AI Hub practice session. */
export function PracticeScorecardResult({ card }: { card: PracticeScorecard | {
  skill: string; score: number; rubric?: Record<string, number>;
  strengths?: string | null; improvements?: string | null;
} }) {
  const tone = card.score >= 85 ? "#66BB6A" : card.score >= 70 ? "#FFC107" : card.score >= 50 ? "#FF7043" : "#EF5350";
  const grade = card.score >= 85 ? "Excellent" : card.score >= 70 ? "Solid" : card.score >= 50 ? "Getting there" : "Keep practicing";
  return (
    <div style={{ background: "#111827", border: `1px solid ${tone}55`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>📊 Practice scorecard</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginTop: 2, textTransform: "capitalize" }}>
            {card.skill.replace(/_/g, " ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: tone, lineHeight: 1 }}>{card.score}</div>
          <div style={{ fontSize: 10, color: tone, fontWeight: 700, marginTop: 2 }}>/ 100 · {grade}</div>
        </div>
      </div>
      {card.rubric && Object.keys(card.rubric).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {Object.entries(card.rubric).map(([k, v]) => (
            <div key={k}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#B0BEC5", marginBottom: 2 }}>
                <span style={{ textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, v)}%`, background: tone, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {card.strengths && (
        <div style={{ fontSize: 11, color: "#66BB6A", marginBottom: 6 }}>✓ <b>Strengths:</b> {card.strengths}</div>
      )}
      {card.improvements && (
        <div style={{ fontSize: 11, color: "#FFC107" }}>↗ <b>Improve:</b> {card.improvements}</div>
      )}
    </div>
  );
}

/** Progress-over-time list. Drop into the AI hub history tab or profile. */
export function PracticeScorecardHistory() {
  const [rows, setRows] = useState<PracticeScorecard[] | null>(null);
  useEffect(() => { listMyScorecards().then((r) => { if (r.ok) setRows(r.data!); }); }, []);
  if (!rows) return <div style={{ fontSize: 12, color: "#8892A4" }}>Loading…</div>;
  if (rows.length === 0) return null;
  const avg = Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length);
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>📈 Practice history</div>
        <div style={{ fontSize: 12, color: "#FFC107", fontWeight: 700 }}>avg {avg}/100</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.slice(0, 10).map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#0A0E1A", borderRadius: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5", textTransform: "capitalize" }}>{r.skill.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 800, color: r.score >= 85 ? "#66BB6A" : r.score >= 70 ? "#FFC107" : "#FF7043" }}>{r.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
