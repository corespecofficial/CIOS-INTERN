"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FineModal } from "./fine-modal";
import { getMyComplianceStatus } from "@/app/actions/compliance-fines";
import type { MyComplianceStatus } from "@/app/actions/compliance-types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type GateState =
  | { phase: "loading" }
  | { phase: "clear" }
  | { phase: "fine"; data: MyComplianceStatus }
  | { phase: "suspended" }
  | { phase: "error"; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Loading spinner (bottom-right corner — non-intrusive)
// ─────────────────────────────────────────────────────────────────────────────

function LoadingIndicator() {
  return (
    <>
      <style>{`
        @keyframes gate-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes gate-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        aria-label="Checking compliance status…"
        role="status"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderRadius: 20,
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          fontFamily: "'Nunito', 'Inter', sans-serif",
          animation: "gate-fade-in 0.25s ease both",
        }}
      >
        {/* Spinner */}
        <div
          aria-hidden
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid rgba(124,77,255,0.2)",
            borderTopColor: "#7C4DFF",
            animation: "gate-spin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, letterSpacing: 0.2 }}>
          Checking compliance…
        </span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error toast (bottom-right, auto-dismisses)
// ─────────────────────────────────────────────────────────────────────────────

function ErrorToast({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 10,
        background: "#111827",
        border: "1px solid rgba(239,83,80,0.3)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: "'Nunito', 'Inter', sans-serif",
        maxWidth: 280,
      }}
    >
      <span style={{ fontSize: 14 }}>⚠️</span>
      <span style={{ fontSize: 11, color: "#EF5350", fontWeight: 600, lineHeight: 1.4 }}>
        {message}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main gate
// ─────────────────────────────────────────────────────────────────────────────

export function ComplianceGate() {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ phase: "loading" });

  const checkCompliance = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const result = await getMyComplianceStatus();

      if (!result.ok) {
        // Non-fatal: surface as a quiet error, don't block the user
        setState({ phase: "error", message: result.error });
        // Auto-clear after 5 seconds so the toast doesn't linger
        setTimeout(() => setState({ phase: "clear" }), 5000);
        return;
      }

      const status = result.data!;

      if (!status.isBlocked) {
        setState({ phase: "clear" });
        return;
      }

      if (status.blockReason === "suspended") {
        setState({ phase: "suspended" });
        // Redirect happens in effect below
        return;
      }

      if (status.blockReason === "unpaid_fine") {
        setState({ phase: "fine", data: status });
        return;
      }

      // Unexpected blockReason — stay clear
      setState({ phase: "clear" });
    } catch (err) {
      // Silently fail — never hard-crash the UI for a compliance check
      setState({ phase: "clear" });
      console.warn("[ComplianceGate] check failed:", err);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkCompliance();
  }, [checkCompliance]);

  // Handle suspension redirect
  useEffect(() => {
    if (state.phase === "suspended") {
      router.push("/suspended");
    }
  }, [state.phase, router]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.phase === "loading") {
    return <LoadingIndicator />;
  }

  if (state.phase === "error") {
    return <ErrorToast message={state.message} />;
  }

  if (state.phase === "fine") {
    const { unpaidFines, totalUnpaidAmount, activeSuspension } = state.data;
    return (
      <FineModal
        fines={unpaidFines}
        totalAmount={totalUnpaidAmount}
        suspension={activeSuspension}
        onFinesPaid={checkCompliance}
      />
    );
  }

  // "clear" or "suspended" (while redirect is in-flight) — render nothing
  return null;
}
