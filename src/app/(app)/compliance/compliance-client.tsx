"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { TaskWithStatus, MyComplianceStatus } from "@/app/actions/compliance-types";
import { submitTaskWork } from "@/app/actions/compliance-tasks";
import { DeadlineCountdown } from "@/components/compliance/deadline-countdown";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  tasks: TaskWithStatus[];
  status: MyComplianceStatus;
}

type TabKey = "all" | "pending" | "overdue" | "submitted";

interface SubmitState {
  content: string;
  fileUrl: string;
  linkUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function getPriorityStyle(priority: string): { color: string; bg: string; label: string } {
  switch (priority) {
    case "critical": return { color: "#EF5350", bg: "rgba(239,83,80,0.12)", label: "CRITICAL" };
    case "high":     return { color: "#FF7043", bg: "rgba(255,112,67,0.12)", label: "HIGH" };
    case "medium":   return { color: "#FFC107", bg: "rgba(255,193,7,0.12)",  label: "MEDIUM" };
    default:         return { color: "#66BB6A", bg: "rgba(102,187,106,0.12)", label: "LOW" };
  }
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    assignment: "Assignment",
    quiz: "Quiz",
    project: "Project",
    attendance: "Attendance",
    survey: "Survey",
    report: "Report",
    other: "Other",
  };
  return map[type] ?? type;
}

function getComplianceScoreColor(score: number): string {
  if (score >= 80) return "#66BB6A";
  if (score >= 50) return "#FFC107";
  return "#EF5350";
}

function calcComplianceScore(tasks: TaskWithStatus[]): number {
  if (tasks.length === 0) return 100;
  const onTime = tasks.filter(
    (t) => t.has_submission && t.submission && !t.submission.is_late
  ).length;
  return Math.round((onTime / tasks.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#8892A4", fontWeight: 600, letterSpacing: 0.3 }}>
        {label}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const s = getPriorityStyle(priority);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.6,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}44`,
        textTransform: "uppercase",
      }}
    >
      {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        color: "#7C4DFF",
        background: "rgba(124,77,255,0.12)",
        border: "1px solid rgba(124,77,255,0.3)",
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {getTypeLabel(type)}
    </span>
  );
}

function StatusIndicator({ task }: { task: TaskWithStatus }) {
  if (task.has_submission) {
    return (
      <span style={{ fontSize: 13, fontWeight: 700, color: "#66BB6A" }}>
        ✅ Submitted
      </span>
    );
  }
  if (task.is_overdue) {
    return (
      <span style={{ fontSize: 13, fontWeight: 700, color: "#EF5350" }}>
        ⚠️ Overdue
      </span>
    );
  }
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: "#FFC107" }}>
      ⏰ Pending
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline submission form
// ─────────────────────────────────────────────────────────────────────────────

function InlineSubmitForm({
  taskId,
  taskTitle,
  isOverdue,
  onSuccess,
  onCancel,
}: {
  taskId: string;
  taskTitle: string;
  isOverdue: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<SubmitState>({ content: "", fileUrl: "", linkUrl: "" });
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function handleChange(field: keyof SubmitState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function handleSubmit() {
    if (!form.content.trim() && !form.fileUrl.trim() && !form.linkUrl.trim()) {
      setError("Please provide at least some content, a file URL, or a link.");
      return;
    }
    startTransition(async () => {
      const res = await submitTaskWork(taskId, {
        content: form.content || undefined,
        file_url: form.fileUrl || undefined,
        link_url: form.linkUrl || undefined,
      });
      if (res.ok) {
        setToast("Work submitted successfully!");
        setTimeout(() => {
          setToast(null);
          onSuccess();
        }, 1500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <style>{`
        .submit-form-area { font-size: 14px !important; }
        @media (max-width: 600px) {
          .submit-form-area textarea,
          .submit-form-area input { font-size: 16px !important; }
        }
      `}</style>

      <div
        className="submit-form-area"
        style={{
          marginTop: 16,
          padding: "18px 20px",
          background: "rgba(124,77,255,0.06)",
          border: "1px solid rgba(124,77,255,0.25)",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#E8EDF5",
            marginBottom: 4,
          }}
        >
          Submit Work — {taskTitle}
        </div>

        {isOverdue && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              background: "rgba(239,83,80,0.1)",
              border: "1px solid rgba(239,83,80,0.3)",
              borderRadius: 8,
              fontSize: 13,
              color: "#EF5350",
              fontWeight: 600,
            }}
          >
            ⚠️ This task is overdue. Late submission may result in partial credit or a fine.
          </div>
        )}

        {toast && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              background: "rgba(102,187,106,0.12)",
              border: "1px solid rgba(102,187,106,0.35)",
              borderRadius: 8,
              fontSize: 13,
              color: "#66BB6A",
              fontWeight: 700,
            }}
          >
            {toast}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              background: "rgba(239,83,80,0.1)",
              border: "1px solid rgba(239,83,80,0.3)",
              borderRadius: 8,
              fontSize: 13,
              color: "#EF5350",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 5, fontWeight: 600 }}
            >
              Written Response
            </label>
            <textarea
              value={form.content}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder="Describe your work, findings, or answer here..."
              rows={4}
              style={{
                width: "100%",
                background: "#0A0E1A",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#E8EDF5",
                fontSize: 14,
                resize: "vertical",
                outline: "none",
                fontFamily: "'Nunito', 'Inter', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 5, fontWeight: 600 }}
            >
              File URL (optional)
            </label>
            <input
              type="url"
              value={form.fileUrl}
              onChange={(e) => handleChange("fileUrl", e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{
                width: "100%",
                background: "#0A0E1A",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#E8EDF5",
                fontSize: 14,
                outline: "none",
                fontFamily: "'Nunito', 'Inter', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 5, fontWeight: 600 }}
            >
              Reference Link (optional)
            </label>
            <input
              type="url"
              value={form.linkUrl}
              onChange={(e) => handleChange("linkUrl", e.target.value)}
              placeholder="https://github.com/..."
              style={{
                width: "100%",
                background: "#0A0E1A",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#E8EDF5",
                fontSize: 14,
                outline: "none",
                fontFamily: "'Nunito', 'Inter', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              onClick={onCancel}
              disabled={isPending}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "#8892A4",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                padding: "9px 24px",
                borderRadius: 8,
                border: "none",
                background: isPending ? "#333" : "#7C4DFF",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: isPending ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {isPending ? "Submitting..." : "Submit Work"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Card
// ─────────────────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: TaskWithStatus }) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(task.has_submission);

  const descPreview =
    task.description && task.description.length > 100
      ? task.description.slice(0, 100) + "..."
      : task.description ?? "";

  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .task-card-actions { flex-direction: column !important; }
          .task-card-actions a,
          .task-card-actions button { width: 100% !important; text-align: center !important; }
          .task-card-badges { flex-wrap: wrap !important; }
        }
      `}</style>

      <div
        style={{
          background: "#111827",
          border: `1px solid ${task.is_overdue && !submitted ? "rgba(239,83,80,0.35)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 14,
          padding: "20px 22px",
          transition: "border-color 0.2s",
        }}
      >
        {/* Header row */}
        <div
          className="task-card-badges"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <PriorityBadge priority={task.priority} />
          <TypeBadge type={task.task_type} />
          <div style={{ marginLeft: "auto" }}>
            <StatusIndicator task={{ ...task, has_submission: submitted }} />
          </div>
        </div>

        {/* Title & description */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#E8EDF5",
            marginBottom: 6,
            lineHeight: 1.35,
          }}
        >
          {task.title}
        </div>
        {descPreview && (
          <div
            style={{
              fontSize: 13,
              color: "#8892A4",
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            {descPreview}
          </div>
        )}

        {/* Countdown + Fine info */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <DeadlineCountdown
            deadline={task.deadline}
            gracePeriodMinutes={task.grace_period_minutes}
            compact
          />
          {task.fine_amount > 0 && !submitted && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#FFC107",
                background: "rgba(255,193,7,0.1)",
                border: "1px solid rgba(255,193,7,0.25)",
                borderRadius: 20,
                padding: "3px 10px",
              }}
            >
              Fine: {formatNaira(task.fine_amount)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {!submitted && (
          <div
            className="task-card-actions"
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setShowForm((v) => !v)}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "9px 16px",
                borderRadius: 8,
                border: "none",
                background: showForm ? "rgba(124,77,255,0.15)" : "#7C4DFF",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              {showForm ? "Close Form" : "Submit Work"}
            </button>
            <Link
              href={`/compliance/${task.id}`}
              style={{
                flex: 1,
                minWidth: 100,
                padding: "9px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "#8892A4",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "none",
                textAlign: "center",
                display: "block",
              }}
            >
              View Details
            </Link>
          </div>
        )}

        {submitted && (
          <Link
            href={`/compliance/${task.id}`}
            style={{
              display: "inline-block",
              padding: "9px 20px",
              borderRadius: 8,
              border: "1px solid rgba(102,187,106,0.3)",
              background: "rgba(102,187,106,0.08)",
              color: "#66BB6A",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            View Submission →
          </Link>
        )}

        {/* Inline form */}
        {showForm && !submitted && (
          <InlineSubmitForm
            taskId={task.id}
            taskTitle={task.title}
            isOverdue={task.is_overdue}
            onSuccess={() => {
              setSubmitted(true);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ComplianceClient({ tasks, status }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const score = calcComplianceScore(tasks);
  const scoreColor = getComplianceScoreColor(score);

  const overdueCount = tasks.filter((t) => t.is_overdue && !t.has_submission).length;
  const activeTasks = tasks.filter((t) => !t.has_submission && !t.is_overdue).length;

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return !t.has_submission && !t.is_overdue;
    if (activeTab === "overdue") return t.is_overdue && !t.has_submission;
    if (activeTab === "submitted") return t.has_submission;
    return true;
  });

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all",       label: "All",       count: tasks.length },
    { key: "pending",   label: "Pending",   count: activeTasks },
    { key: "overdue",   label: "Overdue",   count: overdueCount },
    { key: "submitted", label: "Submitted", count: tasks.filter((t) => t.has_submission).length },
  ];

  return (
    <>
      <style>{`
        .compliance-page * { box-sizing: border-box; }
        .compliance-page { font-family: 'Nunito', 'Inter', sans-serif; }
        @media (max-width: 600px) {
          .compliance-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .compliance-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .compliance-tab { padding: 8px 12px !important; font-size: 12px !important; }
          .compliance-tabs { gap: 6px !important; }
          .compliance-main { padding: 16px !important; }
        }
      `}</style>

      <div
        className="compliance-page"
        style={{
          minHeight: "100vh",
          background: "#0A0E1A",
          color: "#E8EDF5",
          padding: "24px 20px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div
            className="compliance-header-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 28,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#E8EDF5",
                  margin: 0,
                  letterSpacing: -0.5,
                }}
              >
                ⚡ My Compliance
              </h1>
              <p style={{ fontSize: 14, color: "#8892A4", margin: "6px 0 0" }}>
                Track your assignments, deadlines, and compliance score
              </p>
            </div>

            {/* Score pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                background: "#111827",
                border: `1px solid ${scoreColor}44`,
                borderRadius: 40,
                boxShadow: `0 0 16px ${scoreColor}22`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: scoreColor,
                  boxShadow: `0 0 6px ${scoreColor}`,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 900, color: scoreColor }}>
                {score}%
              </span>
              <span style={{ fontSize: 12, color: "#8892A4", fontWeight: 600 }}>
                Score
              </span>
            </div>
          </div>

          {/* ── Blocked Banner ── */}
          {status.isBlocked && (
            <div
              style={{
                marginBottom: 24,
                padding: "18px 22px",
                background: "rgba(239,83,80,0.08)",
                border: "1px solid rgba(239,83,80,0.4)",
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
              >
                <span style={{ fontSize: 20 }}>⚠️</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#EF5350" }}>
                  Your account has restrictions
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#E8EDF5", margin: 0, lineHeight: 1.6 }}>
                {status.blockReason === "suspended"
                  ? "You have an active suspension. Some features may be limited."
                  : "You have unpaid fines that must be cleared to restore full access."}
              </p>
              {status.totalUnpaidAmount > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: "rgba(239,83,80,0.12)",
                    borderRadius: 20,
                    alignSelf: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#EF5350" }}>
                    Total Unpaid: {formatNaira(status.totalUnpaidAmount)}
                  </span>
                </div>
              )}
              <Link
                href="/appeals"
                style={{
                  alignSelf: "flex-start",
                  marginTop: 4,
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: "rgba(239,83,80,0.15)",
                  border: "1px solid rgba(239,83,80,0.4)",
                  color: "#EF5350",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Submit an Appeal →
              </Link>
            </div>
          )}

          {/* ── Stat Cards ── */}
          <div
            className="compliance-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Active Tasks"
              value={activeTasks}
              accent="#7C4DFF"
              icon="📋"
            />
            <StatCard
              label="Overdue Tasks"
              value={overdueCount}
              accent="#EF5350"
              icon="🚨"
            />
            <StatCard
              label="Unpaid Fines"
              value={
                status.totalUnpaidAmount > 0
                  ? formatNaira(status.totalUnpaidAmount)
                  : "₦0"
              }
              accent="#FFC107"
              icon="💸"
            />
            <StatCard
              label="Compliance Score"
              value={`${score}%`}
              accent={scoreColor}
              icon="🎯"
            />
          </div>

          {/* ── Tab Bar ── */}
          <div
            className="compliance-tabs"
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className="compliance-tab"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 30,
                    border: `1px solid ${isActive ? "#7C4DFF" : "rgba(255,255,255,0.1)"}`,
                    background: isActive ? "#7C4DFF" : "transparent",
                    color: isActive ? "#fff" : "#8892A4",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      background: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
                      color: isActive ? "#fff" : "#8892A4",
                      fontSize: 11,
                      fontWeight: 900,
                      padding: "0 5px",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Task List ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredTasks.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  background: "#111827",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {activeTab === "submitted" ? (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>
                      No submissions yet
                    </div>
                    <div style={{ fontSize: 13, color: "#8892A4" }}>
                      Complete and submit your assigned tasks to see them here.
                    </div>
                  </>
                ) : activeTab === "overdue" ? (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#66BB6A", marginBottom: 6 }}>
                      No overdue tasks!
                    </div>
                    <div style={{ fontSize: 13, color: "#8892A4" }}>
                      You're on top of your compliance. Keep it up!
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>
                      {tasks.length === 0 ? "No tasks assigned yet" : "All tasks complete!"}
                    </div>
                    <div style={{ fontSize: 13, color: "#8892A4" }}>
                      {tasks.length === 0
                        ? "You have no active compliance tasks at the moment."
                        : "You've completed all tasks in this category. Great work!"}
                    </div>
                  </>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>

          {/* ── Footer spacer ── */}
          <div style={{ height: 48 }} />
        </div>
      </div>
    </>
  );
}
