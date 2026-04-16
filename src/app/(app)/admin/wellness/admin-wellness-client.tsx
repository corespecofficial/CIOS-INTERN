"use client";

import { type WellnessAggregate } from "@/app/actions/wellness-types";

const GOLD = "#FFC107";
const GOLD_DIM = "rgba(255,193,7,0.12)";
const GOLD_BORDER = "rgba(255,193,7,0.25)";

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color,
          fontFamily: "'Space Grotesk', sans-serif",
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: "#5A6478", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({
  value,
  max = 5,
  color,
  invert = false,
}: {
  value: number;
  max?: number;
  color: string;
  invert?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const displayColor = invert
    ? value <= 2.5 ? "#66BB6A" : value <= 3.5 ? "#FFC107" : "#EF5350"
    : color;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: displayColor,
            borderRadius: 4,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: displayColor, fontWeight: 700, minWidth: 28, textAlign: "right" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function AdminWellnessClient({ aggregates }: { aggregates: WellnessAggregate[] }) {
  const latest = aggregates.length > 0 ? aggregates[aggregates.length - 1] : null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @media (max-width: 600px) {
          .wt-table { --wt-cols: 100px 1fr 1fr 80px !important; overflow-x: auto; }
          .wt-col-energy { display: none !important; }
          .aw-stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      {/* Header */}
      <div
        style={{
          background: GOLD_DIM,
          border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 0.5 }}>
          ADMIN PANEL
        </span>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#E8EDF5",
            margin: "4px 0 4px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          💚 Team Wellness Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Aggregated wellness check-in trends across the team. Individual data is anonymised.
        </p>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Avg Mood (this week)"
          value={latest ? latest.avg_mood.toFixed(1) : "—"}
          color="#66BB6A"
          sub="out of 5.0"
        />
        <StatCard
          label="Avg Stress (this week)"
          value={latest ? latest.avg_stress.toFixed(1) : "—"}
          color="#EF5350"
          sub="1=calm, 5=overwhelmed"
        />
        <StatCard
          label="Avg Energy (this week)"
          value={latest ? latest.avg_energy.toFixed(1) : "—"}
          color="#42A5F5"
          sub="out of 5.0"
        />
        <StatCard
          label="Responses (this week)"
          value={latest ? latest.count : 0}
          color={GOLD}
          sub="check-ins recorded"
        />
      </div>

      {/* Weekly trend table */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#E8EDF5",
          marginBottom: 14,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Weekly Trends (last {aggregates.length} weeks)
      </div>

      {aggregates.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: "#8892A4",
            background: "#111827",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 14,
            fontSize: 13,
          }}
        >
          No wellness check-ins recorded yet.
        </div>
      ) : (
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "var(--wt-cols, 140px 1fr 1fr 1fr 80px)",
              gap: 0,
              padding: "10px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {["Week", "Mood", "Stress", "Energy", "Responses"].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#8892A4",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Data rows — newest last from API but let's show newest first */}
          {[...aggregates].reverse().map((agg) => {
            const date = new Date(agg.week_of);
            const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
            return (
              <div
                key={agg.week_of}
                style={{
                  display: "grid",
                  gridTemplateColumns: "var(--wt-cols, 140px 1fr 1fr 1fr 80px)",
                  gap: 0,
                  padding: "12px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <div style={{ fontSize: 12, color: "#E8EDF5", fontWeight: 600 }}>{label}</div>

                {/* Mood bar — high=green, low=red */}
                <div style={{ paddingRight: 16 }}>
                  <MiniBar
                    value={agg.avg_mood}
                    color={agg.avg_mood >= 3.5 ? "#66BB6A" : agg.avg_mood >= 2.5 ? "#FFC107" : "#EF5350"}
                  />
                </div>

                {/* Stress bar — high=red, low=green */}
                <div style={{ paddingRight: 16 }}>
                  <MiniBar
                    value={agg.avg_stress}
                    color={agg.avg_stress >= 3.5 ? "#EF5350" : agg.avg_stress >= 2.5 ? "#FFC107" : "#66BB6A"}
                  />
                </div>

                {/* Energy bar — high=blue, low=gray */}
                <div style={{ paddingRight: 16 }}>
                  <MiniBar
                    value={agg.avg_energy}
                    color={agg.avg_energy >= 3.5 ? "#42A5F5" : agg.avg_energy >= 2.5 ? "#7986CB" : "#8892A4"}
                  />
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: GOLD,
                    textAlign: "center",
                  }}
                >
                  {agg.count}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {aggregates.length > 0 && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            fontSize: 11,
            color: "#5A6478",
          }}
        >
          <span>Mood: <span style={{ color: "#66BB6A" }}>high = positive</span> / <span style={{ color: "#EF5350" }}>low = concerning</span></span>
          <span>Stress: <span style={{ color: "#EF5350" }}>high = overwhelmed</span> / <span style={{ color: "#66BB6A" }}>low = calm</span></span>
          <span>Energy: <span style={{ color: "#42A5F5" }}>high = pumped</span> / <span style={{ color: "#8892A4" }}>low = drained</span></span>
        </div>
      )}
    </div>
  );
}
