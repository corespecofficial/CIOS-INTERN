/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', system-ui, sans-serif", overflowX: "hidden" }}>
      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 2, height: 2, background: "#fff", borderRadius: "50%",
            left: `${(i * 37 + 13) % 100}%`, top: `${(i * 53 + 7) % 100}%`,
            opacity: 0.1 + (i % 5) * 0.1,
            animation: `pulse ${2 + (i % 4)}s ease-in-out infinite ${(i % 7) * 0.5}s`,
          }} />
        ))}
      </div>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,14,26,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={LOGO} alt="CIOS" width={40} height={40} style={{ borderRadius: 12, animation: "float 4s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, background: "linear-gradient(135deg, #fff, #1E88E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CIOS Platform</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <a href="#features" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>Features</a>
            <Link href="/about" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>About</Link>
            <Link href="/recruiters" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>For Recruiters</Link>
            <Link href="/talent-showcase" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>Talent</Link>
            <Link href="/pricing" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>Pricing</Link>
            <Link href="/contact" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>Contact</Link>
            <a href="#faq" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>FAQ</a>
            <Link href="/sign-in" style={{
              fontSize: 14, fontWeight: 700, padding: "10px 24px", borderRadius: 12,
              background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", textDecoration: "none",
              boxShadow: "0 4px 20px rgba(30,136,229,0.35)",
            }}>Sign In</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", padding: "80px 24px 60px", textAlign: "center", zIndex: 1 }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(30,136,229,0.12), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={LOGO} alt="Mascot" width={160} height={160} style={{
            borderRadius: "50%", marginBottom: 32,
            animation: "float 3.5s ease-in-out infinite",
            filter: "drop-shadow(0 20px 50px rgba(30,136,229,0.45))",
          }} />
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", marginBottom: 28,
            borderRadius: 99, background: "rgba(30,136,229,0.1)", border: "1px solid rgba(30,136,229,0.25)",
            color: "#42A5F5", fontSize: 14, fontWeight: 600,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#66BB6A", animation: "pulse 1.5s ease-in-out infinite" }} />
            COSPRONOS Media AI Internship Program
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            The Complete Internship<br />
            <span style={{ background: "linear-gradient(135deg, #1E88E5, #42A5F5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Operating System</span>
          </h1>
          <p style={{ fontSize: 18, color: "#8892A4", maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.7 }}>
            A transformative 6-month AI-powered internship experience designed to build real-world skills, accountability, and career-ready professionals across Africa.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/sign-up" style={{
              padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: "none",
              background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
              boxShadow: "0 8px 30px rgba(30,136,229,0.35)",
            }}>Get Started</Link>
            <Link href="/sign-in" style={{
              padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.15)", color: "#B0BEC5",
            }}>Sign In</Link>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
            {[{ v: "120+", l: "Interns" }, { v: "48", l: "Courses" }, { v: "15", l: "Mentors" }, { v: "6", l: "Months" }].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, background: "linear-gradient(135deg, #1E88E5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.v}</div>
                <div style={{ fontSize: 12, color: "#607D8B", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY COSPRONOS */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 12 }}>Why COSPRONOS?</h2>
          <p style={{ color: "#8892A4", maxWidth: 560, margin: "0 auto 48px", fontSize: 16, lineHeight: 1.7 }}>We are not just an internship. We are a launchpad for the next generation of African tech leaders.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: "🎯", title: "Learn Real Skills", desc: "Master AI tools, design, development, content creation, and business strategy with hands-on projects and live mentorship." },
              { icon: "💼", title: "Build Your Portfolio", desc: "Work on live client projects that you can showcase to employers. Graduate with a portfolio that stands out." },
              { icon: "🏆", title: "Earn Rewards", desc: "Get XP, climb the leaderboard, earn real money through performance bonuses, and unlock exclusive opportunities." },
              { icon: "👨‍🏫", title: "Get Mentored", desc: "Learn directly from industry professionals including the CEO, Joshua Agbo, and senior leads from Corespec Engineering." },
            ].map(c => (
              <div key={c.title} style={{
                background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20,
                padding: 28, textAlign: "center", transition: "all 0.3s",
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{c.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section id="features" style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", marginBottom: 16, borderRadius: 99, background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.2)", color: "#FFC107", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Platform Features</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 12 }}>
            Everything you need for a <span style={{ background: "linear-gradient(135deg, #1E88E5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>world-class</span> internship
          </h2>
          <p style={{ color: "#8892A4", maxWidth: 520, margin: "0 auto 48px", fontSize: 15 }}>Nine powerful modules working together in one integrated system.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {[
              { emoji: "📚", title: "Classroom", desc: "Live and recorded classes with attendance tracking, schedules, and real-time participation." },
              { emoji: "🎓", title: "Courses", desc: "Structured learning paths across AI, Design, Marketing, Development, and Business tracks." },
              { emoji: "✅", title: "Tasks", desc: "Daily and weekly tasks with deadlines, submissions, grading, and performance tracking." },
              { emoji: "💬", title: "Messaging", desc: "Real-time messaging between interns, mentors, and team leads with group channels." },
              { emoji: "🌐", title: "Community", desc: "Discussion forums, project showcases, resource sharing, and peer-to-peer collaboration." },
              { emoji: "🏆", title: "Gamification", desc: "XP system, leaderboards, streaks, missions, achievement badges, and a spin-the-wheel bonus game." },
              { emoji: "💰", title: "Wallet", desc: "Track earnings, fines, bonuses, and payouts. Transparent financial management for every intern." },
              { emoji: "🤖", title: "AI Copilot", desc: "Built-in AI assistant to help with tasks, answer questions, and provide personalized study guidance." },
              { emoji: "📈", title: "Performance", desc: "Detailed analytics on your progress, promotion readiness score, and improvement suggestions." },
            ].map(f => (
              <div key={f.title} style={{
                background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
                padding: "24px 20px", textAlign: "left", transition: "all 0.3s",
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.emoji}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 12 }}>
            How It <span style={{ background: "linear-gradient(135deg, #1E88E5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Works</span>
          </h2>
          <p style={{ color: "#8892A4", marginBottom: 48, fontSize: 15 }}>Four simple steps to transform your career trajectory.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
            {[
              { n: "1", t: "Apply", d: "Submit your application and complete the onboarding process to join the cohort.", c: "#1E88E5" },
              { n: "2", t: "Learn", d: "Attend classes, complete courses, and engage with mentors through the platform.", c: "#FFC107" },
              { n: "3", t: "Perform", d: "Complete daily tasks, build projects, and contribute to real client deliverables.", c: "#66BB6A" },
              { n: "4", t: "Get Rewarded", d: "Earn XP, climb ranks, receive payouts, and graduate with a strong portfolio.", c: "#AB47BC" },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: `linear-gradient(135deg, ${s.c}, ${s.c}cc)`, fontSize: 24, fontWeight: 800,
                  fontFamily: "'Space Grotesk', sans-serif", boxShadow: `0 8px 24px ${s.c}44`,
                }}>{s.n}</div>
                <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>{s.t}</h4>
                <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 48 }}>
            What Interns <span style={{ background: "linear-gradient(135deg, #1E88E5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Say</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { name: "Adaeze Okonkwo", role: "Senior Intern · Lagos", quote: "CIOS transformed my internship experience. The gamification kept me motivated, and I built a real portfolio that got me freelance clients!", i: "AO", g: "linear-gradient(135deg, #1E88E5, #AB47BC)", stars: 5 },
              { name: "Chukwuemeka Obi", role: "Team Lead · Abuja", quote: "The platform's structure and accountability system helped me develop leadership skills I never knew I had. Now I lead a team of 8!", i: "CO", g: "linear-gradient(135deg, #FFC107, #FF7043)", stars: 5 },
              { name: "Folake Nwosu", role: "Top Performer · Ibadan", quote: "From zero experience to building websites in 3 months. The AI Copilot and community support made all the difference.", i: "FN", g: "linear-gradient(135deg, #66BB6A, #1E88E5)", stars: 5 },
              { name: "Tunde Bakare", role: "AI Engineer Track · Port Harcourt", quote: "The fines kept me honest, the rewards kept me moving. I shipped 4 production AI projects before I even graduated.", i: "TB", g: "linear-gradient(135deg, #26C6DA, #1E88E5)", stars: 5 },
              { name: "Ngozi Eze", role: "Department Lead · Enugu", quote: "Mentorship + real money rewards = no other internship comes close. Already hired 3 of my juniors at my agency.", i: "NE", g: "linear-gradient(135deg, #AB47BC, #EF5350)", stars: 5 },
              { name: "Samuel Adeyemi", role: "Marketing Intern · Accra", quote: "I used the wallet payouts to fund my own micro-business while still in the program. CIOS doesn't just train — it pays.", i: "SA", g: "linear-gradient(135deg, #FF7043, #FFC107)", stars: 5 },
            ].map(t => (
              <div key={t.name} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 28, textAlign: "left", position: "relative" }}>
                <span title="Verified intern" style={{ position: "absolute", top: 18, right: 18, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "rgba(38,198,218,0.15)", color: "#26C6DA" }}>✓ Verified</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.g, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700 }}>{t.i}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#1E88E5", fontWeight: 600 }}>{t.role}</div>
                  </div>
                </div>
                <div style={{ color: "#FFC107", letterSpacing: 2, fontSize: 13, marginBottom: 10 }}>{"★".repeat(t.stars)}<span style={{ color: "rgba(255,255,255,0.15)" }}>{"★".repeat(5 - t.stars)}</span></div>
                <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>

          {/* Trusted by partners */}
          <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5A6478", textTransform: "uppercase", letterSpacing: 2, marginBottom: 22 }}>Trusted by partners & employers</div>
            <div style={{ display: "flex", gap: 28, alignItems: "center", justifyContent: "center", flexWrap: "wrap", opacity: 0.55 }}>
              {[
                { name: "COSPRONOS Media", g: "linear-gradient(135deg,#1E88E5,#AB47BC)" },
                { name: "Corespec Engineering", g: "linear-gradient(135deg,#FFC107,#FF7043)" },
                { name: "Lagos Tech Hub", g: "linear-gradient(135deg,#66BB6A,#1E88E5)" },
                { name: "AfriTalent", g: "linear-gradient(135deg,#26C6DA,#1E88E5)" },
                { name: "Naija Devs", g: "linear-gradient(135deg,#AB47BC,#EF5350)" },
                { name: "RecruitNG", g: "linear-gradient(135deg,#FF7043,#FFC107)" },
              ].map(p => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: p.g, display: "inline-block" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#B0BEC5", letterSpacing: 0.3 }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING — now uses shared component with regional detection */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <PricingSection condensed />
      </div>

      {/* FAQ */}
      <section id="faq" style={{ padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 48 }}>
            Frequently Asked <span style={{ background: "linear-gradient(135deg, #1E88E5, #FFC107)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Questions</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
            {[
              { q: "What is the CIOS Internship Program?", a: "CIOS is a 6-month AI-powered internship program by COSPRONOS Media × Corespec Engineering. You learn digital skills, complete real projects, earn rewards, and build your career." },
              { q: "Is the program free?", a: "The basic program is free. Premium features like AI Copilot, advanced courses, and priority support are available with the Premium plan at ₦5,000/month." },
              { q: "What skills will I learn?", a: "UI/UX Design, Web Development, Content Marketing, Video Editing, AI Tools, Cybersecurity, Graphic Design, and more." },
              { q: "How does the reward system work?", a: "You earn XP for completing tasks, attending classes, and community participation. XP translates to levels, badges, and real monetary rewards." },
              { q: "What happens if I miss a class?", a: "Missed classes result in a fine (₦500). Pay through the platform to regain access. Attendance affects your performance score." },
              { q: "Can I get promoted during the internship?", a: "Yes! The career ladder goes from New Intern → Active → Senior → Team Lead → Department Lead → Trainer → Manager. Based on performance and leadership." },
            ].map(f => (
              <details key={f.q} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
                <summary style={{ padding: "16px 20px", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {f.q}
                  <span style={{ color: "#607D8B", fontSize: 20, marginLeft: 16 }}>+</span>
                </summary>
                <div style={{ padding: "0 20px 16px", fontSize: 14, color: "#8892A4", lineHeight: 1.7, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16 }}>
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative", zIndex: 1 }}>
        <img src={LOGO} alt="CIOS" width={70} height={70} style={{ margin: "0 auto 24px", borderRadius: "50%", display: "block", filter: "drop-shadow(0 8px 24px rgba(30,136,229,0.4))" }} />
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 16 }}>Ready to Start Your Journey?</h2>
        <p style={{ color: "#8892A4", marginBottom: 32, maxWidth: 500, margin: "0 auto 32px", fontSize: 15, lineHeight: 1.7 }}>Join hundreds of interns building real skills with COSPRONOS Media × Corespec Engineering Ltd.</p>
        <Link href="/sign-up" style={{
          display: "inline-flex", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: "none",
          background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
          boxShadow: "0 8px 30px rgba(30,136,229,0.35)",
        }}>Apply Now →</Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "24px 32px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={LOGO} alt="CIOS" width={28} height={28} style={{ borderRadius: "50%" }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "#8892A4" }}>CIOS Platform</span>
          </div>
          <p style={{ fontSize: 12, color: "#4A5568" }}>© 2026 COSPRONOS Media × Corespec Engineering Ltd. All rights reserved.</p>
        </div>
      </footer>

      {/* Floating Mascot Button */}
      <Link href="/sign-up" style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 50,
        width: 56, height: 56, borderRadius: "50%", overflow: "hidden",
        boxShadow: "0 8px 32px rgba(30,136,229,0.4)", border: "2px solid rgba(30,136,229,0.3)",
        animation: "float 3s ease-in-out infinite", textDecoration: "none",
      }}>
        <img src={LOGO} alt="AI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Link>
    </div>
  );
}
