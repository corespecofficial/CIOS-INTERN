import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORIES, TOOLS, STATUS_LABEL, STATUS_COLOR } from "@/lib/document-tools";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CIOS Documents — CVs, cover letters, pitch decks & more",
  description:
    "Generate ATS-friendly CVs, tailored cover letters, LinkedIn rewrites, pitch decks and full business plans — auto-filled from your CIOS profile.",
  alternates: { canonical: "/documents" },
};

// Portal accent — pink primary, violet partner
const A1 = "#EC4899";
const A2 = "#8B5CF6";

const FEATURES = [
  { emoji: "📄", title: "CV",                   blurb: "ATS-friendly, auto-filled from your CIOS profile" },
  { emoji: "✍️", title: "Cover letter",         blurb: "Tailored to a specific job posting in seconds" },
  { emoji: "💼", title: "LinkedIn rewrite",     blurb: "Headline, About, and bullets rewritten for impact" },
  { emoji: "🎨", title: "Portfolio one-pager",  blurb: "Public link summarising your best CIOS work" },
  { emoji: "📊", title: "Pitch deck",           blurb: "10-slide investor deck from your startup pitch" },
  { emoji: "📘", title: "Business plan",        blurb: "Full investor-ready business plan PDF" },
  { emoji: "🎓", title: "Statement of Purpose", blurb: "Scholarship / grad-school SOP, tailored to programme" },
];

export default function DocumentsLandingPage() {
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
          <div style={eyebrow(A1)}>Documents that open doors</div>
          <h1 className="docs-hero-h1" style={heroH1}>
            One profile.{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${A1}, ${A2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Every document
            </span>
            .
          </h1>
          <p style={heroSub}>
            CIOS Documents turns your profile into a ready-to-send pack — CVs, cover letters, LinkedIn rewrites,
            pitch decks, business plans and more. Auto-filled, ATS-friendly, and free to start.
          </p>
          <div style={ctaRow}>
            <Link
              href="/documents/app"
              style={{
                ...ctaPrimary,
                background: `linear-gradient(135deg, ${A1}, #DB2777)`,
                boxShadow: `0 12px 28px -10px ${A1}B3`,
              }}
            >
              Open Documents →
            </Link>
            <Link href="/ai-hub" style={ctaGhost}>
              ✨ AI Hub
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 640px) {
          .docs-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 0" }}>
        <div style={sectionLabel(A1)}>WHAT YOU CAN BUILD</div>
        <h2 style={sectionHeading}>Seven document types, one profile</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={cardNeutral}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: "var(--text-primary, #F8FAFC)" }}>{f.title}</div>
              <div style={{ color: "var(--text-tertiary, #8892A4)", fontSize: 13, lineHeight: 1.55 }}>{f.blurb}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Full toolkit — every category, every tool */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px 0" }}>
        <div style={sectionLabel(A2)}>THE FULL TOOLKIT</div>
        <h2 style={sectionHeading}>A workspace, not just a CV maker</h2>
        <p style={{ color: "var(--text-tertiary, #94A3B8)", fontSize: 14, lineHeight: 1.6, marginTop: 8, maxWidth: 680 }}>
          Everything below is included. Create with AI, merge and split PDFs, convert to and from any format,
          edit, secure and translate — all under one roof.
        </p>

        <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
          {CATEGORIES.map((cat) => {
            const tools = TOOLS.filter((t) => t.category === cat.id);
            if (tools.length === 0) return null;
            return (
              <div key={cat.id} style={cardNeutral}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: A1, letterSpacing: 2, textTransform: "uppercase" }}>
                      {cat.eyebrow}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary, #F8FAFC)", letterSpacing: -0.2, marginTop: 2 }}>
                      {cat.label}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>
                    {tools.length} {tools.length === 1 ? "tool" : "tools"}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {tools.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 12px",
                        borderRadius: 999,
                        background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                        border: `1px solid ${t.accent}33`,
                        fontSize: 12,
                        color: "var(--text-secondary, #E2E8F0)",
                      }}
                    >
                      <span>{t.emoji}</span>
                      <span style={{ fontWeight: 700 }}>{t.name}</span>
                      <span
                        style={{
                          marginLeft: 2,
                          fontSize: 9,
                          fontWeight: 800,
                          color: STATUS_COLOR[t.status],
                          letterSpacing: 0.3,
                          textTransform: "uppercase",
                        }}
                      >
                        · {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
            Plans built for every stage
          </h2>
          <p style={{ color: "var(--text-tertiary, #94A3B8)", fontSize: 14, lineHeight: 1.7, marginTop: 10, marginBottom: 20 }}>
            Free — unlimited CV generation and core PDF tools. Pro — cover letters, LinkedIn and portfolios.
            Pro+ — investor-grade pitch decks, business plans and scholarship SOPs, all with priority AI.
          </p>
          <Link
            href="/documents/app"
            style={{
              ...ctaPrimary,
              background: `linear-gradient(135deg, ${A1}, #DB2777)`,
              boxShadow: `0 12px 28px -10px ${A1}B3`,
            }}
          >
            Go to Documents →
          </Link>
        </div>
      </section>
    </div>
  );
}

/* shared helpers — same spec as Opportunities/Marketplace hero */

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
