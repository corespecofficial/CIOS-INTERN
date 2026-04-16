"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ComplianceAppeal, ComplianceSuspension } from "@/app/actions/compliance-types";
import {
  submitAppeal,
  type SubmitAppealInput,
} from "@/app/actions/compliance-appeals";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  myAppeals: ComplianceAppeal[];
  activeSuspension: ComplianceSuspension | null;
}

interface AppealFormState {
  internName: string;
  internIdNumber: string;
  reason: string;
  explanation: string;
  evidenceUrl: string;
  emergencyDetails: string;
  promiseStatement: string;
}

const EMPTY_FORM: AppealFormState = {
  internName: "",
  internIdNumber: "",
  reason: "",
  explanation: "",
  evidenceUrl: "",
  emergencyDetails: "",
  promiseStatement: "",
};

const REASON_OPTIONS = [
  { value: "", label: "— Select a reason —" },
  { value: "Technical issue", label: "Technical issue" },
  { value: "Medical/Emergency", label: "Medical / Emergency" },
  { value: "Unfair task", label: "Unfair task assignment" },
  { value: "Work submitted elsewhere", label: "Work submitted elsewhere" },
  { value: "Other", label: "Other" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function getAppealStatusStyle(status: string) {
  switch (status) {
    case "approved":
      return { color: "#66BB6A", bg: "rgba(102,187,106,0.12)", label: "Approved ✅", border: "rgba(102,187,106,0.3)" };
    case "rejected":
      return { color: "#EF5350", bg: "rgba(239,83,80,0.12)",   label: "Rejected ❌", border: "rgba(239,83,80,0.3)" };
    case "escalated":
      return { color: "#FF7043", bg: "rgba(255,112,67,0.12)",  label: "Escalated ⬆️", border: "rgba(255,112,67,0.3)" };
    default:
      return { color: "#FFC107", bg: "rgba(255,193,7,0.12)",   label: "Pending ⏳", border: "rgba(255,193,7,0.3)" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Input / Textarea helpers
// ─────────────────────────────────────────────────────────────────────────────

function FormLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 7 }}>
      <label
        style={{
          fontSize: 12,
          color: "#8892A4",
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {children}
        {required && (
          <span style={{ color: "#EF5350", marginLeft: 3 }}>*</span>
        )}
      </label>
      {hint && (
        <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2, fontWeight: 400 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "#0A0E1A",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#E8EDF5",
  fontSize: 14,
  outline: "none",
  fontFamily: "'Nunito', 'Inter', sans-serif",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

// ─────────────────────────────────────────────────────────────────────────────
// Appeal History Item
// ─────────────────────────────────────────────────────────────────────────────

function AppealHistoryItem({ appeal }: { appeal: ComplianceAppeal }) {
  const [expanded, setExpanded] = useState(false);
  const ss = getAppealStatusStyle(appeal.status);

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#E8EDF5",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {appeal.reason}
          </div>
          <div style={{ fontSize: 12, color: "#8892A4" }}>
            Submitted {formatDate(appeal.created_at)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span
            style={{
              padding: "3px 12px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 800,
              color: ss.color,
              background: ss.bg,
              border: `1px solid ${ss.border}`,
              letterSpacing: 0.4,
            }}
          >
            {ss.label}
          </span>
          <span
            style={{
              fontSize: 18,
              color: "#8892A4",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              display: "inline-block",
            }}
          >
            ›
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            padding: "0 20px 18px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ height: 8 }} />

          <div>
            <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Explanation
            </div>
            <p style={{ fontSize: 13, color: "#E8EDF5", lineHeight: 1.65, margin: 0 }}>
              {appeal.explanation}
            </p>
          </div>

          {appeal.evidence_url && (
            <div>
              <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Evidence
              </div>
              <a
                href={appeal.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#7C4DFF", wordBreak: "break-all" }}
              >
                🔗 {appeal.evidence_url}
              </a>
            </div>
          )}

          {appeal.promise_statement && (
            <div>
              <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Promise
              </div>
              <p style={{ fontSize: 13, color: "#E8EDF5", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
                "{appeal.promise_statement}"
              </p>
            </div>
          )}

          {appeal.admin_notes && (
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(124,77,255,0.08)",
                border: "1px solid rgba(124,77,255,0.2)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 11, color: "#7C4DFF", fontWeight: 700, marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Admin Notes
              </div>
              <p style={{ fontSize: 13, color: "#E8EDF5", lineHeight: 1.65, margin: 0 }}>
                {appeal.admin_notes}
              </p>
              {appeal.reviewed_at && (
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 6 }}>
                  Reviewed: {formatDate(appeal.reviewed_at)}
                  {appeal.reviewer_name && (
                    <span> by {appeal.reviewer_name}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AppealsClient({ myAppeals, activeSuspension }: Props) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<AppealFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hasPendingAppeal = myAppeals.some((a) => a.status === "pending");

  function updateField(field: keyof AppealFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  }

  function handleSubmit() {
    if (!form.internName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!form.reason) {
      setFormError("Please select a reason for your appeal.");
      return;
    }
    if (form.explanation.trim().length < 50) {
      setFormError("Please provide a detailed explanation (at least 50 characters).");
      return;
    }

    setFormError(null);

    startTransition(async () => {
      const input: SubmitAppealInput = {
        intern_name: form.internName.trim(),
        intern_id_number: form.internIdNumber.trim() || undefined,
        reason: form.reason,
        explanation: form.explanation.trim(),
        evidence_url: form.evidenceUrl.trim() || undefined,
        emergency_details: form.emergencyDetails.trim() || undefined,
        promise_statement: form.promiseStatement.trim() || undefined,
        suspension_id: activeSuspension?.id || undefined,
      };

      const res = await submitAppeal(input);
      if (res.ok) {
        setSuccessMsg(
          "Your appeal has been submitted successfully. Our admin team will review it shortly."
        );
        setForm(EMPTY_FORM);
      } else {
        setFormError(res.error);
      }
    });
  }

  return (
    <>
      <style>{`
        .appeals-page * { box-sizing: border-box; }
        .appeals-page { font-family: 'Nunito', 'Inter', sans-serif; }
        @media (max-width: 600px) {
          .appeals-page-inner { padding: 14px !important; }
          .appeals-form-actions { flex-direction: column !important; }
          .appeals-form-actions button { width: 100% !important; }
          .appeals-header-title { font-size: 22px !important; }
        }
      `}</style>

      <div
        className="appeals-page"
        style={{
          minHeight: "100vh",
          background: "#0A0E1A",
          color: "#E8EDF5",
          padding: "24px 20px",
        }}
      >
        <div
          className="appeals-page-inner"
          style={{ maxWidth: 780, margin: "0 auto" }}
        >

          {/* ── Header ── */}
          <div style={{ marginBottom: 32 }}>
            <Link
              href="/compliance"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#8892A4",
                textDecoration: "none",
                marginBottom: 18,
                fontWeight: 600,
              }}
            >
              ← Back to Compliance
            </Link>

            <h1
              className="appeals-header-title"
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#E8EDF5",
                margin: "0 0 8px",
                letterSpacing: -0.5,
              }}
            >
              📋 Appeal Center
            </h1>
            <p style={{ fontSize: 14, color: "#8892A4", margin: 0, lineHeight: 1.65 }}>
              Use this form to appeal a suspension, challenge a fine, or dispute a compliance
              decision. Appeals are reviewed by admin within 24–48 hours. Please provide as much
              detail as possible to support your case.
            </p>
          </div>

          {/* ── Active Suspension Banner ── */}
          {activeSuspension && (
            <div
              style={{
                marginBottom: 28,
                padding: "20px 22px",
                background: "rgba(255,193,7,0.07)",
                border: "1px solid rgba(255,193,7,0.35)",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 22 }}>🔒</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#FFC107" }}>
                  You have an active suspension
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(255,193,7,0.06)",
                    borderRadius: 10,
                    border: "1px solid rgba(255,193,7,0.15)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Reason
                  </div>
                  <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>
                    {activeSuspension.reason}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(255,193,7,0.06)",
                    borderRadius: 10,
                    border: "1px solid rgba(255,193,7,0.15)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Suspended Since
                  </div>
                  <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>
                    {formatDate(activeSuspension.suspended_at)}
                  </div>
                </div>

                {activeSuspension.unpaid_fine_total > 0 && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(239,83,80,0.07)",
                      borderRadius: 10,
                      border: "1px solid rgba(239,83,80,0.2)",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      Unpaid Fines
                    </div>
                    <div style={{ fontSize: 14, color: "#EF5350", fontWeight: 900 }}>
                      {formatNaira(activeSuspension.unpaid_fine_total)}
                    </div>
                  </div>
                )}
              </div>

              <p style={{ fontSize: 13, color: "#FFC107", margin: "4px 0 0", fontWeight: 600 }}>
                Your appeal below will address this suspension. Fill out all details carefully.
              </p>
            </div>
          )}

          {/* ── Pending appeal notice ── */}
          {hasPendingAppeal && !successMsg && (
            <div
              style={{
                marginBottom: 28,
                padding: "18px 22px",
                background: "rgba(255,193,7,0.07)",
                border: "1px solid rgba(255,193,7,0.3)",
                borderRadius: 14,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>⏳</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#FFC107", marginBottom: 4 }}>
                  Appeal Pending Review
                </div>
                <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.6 }}>
                  You already have a pending appeal. Please wait for the admin team to review it
                  before submitting a new one. You can track the status in your history below.
                </p>
              </div>
            </div>
          )}

          {/* ── Success message ── */}
          {successMsg && (
            <div
              style={{
                marginBottom: 28,
                padding: "20px 22px",
                background: "rgba(102,187,106,0.09)",
                border: "1px solid rgba(102,187,106,0.35)",
                borderRadius: 14,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>✅</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#66BB6A", marginBottom: 4 }}>
                  Appeal Submitted
                </div>
                <p style={{ fontSize: 13, color: "#E8EDF5", margin: 0, lineHeight: 1.6 }}>
                  {successMsg}
                </p>
              </div>
            </div>
          )}

          {/* ── Appeal form ── */}
          {!hasPendingAppeal && !successMsg && (
            <div
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                overflow: "hidden",
                marginBottom: 32,
              }}
            >
              {/* Form header */}
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(124,77,255,0.06)",
                  borderLeft: "3px solid #7C4DFF",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 900, color: "#E8EDF5" }}>
                  Submit New Appeal
                </div>
                <div style={{ fontSize: 12, color: "#8892A4", marginTop: 3 }}>
                  All fields marked with * are required.
                </div>
              </div>

              <div
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Name + ID row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <FormLabel required hint="Your full name as registered in the system">
                      Your Name
                    </FormLabel>
                    <input
                      type="text"
                      value={form.internName}
                      onChange={(e) => updateField("internName", e.target.value)}
                      placeholder="e.g. Chioma Adebayo"
                      style={inputBase}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>
                  <div>
                    <FormLabel hint="Your intern ID (optional)">
                      Intern ID Number
                    </FormLabel>
                    <input
                      type="text"
                      value={form.internIdNumber}
                      onChange={(e) => updateField("internIdNumber", e.target.value)}
                      placeholder="e.g. CIOS-2024-042"
                      style={inputBase}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <FormLabel required hint="Select the primary reason for your appeal">
                    Reason for Appeal
                  </FormLabel>
                  <select
                    value={form.reason}
                    onChange={(e) => updateField("reason", e.target.value)}
                    style={{
                      ...inputBase,
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%238892A4' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                      paddingRight: 36,
                      cursor: "pointer",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  >
                    {REASON_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        style={{ background: "#111827", color: "#E8EDF5" }}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detailed explanation */}
                <div>
                  <FormLabel
                    required
                    hint="Minimum 50 characters. Be as specific as possible."
                  >
                    Detailed Explanation
                  </FormLabel>
                  <textarea
                    value={form.explanation}
                    onChange={(e) => updateField("explanation", e.target.value)}
                    placeholder="Explain your situation in detail. What happened? Why should this be reviewed? What evidence do you have?"
                    rows={5}
                    style={{
                      ...inputBase,
                      resize: "vertical",
                      lineHeight: 1.65,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        form.explanation.trim().length >= 50 ? "#66BB6A" : "#8892A4",
                      marginTop: 5,
                      fontWeight: 600,
                    }}
                  >
                    {form.explanation.trim().length} / 50 minimum characters
                  </div>
                </div>

                {/* Evidence URL */}
                <div>
                  <FormLabel hint="A link to supporting documents, screenshots, or proof">
                    Evidence URL
                  </FormLabel>
                  <input
                    type="url"
                    value={form.evidenceUrl}
                    onChange={(e) => updateField("evidenceUrl", e.target.value)}
                    placeholder="https://drive.google.com/..."
                    style={inputBase}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                {/* Emergency details */}
                <div>
                  <FormLabel hint="Only if this is a medical or emergency situation">
                    Emergency / Medical Details
                  </FormLabel>
                  <textarea
                    value={form.emergencyDetails}
                    onChange={(e) => updateField("emergencyDetails", e.target.value)}
                    placeholder="Describe any medical or emergency circumstances if applicable..."
                    rows={3}
                    style={{
                      ...inputBase,
                      resize: "vertical",
                      lineHeight: 1.65,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                {/* Promise of compliance */}
                <div>
                  <FormLabel hint='State your commitment going forward, e.g. "I promise to..."'>
                    Promise of Compliance
                  </FormLabel>
                  <textarea
                    value={form.promiseStatement}
                    onChange={(e) => updateField("promiseStatement", e.target.value)}
                    placeholder="I promise to submit all future tasks on time and maintain full compliance with program requirements..."
                    rows={3}
                    style={{
                      ...inputBase,
                      resize: "vertical",
                      lineHeight: 1.65,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,77,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                {/* Error */}
                {formError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(239,83,80,0.09)",
                      border: "1px solid rgba(239,83,80,0.3)",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "#EF5350",
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ {formError}
                  </div>
                )}

                {/* Actions */}
                <div
                  className="appeals-form-actions"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    paddingTop: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setForm(EMPTY_FORM);
                      setFormError(null);
                    }}
                    disabled={isPending}
                    style={{
                      padding: "11px 22px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "transparent",
                      color: "#8892A4",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    style={{
                      padding: "11px 32px",
                      borderRadius: 10,
                      border: "none",
                      background: isPending ? "rgba(124,77,255,0.4)" : "#7C4DFF",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 14,
                      cursor: isPending ? "not-allowed" : "pointer",
                      transition: "background 0.2s",
                      letterSpacing: 0.3,
                    }}
                  >
                    {isPending ? "Submitting..." : "Submit Appeal →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Appeals History ── */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: "#E8EDF5",
                    margin: 0,
                    letterSpacing: -0.2,
                  }}
                >
                  Appeal History
                </h2>
                <p style={{ fontSize: 12, color: "#8892A4", margin: "3px 0 0" }}>
                  {myAppeals.length} appeal{myAppeals.length !== 1 ? "s" : ""} total
                </p>
              </div>
            </div>

            {myAppeals.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  background: "#111827",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>
                  No appeals yet
                </div>
                <div style={{ fontSize: 13, color: "#8892A4" }}>
                  Your appeal history will appear here once you submit your first appeal.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myAppeals.map((appeal) => (
                  <AppealHistoryItem key={appeal.id} appeal={appeal} />
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 48 }} />
        </div>
      </div>
    </>
  );
}
