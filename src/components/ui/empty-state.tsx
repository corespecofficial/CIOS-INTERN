"use client";

import Link from "next/link";

/**
 * Standard empty state used across list pages. Always pairs a friendly
 * message with a concrete next action — never a dead end.
 *
 * Use the `action` prop for internal navigation (Link) or `onAction` for a
 * local handler (opening a modal, etc.).
 */
export function EmptyState({
  icon = "🕊️",
  title,
  hint,
  action,
  actionLabel,
  onAction,
  secondary,
  compact = false,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondary?: React.ReactNode;
  compact?: boolean;
}) {
  const inner = (
    <>
      <div style={{ fontSize: compact ? 34 : 48, marginBottom: compact ? 6 : 10 }}>{icon}</div>
      <h3 style={{ fontSize: compact ? 14 : 17, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{title}</h3>
      {hint && <p style={{ fontSize: compact ? 12 : 13, color: "#8892A4", margin: "6px 0 0", lineHeight: 1.55, maxWidth: 360 }}>{hint}</p>}
      {(action || onAction) && actionLabel && (
        action ? (
          <Link href={action} style={cta}>{actionLabel}</Link>
        ) : (
          <button onClick={onAction} style={cta}>{actionLabel}</button>
        )
      )}
      {secondary && <div style={{ marginTop: 10 }}>{secondary}</div>}
    </>
  );
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: compact ? "20px 14px" : "36px 20px",
      background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
    }}>
      {inner}
    </div>
  );
}

/** A simple list skeleton — 3-5 rounded bars that shimmer. Use on any list
 *  page while data is fetching. Avoids the "spinner then jump" effect. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 68, borderRadius: 12,
          background: "linear-gradient(90deg, #111827 0%, #1a2130 50%, #111827 100%)",
          backgroundSize: "200% 100%",
          animation: "cios-skel 1.6s ease-in-out infinite",
        }} />
      ))}
      <style>{`@keyframes cios-skel { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}

const cta: React.CSSProperties = {
  marginTop: 14, padding: "9px 18px",
  background: "linear-gradient(135deg,#1E88E5,#1565C0)",
  color: "#fff", border: "none", borderRadius: 10,
  fontSize: 13, fontWeight: 800, cursor: "pointer", textDecoration: "none",
  display: "inline-block",
};
