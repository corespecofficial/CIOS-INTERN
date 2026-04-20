import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CIOS Study Buddy — learn anything, your way",
  description:
    "Upload your notes or pick a topic. CIOS builds a knowledge map, quizzes you Socratic-style and reads explanations out loud. Like NotebookLM, but a coach.",
  alternates: { canonical: "/study-buddy" },
};

// Portal accent — blue primary, violet partner
const A1 = "#60A5FA";
const A2 = "#8B5CF6";

const STEPS = [
  { emoji: "🎯", title: "Set a goal",            blurb: "Pick a topic, your level, and how you learn best." },
  { emoji: "📄", title: "Drop in your notes",    blurb: "Paste text, upload a .txt/.md file, or ask CIOS to generate a primer." },
  { emoji: "🗺️", title: "Get a knowledge map",   blurb: "CIOS extracts concepts into a visual map you can navigate." },
  { emoji: "🎙️", title: "Learn by conversation", blurb: "Socratic Q&A with voice playback. Get graded. Try again. Move on." },
];

const PERKS = [
  { emoji: "🧠", title: "Pedagogy first",   blurb: "Spaced, Socratic, corrective. Built by educators, not quiz-gen toys." },
  { emoji: "🎧", title: "Voice or written", blurb: "Toggle text-to-speech for any explanation. Hands-free study." },
  { emoji: "🌍", title: "Your language",    blurb: "English, Yoruba, Swahili, Chinese, Arabic — and 10+ more." },
];

export default function StudyBuddyLandingPage() {
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
          <div style={eyebrow(A1)}>Your AI study coach</div>
          <h1 className="sb-hero-h1" style={heroH1}>
            Learn anything.{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${A1}, ${A2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              The way you think
            </span>
            .
          </h1>
          <p style={heroSub}>
            CIOS Study Buddy turns any document, slide deck or topic into a personal curriculum —
            a knowledge map, Socratic questions, graded feedback, and voice explanations.
          </p>
          <div style={ctaRow}>
            <Link
              href="/study-buddy/learn"
              style={{
                ...ctaPrimary,
                background: `linear-gradient(135deg, ${A1}, #3B82F6)`,
                boxShadow: `0 12px 28px -10px ${A1}B3`,
              }}
            >
              Start learning →
            </Link>
            <Link href="/ai-hub" style={ctaGhost}>
              ✨ AI Hub
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 640px) {
          .sb-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 0" }}>
        <div style={sectionLabel(A1)}>HOW IT WORKS</div>
        <h2 style={sectionHeading}>Four steps from topic to mastery</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={cardNeutral}>
              <div style={{ fontSize: 11, color: A1, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>
                STEP 0{i + 1}
              </div>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{s.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: "var(--text-primary, #F8FAFC)" }}>{s.title}</div>
              <div style={{ color: "var(--text-tertiary, #8892A4)", fontSize: 13, lineHeight: 1.55 }}>{s.blurb}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "20px auto 0", padding: "24px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {PERKS.map((p) => (
            <div key={p.title} style={cardNeutral}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{p.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: "var(--text-primary, #F8FAFC)" }}>{p.title}</div>
              <div style={{ color: "var(--text-tertiary, #8892A4)", fontSize: 13, lineHeight: 1.55 }}>{p.blurb}</div>
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
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--text-primary, #F8FAFC)", letterSpacing: -0.3 }}>
            Ready to learn something new today?
          </h2>
          <p style={{ color: "var(--text-tertiary, #94A3B8)", fontSize: 14, lineHeight: 1.7, marginTop: 10, marginBottom: 20 }}>
            Pick a topic, drop in your notes, and start your first session in 60 seconds.
          </p>
          <Link
            href="/study-buddy/learn"
            style={{
              ...ctaPrimary,
              background: `linear-gradient(135deg, ${A1}, #3B82F6)`,
              boxShadow: `0 12px 28px -10px ${A1}B3`,
            }}
          >
            Open Study Buddy →
          </Link>
        </div>
      </section>
    </div>
  );
}

/* shared style helpers — same spec as Opportunities/Marketplace hero */

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
  marginTop: 22, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap",
};
const ctaPrimary: React.CSSProperties = {
  display: "inline-block", padding: "12px 22px", borderRadius: 12, color: "#fff",
  fontSize: 14, fontWeight: 800, textDecoration: "none",
};
const ctaGhost: React.CSSProperties = {
  padding: "12px 22px", borderRadius: 12, background: "rgba(255,255,255,0.04)",
  color: "var(--text-primary, #F8FAFC)", fontSize: 14, fontWeight: 700, textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.1)",
};
const cardNeutral: React.CSSProperties = {
  padding: 22, borderRadius: 16,
  background: "var(--bg-secondary, #111827)",
  border: "1px solid var(--border-default, rgba(255,255,255,0.07))",
  color: "var(--text-primary, #F8FAFC)",
};
const sectionHeading: React.CSSProperties = {
  margin: "6px 0 0", fontSize: 24, fontWeight: 900, color: "var(--text-primary, #F8FAFC)", letterSpacing: -0.3,
};

function eyebrow(color: string): React.CSSProperties {
  return {
    display: "inline-block", padding: "5px 14px", borderRadius: 999,
    background: hexToRgba(color, 0.14), border: `1px solid ${hexToRgba(color, 0.34)}`,
    color, fontSize: 11, letterSpacing: 2, fontWeight: 800,
    textTransform: "uppercase", marginBottom: 18,
  };
}
function sectionLabel(color: string): React.CSSProperties {
  return { fontSize: 11, fontWeight: 800, color, letterSpacing: 2, textTransform: "uppercase" };
}
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
