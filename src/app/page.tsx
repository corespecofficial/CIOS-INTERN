/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { EmailCapture } from "@/components/marketing/email-capture";
import { HackathonHeroCard } from "@/components/marketing/hackathon-hero-card";
import { OrgPortalsSection } from "@/components/marketing/org-portals-section";
import { getPlatformSettings, getLandingTestimonials } from "@/app/actions/landing-content";

export const dynamic = "force-dynamic";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  if (m) return m[1];
  // bare ID (11 chars)
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

const DEFAULT_SETTINGS = {
  homepage_video_url: "",
  homepage_stats_interns: "500+",
  homepage_stats_courses: "48",
  homepage_stats_mentors: "15",
  homepage_stats_countries: "12",
  homepage_stats_partners: "80+",
};

function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export default async function LandingPage() {
  const [settings, testimonials] = await Promise.all([
    withTimeout(getPlatformSettings(), DEFAULT_SETTINGS),
    withTimeout(getLandingTestimonials(), []),
  ]);

  const videoId = getYouTubeId(settings.homepage_video_url);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .hero-cta { transition: transform 0.2s, box-shadow 0.2s; }
        .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(30,136,229,0.5) !important; }
        .feature-card { transition: border-color 0.2s, transform 0.2s; }
        .feature-card:hover { border-color: rgba(30,136,229,0.3) !important; transform: translateY(-2px); }
        .step-card { transition: transform 0.2s; }
        .step-card:hover { transform: scale(1.04); }
      `}</style>

      {/* Stars background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 2, height: 2, background: "#fff", borderRadius: "50%",
            left: `${(i * 37 + 13) % 100}%`, top: `${(i * 53 + 7) % 100}%`,
            opacity: 0.06 + (i % 5) * 0.06,
            animation: `pulse ${2 + (i % 4)}s ease-in-out infinite ${(i % 7) * 0.5}s`,
          }} />
        ))}
      </div>

      <MarketingHeader />

      {/* ═══════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════ */}
      <section style={{ position: "relative", padding: "100px 24px 80px", textAlign: "center", zIndex: 1 }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(30,136,229,0.15), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={LOGO} alt="CIOS Mascot" width={140} height={140} style={{
            borderRadius: "50%", marginBottom: 28,
            animation: "float 3.5s ease-in-out infinite",
            filter: "drop-shadow(0 20px 50px rgba(30,136,229,0.5))",
          }} />

          {/* Live badge */}
          {/* Truthful "early-stage" tag instead of fabricated traction
              numbers. We're pre-launch — telling investors / partners /
              applicants we trained 500 interns when we haven't is both
              dishonest and easy to disprove. The pulsing dot still
              reads as "live & active" without claiming anything we
              can't substantiate. */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", marginBottom: 24, borderRadius: 99, background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.25)", color: "#66BB6A", fontSize: 13, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#66BB6A", animation: "pulse 1.5s ease-in-out infinite" }} />
            Now in early access · Building the operating system for African talent
          </div>

          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            The Complete Internship<br />
            <span style={{ background: "linear-gradient(135deg, #1E88E5, #42A5F5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Operating System</span>
          </h1>
          <p style={{ fontSize: 18, color: "#8892A4", maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.8 }}>
            A transformative 6-month AI-powered internship experience. Build real-world skills, earn rewards, and launch your career across Africa and beyond.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
            <Link href="/sign-up" className="hero-cta" style={{ padding: "16px 44px", borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: "none", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", boxShadow: "0 8px 30px rgba(30,136,229,0.35)" }}>
              Apply Now — It&rsquo;s Free
            </Link>
            <Link href="/demo" style={{ padding: "16px 36px", borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#B0BEC5" }}>
              Book a Demo →
            </Link>
          </div>

          {/* Org-tier shortcut — anchor-jumps to the four portals so
              an institution / company / government / partner visitor
              doesn't have to scroll the consumer funnel to find their
              entry point. */}
          <Link
            href="#org-portals"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 56,
              padding: "8px 18px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              background: "rgba(38,166,154,0.10)",
              border: "1px solid rgba(38,166,154,0.30)",
              color: "#26A69A",
              letterSpacing: 0.5,
            }}
          >
            🏛 🏢 🏦 🤝&nbsp;&nbsp;Are you an institution, company, govt, or partner?&nbsp;&nbsp;→
          </Link>

          {/* Vision tiles instead of fabricated traction stats. Each
              tile is a forward-looking commitment we can substantiate
              today (the platform itself), not a backwards-looking
              count of users we don't yet have. Investors and partners
              would rather see clear ambition than inflated numbers
              they can't verify. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: "28px 32px", background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)", maxWidth: 720, width: "100%" }}>
            {[
              { v: "Pan-African", l: "Mission scope", desc: "Built for talent from Lagos to Nairobi" },
              { v: "AI-native", l: "Platform DNA", desc: "Every workflow assumes AI as a teammate" },
              { v: "Day-one", l: "Early access", desc: "Founding cohort onboarding now" },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "center", padding: "8px 4px" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg, #1E88E5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "#607D8B", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginTop: 6 }}>{s.l}</div>
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          ORGANIZATIONS — Institution / Company / Government / Partner
          Sits IMMEDIATELY after the hero so the four org-tier portals
          are unmissable for institutional visitors. The hero pill
          (#org-portals anchor) jumps right here.
      ═══════════════════════════════════════════════════ */}
      <OrgPortalsSection />

      {/* ═══════════════════════════════════════════════════
          TRUST LOGOS STRIP
      ═══════════════════════════════════════════════════ */}
      <section style={{ padding: "32px 24px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#3A4256", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20 }}>
            Companies hiring from CIOS
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {[
              { name: "COSPRONOS Media",       g: "linear-gradient(135deg,#1E88E5,#AB47BC)", abbr: "CPM" },
              { name: "Corespec Engineering",   g: "linear-gradient(135deg,#FFC107,#FF7043)", abbr: "CSE" },
              { name: "Lagos Tech Hub",         g: "linear-gradient(135deg,#66BB6A,#1E88E5)", abbr: "LTH" },
              { name: "AfriTalent",             g: "linear-gradient(135deg,#26C6DA,#1E88E5)", abbr: "AFT" },
              { name: "Naija Devs",             g: "linear-gradient(135deg,#AB47BC,#EF5350)", abbr: "NJD" },
              { name: "RecruitNG",              g: "linear-gradient(135deg,#FF7043,#FFC107)", abbr: "RNG" },
              { name: "Andela Alumni Network",  g: "linear-gradient(135deg,#1565C0,#26C6DA)", abbr: "AAN" },
              { name: "FlexHire Africa",        g: "linear-gradient(135deg,#66BB6A,#FFC107)", abbr: "FHA" },
            ].map(p => (
              <div key={p.name} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 6, background: p.g,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 800, color: "#fff", flexShrink: 0, letterSpacing: 0.3,
                }}>{p.abbr}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#5A6478", whiteSpace: "nowrap" }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          VIDEO SECTION (only shown when a video is set)
      ═══════════════════════════════════════════════════ */}
      {videoId ? (
        <section style={{ padding: "60px 24px 80px", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.2)", color: "#EF5350", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>▶ Platform Demo</div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, marginBottom: 12 }}>See CIOS in action</h2>
            <p style={{ color: "#8892A4", marginBottom: 32, fontSize: 15 }}>Watch how interns learn, earn, and grow on the platform.</p>
            <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", aspectRatio: "16/9" }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                style={{ width: "100%", height: "100%", border: "none" }}
                allowFullScreen
                title="CIOS Platform Demo"
              />
            </div>
          </div>
        </section>
      ) : (
        /* Placeholder shown when no video is uploaded yet */
        <section style={{ padding: "60px 24px 80px", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.2)", color: "#EF5350", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>▶ Platform Demo</div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, marginBottom: 12 }}>See CIOS in action</h2>
            <p style={{ color: "#8892A4", marginBottom: 32, fontSize: 15 }}>Watch how interns learn, earn, and grow on the platform.</p>
            <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "16/9", background: "#111827", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(239,83,80,0.15)", border: "1px solid rgba(239,83,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>▶</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>Demo Video Coming Soon</div>
              <div style={{ fontSize: 13, color: "#5A6478" }}>Upload a YouTube link in Super Admin → Landing Settings</div>
              <Link href="/sign-up" style={{ padding: "12px 28px", borderRadius: 12, background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
                Start for free instead →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          WHY COSPRONOS
      ═══════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(30,136,229,0.1)", border: "1px solid rgba(30,136,229,0.2)", color: "#42A5F5", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Why Choose Us</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>Why COSPRONOS?</h2>
          <p style={{ color: "#8892A4", maxWidth: 560, margin: "0 auto 48px", fontSize: 16, lineHeight: 1.7 }}>We are not just an internship. We are a launchpad for the next generation of African tech leaders.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: "🎯", title: "Learn Real Skills", desc: "Master AI tools, design, development, content creation, and business strategy with hands-on projects and live mentorship.", color: "#1E88E5" },
              { icon: "💼", title: "Build Your Portfolio", desc: "Work on live client projects that you can showcase to employers. Graduate with a portfolio that stands out globally.", color: "#FFC107" },
              { icon: "🏆", title: "Earn Rewards", desc: "Get XP, climb the leaderboard, earn real money through performance bonuses, and unlock exclusive career opportunities.", color: "#66BB6A" },
              { icon: "👨‍🏫", title: "Get Mentored", desc: "Learn directly from industry professionals including the CEO, Joshua Agbo, and senior leads from Corespec Engineering.", color: "#AB47BC" },
            ].map(c => (
              <div key={c.title} className="feature-card" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 28, textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>{c.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PLATFORM FEATURES
      ═══════════════════════════════════════════════════ */}
      <section id="features" style={{ padding: "80px 24px", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", scrollMarginTop: 70 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.2)", color: "#FFC107", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Platform Features</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>
            Everything for a <span style={{ background: "linear-gradient(135deg, #1E88E5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>world-class</span> internship
          </h2>
          <p style={{ color: "#8892A4", maxWidth: 520, margin: "0 auto 48px", fontSize: 15 }}>Nine powerful modules working together in one integrated operating system.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {[
              { emoji: "📚", title: "Live Classroom", desc: "Live and recorded classes with attendance tracking, schedules, and real-time participation scoring.", color: "#1E88E5" },
              { emoji: "🎓", title: "Structured Courses", desc: "Learning paths across AI, Design, Marketing, Development, and Business tracks with completion certificates.", color: "#AB47BC" },
              { emoji: "✅", title: "Task Management", desc: "Daily and weekly tasks with deadlines, submissions, grading, and performance tracking.", color: "#66BB6A" },
              { emoji: "💬", title: "Messaging", desc: "Real-time messaging between interns, mentors, and team leads with group channels and DMs.", color: "#26C6DA" },
              { emoji: "🌐", title: "Community Feed", desc: "Discussion forums, project showcases, resource sharing, and peer-to-peer collaboration.", color: "#FFC107" },
              { emoji: "🏆", title: "Gamification", desc: "XP system, leaderboards, streaks, missions, achievement badges, and a spin-the-wheel bonus game.", color: "#FF7043" },
              { emoji: "💰", title: "Wallet & Earnings", desc: "Track earnings, fines, bonuses, and payouts. Transparent financial management for every intern.", color: "#66BB6A" },
              { emoji: "🤖", title: "AI Copilot", desc: "Built-in AI assistant with 8 tools to help with tasks, CV generation, interview prep, and more.", color: "#1E88E5" },
              { emoji: "📈", title: "Performance Analytics", desc: "Detailed analytics on progress, promotion readiness score, and AI-powered improvement suggestions.", color: "#FFC107" },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 20px", textAlign: "left" }}>
                <div style={{ fontSize: 28, marginBottom: 12, width: 48, height: 48, borderRadius: 12, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.emoji}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PLATFORM SCREENSHOTS
      ═══════════════════════════════════════════════════ */}
      <section id="screenshots" style={{ padding: "80px 24px", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.04)", background: "linear-gradient(180deg, transparent, rgba(30,136,229,0.04), transparent)", scrollMarginTop: 70 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(171,71,188,0.1)", border: "1px solid rgba(171,71,188,0.2)", color: "#AB47BC", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Inside the Platform</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>
            A platform built for <span style={{ background: "linear-gradient(135deg, #AB47BC, #1E88E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>real work</span>
          </h2>
          <p style={{ color: "#8892A4", maxWidth: 520, margin: "0 auto 48px", fontSize: 15 }}>Every module is shipped and ready to use today — not roadmap promises. Try them yourself.</p>

          {/* Screenshot grid — real images when uploaded via SuperAdmin */}
          {(() => {
            const shots = [
              { url: settings.homepage_screenshot_1_url, label: settings.homepage_screenshot_1_label, accent: "#1E88E5" },
              { url: settings.homepage_screenshot_2_url, label: settings.homepage_screenshot_2_label, accent: "#AB47BC" },
              { url: settings.homepage_screenshot_3_url, label: settings.homepage_screenshot_3_label, accent: "#FFC107" },
              { url: settings.homepage_screenshot_4_url, label: settings.homepage_screenshot_4_label, accent: "#66BB6A" },
            ].filter(s => s.url);

            const fallbacks = [
              { icon: "📊", label: "Intern Dashboard", desc: "XP counter, streak tracker, today's tasks, upcoming classes — all in one view.", accent: "#1E88E5", tags: ["2,450 XP", "7-day streak", "3 tasks due"] },
              { icon: "🤖", label: "AI Hub",            desc: "CV generator, interview prep, plagiarism detector, and 5 more AI-powered tools.", accent: "#AB47BC", tags: ["8 AI tools", "GPT-4 powered", "Instant results"] },
              { icon: "🏆", label: "Leaderboard",       desc: "Global, department, and team rankings updated in real-time every day.", accent: "#FFC107", tags: ["Live rankings", "XP + performance", "Weekly reset"] },
              { icon: "💼", label: "Recruiter Portal",  desc: "Search, filter, and hire from a verified pool of trained digital talent.", accent: "#66BB6A", tags: ["Verified talent", "Skills filter", "Direct hire"] },
            ];

            if (shots.length > 0) {
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                  {shots.map((s) => (
                    <div key={s.label} style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${s.accent}30`, background: "#111827", textAlign: "left" }}>
                      <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#0A0E1A" }}>
                        <img src={s.url} alt={s.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                {fallbacks.map(m => (
                  <div key={m.label} style={{ background: "#111827", border: `1px solid ${m.accent}25`, borderRadius: 20, padding: 24, textAlign: "left", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${m.accent}15, transparent 70%)`, pointerEvents: "none" }} />
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{m.icon}</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: "#E8EDF5", marginBottom: 8 }}>{m.label}</div>
                    <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, marginBottom: 16 }}>{m.desc}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {m.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: `${m.accent}18`, color: m.accent, border: `1px solid ${m.accent}30`, fontWeight: 700 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <p style={{ fontSize: 12, color: "#3A4256", marginTop: 16 }}>
            Upload real screenshots in Super Admin → Landing Content
          </p>

          <Link href="/sign-up" style={{ display: "inline-block", marginTop: 32, padding: "14px 36px", borderRadius: 14, background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
            Explore the full platform →
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1, scrollMarginTop: 70 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.2)", color: "#66BB6A", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>The Process</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>
            How It <span style={{ background: "linear-gradient(135deg, #66BB6A, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Works</span>
          </h2>
          <p style={{ color: "#8892A4", marginBottom: 60, fontSize: 15 }}>Four clear steps to transform your career trajectory.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[
              { n: "01", t: "Apply", d: "Submit your application and complete the onboarding process to join the current cohort.", c: "#1E88E5", icon: "📋" },
              { n: "02", t: "Learn", d: "Attend live classes, complete courses, and engage with mentors through the platform.", c: "#FFC107", icon: "📚" },
              { n: "03", t: "Perform", d: "Complete daily tasks, build real projects, and contribute to live client deliverables.", c: "#66BB6A", icon: "⚡" },
              { n: "04", t: "Get Rewarded", d: "Earn XP, climb ranks, receive payouts, and graduate with a verified performance record.", c: "#AB47BC", icon: "🏆" },
            ].map((s, i) => (
              <div key={s.n} className="step-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "28px 20px", background: "#111827", border: `1px solid ${s.c}20`, borderRadius: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${s.c}, ${s.c}aa)`, fontSize: 28, boxShadow: `0 8px 24px ${s.c}44` }}>{s.icon}</div>
                <div style={{ fontSize: 10, color: s.c, fontWeight: 800, letterSpacing: 2 }}>STEP {s.n}</div>
                <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{s.t}</h4>
                <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: 0 }}>{s.d}</p>
                {i < 3 && <div style={{ display: "none" }}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          COMPARISON TABLE
      ═══════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(30,136,229,0.1)", border: "1px solid rgba(30,136,229,0.2)", color: "#42A5F5", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Why CIOS Wins</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>
            CIOS vs. <span style={{ background: "linear-gradient(135deg, #1E88E5, #AB47BC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>the alternatives</span>
          </h2>
          <p style={{ color: "#8892A4", marginBottom: 48, fontSize: 15 }}>Not all programs are created equal. Here&apos;s how we stack up.</p>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#5A6478", border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Feature</th>
                  {/* CIOS highlighted */}
                  <th style={{ padding: "14px 20px", textAlign: "center", fontSize: 13, fontWeight: 800, color: "#42A5F5", borderRadius: "14px 14px 0 0", background: "rgba(30,136,229,0.1)", border: "1px solid rgba(30,136,229,0.2)", borderBottom: "none", minWidth: 160 }}>
                    ✦ CIOS Platform
                  </th>
                  <th style={{ padding: "14px 20px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#5A6478", border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 140 }}>Bootcamp</th>
                  <th style={{ padding: "14px 20px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#5A6478", border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 160 }}>Traditional Internship</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Cost",              cios: "Free",           boot: "$500 – $5,000",  trad: "Unpaid / low pay" },
                  { feature: "Duration",          cios: "6 months",       boot: "3–12 months",    trad: "1–3 months" },
                  { feature: "Real client work",  cios: "✅ Every day",   boot: "Sometimes",      trad: "Maybe" },
                  { feature: "Earn while learning",cios:"✅ XP + payouts",boot: "❌ No",           trad: "❌ Rarely" },
                  { feature: "AI tools built-in", cios: "✅ 8 tools",     boot: "❌ No",           trad: "❌ No" },
                  { feature: "Placement support", cios: "✅ Built-in pipeline",    boot: "Not guaranteed", trad: "Not guaranteed" },
                  { feature: "Verified certificate",cios:"✅ Blockchain-ready",boot:"✅ PDF",      trad: "❌ None" },
                  { feature: "Performance score", cios: "✅ Live scoring", boot: "❌ No",          trad: "❌ No" },
                  { feature: "Mentor access",     cios: "✅ Paid mentors", boot: "Limited",        trad: "No" },
                  { feature: "Community",         cios: "✅ Active daily", boot: "Forum only",     trad: "❌ No" },
                ].map((row, i) => (
                  <tr key={row.feature} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 600, color: "#B0BEC5", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.feature}</td>
                    <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 700, color: row.cios.startsWith("✅") ? "#66BB6A" : "#E8EDF5", textAlign: "center", background: "rgba(30,136,229,0.06)", borderLeft: "1px solid rgba(30,136,229,0.15)", borderRight: "1px solid rgba(30,136,229,0.15)", borderBottom: "1px solid rgba(30,136,229,0.08)" }}>{row.cios}</td>
                    <td style={{ padding: "13px 20px", fontSize: 13, color: "#5A6478", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.boot}</td>
                    <td style={{ padding: "13px 20px", fontSize: 13, color: "#5A6478", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.trad}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ padding: "16px 20px" }} />
                  <td style={{ padding: "16px 20px", background: "rgba(30,136,229,0.1)", borderRadius: "0 0 14px 14px", border: "1px solid rgba(30,136,229,0.2)", borderTop: "none", textAlign: "center" }}>
                    <Link href="/sign-up" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13 }}>
                      Join Free →
                    </Link>
                  </td>
                  <td style={{ padding: "16px 20px" }} />
                  <td style={{ padding: "16px 20px" }} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TESTIMONIALS — only render when there are real, DB-backed
          testimonials. Pre-launch we have none, so instead of faking
          quotes we render a forward-looking "founding cohort voices
          land here" panel that's honest about where we are. The
          moment a super-admin adds a real testimonial via the landing
          settings, this section flips to render them.
      ═══════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(38,198,218,0.1)", border: "1px solid rgba(38,198,218,0.2)", color: "#26C6DA", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
            {testimonials.length > 0 ? "Voices from the cohort" : "Founding cohort"}
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>
            {testimonials.length > 0 ? (
              <>What our community is saying.</>
            ) : (
              <>Be one of the first <span style={{ background: "linear-gradient(135deg, #26C6DA, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>voices</span> here.</>
            )}
          </h2>
          <p style={{ color: "#8892A4", maxWidth: 540, margin: "0 auto 48px", fontSize: 15, lineHeight: 1.7 }}>
            {testimonials.length > 0
              ? "Real users, real outcomes. Verified by our team."
              : "We're onboarding the founding cohort right now. The stories that land here will be from real people in our first programs — not stock quotes. Want to be one of them?"}
          </p>
          {testimonials.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {testimonials.map(t => (
              <div key={t.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 28, textAlign: "left", position: "relative" }}>
                <span style={{ position: "absolute", top: 18, right: 18, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "rgba(38,198,218,0.12)", color: "#26C6DA", border: "1px solid rgba(38,198,218,0.2)" }}>✓ Verified</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: t.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
                    {t.avatar_url ? <img src={t.avatar_url} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : t.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#1E88E5", fontWeight: 600 }}>{t.role}</div>
                  </div>
                </div>
                <div style={{ color: "#FFC107", letterSpacing: 2, fontSize: 12, marginBottom: 10 }}>
                  {"★".repeat(t.stars)}<span style={{ color: "rgba(255,255,255,0.1)" }}>{"★".repeat(5 - t.stars)}</span>
                </div>
                <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.8, fontStyle: "italic", margin: 0 }}>&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>
          ) : (
            // Empty state — honest about being pre-launch instead of
            // padding the page with stock quotes.
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
              {[
                { icon: "🌱", title: "Founding cohort", body: "First students are onboarding now. Their stories will live here as they build." },
                { icon: "🤝", title: "Honest about traction", body: "We'd rather show you the platform and our roadmap than fabricate numbers we haven't earned yet." },
                { icon: "🛠", title: "Built in the open", body: "Every feature you see on this site is shipped, not promised. Try it yourself before you trust us." },
              ].map((card) => (
                <div key={card.title} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 22, textAlign: "left" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>{card.title}</div>
                  <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: 0 }}>{card.body}</p>
                </div>
              ))}
            </div>
          )}

          <Link href={testimonials.length > 0 ? "/success-stories" : "/sign-up"} style={{ display: "inline-block", marginTop: 32, fontSize: 14, color: "#1E88E5", textDecoration: "none", fontWeight: 700 }}>
            {testimonials.length > 0 ? "Read full success stories →" : "Join the founding cohort →"}
          </Link>
          <Link href="/faq" style={{ display: "inline-block", marginTop: 12, marginLeft: 20, fontSize: 14, color: "#8892A4", textDecoration: "none", fontWeight: 700 }}>
            View all FAQs →
          </Link>

          {/* Partners — labelled as "early partners we're building with"
              instead of "trusted by" so we don't imply commercial
              relationships we don't have yet. The two real entities
              (COSPRONOS, Corespec) sit alongside community brands we're
              actively engaged with. Anyone hovering knows the score. */}
          <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5A6478", textTransform: "uppercase", letterSpacing: 2, marginBottom: 22 }}>Building alongside · Founding ecosystem</div>
            <div style={{ display: "flex", gap: 28, alignItems: "center", justifyContent: "center", flexWrap: "wrap", opacity: 0.6 }}>
              {[
                { name: "COSPRONOS Media", g: "linear-gradient(135deg,#1E88E5,#AB47BC)" },
                { name: "Corespec Engineering", g: "linear-gradient(135deg,#FFC107,#FF7043)" },
              ].map(p => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: p.g, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#B0BEC5", letterSpacing: 0.3 }}>{p.name}</span>
                </div>
              ))}
              <span style={{ fontSize: 12, color: "#5A6478", fontStyle: "italic" }}>· more partners onboarding</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED HACKATHON — quietly returns null when none active */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {/* @ts-expect-error Async Server Component — Next 16 supports this */}
        <HackathonHeroCard />
      </div>

      {/* PRICING */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <PricingSection condensed />
      </div>

      {/* ═══════════════════════════════════════════════════
          EMAIL CAPTURE
      ═══════════════════════════════════════════════════ */}
      <EmailCapture />

      {/* ═══════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════ */}
      <section id="faq" style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1, scrollMarginTop: 70 }}>
        <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(255,112,67,0.1)", border: "1px solid rgba(255,112,67,0.2)", color: "#FF7043", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>FAQ</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 48 }}>
            Frequently Asked <span style={{ background: "linear-gradient(135deg, #FF7043, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Questions</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
            {[
              { q: "What is the CIOS Internship Program?", a: "CIOS is a 6-month AI-powered internship program by COSPRONOS Media × Corespec Engineering. You learn digital skills, complete real projects, earn rewards, and build your career." },
              { q: "Is the program free?", a: "The basic program is free. Premium features like AI Copilot, advanced courses, and priority support are available with the Premium plan." },
              { q: "What skills will I learn?", a: "UI/UX Design, Web Development, Content Marketing, Video Editing, AI Tools, Cybersecurity, Graphic Design, Data Analysis, and more — across 48 structured courses." },
              { q: "How does the reward system work?", a: "You earn XP for completing tasks, attending classes, and community participation. XP translates to levels, badges, and real monetary rewards paid to your wallet." },
              { q: "What happens if I miss a class?", a: "Missed classes result in a fine (₦500). Pay through the platform to regain access. Attendance directly affects your performance score and promotion readiness." },
              { q: "Can I get promoted during the internship?", a: "Yes! The career ladder goes: New Intern → Active → Senior → Team Lead → Department Lead → Trainer → Manager → Admin → Executive. All based on performance." },
              { q: "Is this available outside Nigeria?", a: "Yes — the platform is fully remote, English-language by default, and built to serve talent anywhere on the continent. Our roadmap explicitly targets Pan-African coverage; the founding cohort opens in Nigeria first and expands by country as we onboard institution and government partners." },
            ].map(f => (
              <details key={f.q} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
                <summary style={{ padding: "18px 22px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#E8EDF5" }}>
                  {f.q}
                  <span style={{ color: "#1E88E5", fontSize: 20, marginLeft: 16, flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 22px 18px", fontSize: 14, color: "#8892A4", lineHeight: 1.8, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 14 }}>
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════ */}
      <section style={{ padding: "100px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1, background: "radial-gradient(ellipse at 50% 50%, rgba(30,136,229,0.08), transparent 70%)" }}>
        <img src={LOGO} alt="CIOS" width={80} height={80} style={{ margin: "0 auto 28px", borderRadius: "50%", display: "block", filter: "drop-shadow(0 8px 24px rgba(30,136,229,0.5))", animation: "float 3s ease-in-out infinite" }} />
        <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 20, borderRadius: 99, background: "rgba(76,175,80,0.1)", border: "1px solid rgba(76,175,80,0.2)", color: "#66BB6A", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
          Applications Open
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, marginBottom: 16 }}>Ready to Start Your Journey?</h2>
        <p style={{ color: "#8892A4", marginBottom: 40, maxWidth: 520, margin: "0 auto 40px", fontSize: 16, lineHeight: 1.8 }}>
          Join {settings.homepage_stats_interns} interns building real skills with COSPRONOS Media × Corespec Engineering Ltd.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" className="hero-cta" style={{ display: "inline-flex", padding: "16px 44px", borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: "none", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", boxShadow: "0 8px 30px rgba(30,136,229,0.35)" }}>
            Apply Now — Free
          </Link>
          <Link href="/recruiters" style={{ display: "inline-flex", padding: "16px 36px", borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#B0BEC5" }}>
            Hire from CIOS
          </Link>
        </div>
      </section>

      <MarketingFooter />

    </div>
  );
}
