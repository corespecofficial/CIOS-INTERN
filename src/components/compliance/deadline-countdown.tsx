"use client";

import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DeadlineCountdownProps {
  deadline: string;             // ISO string — original task deadline
  gracePeriodMinutes?: number;  // added to deadline for effective cutoff
  taskTitle?: string;
  compact?: boolean;            // true → small badge; false → full card
}

interface TimeLeft {
  total: number; // ms
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeTimeLeft(effectiveDeadlineMs: number): TimeLeft {
  const total = effectiveDeadlineMs - Date.now();
  if (total <= 0) return { total, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const days    = Math.floor(total / 86400000);
  const hours   = Math.floor((total % 86400000) / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return { total, days, hours, minutes, seconds };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type ColorScheme = {
  text: string;
  bg: string;
  border: string;
  glow: string;
  label: string;
};

function getColorScheme(totalMs: number): ColorScheme {
  if (totalMs <= 0) {
    return {
      text: "#EF5350",
      bg: "rgba(239,83,80,0.08)",
      border: "rgba(239,83,80,0.35)",
      glow: "rgba(239,83,80,0.25)",
      label: "overdue",
    };
  }
  const mins = totalMs / 60000;
  if (mins < 5) {
    return {
      text: "#EF5350",
      bg: "rgba(239,83,80,0.12)",
      border: "rgba(239,83,80,0.5)",
      glow: "rgba(239,83,80,0.3)",
      label: "critical",
    };
  }
  if (mins < 30) {
    return {
      text: "#EF5350",
      bg: "rgba(239,83,80,0.08)",
      border: "rgba(239,83,80,0.3)",
      glow: "rgba(239,83,80,0.15)",
      label: "danger",
    };
  }
  if (mins < 60) {
    return {
      text: "#FF7043",
      bg: "rgba(255,112,67,0.08)",
      border: "rgba(255,112,67,0.3)",
      glow: "rgba(255,112,67,0.15)",
      label: "warning",
    };
  }
  if (mins < 1440) {
    return {
      text: "#FFC107",
      bg: "rgba(255,193,7,0.08)",
      border: "rgba(255,193,7,0.3)",
      glow: "rgba(255,193,7,0.15)",
      label: "caution",
    };
  }
  return {
    text: "#66BB6A",
    bg: "rgba(102,187,106,0.08)",
    border: "rgba(102,187,106,0.25)",
    glow: "rgba(102,187,106,0.1)",
    label: "safe",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact badge
// ─────────────────────────────────────────────────────────────────────────────

function CompactBadge({
  timeLeft,
  colors,
  isPulsing,
}: {
  timeLeft: TimeLeft;
  colors: ColorScheme;
  isPulsing: boolean;
}) {
  const label =
    timeLeft.total <= 0
      ? "⚠️ OVERDUE"
      : timeLeft.days > 0
      ? `⏰ ${timeLeft.days}d ${pad(timeLeft.hours)}h`
      : timeLeft.hours > 0
      ? `⏰ ${timeLeft.hours}h ${pad(timeLeft.minutes)}m`
      : `⏰ ${timeLeft.minutes}m ${pad(timeLeft.seconds)}s`;

  return (
    <>
      <style>{`
        @keyframes badge-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.04); }
        }
      `}</style>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.3,
          color: colors.text,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          boxShadow: isPulsing ? `0 0 8px ${colors.glow}` : "none",
          fontFamily: "'Nunito', 'Inter', sans-serif",
          animation: isPulsing ? "badge-pulse 1s ease-in-out infinite" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full countdown card
// ─────────────────────────────────────────────────────────────────────────────

function FullCountdownCard({
  timeLeft,
  colors,
  isPulsing,
  taskTitle,
  deadline,
  effectiveDeadlineMs,
}: {
  timeLeft: TimeLeft;
  colors: ColorScheme;
  isPulsing: boolean;
  taskTitle?: string;
  deadline: string;
  effectiveDeadlineMs: number;
}) {
  // Estimate progress: assume task was created 7 days before deadline as fallback
  const totalDuration = 7 * 24 * 60 * 60 * 1000;
  const elapsed = totalDuration - Math.max(0, timeLeft.total);
  const progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  const formattedDeadline = new Date(effectiveDeadlineMs).toLocaleString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <>
      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,83,80,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(239,83,80,0); }
        }
        @keyframes overdue-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-3px); }
          40%, 80% { transform: translateX(3px); }
        }
        .countdown-digit {
          transition: transform 0.15s ease;
        }
        .countdown-digit:hover {
          transform: scale(1.05);
        }
        @media (max-width: 480px) {
          .countdown-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .countdown-title { font-size: 15px !important; }
          .countdown-deadline-txt { font-size: 11px !important; }
        }
      `}</style>

      <div
        style={{
          background: "#111827",
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: "20px 24px",
          fontFamily: "'Nunito', 'Inter', sans-serif",
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${colors.border}`,
          animation: isPulsing ? "pulse-red 1.5s ease-in-out infinite" : "none",
          position: "relative",
          overflow: "hidden",
          maxWidth: 440,
          width: "100%",
        }}
      >
        {/* Ambient glow layer */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at top, ${colors.glow} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {taskTitle && (
                <div
                  className="countdown-title"
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#E8EDF5",
                    marginBottom: 4,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {taskTitle}
                </div>
              )}
              <div
                className="countdown-deadline-txt"
                style={{ fontSize: 12, color: "#8892A4" }}
              >
                Due: {formattedDeadline}
              </div>
            </div>

            {/* Status pill */}
            <span
              style={{
                flexShrink: 0,
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: colors.text,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                textTransform: "uppercase",
              }}
            >
              {colors.label}
            </span>
          </div>
        </div>

        {/* Countdown or OVERDUE */}
        {timeLeft.total <= 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              animation: "overdue-shake 0.6s ease-in-out",
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#EF5350",
                letterSpacing: 2,
                textShadow: "0 0 20px rgba(239,83,80,0.5)",
              }}
            >
              ⚠️ OVERDUE
            </div>
            <div style={{ fontSize: 12, color: "#8892A4", marginTop: 6 }}>
              Deadline has passed. Submit or pay your fine immediately.
            </div>
          </div>
        ) : (
          <div
            className="countdown-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              { value: timeLeft.days, label: "Days" },
              { value: timeLeft.hours, label: "Hours" },
              { value: timeLeft.minutes, label: "Min" },
              { value: timeLeft.seconds, label: "Sec" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="countdown-digit"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderRadius: 12,
                  padding: "12px 4px 8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: colors.text,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    textShadow: isPulsing ? `0 0 10px ${colors.glow}` : "none",
                  }}
                >
                  {pad(value)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#8892A4",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    marginTop: 4,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {timeLeft.total > 0 && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${colors.text}99, ${colors.text})`,
                  borderRadius: 4,
                  transition: "width 1s linear",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontSize: 10,
                color: "#8892A4",
              }}
            >
              <span>Time elapsed</span>
              <span style={{ color: colors.text, fontWeight: 700 }}>
                {Math.round(progressPct)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function DeadlineCountdown({
  deadline,
  gracePeriodMinutes = 0,
  taskTitle,
  compact = false,
}: DeadlineCountdownProps) {
  const effectiveDeadlineMs = useRef(
    new Date(deadline).getTime() + gracePeriodMinutes * 60 * 1000
  );

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    computeTimeLeft(effectiveDeadlineMs.current)
  );

  useEffect(() => {
    // Recompute if props change
    effectiveDeadlineMs.current =
      new Date(deadline).getTime() + gracePeriodMinutes * 60 * 1000;
    setTimeLeft(computeTimeLeft(effectiveDeadlineMs.current));

    const id = setInterval(() => {
      setTimeLeft(computeTimeLeft(effectiveDeadlineMs.current));
    }, 1000);

    return () => clearInterval(id);
  }, [deadline, gracePeriodMinutes]);

  const colors = getColorScheme(timeLeft.total);
  const isPulsing = timeLeft.total > 0 && timeLeft.total / 60000 < 5;

  if (compact) {
    return (
      <CompactBadge timeLeft={timeLeft} colors={colors} isPulsing={isPulsing} />
    );
  }

  return (
    <FullCountdownCard
      timeLeft={timeLeft}
      colors={colors}
      isPulsing={isPulsing}
      taskTitle={taskTitle}
      deadline={deadline}
      effectiveDeadlineMs={effectiveDeadlineMs.current}
    />
  );
}
