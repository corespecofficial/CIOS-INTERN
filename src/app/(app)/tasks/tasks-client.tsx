"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

const tabItems = ["Daily", "Weekly", "Assignments"];

export interface TaskVM {
  title: string;
  due: string;
  xp: number;
  status: "In Progress" | "Pending" | "Done";
  priority: "low" | "medium" | "high" | "urgent";
}

const PRIORITY_STYLE: Record<TaskVM["priority"], { bg: string; color: string; label: string }> = {
  urgent: { bg: "rgba(239,83,80,0.15)", color: "#EF5350", label: "Urgent" },
  high: { bg: "rgba(255,112,67,0.15)", color: "#FF7043", label: "High" },
  medium: { bg: "rgba(255,193,7,0.15)", color: "#FFC107", label: "Medium" },
  low: { bg: "rgba(136,146,164,0.15)", color: "#8892A4", label: "Low" },
};

function suggest(tasks: TaskVM[]): string {
  const pending = tasks.filter((t) => t.status !== "Done");
  if (pending.length === 0) return "🎉 Inbox zero. Great work — take a breather, then queue up tomorrow's priorities.";
  const urgent = pending.find((t) => t.priority === "urgent");
  if (urgent) return `⚡ Start with "${urgent.title}" — it's urgent. Block 25 min of deep focus now.`;
  const high = pending.find((t) => t.priority === "high");
  if (high) return `🎯 "${high.title}" is your highest-impact task today. Knock it out before lunch.`;
  return `🧠 You have ${pending.length} open tasks. Pick the smallest one first to build momentum.`;
}

export default function TasksClient({
  tasks,
  streak,
  performance,
}: {
  tasks: TaskVM[];
  streak: number;
  performance: number;
}) {
  const [activeTab, setActiveTab] = useState("Daily");

  const done = tasks.filter((t) => t.status === "Done").length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusBadge = (status: TaskVM["status"]) => {
    if (status === "In Progress")
      return { background: "rgba(30,136,229,0.15)", color: "#1E88E5", label: "In Progress" };
    if (status === "Pending")
      return { background: "rgba(255,112,67,0.15)", color: "#FF7043", label: "Pending" };
    return { background: "rgba(102,187,106,0.15)", color: "#66BB6A", label: "Done" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", padding: "32px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 20px 0" }}>Tasks</h1>

      {/* Progress + Streak + Performance row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#8892A4" }}>TODAY&apos;S PROGRESS</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#66BB6A" }}>{done} / {total} done</span>
          </div>
          <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #1E88E5, #66BB6A)", transition: "width 0.6s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "#5A6478", marginTop: 8 }}>{pct}% complete</div>
        </div>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #FF7043", borderRadius: 14, padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>🔥 Streak</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#FF7043", marginTop: 4 }}>{streak}</div>
          <div style={{ fontSize: 11, color: "#5A6478" }}>days</div>
        </div>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #66BB6A", borderRadius: 14, padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>📈 Performance</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#66BB6A", marginTop: 4 }}>{performance}%</div>
          <div style={{ fontSize: 11, color: "#5A6478" }}>this month</div>
        </div>
      </div>

      {/* AI Suggestion banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.12), rgba(30,136,229,0.08))",
        border: "1px solid rgba(171,71,188,0.25)",
        borderRadius: 14, padding: "14px 18px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #AB47BC, #1E88E5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#AB47BC", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>AI Suggestion</div>
          <div style={{ fontSize: 13, color: "#E8EDF5" }}>{suggest(tasks)}</div>
        </div>
      </div>

      {/* Tab Group */}
      <div style={{ display: "flex", gap: 4, background: "#111827", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 20 }}>
        {tabItems.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500,
              border: "none", cursor: "pointer",
              background: activeTab === tab ? "#1E88E5" : "transparent",
              color: activeTab === tab ? "#fff" : "#8892A4",
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task Items */}
      {activeTab === "Daily" && tasks.length === 0 && (
        <EmptyState icon="📋" title="No tasks yet"
          hint="Your instructor will post assignments here. Meanwhile, warm up in the classroom or practice with AI Hub."
          action="/classroom" actionLabel="Open classroom" />
      )}
      {activeTab === "Daily" && tasks.length > 0 && (
        <div>
          {tasks.map((task, i) => {
            const badge = statusBadge(task.status);
            const pri = PRIORITY_STYLE[task.priority];
            const isDone = task.status === "Done";
            return (
              <div key={i} style={{ background: "#111827", borderRadius: 12, padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, border: isDone ? "none" : "2px solid #8892A4", background: isDone ? "#66BB6A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                  {isDone && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: 0, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#8892A4" : "#E8EDF5" }}>
                      {task.title}
                    </p>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: pri.bg, color: pri.color, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {pri.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: isDone ? "#66BB6A" : "#8892A4", margin: "4px 0 0 0" }}>
                    {isDone ? (
                      <span style={{ color: "#66BB6A" }}>+{task.xp} XP earned</span>
                    ) : (
                      <>{task.due} &middot; <span style={{ color: "#66BB6A" }}>+{task.xp} XP</span></>
                    )}
                  </p>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.background, color: badge.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "Weekly" && (
        <div style={{ background: "#111827", borderRadius: 12, padding: 20, color: "#8892A4", fontSize: 14 }}>
          Weekly rollup: filter the Daily list by deadlines falling in the next 7 days (coming next).
        </div>
      )}
      {activeTab === "Assignments" && (
        <div style={{ background: "#111827", borderRadius: 12, padding: 20, color: "#8892A4", fontSize: 14 }}>
          Assignments tied to courses — wire once course-tasks relation is populated.
        </div>
      )}
    </div>
  );
}
