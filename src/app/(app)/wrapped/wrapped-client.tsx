"use client";

import { useRef, useState } from "react";
import type { WrappedData } from "@/app/actions/wrapped";

const C = {
  bg: "#05070F",
  card: "#0D1220",
  text: "#E8EDF5",
  dim: "#8892A4",
};

const GRADIENTS = [
  { from: "#6B3FD4", to: "#EC4899", accent: "#FBCFE8" },  // purple→pink
  { from: "#1E88E5", to: "#26C6DA", accent: "#A5F3FC" },  // blue→cyan
  { from: "#F59E0B", to: "#EF5350", accent: "#FDE68A" },  // amber→red
  { from: "#10B981", to: "#1E88E5", accent: "#BBF7D0" },  // green→blue
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Props {
  data: WrappedData;
}

export default function WrappedClient({ data }: Props) {
  const [gradientIdx, setGradientIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const g = GRADIENTS[gradientIdx];

  const shareText = `My ${data.monthLabel} on CIOS 🔥\n${data.tasksCompleted} tasks · ${fmtNum(data.xpEarned)} XP · #${data.rank ?? "–"} rank · Top ${data.percentileTop}%\n${data.monthlyHighlight}\n\ncios-intern.vercel.app`;

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function shareToLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://cios-intern.vercel.app/wrapped")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareToWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareToTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadAsPng() {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement("a");
      link.download = `cios-wrapped-${data.year}-${data.month}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Download failed — try taking a screenshot instead.");
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <style>{`
        .wrap-stat { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 16px; text-align: center; backdrop-filter: blur(10px); }
        .wrap-stat-n { font-family: 'Fraunces', 'Instrument Serif', serif; font-size: 30px; font-weight: 800; line-height: 1; letter-spacing: -1px; }
        .wrap-stat-l { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.65; margin-top: 6px; font-weight: 600; }
        .wrap-btn { padding: 11px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; }
        .wrap-btn-primary { background: #fff; color: #000; }
        .wrap-btn-ghost { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); }
        @keyframes wrapShine { from { transform: translateX(-100%) skewX(-12deg); } to { transform: translateX(200%) skewX(-12deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.dim, textTransform: "uppercase", fontWeight: 700 }}>
            CIOS Wrapped
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
            {data.monthLabel}
          </h1>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {GRADIENTS.map((grad, i) => (
            <button
              key={i}
              onClick={() => setGradientIdx(i)}
              aria-label={`Theme ${i + 1}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: gradientIdx === i ? "2px solid #fff" : "2px solid rgba(255,255,255,0.1)",
                background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        style={{
          background: `linear-gradient(160deg, ${g.from} 0%, ${g.to} 100%)`,
          borderRadius: 24,
          padding: 32,
          position: "relative",
          overflow: "hidden",
          aspectRatio: "9/12",
          maxHeight: 820,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: `${g.accent}33`, filter: "blur(20px)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 220, height: 220, borderRadius: "50%", background: `${g.accent}22`, filter: "blur(30px)" }} />

        {/* Watermark */}
        <div style={{ position: "absolute", top: 20, right: 20, fontSize: 11, letterSpacing: 2, opacity: 0.7, textTransform: "uppercase", fontWeight: 700 }}>
          CIOS · Wrapped
        </div>

        {/* Name + month */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 12, letterSpacing: 3, opacity: 0.8, textTransform: "uppercase", fontWeight: 700 }}>
            {data.monthLabel}
          </div>
          <h2 style={{ margin: "8px 0 0", fontSize: 38, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1 }}>
            {data.userName}
          </h2>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, textTransform: "capitalize" }}>
            {data.role.replace("_", " ")}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 28, position: "relative", zIndex: 1 }}>
          <div className="wrap-stat">
            <div className="wrap-stat-n">{data.performanceScore}</div>
            <div className="wrap-stat-l">Score</div>
          </div>
          <div className="wrap-stat">
            <div className="wrap-stat-n">{fmtNum(data.xpEarned)}</div>
            <div className="wrap-stat-l">XP this month</div>
          </div>
          <div className="wrap-stat">
            <div className="wrap-stat-n">#{data.rank ?? "—"}</div>
            <div className="wrap-stat-l">Rank</div>
          </div>
          <div className="wrap-stat">
            <div className="wrap-stat-n">{data.tasksCompleted}</div>
            <div className="wrap-stat-l">Tasks</div>
          </div>
          <div className="wrap-stat">
            <div className="wrap-stat-n">🔥 {data.streak}</div>
            <div className="wrap-stat-l">Day streak</div>
          </div>
          <div className="wrap-stat">
            <div className="wrap-stat-n">Top {data.percentileTop}%</div>
            <div className="wrap-stat-l">Percentile</div>
          </div>
        </div>

        {/* Highlight */}
        <div style={{ marginTop: 24, position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, textTransform: "uppercase", fontWeight: 700 }}>
            Top skill · {data.topSkill}
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, lineHeight: 1.25, marginTop: 10, fontStyle: "italic" }}>
            &ldquo;{data.monthlyHighlight}&rdquo;
          </div>
        </div>

        {/* Mini-bars row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: "auto", position: "relative", zIndex: 1, paddingTop: 28 }}>
          <div style={{ fontSize: 11 }}>
            <div style={{ opacity: 0.65, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Reports</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{data.reportsSubmitted}</div>
          </div>
          <div style={{ fontSize: 11 }}>
            <div style={{ opacity: 0.65, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Courses</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{data.coursesCompleted}</div>
          </div>
          <div style={{ fontSize: 11 }}>
            <div style={{ opacity: 0.65, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Certs</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{data.certificatesEarned}</div>
          </div>
          <div style={{ fontSize: 11 }}>
            <div style={{ opacity: 0.65, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Badges</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{data.badgesEarned}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.18)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, opacity: 0.75, position: "relative", zIndex: 1, fontWeight: 600 }}>
          <span>cios-intern.vercel.app</span>
          <span>@{data.userName.split(" ")[0].toLowerCase()}</span>
        </div>
      </div>

      {/* Share buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <button className="wrap-btn wrap-btn-primary" onClick={downloadAsPng}>
          ⬇ Download PNG
        </button>
        <button className="wrap-btn wrap-btn-ghost" onClick={shareToLinkedIn}>
          📎 LinkedIn
        </button>
        <button className="wrap-btn wrap-btn-ghost" onClick={shareToWhatsApp}>
          💬 WhatsApp
        </button>
        <button className="wrap-btn wrap-btn-ghost" onClick={shareToTwitter}>
          𝕏 Twitter
        </button>
        <button className="wrap-btn wrap-btn-ghost" onClick={copyShareText}>
          {copied ? "✓ Copied" : "📋 Copy caption"}
        </button>
      </div>

      {/* MoM comparison */}
      <div style={{ marginTop: 32, background: C.card, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: C.dim, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
          Vs Last Month
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {data.vsLastMonth > 0 ? (
            <span style={{ color: "#4dd88b" }}>↑ +{fmtNum(data.vsLastMonth)} XP</span>
          ) : data.vsLastMonth < 0 ? (
            <span style={{ color: "#EF5350" }}>↓ {fmtNum(data.vsLastMonth)} XP</span>
          ) : (
            <span style={{ color: C.dim }}>Same as last month</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: C.dim, margin: "8px 0 0", lineHeight: 1.6 }}>
          {data.vsLastMonth > 500
            ? "Huge jump — your hustle is compounding."
            : data.vsLastMonth > 0
            ? "Steady growth. Keep stacking."
            : data.vsLastMonth < 0
            ? "Dip month — every builder has them. Reset and go."
            : "Consistent output."}
        </p>
      </div>

      {/* Tip */}
      <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(76,175,80,0.07)", border: "1px solid rgba(76,175,80,0.2)", borderRadius: 12, fontSize: 13, color: C.dim }}>
        💡 <strong style={{ color: C.text }}>Share this card</strong> to LinkedIn — every share = 200–2,000 brand impressions for CIOS. Your network sees your wins; recruiters see your hustle.
      </div>
    </div>
  );
}
