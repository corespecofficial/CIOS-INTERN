/**
 * Banner shown wherever a public user can upload a file. Warns them that the
 * asset will auto-delete after 24h unless they upgrade / convert. See
 * masterplan §2.4 — Cloudinary 24h TTL is enforced by /api/cron/cloudinary-sweep.
 *
 * Kept as a dumb display component (no state, no props beyond a short kind
 * label) so it drops cleanly into any upload surface without causing hydration
 * mismatches or client-only boundaries.
 */

export interface AutoDeleteBannerProps {
  /** Short label for what they're uploading ("CV", "pitch deck", "product photo"). */
  kind?: string;
  /** When true, renders compact inline (single line). Default: card. */
  compact?: boolean;
}

export function AutoDeleteBanner({ kind, compact }: AutoDeleteBannerProps) {
  const noun = kind ? kind : "upload";
  const message = `Your ${noun} is kept for 24 hours, then auto-deleted. Sign up / upgrade to keep it permanently.`;

  if (compact) {
    return (
      <div
        role="note"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 10,
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.25)",
          fontSize: 12,
          color: "#FDE68A",
          lineHeight: 1.4,
        }}
      >
        <span aria-hidden>⏱</span>
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      role="note"
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        background: "rgba(251,191,36,0.08)",
        border: "1px solid rgba(251,191,36,0.25)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "rgba(251,191,36,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        ⏱
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#FDE68A", letterSpacing: 0.3 }}>
          24-hour preview
        </div>
        <div style={{ fontSize: 12, color: "#FCD34D", opacity: 0.9, marginTop: 3, lineHeight: 1.55 }}>
          {message}
        </div>
      </div>
    </div>
  );
}
