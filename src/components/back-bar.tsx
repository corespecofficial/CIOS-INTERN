"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Consistent back-navigation bar used across sub-pages (Contacts, Requests,
 * Admin queues, Help, etc.). Renders:
 *   [← Back] [optional extra links…]
 *
 * If `to` is omitted, it uses router.back() (browser history). Prefer `to`
 * when there's a canonical parent route so deep-links always work.
 */
export function BackBar({
  to,
  label = "Back",
  extras = [],
}: {
  to?: string;
  label?: string;
  extras?: Array<{ href: string; label: string }>;
}) {
  const router = useRouter();
  const btnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    background: "transparent",
    color: "#8892A4",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  };
  return (
    <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {to ? (
        <Link href={to} style={btnStyle}>
          <ArrowLeft />
          {label}
        </Link>
      ) : (
        <button onClick={() => router.back()} style={btnStyle}>
          <ArrowLeft />
          {label}
        </button>
      )}
      {extras.map((e) => (
        <Link key={e.href} href={e.href} style={{ ...btnStyle, color: "#E8EDF5" }}>
          {e.label}
        </Link>
      ))}
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
