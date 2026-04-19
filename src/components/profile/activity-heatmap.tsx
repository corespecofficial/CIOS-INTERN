"use client";

import { useMemo } from "react";
import type { ActivityHeatmap as HeatmapData, ActivityDay } from "@/app/actions/activity-heatmap";

const LEVEL_COLORS = ["rgba(255,255,255,0.05)", "#1a4b3a", "#2ea56a", "#4dd88b", "#7cf9b1"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  data: HeatmapData;
  compact?: boolean;
  title?: string;
}

export function ActivityHeatmap({ data, compact = false, title = "Activity" }: Props) {
  const weeks = useMemo(() => {
    const grouped: ActivityDay[][] = [];
    let week: ActivityDay[] = [];
    const first = new Date(data.days[0].date);
    const firstDow = first.getDay();
    for (let i = 0; i < firstDow; i++) {
      week.push({ date: "", count: 0, level: 0 });
    }
    for (const day of data.days) {
      week.push(day);
      if (week.length === 7) {
        grouped.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push({ date: "", count: 0, level: 0 });
      grouped.push(week);
    }
    return grouped;
  }, [data.days]);

  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstReal = week.find((d) => d.date);
      if (!firstReal) return;
      const month = new Date(firstReal.date).getMonth();
      if (month !== lastMonth) {
        labels.push({ week: wi, label: MONTHS[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const cellSize = compact ? 10 : 12;
  const cellGap = 3;

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: compact ? 16 : 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 3 }}>
            {data.total} events in the last year
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#8892A4" }}>
          <div>
            <span style={{ color: "#4dd88b", fontWeight: 700 }}>🔥 {data.streak}</span> current streak
          </div>
          <div>
            <span style={{ color: "#FFC107", fontWeight: 700 }}>⚡ {data.maxStreak}</span> best
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto", padding: "4px 0" }}>
        <div style={{ display: "inline-block", position: "relative" }}>
          {/* Month labels */}
          <div style={{ display: "flex", gap: cellGap, marginLeft: 26, marginBottom: 4, height: 12 }}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find((m) => m.week === wi);
              return (
                <div key={wi} style={{ width: cellSize, fontSize: 10, color: "#6B7280" }}>
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: cellGap }}>
            {/* Day-of-week labels */}
            <div style={{ display: "flex", flexDirection: "column", gap: cellGap, marginRight: 4 }}>
              {["", "Mon", "", "Wed", "", "Fri", ""].map((l, i) => (
                <div key={i} style={{ height: cellSize, fontSize: 9, color: "#6B7280", lineHeight: `${cellSize}px` }}>
                  {l}
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: cellGap }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={day.date ? `${day.count} ${day.count === 1 ? "event" : "events"} on ${fmtDate(day.date)}` : ""}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: day.date ? LEVEL_COLORS[day.level] : "transparent",
                      borderRadius: 2,
                      cursor: day.date ? "pointer" : "default",
                      transition: "transform 0.15s",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 10, color: "#6B7280", justifyContent: "flex-end" }}>
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
