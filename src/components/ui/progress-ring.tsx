"use client";

interface ProgressRingProps {
  percent: number;       // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;        // centre top text
  sublabel?: string;     // centre bottom text
  animate?: boolean;
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 10,
  color = "#1E88E5",
  label,
  sublabel,
  animate = true,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(100, Math.max(0, percent)) / 100 * circ;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        {/* track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: animate ? "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" : "none" }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: size * 0.19, fontWeight: 800, color: "#E8EDF5", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
          {Math.round(percent)}%
        </div>
        {label && (
          <div style={{ fontSize: Math.max(9, size * 0.1), color: "#8892A4", marginTop: 2, lineHeight: 1.2 }}>
            {label}
          </div>
        )}
        {sublabel && (
          <div style={{ fontSize: Math.max(8, size * 0.085), color: "#5A6478", marginTop: 1, lineHeight: 1.2 }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
