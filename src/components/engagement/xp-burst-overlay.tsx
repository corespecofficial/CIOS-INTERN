"use client";

import { useEffect, useState } from "react";

interface Burst { id: number; amount: number; label?: string; }

/**
 * Global XP-burst overlay. Any code can fire:
 *   window.dispatchEvent(new CustomEvent("xp-burst", { detail: { amount: 50, label: "Quest claimed" } }))
 * and a flying "+50 XP" chip + confetti shows in the top-right.
 *
 * Mount this component once at app root (in the app layout).
 */
export function XpBurstOverlay() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { amount: number; label?: string } | undefined;
      if (!detail) return;
      const id = Date.now() + Math.random();
      setBursts((prev) => [...prev, { id, amount: detail.amount, label: detail.label }]);
      setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 2400);
    };
    window.addEventListener("xp-burst", handler);
    return () => window.removeEventListener("xp-burst", handler);
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div style={{ position: "fixed", top: 80, right: 20, zIndex: 9999, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      {bursts.map((b) => {
        const positive = b.amount >= 0;
        return (
          <div
            key={b.id}
            style={{
              background: positive ? "linear-gradient(135deg,#FFC107,#FF7043)" : "linear-gradient(135deg,#5A6478,#334155)",
              color: "#fff", padding: "10px 16px", borderRadius: 999,
              fontWeight: 800, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: positive ? "0 8px 24px rgba(255,112,67,0.4)" : "0 8px 24px rgba(0,0,0,0.4)",
              animation: "xpBurstFly 2.4s ease-out forwards",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>{positive ? "✨" : "💸"}</span>
            <span>{positive ? "+" : ""}{b.amount} XP</span>
            {b.label && <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>· {b.label}</span>}
          </div>
        );
      })}
      <style>{`
        @keyframes xpBurstFly {
          0%   { transform: translate(40px, 20px) scale(0.6); opacity: 0; }
          15%  { transform: translate(0, 0) scale(1.15); opacity: 1; }
          25%  { transform: translate(0, 0) scale(1); opacity: 1; }
          80%  { transform: translate(0, -20px) scale(1); opacity: 1; }
          100% { transform: translate(0, -60px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
