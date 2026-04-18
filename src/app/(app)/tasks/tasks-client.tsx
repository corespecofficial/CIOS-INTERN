"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export interface TaskVM {
  title: string;
  due: string;
  dueIso: string;
  xp: number;
  status: "In Progress" | "Pending" | "Done";
  priority: "low" | "medium" | "high" | "urgent";
}

const PRIORITY: Record<TaskVM["priority"], { color: string; bg: string; label: string; dot: string }> = {
  urgent: { color: "#EF5350", bg: "rgba(239,83,80,0.12)", label: "Urgent",  dot: "#EF5350" },
  high:   { color: "#FF7043", bg: "rgba(255,112,67,0.12)", label: "High",    dot: "#FF7043" },
  medium: { color: "#FFC107", bg: "rgba(255,193,7,0.12)",  label: "Medium",  dot: "#FFC107" },
  low:    { color: "#8892A4", bg: "rgba(136,146,164,0.1)", label: "Low",     dot: "#5A6478" },
};

const STATUS: Record<TaskVM["status"], { color: string; bg: string; label: string }> = {
  "Done":        { color: "#66BB6A", bg: "rgba(102,187,106,0.12)", label: "Done ✓" },
  "In Progress": { color: "#1E88E5", bg: "rgba(30,136,229,0.12)",  label: "In Progress" },
  "Pending":     { color: "#FF7043", bg: "rgba(255,112,67,0.12)",  label: "Pending" },
};

const TABS = [
  { id: "Daily",       icon: "☀️", label: "Daily" },
  { id: "Weekly",      icon: "📅", label: "Weekly" },
  { id: "Assignments", icon: "📋", label: "Assignments" },
];

function suggest(tasks: TaskVM[]): string {
  const pending = tasks.filter((t) => t.status !== "Done");
  if (pending.length === 0) return "🎉 Inbox zero! Great work — rest up and prep for tomorrow.";
  const urgent = pending.find((t) => t.priority === "urgent");
  if (urgent) return `⚡ "${urgent.title}" is urgent. Block 25 min of deep focus now.`;
  const high = pending.find((t) => t.priority === "high");
  if (high) return `🎯 "${high.title}" is your highest-impact task. Knock it out first.`;
  return `🧠 ${pending.length} open task${pending.length !== 1 ? "s" : ""}. Start with the smallest to build momentum.`;
}

export default function TasksClient({ tasks, streak, performance }: { tasks: TaskVM[]; streak: number; performance: number }) {
  const [activeTab, setActiveTab] = useState("Daily");

  const done  = tasks.filter((t) => t.status === "Done").length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const now  = new Date();
  const in7  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const listed =
    activeTab === "Weekly"
      ? tasks.filter((t) => { const d = new Date(t.dueIso); return d >= now && d <= in7; })
      : activeTab === "Assignments"
      ? tasks.filter((t) => t.title.includes("[Masterclass") || t.title.includes("Assignment") || t.title.includes("Project"))
      : tasks;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        /* ── Tasks page responsive ── */
        .tk-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
        .tk-h1 { font-size: 28px; font-weight: 800; margin: 0; font-family: 'Space Grotesk', sans-serif; }
        .tk-subtitle { font-size: 13px; color: #5A6478; margin: 4px 0 0; }

        .tk-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .tk-stat-card { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 12px; text-align: center; position: relative; overflow: hidden; }
        .tk-stat-number { font-size: 26px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; line-height: 1; }
        .tk-stat-label { font-size: 10px; color: #5A6478; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px; }

        .tk-progress-card { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px 18px; margin-bottom: 16px; }
        .tk-progress-bar { height: 10px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; margin: 10px 0 6px; }
        .tk-progress-fill { height: 100%; background: linear-gradient(90deg, #1E88E5, #66BB6A); border-radius: 99px; transition: width 0.6s ease; }

        .tk-ai { background: linear-gradient(135deg, rgba(171,71,188,0.1), rgba(30,136,229,0.07)); border: 1px solid rgba(171,71,188,0.2); border-radius: 14px; padding: 14px 16px; margin-bottom: 18px; display: flex; align-items: flex-start; gap: 12px; }
        .tk-ai-icon { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #AB47BC, #1E88E5); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        .tk-ai-tag { font-size: 10px; font-weight: 700; color: #AB47BC; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 3px; }
        .tk-ai-text { font-size: 13px; color: #E8EDF5; line-height: 1.5; }

        .tk-tabs { display: grid; grid-template-columns: repeat(3, 1fr); background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 4px; gap: 4px; margin-bottom: 18px; }
        .tk-tab { padding: 10px 6px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; transition: all 0.2s; font-family: 'Nunito', sans-serif; display: flex; align-items: center; justify-content: center; gap: 5px; }

        .tk-count-badge { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: 800; background: rgba(255,255,255,0.12); }

        .tk-task { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; display: flex; gap: 12px; align-items: flex-start; position: relative; overflow: hidden; transition: border-color 0.2s; }
        .tk-task:active { transform: scale(0.99); }
        .tk-task-done { opacity: 0.6; }
        .tk-task-left-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 14px 0 0 14px; }
        .tk-checkbox { width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
        .tk-task-body { flex: 1; min-width: 0; }
        .tk-task-title { font-size: 14px; font-weight: 700; color: #E8EDF5; line-height: 1.4; word-break: break-word; }
        .tk-task-meta { display: flex; gap: 8px; align-items: center; margin-top: 6px; flex-wrap: wrap; }
        .tk-chip { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; }
        .tk-xp { font-size: 12px; font-weight: 700; color: #66BB6A; }
        .tk-due { font-size: 11px; color: #5A6478; }

        .tk-status-pill { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; align-self: flex-start; }

        @media (max-width: 640px) {
          .tk-h1 { font-size: 22px !important; }
          .tk-stat-number { font-size: 22px !important; }
          .tk-stat-card { padding: 12px 8px; }
          .tk-task { padding: 12px 14px; }
          .tk-task-title { font-size: 13px; }
        }
      `}</style>

      {/* Header */}
      <div className="tk-header">
        <div>
          <h1 className="tk-h1">My Tasks</h1>
          <p className="tk-subtitle">{total === 0 ? "Nothing assigned yet" : `${done} of ${total} complete`}</p>
        </div>
        <div style={{ fontSize: 28 }}>📋</div>
      </div>

      {/* Progress card */}
      <div className="tk-progress-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>Today&apos;s Progress</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? "#66BB6A" : "#E8EDF5" }}>{pct}%</span>
        </div>
        <div className="tk-progress-bar">
          <div className="tk-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ fontSize: 12, color: "#5A6478" }}>{done} done &middot; {total - done} remaining</div>
      </div>

      {/* Stats row */}
      <div className="tk-stats">
        <div className="tk-stat-card" style={{ borderTop: "2px solid #FF7043" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,112,67,0.06) 0%, transparent 100%)", pointerEvents: "none" }} />
          <div className="tk-stat-number" style={{ color: "#FF7043" }}>🔥{streak}</div>
          <div className="tk-stat-label">Day Streak</div>
        </div>
        <div className="tk-stat-card" style={{ borderTop: "2px solid #66BB6A" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(102,187,106,0.06) 0%, transparent 100%)", pointerEvents: "none" }} />
          <div className="tk-stat-number" style={{ color: "#66BB6A" }}>{performance}%</div>
          <div className="tk-stat-label">Performance</div>
        </div>
        <div className="tk-stat-card" style={{ borderTop: "2px solid #1E88E5" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(30,136,229,0.06) 0%, transparent 100%)", pointerEvents: "none" }} />
          <div className="tk-stat-number" style={{ color: "#1E88E5" }}>{done}</div>
          <div className="tk-stat-label">Tasks Done</div>
        </div>
      </div>

      {/* AI Suggestion */}
      <div className="tk-ai">
        <div className="tk-ai-icon">🤖</div>
        <div>
          <div className="tk-ai-tag">AI Coach</div>
          <div className="tk-ai-text">{suggest(tasks)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tk-tabs">
        {TABS.map((tab) => {
          const count = tab.id === "Weekly"
            ? tasks.filter((t) => { const d = new Date(t.dueIso); return d >= now && d <= in7; }).length
            : tab.id === "Assignments"
            ? tasks.filter((t) => t.title.includes("[Masterclass") || t.title.includes("Assignment") || t.title.includes("Project")).length
            : tasks.length;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} className="tk-tab" onClick={() => setActiveTab(tab.id)}
              style={{
                background: active ? "#1E88E5" : "transparent",
                color: active ? "#fff" : "#5A6478",
              }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="tk-count-badge" style={{ background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)", color: active ? "#fff" : "#8892A4" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {listed.length === 0 ? (
        <EmptyState icon="✅" title="All clear!"
          hint={activeTab === "Assignments" ? "Assignment tasks will appear here when your coach adds them." : "No tasks in this view right now."}
          action="/projects" actionLabel="View Projects" />
      ) : (
        <div>
          {listed.map((task, i) => {
            const pri    = PRIORITY[task.priority];
            const status = STATUS[task.status];
            const isDone = task.status === "Done";
            return (
              <div key={i} className={`tk-task${isDone ? " tk-task-done" : ""}`}
                style={{ borderColor: isDone ? "rgba(255,255,255,0.05)" : `${pri.color}30` }}>
                {/* Left priority bar */}
                <div className="tk-task-left-bar" style={{ background: pri.color }} />

                {/* Checkbox */}
                <div className="tk-checkbox"
                  style={{ background: isDone ? "#66BB6A" : "transparent", border: isDone ? "none" : `2px solid ${pri.color}60` }}>
                  {isDone && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Body */}
                <div className="tk-task-body">
                  <div className="tk-task-title" style={{ textDecoration: isDone ? "line-through" : "none", color: isDone ? "#5A6478" : "#E8EDF5" }}>
                    {task.title}
                  </div>
                  <div className="tk-task-meta">
                    <span className="tk-chip" style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
                    {!isDone && <span className="tk-due">{task.due}</span>}
                    <span className="tk-xp">{isDone ? `+${task.xp} XP earned` : `+${task.xp} XP`}</span>
                  </div>
                </div>

                {/* Status pill */}
                <span className="tk-status-pill" style={{ background: status.bg, color: status.color }}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
