import type { Metadata } from "next";
import { CalendlyEmbed } from "@/components/marketing/calendly-embed";
import { DemoForm } from "@/components/marketing/demo-form";
import { getPlatformSettings } from "@/app/actions/landing-content";

export const metadata: Metadata = {
  title: "Book a Demo · CIOS",
  description: "Book a personalized 30-minute demo and see the CIOS platform live.",
};

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🎯", title: "Full Dashboard Tour",   desc: "30-minute walkthrough of the intern dashboard, task system, gamification, and AI tools." },
  { icon: "🤖", title: "AI Features Demo",      desc: "Live demo of AI Resume Builder, Interview Prep, Plagiarism Detection, and AI Copilot." },
  { icon: "🏆", title: "Gamification System",   desc: "See XP, streaks, challenges, leaderboards, and reward payouts in action." },
  { icon: "💼", title: "Recruiter Portal",       desc: "How companies find, filter, and hire talent directly from the platform." },
  { icon: "📊", title: "Admin Controls",         desc: "Full tour of the operator panels — compliance, analytics, and platform controls." },
  { icon: "💰", title: "Finance & Wallet",       desc: "How monetary rewards, fines, and wallet payouts work in real time." },
];

export default async function DemoPage() {
  const settings = await getPlatformSettings().catch(() => ({ demo_calendly_url: "" } as Awaited<ReturnType<typeof getPlatformSettings>>));
  const calendlyUrl = settings.demo_calendly_url?.trim() ?? "";
  const hasCalendly = calendlyUrl.startsWith("https://calendly.com/") || calendlyUrl.startsWith("https://cal.com/");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 80px" }}>

      {/* ── HERO ── */}
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <span style={{
          display: "inline-block", padding: "4px 14px", marginBottom: 16, borderRadius: 20,
          background: "rgba(30,136,229,0.15)", color: "#1E88E5",
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
        }}>
          LIVE DEMO
        </span>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "#E8EDF5",
          margin: "0 0 16px", lineHeight: 1.1,
        }}>
          See CIOS in action
        </h1>
        <p style={{ fontSize: 17, color: "#8892A4", maxWidth: 560, margin: "0 auto 20px", lineHeight: 1.6 }}>
          Book a personalized 30-minute demo and watch how CIOS turns an internship program into a full talent economy — live, end-to-end.
        </p>

        {/* Meta badges */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {["⏱ 30 minutes", "🎥 Video call", "📅 You pick the time", "🆓 Free, no commitment"].map(b => (
            <span key={b} style={{
              display: "inline-block", padding: "5px 14px", borderRadius: 99,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12, color: "#8892A4", fontWeight: 600,
            }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: hasCalendly ? "1fr 1.4fr" : "1fr 1fr",
        gap: 48, alignItems: "center",
      }} className="demo-grid">

        {/* Left — what we'll cover */}
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 20 }}>
            What we&apos;ll cover
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                display: "flex", gap: 14, padding: "14px 18px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: "rgba(30,136,229,0.12)", border: "1px solid rgba(30,136,229,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{
            padding: "20px 24px", borderRadius: 14,
            background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.2)",
          }}>
            <div style={{ color: "#FFC107", fontSize: 13, marginBottom: 8 }}>★★★★★</div>
            <p style={{ fontSize: 14, color: "#B0BEC5", lineHeight: 1.7, fontStyle: "italic", margin: "0 0 12px" }}>
              &ldquo;The demo call convinced us in 20 minutes. We enrolled our entire 40-person cohort the following week.&rdquo;
            </p>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E88E5" }}>— Training Manager, Lagos Tech Hub</div>
          </div>
        </div>

        {/* Right — Calendly embed or fallback form */}
        <div style={{ position: "sticky", top: 90 }}>
          {hasCalendly ? (
            <>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 16 }}>
                Pick a time that works for you
              </h2>
              <CalendlyEmbed url={calendlyUrl} />
            </>
          ) : (
            <DemoForm />
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .demo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
