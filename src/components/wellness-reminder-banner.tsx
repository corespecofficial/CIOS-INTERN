"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { hasCheckedInThisWeek } from "@/app/actions/wellness";
import { useCurrentUser } from "@/lib/use-current-user";

const SKIP_ROLES = new Set(["admin", "super_admin", "recruiter"]);

export function WellnessReminderBanner() {
  const { role, isLoaded } = useCurrentUser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoaded || !role || SKIP_ROLES.has(role)) return;

    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem("wellness-dismissed") === today) return;
    } catch { /* ignore */ }

    hasCheckedInThisWeek().then((done) => {
      if (!done) setVisible(true);
    });
  }, [role, isLoaded]);

  const dismiss = () => {
    const today = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem("wellness-dismissed", today); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 88,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 1200,
      width: "calc(100% - 32px)",
      maxWidth: 480,
      background: "linear-gradient(135deg, rgba(102,187,106,0.18), rgba(102,187,106,0.08))",
      border: "1px solid rgba(102,187,106,0.35)",
      borderRadius: 14,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      backdropFilter: "blur(12px)",
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>💚</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 1 }}>
          How are you feeling today?
        </div>
        <div style={{ fontSize: 11, color: "#8892A4" }}>
          Your weekly wellness check-in is waiting — takes 60 seconds.
        </div>
      </div>
      <Link
        href="/wellness"
        onClick={dismiss}
        style={{
          flexShrink: 0,
          padding: "7px 12px",
          background: "rgba(102,187,106,0.25)",
          color: "#66BB6A",
          border: "1px solid rgba(102,187,106,0.4)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Check in →
      </Link>
      <button
        onClick={dismiss}
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "none",
          color: "#5A6478",
          cursor: "pointer",
          padding: "4px 6px",
          fontSize: 16,
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
