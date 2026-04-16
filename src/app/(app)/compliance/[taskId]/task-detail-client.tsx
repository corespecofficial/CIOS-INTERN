"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type {
  ComplianceTask,
  ComplianceTaskAssignment,
  ComplianceTaskSubmission,
} from "@/app/actions/compliance-types";
import { submitTaskWork } from "@/app/actions/compliance-tasks";
import { DeadlineCountdown } from "@/components/compliance/deadline-countdown";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TaskDetail = ComplianceTask & {
  assignments: ComplianceTaskAssignment[];
  mySubmission: ComplianceTaskSubmission | null;
};

interface Props {
  task: TaskDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getPriorityStyle(priority: string) {
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

function getSubmissionStatusStyle(status: string) {
  switch (status) {
    case "approved":     return { color: "#66BB6A", bg: "rgba(102,187,106,0.12)", label: "Approved ✅" };
    case "rejected":     return { color: "#EF5350", bg: "rgba(239,83,80,0.12)",   label: "Rejected ❌" };
    case "flagged":      return { color: "#FF7043", bg: "rgba(255,112,67,0.12)",  label: "Flagged ⚑" };
    case "late_approved":return { color: "#FFC107", bg: "rgba(255,193,7,0.12)",   label: "Late (Approved) ⚠️" };
    default:             return { color: "#7C4DFF", bg: "rgba(124,77,255,0.12)",  label: "Pending Review ⏳" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Card wrapper
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  accentColor,
}: {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          padding: "14px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
          background: accentColor ? `${accentColor}0A` : undefined,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", letterSpacing: 0.2 }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "20px 22px" }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TaskDetailClient({ task }: Props) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ComplianceTaskSubmission | null>(
    task.mySubmission
  );

  const now = Date.now();
  const deadlineMs = new Date(task.deadline).getTime();
  const effectiveDeadlineMs = deadlineMs + (task.grace_period_minutes ?? 0) * 60 * 1000;
  const isOverdue = now > effectiveDeadlineMs && !submission;

  const priorityStyle = getPriorityStyle(task.priority);

  function handleSubmit() {
    if (!content.trim() && !fileUrl.trim() && !linkUrl.trim()) {
      setError("Provide at least written content, a file URL, or a reference link.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitTaskWork(task.id, {
        content: content || undefined,
        file_url: fileUrl || undefined,
        link_url: linkUrl || undefined,
      });
      if (res.ok) {
        setSuccessMsg("Your work has been submitted successfully! Awaiting admin review.");
        setSubmission({
          id: "temp",
          task_id: task.id,
          user_id: "",
          content: content || null,
          file_url: fileUrl || null,
          link_url: linkUrl || null,
          submitted_at: new Date().toISOString(),
          is_late: isOverdue,
          minutes_late: isOverdue ? Math.floor((now - effectiveDeadlineMs) / 60000) : 0,
          score_awarded: null,
          status: "pending",
          admin_feedback: null,
          reviewed_by: null,
          reviewed_at: null,
        });
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <style>{`
        .task-detail * { box-sizing: border-box; }
        .task-detail { font-family: 'Nunito', 'Inter', sans-serif; }
        @media (max-width: 600px) {
          .task-detail-header-badges { flex-wrap: wrap !important; gap: 8px !important; }
          .task-detail-title { font-size: 20px !important; }
          .task-detail-page { padding: 14px !important; }
          .task-detail-section { padding: 14px 16px !important; }
          .task-detail-form-actions { flex-direction: column !important; }
          .task-detail-form-actions button { width: 100% !important; }
        }
      `}</style>

      <div
        className="task-detail task-detail-page"
        style={{
          minHeight: "100vh",
          background: "#0A0E1A",
          color: "#E8EDF5",
          padding: "24px 20px",
        }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto" }}>

          {/* ── Breadcrumb ── */}
          <Link
            href="/compliance"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#8892A4",
              textDecoration: "none",
              marginBottom: 22,
              fontWeight: 600,
              transition: "color 0.15s",
            }}
          >
            ← Back to Compliance
          </Link>

          {/* ── Task Header ── */}
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: "26px 28px",
              marginBottom: 22,
            }}
          >
            <div
              className="task-detail-header-badges"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              {/* Priority badge */}
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.7,
                  color: priorityStyle.color,
                  background: priorityStyle.bg,
                  border: `1px solid ${priorityStyle.color}44`,
                  textTransform: "uppercase",
                }}
              >
                {priorityStyle.label}
              </span>

              {/* Type badge */}
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7C4DFF",
                  background: "rgba(124,77,255,0.12)",
                  border: "1px solid rgba(124,77,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {getTypeLabel(task.task_type)}
              </span>

              {/* Status badge */}
              {submission ? (
                <span
                  style={{
                    padding: "3px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#66BB6A",
                    background: "rgba(102,187,106,0.12)",
                    border: "1px solid rgba(102,187,106,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  ✅ Submitted
                </span>
              ) : isOverdue ? (
                <span
                  style={{
                    padding: "3px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#EF5350",
                    background: "rgba(239,83,80,0.12)",
                    border: "1px solid rgba(239,83,80,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  ⚠️ Overdue
                </span>
              ) : (
                <span
                  style={{
                    padding: "3px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#FFC107",
                    background: "rgba(255,193,7,0.12)",
                    border: "1px solid rgba(255,193,7,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  ⏰ Pending
                </span>
              )}
            </div>

            <h1
              className="task-detail-title"
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#E8EDF5",
                margin: "0 0 8px",
                lineHeight: 1.3,
                letterSpacing: -0.3,
              }}
            >
              {task.title}
            </h1>

            <div style={{ fontSize: 13, color: "#8892A4" }}>
              Deadline:{" "}
              <span style={{ color: "#E8EDF5", fontWeight: 600 }}>
                {formatDate(task.deadline)}
              </span>
              {task.grace_period_minutes > 0 && (
                <span style={{ marginLeft: 8, color: "#FFC107" }}>
                  (+{task.grace_period_minutes}m grace)
                </span>
              )}
            </div>
          </div>

          {/* ── Countdown ── */}
          <div style={{ marginBottom: 22 }}>
            <DeadlineCountdown
              deadline={task.deadline}
              gracePeriodMinutes={task.grace_period_minutes}
              taskTitle={task.title}
              compact={false}
            />
          </div>

          {/* ── Description ── */}
          {task.description && (
            <SectionCard title="📄 Task Description" accentColor="#7C4DFF">
              <p
                style={{
                  fontSize: 14,
                  color: "#E8EDF5",
                  lineHeight: 1.75,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description}
              </p>
            </SectionCard>
          )}

          {/* ── Submission format instructions ── */}
          {(task.submission_format || task.attachment_instructions) && (
            <SectionCard title="📋 Submission Instructions" accentColor="#FFC107">
              {task.submission_format && (
                <div style={{ marginBottom: task.attachment_instructions ? 14 : 0 }}>
                  <div style={{ fontSize: 12, color: "#8892A4", fontWeight: 600, marginBottom: 6 }}>
                    FORMAT REQUIRED
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#E8EDF5",
                      lineHeight: 1.7,
                      margin: 0,
                      padding: "12px 14px",
                      background: "rgba(255,193,7,0.06)",
                      borderRadius: 8,
                      border: "1px solid rgba(255,193,7,0.15)",
                    }}
                  >
                    {task.submission_format}
                  </p>
                </div>
              )}
              {task.attachment_instructions && (
                <div>
                  <div style={{ fontSize: 12, color: "#8892A4", fontWeight: 600, marginBottom: 6 }}>
                    ATTACHMENT INSTRUCTIONS
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#E8EDF5",
                      lineHeight: 1.7,
                      margin: 0,
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {task.attachment_instructions}
                  </p>
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Fine Info Card ── */}
          {task.fine_amount > 0 && (
            <div
              style={{
                marginBottom: 22,
                padding: "18px 22px",
                background: "rgba(255,193,7,0.06)",
                border: "1px solid rgba(255,193,7,0.25)",
                borderRadius: 16,
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>💸</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#FFC107", marginBottom: 4 }}>
                  Fine: {formatNaira(task.fine_amount)}
                </div>
                <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6 }}>
                  If you miss this task or submit after the deadline without approval, you will be
                  fined <strong style={{ color: "#FFC107" }}>{formatNaira(task.fine_amount)}</strong>.
                  {task.late_fine_amount && task.late_fine_amount > 0 && (
                    <span>
                      {" "}
                      Late submissions incur an additional fine of{" "}
                      <strong style={{ color: "#FF7043" }}>
                        {formatNaira(task.late_fine_amount)}
                      </strong>
                      .
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Submission section ── */}
          {submission ? (
            /* ── Existing submission view ── */
            <SectionCard title="✅ Your Submission" accentColor="#66BB6A">
              {/* Status badge */}
              {(() => {
                const ss = getSubmissionStatusStyle(submission.status);
                return (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 14px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 800,
                      color: ss.color,
                      background: ss.bg,
                      border: `1px solid ${ss.color}44`,
                      marginBottom: 16,
                    }}
                  >
                    {ss.label}
                  </div>
                );
              })()}

              <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>
                Submitted:{" "}
                <span style={{ color: "#E8EDF5", fontWeight: 600 }}>
                  {formatDate(submission.submitted_at)}
                </span>
                {submission.is_late && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "rgba(239,83,80,0.12)",
                      color: "#EF5350",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Late by {submission.minutes_late}m
                  </span>
                )}
              </div>

              {submission.content && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{ fontSize: 12, color: "#8892A4", fontWeight: 600, marginBottom: 6 }}
                  >
                    WRITTEN RESPONSE
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#E8EDF5",
                      lineHeight: 1.7,
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.07)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {submission.content}
                  </div>
                </div>
              )}

              {submission.file_url && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{ fontSize: 12, color: "#8892A4", fontWeight: 600, marginBottom: 6 }}
                  >
                    FILE SUBMITTED
                  </div>
                  <a
                    href={submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13,
                      color: "#7C4DFF",
                      textDecoration: "none",
                      fontWeight: 600,
                      wordBreak: "break-all",
                    }}
                  >
                    🔗 {submission.file_url}
                  </a>
                </div>
              )}

              {submission.link_url && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{ fontSize: 12, color: "#8892A4", fontWeight: 600, marginBottom: 6 }}
                  >
                    REFERENCE LINK
                  </div>
                  <a
                    href={submission.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13,
                      color: "#7C4DFF",
                      textDecoration: "none",
                      fontWeight: 600,
                      wordBreak: "break-all",
                    }}
                  >
                    🔗 {submission.link_url}
                  </a>
                </div>
              )}

              {/* Admin Feedback */}
              {submission.admin_feedback && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "14px 16px",
                    background: "rgba(124,77,255,0.08)",
                    border: "1px solid rgba(124,77,255,0.25)",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#7C4DFF",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      marginBottom: 6,
                    }}
                  >
                    ADMIN FEEDBACK
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#E8EDF5",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {submission.admin_feedback}
                  </p>
                  {submission.reviewed_at && (
                    <div style={{ fontSize: 11, color: "#8892A4", marginTop: 8 }}>
                      Reviewed: {formatDate(submission.reviewed_at)}
                    </div>
                  )}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 16px",
                    background: "rgba(102,187,106,0.1)",
                    border: "1px solid rgba(102,187,106,0.3)",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#66BB6A",
                    fontWeight: 700,
                  }}
                >
                  {successMsg}
                </div>
              )}
            </SectionCard>
          ) : (
            /* ── Submit form ── */
            <SectionCard title="📤 Submit Your Work" accentColor="#7C4DFF">
              {/* Late warning */}
              {isOverdue && (
                <div
                  style={{
                    marginBottom: 18,
                    padding: "12px 16px",
                    background: "rgba(239,83,80,0.09)",
                    border: "1px solid rgba(239,83,80,0.35)",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "#EF5350",
                    fontWeight: 600,
                    lineHeight: 1.6,
                  }}
                >
                  ⚠️{" "}
                  <strong>Late submission warning:</strong> The deadline has passed. Your submission
                  will be marked as late and may incur a fine of{" "}
                  {formatNaira(task.fine_amount)}. Submit anyway to reduce penalties.
                </div>
              )}

              {error && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "12px 16px",
                    background: "rgba(239,83,80,0.09)",
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

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Written content */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#8892A4",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Written Response
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => { setContent(e.target.value); setError(null); }}
                    placeholder="Write your response, explanation, or findings here..."
                    rows={5}
                    style={{
                      width: "100%",
                      background: "#0A0E1A",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      color: "#E8EDF5",
                      fontSize: 14,
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "'Nunito', 'Inter', sans-serif",
                      lineHeight: 1.65,
                      boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                {/* File URL */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#8892A4",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    File / Document URL <span style={{ fontWeight: 400, textTransform: "none", color: "#666" }}>(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => { setFileUrl(e.target.value); setError(null); }}
                    placeholder="https://drive.google.com/file/..."
                    style={{
                      width: "100%",
                      background: "#0A0E1A",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      color: "#E8EDF5",
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "'Nunito', 'Inter', sans-serif",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                {/* Link URL */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#8892A4",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Reference Link <span style={{ fontWeight: 400, textTransform: "none", color: "#666" }}>(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => { setLinkUrl(e.target.value); setError(null); }}
                    placeholder="https://github.com/..."
                    style={{
                      width: "100%",
                      background: "#0A0E1A",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      color: "#E8EDF5",
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "'Nunito', 'Inter', sans-serif",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                {/* Submit button */}
                <div
                  className="task-detail-form-actions"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href="/compliance"
                    style={{
                      padding: "11px 22px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "transparent",
                      color: "#8892A4",
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: "none",
                      display: "inline-block",
                      textAlign: "center",
                    }}
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={isPending}
                    style={{
                      padding: "11px 32px",
                      borderRadius: 10,
                      border: "none",
                      background: isPending
                        ? "rgba(124,77,255,0.4)"
                        : isOverdue
                        ? "rgba(239,83,80,0.85)"
                        : "#7C4DFF",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 14,
                      cursor: isPending ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      letterSpacing: 0.3,
                    }}
                  >
                    {isPending
                      ? "Submitting..."
                      : isOverdue
                      ? "⚠️ Submit Late Work"
                      : "Submit Work →"}
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          <div style={{ height: 48 }} />
        </div>
      </div>
    </>
  );
}
