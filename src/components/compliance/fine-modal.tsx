"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { payFine } from "@/app/actions/compliance-fines";
import type { ComplianceFine, ComplianceSuspension } from "@/app/actions/compliance-types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FineModalProps {
  fines: ComplianceFine[];
  totalAmount: number;
  suspension: ComplianceSuspension | null;
  onFinesPaid: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysOverdue(issuedAt: string): number {
  return Math.floor((Date.now() - new Date(issuedAt).getTime()) / 86400000);
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useOverdueTimer(issuedAt: string) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(issuedAt).getTime());
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(issuedAt).getTime()), 1000);
    return () => clearInterval(id);
  }, [issuedAt]);

  const totalSecs = Math.floor(elapsed / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${String(h).padStart(2, "0")}h`);
  parts.push(`${String(m).padStart(2, "0")}m`);
  parts.push(`${String(s).padStart(2, "0")}s`);

  return parts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual fine row
// ─────────────────────────────────────────────────────────────────────────────

interface FineRowProps {
  fine: ComplianceFine;
  payingFineId: string | null;
  expandedFineId: string | null;
  onExpandToggle: (id: string) => void;
  onPayClick: (fineId: string) => void;
  isProcessing: boolean;
}

function FineRow({
  fine,
  payingFineId,
  expandedFineId,
  onExpandToggle,
  onPayClick,
  isProcessing,
}: FineRowProps) {
  const overdueDays = daysOverdue(fine.issued_at);
  const isExpanded = expandedFineId === fine.id;
  const isThisPaying = payingFineId === fine.id;

  return (
    <div
      style={{
        background: "rgba(239,83,80,0.04)",
        border: "1px solid rgba(239,83,80,0.15)",
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Fine header row */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#E8EDF5",
                marginBottom: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fine.task_title || fine.reason}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  color: overdueDays > 3 ? "#EF5350" : "#FFC107",
                  fontWeight: 600,
                }}
              >
                {overdueDays === 0 ? "Issued today" : `${overdueDays}d overdue`}
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 8px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "#EF5350",
                  background: "rgba(239,83,80,0.12)",
                  border: "1px solid rgba(239,83,80,0.25)",
                }}
              >
                {fine.status}
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{ fontSize: 18, fontWeight: 900, color: "#EF5350", lineHeight: 1 }}
            >
              {formatNaira(fine.amount)}
            </div>
            <button
              onClick={() => onExpandToggle(fine.id)}
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "#7C4DFF",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {isExpanded ? "Cancel" : "💳 Pay this fine"}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable payment form */}
      {isExpanded && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(239,83,80,0.12)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 8 }}>
            Continue to Flutterwave to pay securely. The verified payment and receipt will be linked to this fine automatically.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={isProcessing && isThisPaying}
              onClick={() => onPayClick(fine.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: isProcessing ? "rgba(102,187,106,0.4)" : "#66BB6A",
                color: "#fff",
                border: "none",
                cursor: isProcessing ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                transition: "opacity 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {isProcessing && isThisPaying ? "Opening checkout…" : "Pay with Flutterwave"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export function FineModal({ fines, totalAmount, suspension }: FineModalProps) {
  const router = useRouter();

  // Only show unpaid fines
  const unpaidFines = fines.filter((f) => f.status === "unpaid");

  // The oldest fine determines the overdue timer start
  const oldestIssuedAt =
    unpaidFines.length > 0
      ? unpaidFines.reduce((a, b) =>
          new Date(a.issued_at) < new Date(b.issued_at) ? a : b
        ).issued_at
      : new Date().toISOString();

  const overdueTimer = useOverdueTimer(oldestIssuedAt);

  // Per-fine payment state
  const [expandedFineId, setExpandedFineId] = useState<string | null>(null);
  const [payingFineId, setPayingFineId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg] = useState<string | null>(null);

  // Scroll lock while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleExpandToggle(fineId: string) {
    if (expandedFineId === fineId) {
      setExpandedFineId(null);
      setPayingFineId(null);
    } else {
      setExpandedFineId(fineId);
      setPayingFineId(fineId);
    }
    setError(null);
  }

  async function handlePayClick(fineId: string) {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await payFine(fineId);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.assign(result.data.checkoutUrl);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  const suspendedSince =
    suspension?.suspended_at
      ? new Date(suspension.suspended_at).toLocaleString("en-NG", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  return (
    <>
      <style>{`
        @keyframes fine-modal-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes red-pulse-border {
          0%, 100% { border-color: rgba(239,83,80,0.3); }
          50%       { border-color: rgba(239,83,80,0.7); }
        }
        @keyframes shake-in {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-6px); }
          30%  { transform: translateX(6px); }
          45%  { transform: translateX(-4px); }
          60%  { transform: translateX(4px); }
          75%  { transform: translateX(-2px); }
          90%  { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
        .fine-action-btn {
          display: block;
          width: 100%;
          padding: 13px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #E8EDF5;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
          text-decoration: none;
        }
        .fine-action-btn:hover {
          background: rgba(124,77,255,0.12);
          border-color: rgba(124,77,255,0.35);
          transform: translateX(3px);
        }
        .fine-action-btn:active { transform: translateX(1px); }
        .fine-modal-scroll::-webkit-scrollbar { width: 4px; }
        .fine-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .fine-modal-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @media (max-width: 520px) {
          .fine-modal-card { margin: 16px !important; max-width: calc(100vw - 32px) !important; }
        }
      `}</style>

      {/* Backdrop — intentionally unclickable */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        // No onClick here — modal is intentionally unclosable
      >
        {/* Modal card */}
        <div
          className="fine-modal-card"
          style={{
            background: "#111827",
            border: "1.5px solid rgba(239,83,80,0.35)",
            borderRadius: 18,
            maxWidth: 480,
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(239,83,80,0.1)",
            fontFamily: "'Nunito', 'Inter', sans-serif",
            animation: "fine-modal-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both, red-pulse-border 3s ease-in-out infinite",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "20px 22px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(239,83,80,0.05)",
              flexShrink: 0,
            }}
          >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>🚨</span>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: "#EF5350",
                      margin: 0,
                      letterSpacing: -0.3,
                    }}
                  >
                    Compliance Alert
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#8892A4" }}>
                  {unpaidFines.length} unpaid fine{unpaidFines.length !== 1 ? "s" : ""} require{unpaidFines.length === 1 ? "s" : ""} your immediate attention
                </p>
              </div>

              {/* Overdue timer */}
              <div
                style={{
                  flexShrink: 0,
                  textAlign: "right",
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(239,83,80,0.1)",
                  border: "1px solid rgba(239,83,80,0.2)",
                }}
              >
                <div style={{ fontSize: 9, color: "#8892A4", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
                  Overdue for
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#EF5350",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {overdueTimer}
                </div>
              </div>
            </div>

            {/* Total amount */}
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(239,83,80,0.08)",
                border: "1px solid rgba(239,83,80,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: "#8892A4", fontWeight: 600 }}>
                Total Outstanding
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#EF5350",
                  fontVariantNumeric: "tabular-nums",
                  textShadow: "0 0 16px rgba(239,83,80,0.4)",
                }}
              >
                {formatNaira(totalAmount)}
              </span>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div
            className="fine-modal-scroll"
            style={{ overflowY: "auto", flex: 1, padding: "16px 22px" }}
          >
            {/* Error / success feedback */}
            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(239,83,80,0.1)",
                  border: "1px solid rgba(239,83,80,0.3)",
                  color: "#EF5350",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                  animation: "shake-in 0.5s ease",
                }}
              >
                ⚠️ {error}
              </div>
            )}
            {successMsg && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(102,187,106,0.1)",
                  border: "1px solid rgba(102,187,106,0.3)",
                  color: "#66BB6A",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                ✅ {successMsg}
              </div>
            )}

            {/* Fine list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {unpaidFines.map((fine) => (
                <FineRow
                  key={fine.id}
                  fine={fine}
                  payingFineId={payingFineId}
                  expandedFineId={expandedFineId}
                  onExpandToggle={handleExpandToggle}
                  onPayClick={handlePayClick}
                  isProcessing={isProcessing}
                />
              ))}
            </div>

            {/* Suspension info */}
            {suspension && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(239,83,80,0.06)",
                  border: "1px solid rgba(239,83,80,0.18)",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#EF5350", letterSpacing: 0.3 }}>
                    ACCOUNT SUSPENDED
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.6 }}>
                  <strong style={{ color: "#E8EDF5" }}>Reason:</strong> {suspension.reason}
                </div>
                {suspendedSince && (
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4 }}>
                    Suspended since: <strong style={{ color: "#E8EDF5" }}>{suspendedSince}</strong>
                  </div>
                )}
                {suspension.unpaid_fine_total > 0 && (
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
                    Unpaid fine total triggering suspension:{" "}
                    <strong style={{ color: "#EF5350" }}>
                      {formatNaira(suspension.unpaid_fine_total)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <button
                className="fine-action-btn"
                onClick={() => setExpandedFineId(unpaidFines[0]?.id ?? null)}
                style={{
                  background: "rgba(102,187,106,0.08)",
                  borderColor: "rgba(102,187,106,0.25)",
                  color: "#66BB6A",
                }}
              >
                💳 Pay Fine — Settle outstanding balance
              </button>

              <button
                className="fine-action-btn"
                onClick={() => router.push("/compliance")}
              >
                📤 Submit Work — Go to compliance dashboard
              </button>

              <button
                className="fine-action-btn"
                onClick={() => router.push("/appeals")}
              >
                📋 File an Appeal — Contest this fine or suspension
              </button>

              <button
                className="fine-action-btn"
                onClick={() => router.push("/messages")}
              >
                💬 Contact Admin — Message the compliance team
              </button>
            </div>

            {/* Disclaimer */}
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#8892A4",
                lineHeight: 1.5,
                textAlign: "center",
                padding: "10px 0 4px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              🔒 This modal cannot be dismissed until compliance is restored.
              Pay your fines or file a successful appeal to regain full access.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
