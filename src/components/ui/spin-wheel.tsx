"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { spinWheel, canSpinToday } from "@/app/actions/spin-wheel";
import { WHEEL_PRIZES, type SpinPrize } from "@/lib/spin-wheel-config";
import { fireConfetti } from "@/lib/celebrate";

const SEGMENTS = WHEEL_PRIZES.length; // 8
const SEGMENT_ANGLE = 360 / SEGMENTS;

function getSegmentPath(index: number, radius: number): string {
  const startAngle = (index * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  const endAngle = ((index + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  const cx = radius, cy = radius;
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
}

function getLabelPos(index: number, radius: number) {
  const angle = ((index + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
  const r = radius * 0.65;
  return { x: radius + r * Math.cos(angle), y: radius + r * Math.sin(angle), angle: (index + 0.5) * SEGMENT_ANGLE };
}

export function SpinWheel({ onWin, size: sizeProp }: { onWin?: (prize: SpinPrize) => void; size?: number }) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(true);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [bonusAvailable, setBonusAvailable] = useState(false);
  const [lastPrize, setLastPrize] = useState<SpinPrize | null>(null);
  const [loading, setLoading] = useState(true);
  const rotRef = useRef(rotation);

  useEffect(() => {
    canSpinToday().then(({ canSpin, nextSpinAt, bonusAvailable }) => {
      setCanSpin(canSpin);
      setNextSpinAt(nextSpinAt);
      setBonusAvailable(bonusAvailable);
      setLoading(false);
    });
  }, []);

  async function handleSpin() {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setLastPrize(null);

    const result = await spinWheel();

    if (!result.ok) {
      toast.error(result.error);
      setSpinning(false);
      if (result.nextSpinAt) {
        setCanSpin(false);
        setNextSpinAt(result.nextSpinAt);
      }
      return;
    }

    const targetIndex = result.index;
    // Spin to the winning segment: subtract segment center angle so pointer lines up
    const targetAngle = 360 - (targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
    const fullRotations = 5 * 360; // 5 full spins for drama
    const finalRotation = rotRef.current + fullRotations + targetAngle - (rotRef.current % 360);

    rotRef.current = finalRotation;
    setRotation(finalRotation);

    setTimeout(() => {
      setSpinning(false);
      setLastPrize(result.prize);
      setBonusAvailable(result.bonusAvailable);
      if (result.prize.type !== "miss") {
        fireConfetti?.();
        toast.success(`${result.prize.emoji} You won ${result.prize.label}!`, { duration: 4000 });
      } else {
        toast(`${result.prize.emoji} ${result.prize.label} — better luck next time!`, { duration: 3000 });
      }
      setCanSpin(result.bonusAvailable);
      onWin?.(result.prize);
      router.refresh();
    }, 4200);
  }

  const size = sizeProp ?? 280;
  const r = size / 2;

  const timeUntilNext = nextSpinAt ? (() => {
    // eslint-disable-next-line react-hooks/purity -- countdown label is intentionally time-relative
    const diff = new Date(nextSpinAt).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  })() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* Pointer */}
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Arrow pointer at top */}
        <div style={{
          position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          borderTop: "24px solid #F59E0B",
          zIndex: 10,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
        }} />

        {/* Wheel SVG */}
        <svg
          width={size}
          height={size}
          style={{
            borderRadius: "50%",
            transition: spinning ? `transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
            transform: `rotate(${rotation}deg)`,
            boxShadow: "0 0 0 4px #1F2937, 0 0 0 6px #374151, 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {WHEEL_PRIZES.map((prize, i) => (
            <g key={i}>
              <path
                d={getSegmentPath(i, r)}
                fill={prize.color}
                stroke="#111827"
                strokeWidth={2}
                opacity={0.92}
              />
              <g transform={`translate(${getLabelPos(i, r).x}, ${getLabelPos(i, r).y}) rotate(${getLabelPos(i, r).angle})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#fff"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {prize.emoji}
                </text>
                <text
                  y={13}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8.5}
                  fontWeight={700}
                  fill="#fff"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {prize.label}
                </text>
              </g>
            </g>
          ))}
          {/* Center circle */}
          <circle cx={r} cy={r} r={22} fill="#111827" stroke="#374151" strokeWidth={3} />
          <text x={r} y={r + 1} textAnchor="middle" dominantBaseline="middle" fontSize={18} fill="#F59E0B">🎰</text>
        </svg>
      </div>

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={spinning || !canSpin || loading}
        style={{
          padding: "14px 40px",
          borderRadius: 999,
          background: canSpin && !spinning
            ? "linear-gradient(135deg, #F59E0B, #EF4444)"
            : "#1F2937",
          color: canSpin && !spinning ? "#fff" : "#6B7280",
          border: "none",
          fontSize: 15,
          fontWeight: 800,
          cursor: canSpin && !spinning ? "pointer" : "not-allowed",
          transition: "all 0.2s",
          boxShadow: canSpin && !spinning ? "0 4px 20px rgba(245,158,11,0.4)" : "none",
          letterSpacing: 0.5,
        }}
      >
        {loading ? "Loading..." : spinning ? "Spinning..." : canSpin ? "🎰 SPIN NOW!" : `Come back in ${timeUntilNext ?? "tomorrow"}`}
      </button>

      {bonusAvailable && !spinning && (
        <div style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700, textAlign: "center" }}>
          🎁 You earned a bonus spin! Click to use it.
        </div>
      )}

      {lastPrize && !spinning && (
        <div style={{
          background: lastPrize.type === "miss" ? "rgba(75,85,99,0.2)" : `${lastPrize.color}22`,
          border: `1px solid ${lastPrize.type === "miss" ? "#374151" : lastPrize.color}55`,
          borderRadius: 12, padding: "12px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 24 }}>{lastPrize.emoji}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", marginTop: 4 }}>
            {lastPrize.type === "miss" ? "Better luck tomorrow!" : `You won ${lastPrize.label}!`}
          </div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
            {lastPrize.type === "xp" && "XP added to your profile"}
            {lastPrize.type === "wallet" && "Credited to your wallet"}
            {lastPrize.type === "bonus_spin" && "Use your bonus spin!"}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#4B5563", textAlign: "center" }}>
        1 free spin per day · Bonus spin possible
      </div>
    </div>
  );
}
