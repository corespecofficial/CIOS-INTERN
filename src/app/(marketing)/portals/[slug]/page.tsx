import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/* ─── Portal definitions ──────────────────────────────────────── */

const PORTALS = {
  "creator-admin": {
    title: "Creator Admin",
    badge: "SUPER ADMIN PORTAL",
    badgeColor: "#FFC107",
    icon: "👑",
    gradient: "linear-gradient(135deg, #FFC107, #FF7043)",
    tagline: "Total control over everything",
    desc: "The Creator Admin portal gives the program owner complete visibility and control — cohort management, financial oversight, compliance enforcement, announcements, and platform configuration — all from one dashboard.",
    audience: "For program founders, CEO, and platform owners only.",
    features: [
      { icon: "👥", title: "User Management", desc: "Create, suspend, promote, or delete any user. Assign roles, reset passwords, view full activity logs." },
      { icon: "💸", title: "Financial Control", desc: "View all wallet balances, trigger payouts, manage fines, set reward amounts, and export financial reports." },
      { icon: "📊", title: "Live Analytics", desc: "Real-time cohort performance, engagement scores, dropout risk, and platform-wide KPIs on one dashboard." },
      { icon: "📣", title: "Announcements", desc: "Broadcast platform-wide or targeted announcements. Schedule, pin, or set announcements as mandatory." },
      { icon: "🛡️", title: "Compliance Engine", desc: "Manage fine policies, issue fines, handle appeals, and track repeat offenders automatically." },
      { icon: "⚡", title: "XP & Gamification Rules", desc: "Configure XP values, badge criteria, challenge rewards, leaderboard weights, and level thresholds." },
      { icon: "🤖", title: "AI Settings", desc: "Control AI feature access per role, set model preferences, manage usage limits and API keys." },
      { icon: "🌐", title: "Landing Page Control", desc: "Update homepage video, testimonials, stats, and screenshots without touching code." },
      { icon: "🔒", title: "Security Center", desc: "Monitor suspicious activity, view login logs, manage two-factor policies, and run security audits." },
    ],
    stats: [
      { v: "17+", l: "admin modules" },
      { v: "100%", l: "data visibility" },
      { v: "Real-time", l: "analytics" },
      { v: "1", l: "owner only" },
    ],
    howToAccess: [
      "Sign up and be verified as the platform owner",
      "Your account is assigned the super_admin role",
      "Access the full admin suite via the sidebar under ADMIN",
      "Set up your first cohort and invite interns",
    ],
    cta: { label: "Request Creator Access", href: "/contact?category=creator" },
    otherPortals: ["mentor-portal", "company-portal", "recruiter-portal", "marketplace"],
  },

  "mentor-portal": {
    title: "Mentor Portal",
    badge: "MENTOR PORTAL",
    badgeColor: "#AB47BC",
    icon: "🎓",
    gradient: "linear-gradient(135deg, #AB47BC, #1E88E5)",
    tagline: "Guide the next generation of African talent",
    desc: "The Mentor Portal gives experienced professionals a structured way to invest in interns — through scheduled sessions, session notes, feedback, and measurable impact. Track your mentees, get paid for your time, and build your mentorship reputation.",
    audience: "For professionals with 3+ years experience who want to mentor the next generation.",
    features: [
      { icon: "📅", title: "Session Scheduling", desc: "Book and manage 1-on-1 sessions with mentees. Calendar integration, reminders, and rescheduling built in." },
      { icon: "📝", title: "Session Notes", desc: "Document key takeaways, action items, and progress notes after each session. Shared with mentee optionally." },
      { icon: "👥", title: "Mentee Management", desc: "View all your active mentees, their performance scores, tasks, and weekly progress in one place." },
      { icon: "⭐", title: "Feedback & Ratings", desc: "Give structured feedback after sessions. Mentees rate your sessions — build your mentor reputation." },
      { icon: "💰", title: "Session Earnings", desc: "Set your session rate. Earn per session via the platform wallet. Track earnings and request payouts." },
      { icon: "🏆", title: "Mentor Leaderboard", desc: "Compete on the mentor leaderboard based on mentee outcomes, session consistency, and ratings." },
      { icon: "📊", title: "Impact Dashboard", desc: "See your cumulative impact: total sessions, mentee placement rate, average score improvement." },
      { icon: "🎖️", title: "Mentor Badges", desc: "Earn verified mentor badges — Rookie, Expert, Master — displayed on your public mentor profile." },
    ],
    stats: [
      { v: "1-on-1", l: "sessions" },
      { v: "Paid", l: "per session" },
      { v: "Verified", l: "badge system" },
      { v: "Real impact", l: "tracked" },
    ],
    howToAccess: [
      "Apply as a mentor via the contact form or sign-up page",
      "Complete the mentor verification (profile + expertise review)",
      "Admin approves and assigns mentor role to your account",
      "Set your availability and start accepting mentees",
    ],
    cta: { label: "Apply as a Mentor", href: "/contact?category=mentor" },
    otherPortals: ["creator-admin", "company-portal", "recruiter-portal", "marketplace"],
  },

  "company-portal": {
    title: "Company Portal",
    badge: "COMPANY PORTAL",
    badgeColor: "#26C6DA",
    icon: "🏢",
    gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
    tagline: "Build your talent pipeline before you even hire",
    desc: "The Company Portal gives businesses direct access to a pipeline of trained, verified, performance-ranked digital talent. Post job openings, browse intern profiles, schedule interviews, and hire with confidence — all from one dashboard.",
    audience: "For companies, startups, and businesses looking to hire trained digital talent.",
    features: [
      { icon: "💼", title: "Job Posting", desc: "Post job and internship opportunities directly on the CIOS platform. Reach active, qualified candidates immediately." },
      { icon: "🔍", title: "Talent Search", desc: "Filter interns by track, skills, performance score, location, and availability. Build shortlists instantly." },
      { icon: "📊", title: "Verified Performance Data", desc: "Every intern profile shows their actual XP score, task completion rate, and peer review scores — not just a CV." },
      { icon: "📅", title: "Interview Scheduling", desc: "Schedule interviews directly within the platform. Automated reminders, reschedule links, and interview notes." },
      { icon: "📩", title: "Direct Messaging", desc: "Message candidates directly through the platform. No email middleman. Track all conversations in one place." },
      { icon: "🤝", title: "Placement Tracking", desc: "Track which candidates you've hired through CIOS. Manage onboarding milestones and probation feedback." },
      { icon: "🏆", title: "Top Employer Badge", desc: "Companies that hire consistently earn a Top Employer badge — visible to all interns on the talent directory." },
      { icon: "📣", title: "Company Profile", desc: "Public company profile with culture tags, open roles, and team photos. Interns research you before applying." },
    ],
    stats: [
      { v: "500+", l: "verified candidates" },
      { v: "87%", l: "offer acceptance rate" },
      { v: "14 days", l: "avg time to hire" },
      { v: "Free", l: "to post jobs" },
    ],
    howToAccess: [
      "Register your company via the Recruiter sign-up page",
      "Submit company verification (website, CAC number, contact)",
      "Admin approves your company account within 48 hours",
      "Post your first job and start browsing talent",
    ],
    cta: { label: "Register Your Company", href: "/recruiters" },
    otherPortals: ["creator-admin", "mentor-portal", "recruiter-portal", "marketplace"],
  },

  "recruiter-portal": {
    title: "Recruiter Portal",
    badge: "RECRUITER PORTAL",
    badgeColor: "#1E88E5",
    icon: "🔍",
    gradient: "linear-gradient(135deg, #1E88E5, #26C6DA)",
    tagline: "Find the right talent before the market does",
    desc: "The Recruiter Portal gives individual recruiters and staffing agencies a powerful suite to discover, evaluate, and place CIOS-trained talent. Set talent alerts, manage a pipeline, and earn placement fees — all in one place.",
    audience: "For individual recruiters, headhunters, and staffing agencies.",
    features: [
      { icon: "🔔", title: "Talent Alerts", desc: "Set automated alerts for interns matching your criteria — track, minimum score, skills. Get notified instantly." },
      { icon: "📋", title: "Candidate Pipeline", desc: "Drag-and-drop Kanban board to manage candidates from shortlist → interviewed → placed. Full pipeline view." },
      { icon: "🎯", title: "Advanced Filtering", desc: "Filter by 15+ criteria: track, score, skills, location, availability, graduation date, and more." },
      { icon: "📊", title: "Score-Based Ranking", desc: "Sort talent by CIOS performance score — a composite of XP, task quality, peer reviews, and mentor ratings." },
      { icon: "📄", title: "Profile & CV Export", desc: "Download full intern profiles and auto-generated CVs in PDF. Share with clients in one click." },
      { icon: "💬", title: "Candidate Messaging", desc: "Reach out to candidates directly through the platform. Track response rates and message history." },
      { icon: "💰", title: "Placement Fee Tracking", desc: "Track successful placements, calculate fees, and receive invoices automatically through the platform." },
      { icon: "🏅", title: "Verified Placements Badge", desc: "Build a placement track record on your public recruiter profile. Top recruiters earn a Verified Placer badge." },
    ],
    stats: [
      { v: "500+", l: "active candidates" },
      { v: "12", l: "countries" },
      { v: "Score-ranked", l: "profiles" },
      { v: "5%", l: "placement fee" },
    ],
    howToAccess: [
      "Apply as a recruiter on the sign-up page",
      "Submit your recruiter verification (LinkedIn, agency info)",
      "Super Admin approves your account within 24–48 hours",
      "Set your first talent alert and start browsing profiles",
    ],
    cta: { label: "Apply as a Recruiter", href: "/recruiters" },
    otherPortals: ["creator-admin", "mentor-portal", "company-portal", "marketplace"],
  },

  "marketplace": {
    title: "Marketplace",
    badge: "DIGITAL MARKETPLACE",
    badgeColor: "#66BB6A",
    icon: "🛒",
    gradient: "linear-gradient(135deg, #66BB6A, #26C6DA)",
    tagline: "Buy and sell digital products inside the ecosystem",
    desc: "The CIOS Marketplace lets interns, graduates, and creators sell digital products — templates, courses, design assets, code snippets, and more — directly to each other and to visitors. Earn passive income while you learn.",
    audience: "For all CIOS interns, alumni, and external creators with digital products to sell.",
    features: [
      { icon: "📦", title: "Digital Product Listings", desc: "List templates, UI kits, code repos, Notion dashboards, mini-courses, and more. Upload files via Cloudinary." },
      { icon: "💳", title: "Instant Wallet Payouts", desc: "85% of every sale goes directly to your CIOS wallet. Request payout at any time to your bank account." },
      { icon: "⭐", title: "Product Reviews", desc: "Buyers leave verified reviews and ratings on your products. Build social proof and sales momentum." },
      { icon: "🔍", title: "Discovery & Search", desc: "Products are searchable by category, price, rating, and seller track. No account needed to browse." },
      { icon: "📊", title: "Seller Dashboard", desc: "Track views, sales, revenue, top products, and buyer demographics in your personal seller analytics." },
      { icon: "🏷️", title: "Flexible Pricing", desc: "Set your price in NGN or USD. Offer free lead magnets or premium bundles. Discount codes supported." },
      { icon: "🛡️", title: "Buyer Protection", desc: "All transactions are secured. Buyers get instant access to downloads after payment confirmation." },
      { icon: "🏆", title: "Top Seller Badge", desc: "Earn a verified Top Seller badge when you hit ₦100K in sales — displayed on your talent profile." },
    ],
    stats: [
      { v: "85%", l: "seller revenue share" },
      { v: "₦0", l: "listing fee" },
      { v: "Instant", l: "wallet payout" },
      { v: "NGN + USD", l: "currencies" },
    ],
    howToAccess: [
      "Sign in to your CIOS account (any role)",
      "Navigate to Marketplace in the sidebar",
      "Click 'Start Selling' and create your seller profile",
      "Upload your first product and go live instantly",
    ],
    cta: { label: "Start Selling Today", href: "/sign-up" },
    otherPortals: ["creator-admin", "mentor-portal", "company-portal", "recruiter-portal"],
  },

  /* ─── Coming-soon org-tier portals (Phase 2 rollout) ─────────────
     These are surfaced on the public landing now (see
     <OrgPortalsSection/>) but the actual portal routes are still
     admin-gated. Each entry has comingSoon: true so the page renders
     a "Coming soon" banner + waitlist CTA instead of a "go to portal"
     CTA. Once a portal opens up, flip the flag and update the cta. */

  "institution-portal": {
    title: "Institution Portal",
    badge: "FOR UNIVERSITIES",
    badgeColor: "#26A69A",
    icon: "🏛",
    gradient: "linear-gradient(135deg, #26A69A, #1E88E5)",
    tagline: "Bring your campus on board",
    desc: "Manage entire student cohorts, track placement outcomes, and connect your institution's pipeline directly into the CIOS network of recruiters, mentors, and challenge partners.",
    audience: "For accredited universities, polytechnics, and training institutes.",
    comingSoon: true,
    features: [
      { icon: "👥", title: "Bulk Student Onboarding", desc: "Import student rosters via CSV. Assign cohort tags, track per-cohort progress and engagement at scale." },
      { icon: "📊", title: "Placement Analytics", desc: "Real-time dashboard of who's been hired, where, and at what compensation level — broken down by program and cohort." },
      { icon: "🤝", title: "Recruiter Pipeline", desc: "Get your students in front of pre-vetted hiring partners. White-listed access to roles posted by Company Portal members." },
      { icon: "🎓", title: "Mentor Matching", desc: "Auto-match your students with industry mentors based on their declared track. Sessions are tracked centrally." },
      { icon: "🏆", title: "Inter-cohort Challenges", desc: "Run private challenges between cohorts within your institution, or join cross-institution leagues." },
      { icon: "📜", title: "Verified Credentials", desc: "Issue blockchain-anchored completion certificates that recruiters can verify on-platform with one click." },
    ],
    stats: [
      { v: "Bulk", l: "onboarding" },
      { v: "Real-time", l: "placement data" },
      { v: "Verified", l: "credentials" },
      { v: "Cohort", l: "leagues" },
    ],
    howToAccess: [
      "Register your interest via the contact form below",
      "We schedule a 30-min discovery call with your team",
      "We provision your institution-tier admin account",
      "You bulk-onboard students and go live with cohort tracking",
    ],
    cta: { label: "Register your institution", href: "/contact?category=institution" },
    otherPortals: ["company-portal", "government-portal", "partner-programme", "mentor-portal"],
  },

  "government-portal": {
    title: "Government Portal",
    badge: "FOR PUBLIC SECTOR",
    badgeColor: "#9C27B0",
    icon: "🏦",
    gradient: "linear-gradient(135deg, #9C27B0, #1E88E5)",
    tagline: "Move the needle on youth employment",
    desc: "Run state-level skills programs, track ROI on training spend, and tie cohort outcomes back to verified employment data — all from a single dashboard built for ministry-grade reporting.",
    audience: "For ministries of education, labour, ICT, and youth development at federal or state level.",
    comingSoon: true,
    features: [
      { icon: "📊", title: "KPI Dashboard", desc: "Cohort-level tracking of completion rates, placement rates, average salary uplift, and program ROI in one view." },
      { icon: "📑", title: "Compliance Reports", desc: "One-click export of audit-ready reports formatted for federal or state-level evaluation cycles." },
      { icon: "🆔", title: "Federated Identity", desc: "Optional integration with NIN / national-ID systems so cohort identity is verified and de-duplicated centrally." },
      { icon: "💸", title: "Stipend Disbursement", desc: "Pay stipends to qualifying participants directly through the platform wallet, with full disbursement audit trail." },
      { icon: "🌍", title: "Multi-region Cohorts", desc: "Run parallel cohorts across geopolitical zones with per-region performance benchmarks." },
      { icon: "🤝", title: "Public-Private Bridge", desc: "Pre-built bridges into the Company Portal so private-sector partners can hire from your trained pipeline." },
    ],
    stats: [
      { v: "Audit", l: "ready" },
      { v: "Multi", l: "region" },
      { v: "Verified", l: "identity" },
      { v: "ROI", l: "tracked" },
    ],
    howToAccess: [
      "Submit a partnership enquiry from your official ministry email",
      "We arrange a closed-door briefing with your program team",
      "We co-design the cohort model and reporting cadence",
      "Your portal is provisioned with a dedicated success manager",
    ],
    cta: { label: "Request a briefing", href: "/contact?category=government" },
    otherPortals: ["institution-portal", "company-portal", "partner-programme", "creator-admin"],
  },

  "partner-programme": {
    title: "Partner Programme",
    badge: "FOR PARTNERS",
    badgeColor: "#FFC107",
    icon: "🤝",
    gradient: "linear-gradient(135deg, #FFC107, #FF7043)",
    tagline: "Build joint programmes, share the upside",
    desc: "Co-host cohorts and events, syndicate content, and route your audience into a fully-managed learning platform — with revenue share on every placement and white-label deployments available for select partners.",
    audience: "For media partners, NGOs, accelerators, and tech communities.",
    comingSoon: true,
    features: [
      { icon: "💰", title: "Revenue Share", desc: "Earn a percentage of every placement made through students you refer. Tracked end-to-end with monthly payouts." },
      { icon: "🏷️", title: "White-label Option", desc: "Run CIOS under your own brand for select tiers — your domain, your colours, our engine." },
      { icon: "🎤", title: "Joint Cohorts", desc: "Co-host cohorts with shared branding, shared mentor pools, and shared marketing reach." },
      { icon: "📣", title: "Content Syndication", desc: "Republish CIOS lessons and challenges into your channels. Tracked attribution back to your account." },
      { icon: "🏆", title: "Co-branded Hackathons", desc: "Sponsor or co-host hackathons with shared judging and combined prize pools." },
      { icon: "🔌", title: "API Access", desc: "Programmatic access to enrolment, progress, and placement data for partners on the API tier." },
    ],
    stats: [
      { v: "Rev", l: "share" },
      { v: "White-label", l: "ready" },
      { v: "API", l: "access" },
      { v: "Co-host", l: "events" },
    ],
    howToAccess: [
      "Apply to the partner programme via the form below",
      "We review your audience fit + commercial alignment",
      "We agree commercial terms (rev-share or white-label)",
      "Your partner dashboard goes live with shared analytics",
    ],
    cta: { label: "Apply to be a partner", href: "/contact?category=partner" },
    otherPortals: ["institution-portal", "company-portal", "government-portal", "marketplace"],
  },
} as const;

type Slug = keyof typeof PORTALS;

const PORTAL_META: Record<string, { icon: string; title: string; gradient: string }> = {
  "creator-admin":      { icon: "👑", title: "Creator Admin",      gradient: "linear-gradient(135deg, #FFC107, #FF7043)" },
  "mentor-portal":      { icon: "🎓", title: "Mentor Portal",      gradient: "linear-gradient(135deg, #AB47BC, #1E88E5)" },
  "company-portal":     { icon: "🏢", title: "Company Portal",     gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)" },
  "recruiter-portal":   { icon: "🔍", title: "Recruiter Portal",   gradient: "linear-gradient(135deg, #1E88E5, #26C6DA)" },
  "marketplace":        { icon: "🛒", title: "Marketplace",        gradient: "linear-gradient(135deg, #66BB6A, #26C6DA)" },
  "institution-portal": { icon: "🏛", title: "Institution Portal", gradient: "linear-gradient(135deg, #26A69A, #1E88E5)" },
  "government-portal":  { icon: "🏦", title: "Government Portal",  gradient: "linear-gradient(135deg, #9C27B0, #1E88E5)" },
  "partner-programme":  { icon: "🤝", title: "Partner Programme",  gradient: "linear-gradient(135deg, #FFC107, #FF7043)" },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const portal = PORTALS[slug as Slug];
  if (!portal) return { title: "Portal Not Found · CIOS" };
  return { title: `${portal.title} · CIOS`, description: portal.desc };
}

export function generateStaticParams() {
  return Object.keys(PORTALS).map((slug) => ({ slug }));
}

export default async function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portal = PORTALS[slug as Slug];
  if (!portal) notFound();
  // `comingSoon` lives on a subset of entries; widen for safe access.
  const comingSoon = (portal as { comingSoon?: boolean }).comingSoon === true;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 48px" }}>

      {/* Coming-soon banner — only on Phase-2 org portals. Sits above
          the hero so it's the first thing a visitor sees. */}
      {comingSoon && (
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto 28px",
            padding: "14px 18px",
            background: "rgba(255,193,7,0.08)",
            border: "1px solid rgba(255,193,7,0.32)",
            borderRadius: 12,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            color: "#FFC107",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🚧</span>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 2 }}>Coming soon — register your interest</div>
            <span style={{ color: "#B0BEC5" }}>
              The {portal.title} is rolling out in the next phase. The actual portal isn&apos;t live to the public yet, but you can use the form below to get on the early-access list and we&apos;ll reach out the moment it opens up.
            </span>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{
          width: 100, height: 100, borderRadius: 28, margin: "0 auto 20px",
          background: portal.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 50, boxShadow: "0 20px 56px rgba(0,0,0,0.45)",
        }}>
          {portal.icon}
        </div>

        <span style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20, marginBottom: 16,
          background: `${portal.badgeColor}22`, color: portal.badgeColor,
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
        }}>{portal.badge}</span>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 800,
          color: "#E8EDF5", margin: "0 0 12px", lineHeight: 1.08,
        }}>
          {portal.title}
        </h1>

        <p style={{
          fontSize: 20, fontWeight: 700, marginBottom: 14,
          background: portal.gradient,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {portal.tagline}
        </p>

        <p style={{ fontSize: 16, color: "#8892A4", maxWidth: 620, margin: "0 auto 12px", lineHeight: 1.7 }}>
          {portal.desc}
        </p>

        <p style={{
          fontSize: 12, fontWeight: 700, color: portal.badgeColor,
          padding: "6px 16px", borderRadius: 99, display: "inline-block",
          background: `${portal.badgeColor}18`, marginBottom: 32,
          border: `1px solid ${portal.badgeColor}30`,
        }}>
          {portal.audience}
        </p>

        {/* Stats row */}
        <div style={{
          display: "flex", borderRadius: 18, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          flexWrap: "wrap", justifyContent: "center",
          maxWidth: 680, margin: "0 auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          {portal.stats.map((s, i) => (
            <div key={s.l} style={{
              padding: "20px 32px", textAlign: "center", flex: "1 1 120px",
              borderRight: i < portal.stats.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
            }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800,
                background: portal.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                lineHeight: 1.1,
              }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "#5A6478", fontWeight: 600, marginTop: 4, letterSpacing: 0.3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
          <Link href={portal.cta.href} style={{
            padding: "14px 32px", borderRadius: 12, fontWeight: 800, fontSize: 15,
            background: portal.gradient, color: "#fff", textDecoration: "none",
            boxShadow: "0 6px 28px rgba(0,0,0,0.3)",
          }}>
            {portal.cta.label} →
          </Link>
          <Link href="/demo" style={{
            padding: "14px 24px", borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: "rgba(255,255,255,0.05)", color: "#E8EDF5", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            Book a demo
          </Link>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ marginBottom: 64 }}>
        <Badge color={portal.badgeColor}>WHAT YOU GET</Badge>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", marginBottom: 24 }}>
          Everything inside the {portal.title}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {portal.features.map((f) => (
            <div key={f.title} style={{
              padding: 24, borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderTop: `3px solid ${portal.badgeColor}`,
              transition: "border-color 0.2s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>{f.title}</div>
              <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW TO ACCESS ── */}
      <section style={{ marginBottom: 64 }}>
        <Badge color={portal.badgeColor}>HOW TO GET ACCESS</Badge>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", marginBottom: 24 }}>
          Get started in 4 steps
        </h2>
        <div style={{
          borderRadius: 20, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}>
          {portal.howToAccess.map((step, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 20,
              padding: "22px 28px",
              borderBottom: i < portal.howToAccess.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: portal.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 900, fontSize: 18, color: "#fff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}>{i + 1}</div>
              <div style={{ fontSize: 15, color: "#C0CBD8", lineHeight: 1.6, fontWeight: 500 }}>{step}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BLOCK ── */}
      <section style={{
        textAlign: "center", padding: "52px 32px", borderRadius: 24, marginBottom: 64,
        background: `linear-gradient(135deg, ${portal.badgeColor}12, transparent)`,
        border: `1px solid ${portal.badgeColor}25`,
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>{portal.icon}</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px" }}>
          Ready to access the {portal.title}?
        </h2>
        <p style={{ color: "#8892A4", fontSize: 15, maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Join the CIOS ecosystem and get access to the right portal for your role.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={portal.cta.href} style={{
            padding: "14px 36px", borderRadius: 12, fontWeight: 800, fontSize: 15,
            background: portal.gradient, color: "#fff", textDecoration: "none",
            boxShadow: "0 6px 28px rgba(0,0,0,0.35)",
          }}>
            {portal.cta.label} →
          </Link>
          <Link href="/sign-in" style={{
            padding: "14px 24px", borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: "rgba(255,255,255,0.05)", color: "#E8EDF5", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* ── OTHER PORTALS ── */}
      <section style={{ textAlign: "center", paddingBottom: 8 }}>
        <Badge color={portal.badgeColor}>EXPLORE OTHER PORTALS</Badge>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16,
          justifyContent: "center",
        }}>
          {portal.otherPortals.map((s) => {
            const m = PORTAL_META[s];
            return (
              <Link key={s} href={`/portals/${s}`} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
                borderRadius: 14, background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)", textDecoration: "none",
                minWidth: 180, transition: "background 0.15s, border-color 0.15s",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: m.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                }}>{m.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#C0CBD8", lineHeight: 1.3, textAlign: "left" }}>{m.title}</div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 20, marginBottom: 10,
      background: `${color}18`, color, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    }}>
      {children}
    </div>
  );
}
