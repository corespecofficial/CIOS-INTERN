"use client";

/**
 * Loss-aversion banner. Pinned above the dashboard when the user has an
 * active streak. Nudges them toward the next milestone (3 / 7 / 14 / 30
 * days) so they don't break it. Disappears on streak = 0.
 */
export function StreakNudge({ streak }: { streak: number }) {
  if (!streak || streak < 1) return null;

  const milestones = [3, 7, 14, 30, 60, 100];
  const next = milestones.find((m) => m > streak) || streak + 7;
  const left = next - streak;
  const pct = Math.min(100, Math.round((streak / next) * 100));
  const flame = streak >= 30 ? "🔥🔥🔥" : streak >= 7 ? "🔥🔥" : "🔥";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "linear-gradient(135deg, rgba(255,112,67,0.14), rgba(255,193,7,0.06))",
      border: "1px solid rgba(255,112,67,0.25)",
      borderRadius: 14, padding: "12px 16px", marginBottom: 16,
    }}>
      <div style={{ fontSize: 28 }}>{flame}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>
          {streak}-day streak
          <span style={{ color: "#FFC107", marginLeft: 8, fontWeight: 700 }}>
            {left === 1 ? "1 day" : `${left} days`} to the {next}-day badge
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginTop: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #FF7043, #FFC107)", transition: "width 0.4s" }} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#B0BEC5", textAlign: "right", minWidth: 80 }}>
        Check in<br /><b style={{ color: "#FFC107" }}>daily</b> to keep it alive
      </div>
    </div>
  );
}
