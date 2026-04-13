"use client";

import { useEffect, useState } from "react";

const QUOTES = [
  { theme: "Consistency", emoji: "🔥", quote: "Show up daily. The compound effect of small wins is unbeatable.", color: "#FF7043" },
  { theme: "Honesty", emoji: "🤝", quote: "Speak truth even when it's uncomfortable. Trust is the rarest currency.", color: "#26C6DA" },
  { theme: "Transparency", emoji: "🪟", quote: "Operate in the open. Hidden work creates hidden problems.", color: "#1E88E5" },
  { theme: "Accountability", emoji: "🎯", quote: "Own the outcome — wins and misses both. Excuses don't ship.", color: "#AB47BC" },
  { theme: "Integrity", emoji: "💎", quote: "Do the right thing when no one is watching. That IS the work.", color: "#66BB6A" },
  { theme: "Perfection", emoji: "✨", quote: "Done > perfect, but never settle for sloppy. Refine, then ship.", color: "#FFC107" },
  { theme: "Growth", emoji: "🌱", quote: "Yesterday's best becomes today's baseline. Keep climbing.", color: "#43A047" },
  { theme: "Discipline", emoji: "⚙️", quote: "Motivation gets you started. Discipline keeps you going.", color: "#EF5350" },
];

const STORAGE_KEY = "cios-daily-motivation";

export function DailyMotivationPopup() {
  const [quote, setQuote] = useState<typeof QUOTES[0] | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const last = localStorage.getItem(STORAGE_KEY);
      if (last === today) return;
      // pick deterministic-ish quote so user sees something different each day
      const dayIndex = Math.floor(new Date().getTime() / 86400000) % QUOTES.length;
      setQuote(QUOTES[dayIndex]);
      localStorage.setItem(STORAGE_KEY, today);
    } catch { /* ignore */ }
  }, []);

  if (!quote) return null;

  const dismiss = () => { setClosing(true); setTimeout(() => setQuote(null), 250); };

  return (
    <div onClick={dismiss} style={{
      position: "fixed", inset: 0, zIndex: 950,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, opacity: closing ? 0 : 1, transition: "opacity 0.25s",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(420px, 100%)", background: "#111827",
        border: `1px solid ${quote.color}40`,
        borderRadius: 18, padding: 28, textAlign: "center",
        boxShadow: `0 20px 60px ${quote.color}33`,
        transform: closing ? "scale(0.95)" : "scale(1)",
        transition: "transform 0.25s",
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: quote.color, marginBottom: 16 }}>
          GOOD MORNING · {quote.theme.toUpperCase()}
        </div>
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 14 }}>{quote.emoji}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#E8EDF5", lineHeight: 1.5, marginBottom: 18, fontFamily: "'Space Grotesk', sans-serif" }}>
          {quote.quote}
        </div>
        <div style={{ fontSize: 11, color: "#5A6478", marginBottom: 18 }}>— Your CIOS daily reminder</div>
        <button onClick={dismiss} style={{
          padding: "12px 32px", background: `linear-gradient(135deg, ${quote.color}, ${quote.color}dd)`,
          color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer",
          boxShadow: `0 6px 20px ${quote.color}55`,
        }}>
          Let's go →
        </button>
      </div>
    </div>
  );
}
