"use client";

import { useEffect, useState } from "react";
import { getMyBehaviorInsights, type BehaviorInsights } from "@/app/actions/activity";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVENT_LABELS: Record<string, string> = {
  page_view: "Page views",
  session_start: "Sessions",
  task_completed: "Tasks done",
  class_attended: "Classes",
  message_sent: "Messages",
  note_saved: "Notes",
  course_progress: "Course progress",
  community_post: "Community posts",
  community_comment: "Community comments",
};

function formatHour(h: number): string {
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12} ${ampm}`;
}

export function BehaviorInsightsCard({ refreshMs = 60_000 }: { refreshMs?: number }) {
  const [data, setData] = useState<BehaviorInsights | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  useEffect(() => {
    const load = async () => {
      const r = await getMyBehaviorInsights();
      if (r.ok) { setData(r.data!); setLastRefresh(Date.now()); }
    };
    load();
    const i = setInterval(load, refreshMs);
    return () => clearInterval(i);
  }, [refreshMs]);

  if (!data) return null;

  const maxH = Math.max(1, ...data.hourHistogram);
  const maxD = Math.max(1, ...data.dayHistogram);

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>🧠 Your behavior pattern</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>Live — last 7 days · auto-refresh 60s</div>
        </div>
        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "rgba(102,187,106,0.1)", color: "#66BB6A", fontWeight: 700 }}>
          ● LIVE · updated {relative(lastRefresh)}
        </span>
      </div>

      {/* Headline stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label="Events" value={data.eventsLast7Days.toString()} color="#1E88E5" />
        <Stat label="Sessions" value={data.sessionsLast7Days.toString()} color="#AB47BC" />
        <Stat label="Peak hour" value={data.mostActiveHour !== null ? formatHour(data.mostActiveHour) : "—"} color="#FFC107" />
        <Stat label="Busiest day" value={data.busiestDayOfWeek !== null ? DAY_LABELS[data.busiestDayOfWeek] : "—"} color="#FF7043" />
      </div>

      {/* Hour histogram */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Activity by hour</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 2, alignItems: "flex-end", height: 70 }}>
          {data.hourHistogram.map((c, h) => (
            <div key={h} title={`${formatHour(h)} · ${c} events`} style={{
              height: `${(c / maxH) * 100}%`,
              minHeight: 2,
              background: c > 0 ? "linear-gradient(to top, #1E88E5, #66BB6A)" : "rgba(255,255,255,0.05)",
              borderRadius: "2px 2px 0 0",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#5A6478", marginTop: 4 }}>
          <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
        </div>
      </div>

      {/* Day histogram */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Activity by day</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {data.dayHistogram.map((c, d) => (
            <div key={d} style={{ textAlign: "center" }}>
              <div style={{ height: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div style={{
                  width: "60%", height: `${(c / maxD) * 100}%`, minHeight: 3,
                  background: c > 0 ? "#AB47BC" : "rgba(255,255,255,0.05)",
                  borderRadius: "4px 4px 0 0",
                }} />
              </div>
              <div style={{ fontSize: 10, color: "#8892A4", marginTop: 4 }}>{DAY_LABELS[d]}</div>
              <div style={{ fontSize: 9, color: "#5A6478" }}>{c}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top event types */}
      {data.topEvents.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Top actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {data.topEvents.map((e) => {
              const total = data.topEvents[0].count || 1;
              return (
                <div key={e.event} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#E8EDF5", flex: "0 0 130px" }}>{EVENT_LABELS[e.event] || e.event}</div>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ width: `${(e.count / total) * 100}%`, height: "100%", background: "linear-gradient(90deg, #1E88E5, #26C6DA)" }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5", minWidth: 40, textAlign: "right" }}>{e.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function relative(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}
