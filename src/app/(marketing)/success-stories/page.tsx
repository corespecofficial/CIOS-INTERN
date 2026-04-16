import type { Metadata } from "next";
import Link from "next/link";
import { getLandingTestimonials } from "@/app/actions/landing-content";

export const metadata: Metadata = {
  title: "Success Stories · CIOS",
  description: "Real stories from CIOS interns who transformed their careers through the program.",
};

export const dynamic = "force-dynamic";

const FEATURED_STORIES = [
  {
    name: "Adaeze Okonkwo",
    track: "UI/UX Design Track",
    location: "Lagos, Nigeria",
    initials: "AO",
    gradient: "linear-gradient(135deg, #1E88E5, #AB47BC)",
    outcome: "Freelance Designer → Product Lead",
    salary: "₦450K/month",
    story: "I joined CIOS with zero professional design experience — just a passion for creating beautiful things. The structured 6-month program forced me to build a real portfolio, not just watch tutorials. By month 3, I had 3 freelance clients. By month 6, I was offered a Product Lead role at a Lagos fintech. The gamification kept me honest on days I wanted to quit.",
    highlights: ["Built 12 real client projects", "Won Top Designer badge (3x)", "Hired before graduation"],
  },
  {
    name: "Chukwuemeka Obi",
    track: "AI Engineering Track",
    location: "Abuja, Nigeria",
    initials: "CO",
    gradient: "linear-gradient(135deg, #FFC107, #FF7043)",
    outcome: "Student → Team Lead → CTO",
    salary: "Remote: $2,800/month",
    story: "CIOS didn't just teach me to code AI — it taught me to lead. I started as a confused CS student. After the leadership track, I was managing a team of 8 interns. The accountability system — yes, even the fines — built discipline I carry into every project. Today I run the tech stack at a US-based startup remotely from Abuja.",
    highlights: ["Led team of 8 interns", "4 production AI apps shipped", "Remote CTO role secured"],
  },
  {
    name: "Folake Nwosu",
    track: "Digital Marketing Track",
    location: "Ibadan, Nigeria",
    initials: "FN",
    gradient: "linear-gradient(135deg, #66BB6A, #1E88E5)",
    outcome: "Zero Experience → Agency Owner",
    salary: "₦800K+ monthly revenue",
    story: "I came to CIOS having failed three job interviews and feeling completely hopeless about my career. The AI tools — especially the CV builder and Interview Prep — transformed how I presented myself. But more than that, I learned actual digital marketing skills through real campaigns. Six months later, I launched my own agency and my first client was a CIOS recruiter partner.",
    highlights: ["Launched agency with 3 staff", "₦800K+ first-month revenue", "CIOS recruiter partner client"],
  },
  {
    name: "Tunde Bakare",
    track: "AI Engineering Track",
    location: "Port Harcourt, Nigeria",
    initials: "TB",
    gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
    outcome: "Graduate → AI Engineer at Shell Nigeria",
    salary: "₦1.2M/month",
    story: "Shell Nigeria wasn't on my radar. But my CIOS profile showed verified AI projects, a track record of consistent performance, and a leaderboard ranking in the top 5% globally. The recruiter portal worked — someone found me. The structured portfolio of 4 production apps made the interview process straightforward. CIOS didn't just train me; it made me findable.",
    highlights: ["Top 5% global leaderboard", "4 production apps in portfolio", "Hired via CIOS recruiter portal"],
  },
  {
    name: "Ngozi Eze",
    track: "Business Development Track",
    location: "Enugu, Nigeria",
    initials: "NE",
    gradient: "linear-gradient(135deg, #AB47BC, #EF5350)",
    outcome: "Intern → Department Lead → Agency Director",
    salary: "₦600K/month + equity",
    story: "I originally joined to improve my business skills. I ended up discovering I had a talent for leadership. After the CIOS team lead program, I was managing my entire department. The recruiter I was placed with saw my performance metrics directly on the platform — no need to explain or sell myself. The data spoke for itself. I'm now a Director with equity at 24.",
    highlights: ["Managed 12-person department", "Placed by in-platform recruiting", "Director + equity at 24 years old"],
  },
  {
    name: "Samuel Adeyemi",
    track: "Content Creation Track",
    location: "Accra, Ghana",
    initials: "SA",
    gradient: "linear-gradient(135deg, #FF7043, #FFC107)",
    outcome: "Content Creator → Media Entrepreneur",
    salary: "₦500K/month + platform earnings",
    story: "I'm the only person in my family who went to university, and I felt the pressure to make it count. CIOS gave me a structured path where my effort directly turned into money — not just skills certificates. The wallet payouts were real. I used them to fund equipment. By graduation, I had a YouTube channel with 50K subscribers built on CIOS projects, and a media consultancy with 4 clients.",
    highlights: ["50K YouTube subscribers built during program", "Used wallet payouts to fund equipment", "Launched media consultancy at graduation"],
  },
];

export default async function SuccessStoriesPage() {
  const testimonials = await getLandingTestimonials();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ display: "inline-block", padding: "4px 14px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 16 }}>REAL PEOPLE. REAL RESULTS.</span>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, color: "#E8EDF5", margin: "0 0 16px", lineHeight: 1.1 }}>
          Stories that prove the program works
        </h1>
        <p style={{ fontSize: 17, color: "#8892A4", maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.6 }}>
          From zero experience to real employment, every story here started with a decision to join CIOS.
        </p>
        {/* Stats bar */}
        <div style={{ display: "inline-flex", gap: 32, padding: "16px 28px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap", justifyContent: "center" }}>
          {[["500+", "Graduates"], ["87%", "Placement rate"], ["₦450K+", "Avg. first salary"], ["12", "Countries"]].map(([num, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg, #1E88E5, #66BB6A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{num}</div>
              <div style={{ fontSize: 11, color: "#5A6478", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Stories */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24, marginBottom: 64 }}>
        {FEATURED_STORIES.map((s) => (
          <div key={s.name} style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            {/* Card top band */}
            <div style={{ height: 5, background: s.gradient }} />
            <div style={{ padding: 24 }}>
              {/* Avatar + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>
                  {s.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#E8EDF5" }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#8892A4" }}>{s.track} · {s.location}</div>
                </div>
              </div>

              {/* Outcome badge */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(102,187,106,0.15)", color: "#66BB6A" }}>{s.outcome}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(30,136,229,0.15)", color: "#1E88E5" }}>{s.salary}</span>
              </div>

              {/* Story */}
              <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: "0 0 16px" }}>&ldquo;{s.story}&rdquo;</p>

              {/* Highlights */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.highlights.map((h) => (
                  <div key={h} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#B0BEC5" }}>
                    <span style={{ color: "#66BB6A", flexShrink: 0 }}>✓</span>
                    {h}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic testimonials from DB */}
      {testimonials.length > 0 && (
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", textAlign: "center", marginBottom: 32 }}>
            What interns say
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {testimonials.map((t) => (
              <div key={t.id} style={{ padding: 24, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {Array.from({ length: t.stars }).map((_, i) => <span key={i} style={{ color: "#FFC107", fontSize: 14 }}>★</span>)}
                </div>
                <p style={{ fontSize: 13, color: "#B0BEC5", lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {t.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatar_url} alt={t.name} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{t.initials}</div>
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#5A6478" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "48px 24px", borderRadius: 20, background: "linear-gradient(135deg, rgba(30,136,229,0.12), rgba(102,187,106,0.08))", border: "1px solid rgba(30,136,229,0.2)" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", marginBottom: 12 }}>Your story starts here</h2>
        <p style={{ color: "#8892A4", fontSize: 15, marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>
          Every person on this page was once exactly where you are. The only difference is they decided to start.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{ padding: "13px 28px", borderRadius: 12, background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 4px 20px rgba(30,136,229,0.4)" }}>
            Join the Program →
          </Link>
          <Link href="/demo" style={{ padding: "13px 28px", borderRadius: 12, background: "rgba(255,255,255,0.06)", color: "#E8EDF5", fontWeight: 700, fontSize: 15, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>
            Book a Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
