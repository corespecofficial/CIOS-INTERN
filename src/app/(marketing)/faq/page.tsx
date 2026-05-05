import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ · CIOS",
  description: "Answers to the most common questions about the CIOS Internship Platform — for interns, recruiters, mentors, and companies.",
};

const CATEGORIES = [
  {
    label: "For Interns",
    color: "#1E88E5",
    icon: "🎓",
    faqs: [
      { q: "What is the CIOS Internship Program?", a: "CIOS is a structured 6-month AI-powered internship program by COSPRONOS Media × Corespec Engineering. You attend live classes, complete real projects, earn XP rewards, and graduate with a verified performance record that employers trust." },
      { q: "Is the program free to join?", a: "The core program is free. Premium features (AI Copilot, priority support, advanced courses) are available on the Premium plan. No hidden fees — you can complete the entire 6-month program at zero cost." },
      { q: "What skills can I learn?", a: "We cover all major digital tracks: AI & Automation, Web & Mobile Development, UI/UX Design, Digital Marketing, Data Analytics, and Business & Entrepreneurship — each with 12+ skills per track including AI integration." },
      { q: "How do I earn money as an intern?", a: "You earn XP for completing tasks, attending classes, and participating in the community. XP translates into levels, badges, and real monetary rewards paid to your CIOS wallet. Top performers also earn bonuses and placement fees when hired." },
      { q: "What happens if I miss a class?", a: "Missing a class results in a fine (₦500), logged to your compliance record. You can appeal within 48 hours with evidence. Attendance directly impacts your performance score and promotion eligibility — so consistency matters." },
      { q: "Can I get promoted?", a: "Yes. The career ladder is: New Intern → Active Intern → Senior Intern → Team Lead → Department Lead → Trainer → Manager → Admin → Executive. Promotions are based on XP, task quality, peer reviews, and time in role." },
      { q: "How long does the program last?", a: "The standard program is 6 months. High performers can fast-track to Team Lead within 3 months. The program is fully remote and runs in cohorts with clear start/end dates." },
      { q: "Can I join from outside Nigeria?", a: "Absolutely. We have interns in 12+ countries including Ghana, Kenya, South Africa, Uganda, and more. The platform is fully remote, multi-language (English, French, Arabic, Pidgin), and accessible worldwide." },
    ],
  },
  {
    label: "For Recruiters & Companies",
    color: "#26C6DA",
    icon: "💼",
    faqs: [
      { q: "How do I hire from CIOS?", a: "Register as a recruiter or company at /recruiters. After a quick 24–48 hour verification, you can post jobs, browse the talent pool, filter by track and score, and reach out to candidates directly through the platform." },
      { q: "How much does it cost to hire?", a: "Posting jobs is free. We charge a placement fee (5% of first month salary or a flat fee, whichever applies) when a hire is confirmed. No subscription needed to browse talent." },
      { q: "How are intern profiles verified?", a: "Every intern profile shows their live CIOS performance score — a composite of XP earned, task completion rate, class attendance, peer review scores, and mentor ratings. This is real data, not self-reported." },
      { q: "How quickly can I find a candidate?", a: "Most companies find and shortlist candidates within 48 hours of posting. Our average time to hire is 14 days — versus 45+ days on traditional platforms." },
      { q: "Can I post unpaid internships?", a: "No. CIOS enforces a fair pay policy. All opportunities posted must include clear compensation (salary, stipend, or performance-based). This protects our interns and ensures quality partnerships." },
    ],
  },
  {
    label: "For Mentors",
    color: "#AB47BC",
    icon: "🎯",
    faqs: [
      { q: "How do I become a CIOS mentor?", a: "Apply via /contact?category=mentor. You'll need 3+ years of professional experience in a relevant field. After a profile and expertise review, our team approves your mentor role within 3–5 days." },
      { q: "Do mentors get paid?", a: "Yes. You set your own session rate. Earnings go directly to your CIOS wallet after each confirmed session. You can request payout to your bank account at any time." },
      { q: "How many mentees can I take on?", a: "You control your availability. Set a max mentee count in your mentor profile — from 1 to unlimited. You can pause accepting new mentees at any time." },
      { q: "What does a mentor session look like?", a: "Sessions are 1-on-1 video calls scheduled through the platform. You document session notes and action items after each call. Mentees rate sessions — top-rated mentors get featured on the platform." },
    ],
  },
  {
    label: "Platform & Technical",
    color: "#FFC107",
    icon: "⚙️",
    faqs: [
      { q: "What devices does CIOS support?", a: "CIOS is a web-first platform that works on any modern browser (Chrome, Firefox, Safari, Edge). A mobile-optimized PWA is available — install it from your browser for an app-like experience." },
      { q: "Is my data safe?", a: "Yes. We use Supabase (PostgreSQL) for data storage, Clerk for authentication, and Cloudinary for media. All data is encrypted in transit and at rest. We comply with NDPR (Nigeria Data Protection Regulation) and GDPR principles." },
      { q: "How does the certificate verification work?", a: "Every CIOS certificate has a unique ID (format: CIOS-XXX-XXXXXX). Anyone — including employers — can verify a certificate at /verify by entering the ID. The system confirms the holder, course, and issue date instantly." },
      { q: "Can I use CIOS in my language?", a: "Currently we support English, French, Arabic, and Nigerian Pidgin. More languages are coming. Switch languages via the language selector in the platform settings." },
      { q: "How do I report a bug or get support?", a: "Use the in-app support chat or email support@cospronos.com. Critical bugs are typically addressed within 24 hours. Feature requests can be submitted through the feedback form in your settings." },
    ],
  },
  {
    label: "Pricing & Payments",
    color: "#66BB6A",
    icon: "💰",
    faqs: [
      { q: "What does the free plan include?", a: "The free plan includes: full dashboard access, all core courses, task system, community, leaderboard, basic AI tools, certificate generation, and wallet. Premium adds advanced AI tools, priority support, and exclusive courses." },
      { q: "How are wallet payouts processed?", a: "Payouts are processed to Nigerian bank accounts (and soon international accounts via USD). You can request a payout any time your wallet balance exceeds the minimum threshold (₦1,000)." },
      { q: "What currencies does CIOS support?", a: "The wallet operates in NGN (Nigerian Naira) for domestic transactions. The Marketplace supports both NGN and USD pricing. Recruiter placement fees can be invoiced in USD." },
      { q: "Is there a refund policy for fines?", a: "Fines can be appealed within 48 hours of issue. If an appeal is approved by an admin, the fine is reversed and refunded to your wallet. All fine decisions are logged and auditable." },
    ],
  },
];

export default function FAQPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px 80px" }}>

      {/* Hero */}
      <section style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{
          display: "inline-block", padding: "4px 14px", background: "rgba(255,193,7,0.12)",
          color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 16,
        }}>
          FREQUENTLY ASKED QUESTIONS
        </span>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "#E8EDF5",
          margin: "0 0 16px", lineHeight: 1.1,
        }}>
          Everything you need to know
        </h1>
        <p style={{ fontSize: 17, color: "#8892A4", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.7 }}>
          Can&apos;t find your answer here? Reach us at{" "}
          <a href="mailto:support@cospronos.com" style={{ color: "#1E88E5", textDecoration: "none" }}>
            support@cospronos.com
          </a>
        </p>

        {/* Quick nav pills */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {CATEGORIES.map(c => (
            <a key={c.label} href={`#${c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 99, textDecoration: "none",
                background: `${c.color}14`, border: `1px solid ${c.color}30`,
                color: c.color, fontSize: 12, fontWeight: 700,
              }}>
              <span>{c.icon}</span>{c.label}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ Categories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {CATEGORIES.map(cat => (
          <section key={cat.label} id={cat.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: `${cat.color}20`, border: `1px solid ${cat.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>{cat.icon}</div>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800,
                color: "#E8EDF5", margin: 0,
              }}>{cat.label}</h2>
            </div>

            <div style={{
              borderRadius: 18, overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              {cat.faqs.map((faq, i) => (
                <details key={i} style={{
                  background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                  borderBottom: i < cat.faqs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <summary style={{
                    padding: "18px 24px", cursor: "pointer",
                    fontWeight: 700, fontSize: 14, color: "#E8EDF5",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    listStyle: "none", userSelect: "none",
                  }}>
                    {faq.q}
                    <span style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginLeft: 16,
                      background: `${cat.color}20`, color: cat.color,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700, lineHeight: 1,
                    }}>+</span>
                  </summary>
                  <div style={{
                    padding: "0 24px 18px 24px",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    paddingTop: 14,
                    fontSize: 14, color: "#8892A4", lineHeight: 1.8,
                  }}>
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section style={{
        marginTop: 64, textAlign: "center", padding: "48px 32px", borderRadius: 20,
        background: "linear-gradient(135deg, rgba(30,136,229,0.1), rgba(171,71,188,0.06))",
        border: "1px solid rgba(30,136,229,0.2)",
      }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px" }}>
          Still have questions?
        </h2>
        <p style={{ color: "#8892A4", fontSize: 15, maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
          Our team responds within 24 hours. Or book a live demo and we&apos;ll walk you through everything.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/contact" style={{ padding: "13px 28px", borderRadius: 12, background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14 }}>
            Contact Us →
          </Link>
          <Link href="/demo" style={{ padding: "13px 24px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "#E8EDF5", textDecoration: "none", fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.1)" }}>
            Book a Demo
          </Link>
        </div>
      </section>
    </div>
  );
}
