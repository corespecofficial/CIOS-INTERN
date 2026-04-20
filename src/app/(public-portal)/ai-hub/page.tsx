import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CIOS AI Hub — one workspace, every model",
  description:
    "Chat, code, strategise, write and learn with Africa's first multi-model AI workspace. Built for founders, interns, recruiters and investors across the CIOS platform.",
  alternates: { canonical: "/ai-hub" },
};

// Portal accent — violet primary, pink partner
const A1 = "#8B5CF6";
const A2 = "#EC4899";

const FEATURES = [
  { emoji: "✨", title: "Create",     blurb: "Draft posts, outlines, stories and ideas from a one-line prompt." },
  { emoji: "💻", title: "Code",       blurb: "Debug, refactor and explain code across every language you touch." },
  { emoji: "🧠", title: "Strategise", blurb: "Plans, frameworks, competitor breakdowns, GTM memos — in minutes." },
  { emoji: "✍️", title: "Write",      blurb: "Long-form drafts, cover letters, proposals, emails in your voice." },
  { emoji: "🎓", title: "Learn",      blurb: "Explain anything. Quiz yourself. Turn docs into flashcards instantly." },
];

export default function AIHubLandingPage() {
  return (
    <div style={{ width: "100%", fontFamily: "'Nunito', sans-serif" }}>
      <section
        style={{
          position: "relative",
          padding: "56px 20px 48px",
          background: `radial-gradient(1000px 400px at 20% 0%, ${A1}33, transparent 60%), radial-gradient(900px 400px at 90% 10%, ${A2}26, transparent 60%)`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={eyebrow(A1)}>Africa&apos;s AI workspace</div>
          <h1 className="aihub-hero-h1" style={heroH1}>
            One workspace.{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${A1}, ${A2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Every model
            </span>
            .
          </h1>
          <p style={heroSub}>
            CIOS AI Hub is your unified canvas for chat, code, strategy, writing and learning.
            Built on a shared model router so you always get the best brain for the job — without switching tabs.
          </p>
          <div style={ctaRow}>
            <Link
              href="/ai-hub/chat"
              style={{
                ...ctaPrimary,
                background: `linear-gradient(135deg, ${A1}, #7C3AED)`,
                boxShadow: `0 12px 28px -10px ${A1}B3`,
              }}
            >
              Open AI Hub →
            </Link>
            <Link href="/ai-hub/interview-prep" style={ctaGhost}>
              🎤 Interview prep
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 640px) {
          .aihub-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 0" }}>
        <div style={sectionLabel(A1)}>CAPABILITIES</div>
        <h2 style={sectionHeading}>Five superpowers in one surface</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={cardNeutral}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: "var(--text-primary, #F8FAFC)" }}>{f.title}</div>
              <div style={{ color: "var(--text-tertiary, #8892A4)", fontSize: 13, lineHeight: 1.55 }}>{f.blurb}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: "48px auto 80px", padding: "0 20px" }}>
        <div
          style={{
            padding: 32,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${A1}14, ${A2}0D)`,
            border: `1px solid ${A1}33`,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--text-primary, #F8FAFC)", letterSpacing: -0.3 }}>
            Built for the CIOS community
          </h2>
          <p style={{ color: "var(--text-tertiary, #94A3B8)", fontSize: 14, lineHeight: 1.7, marginTop: 10, marginBottom: 20 }}>
            Interns prep for interviews. Founders pressure-test pitches. Recruiters rewrite outreach. Investors summarise decks.
            One workspace tuned for Africa&apos;s next generation of builders.
          </p>
          <Link
            href="/ai-hub/chat"
            style={{
              ...ctaPrimary,
              background: `linear-gradient(135deg, ${A1}, #7C3AED)`,
              boxShadow: `0 12px 28px -10px ${A1}B3`,
            }}
          >
            Go to AI Hub →
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ─────────── style helpers — Marketplace spec ─────────── */

const heroH1: React.CSSProperties = {
  margin: 0,
  fontSize: 44,
  lineHeight: 1.05,
  letterSpacing: -1.4,
  fontWeight: 900,
  color: "var(--text-primary, #F8FAFC)",
  fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
};

const heroSub: React.CSSProperties = {
  margin: "14px auto 0",
  maxWidth: 620,
  fontSize: 16,
  color: "var(--text-tertiary, #94A3B8)",
  lineHeight: 1.55,
};

const ctaRow: React.CSSProperties = {
  marginTop: 22,
  display: "flex",
  gap: 10,
  justifyContent: "center",
  flexWrap: "wrap",
};

const ctaPrimary: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  borderRadius: 12,
  color: "#fff",
  fontSize: 14,
  fontWeight: 800,
  textDecoration: "none",
};

const ctaGhost: React.CSSProperties = {
  padding: "12px 22px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  color: "var(--text-primary, #F8FAFC)",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.1)",
};

const cardNeutral: React.CSSProperties = {
  padding: 22,
  borderRadius: 16,
  // Theme tokens so the card flips from dark navy to clean white in light mode.
  background: "var(--bg-secondary, #111827)",
  border: "1px solid var(--border-default, rgba(255,255,255,0.07))",
  color: "var(--text-primary, #F8FAFC)",
};

const sectionHeading: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 24,
  fontWeight: 900,
  color: "var(--text-primary, #F8FAFC)",
  letterSpacing: -0.3,
};

function eyebrow(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "5px 14px",
    borderRadius: 999,
    background: hexToRgba(color, 0.14),
    border: `1px solid ${hexToRgba(color, 0.34)}`,
    color,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: 800,
    textTransform: "uppercase",
    marginBottom: 18,
  };
}

function sectionLabel(color: string): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    color,
    letterSpacing: 2,
    textTransform: "uppercase",
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
