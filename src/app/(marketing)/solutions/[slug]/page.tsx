/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/* ─── Track definitions ─────────────────────────────────────────── */

const TRACKS = {
  "ai-machine-learning": {
    title: "AI & Machine Learning",
    badge: "ENGINEERING TRACK",
    badgeColor: "#1E88E5",
    icon: "🤖",
    gradient: "linear-gradient(135deg, #1E88E5, #AB47BC)",
    tagline: "Build real AI products used by real people",
    desc: "Go from zero AI experience to shipping production machine-learning projects in 6 months. You'll learn Python, data pipelines, model training, and deploying AI APIs — with real client projects along the way.",
    outcomes: [
      { icon: "💼", title: "AI/ML Engineer", salary: "₦800K–₦2M/month", where: "Fintech, health-tech, remote startups" },
      { icon: "🌍", title: "Remote Contractor", salary: "$2,000–$5,000/month", where: "US/EU tech companies" },
      { icon: "🚀", title: "AI Founder", salary: "Equity + revenue", where: "Launch your own AI product" },
    ],
    curriculum: [
      { week: "Month 1", title: "Python & Data Fundamentals", topics: ["Python syntax & data structures", "Pandas & NumPy", "Data cleaning pipelines", "Exploratory data analysis"] },
      { week: "Month 2", title: "Machine Learning Core", topics: ["Supervised & unsupervised learning", "Scikit-learn models", "Feature engineering", "Model evaluation & metrics"] },
      { week: "Month 3", title: "Deep Learning & NLP", topics: ["Neural networks & TensorFlow", "NLP with transformers", "Prompt engineering", "Fine-tuning LLMs"] },
      { week: "Month 4", title: "AI Products & APIs", topics: ["OpenAI & Anthropic APIs", "Building AI-powered apps", "LangChain & vector databases", "REST API development"] },
      { week: "Month 5", title: "Production & Deployment", topics: ["Docker & cloud deployment", "Model monitoring", "FastAPI backends", "Scalable ML pipelines"] },
      { week: "Month 6", title: "Capstone Projects", topics: ["Build 2 production AI apps", "Client-ready portfolio", "Technical interviews prep", "Job placement support"] },
    ],
    tools: ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "OpenAI API", "LangChain", "FastAPI", "Docker", "SQL", "Pandas"],
    graduate: {
      name: "Tunde Bakare", role: "AI Engineer · Shell Nigeria", initials: "TB",
      gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
      quote: "I shipped 4 production AI projects before I even graduated. Shell found me through the CIOS recruiter portal — I didn't apply. The portfolio spoke for itself.",
    },
    stats: [{ v: "94%", l: "placement rate" }, { v: "4", l: "projects built" }, { v: "₦1.2M", l: "avg first salary" }, { v: "6mo", l: "to job-ready" }],
  },

  "digital-marketing": {
    title: "Digital Marketing",
    badge: "MARKETING TRACK",
    badgeColor: "#FF7043",
    icon: "📣",
    gradient: "linear-gradient(135deg, #FF7043, #FFC107)",
    tagline: "Run campaigns that generate real money",
    desc: "Master paid ads, SEO, content strategy, email marketing, and analytics — all applied to real brands with real budgets. Graduate as a full-stack digital marketer ready to lead campaigns from day one.",
    outcomes: [
      { icon: "📈", title: "Digital Marketing Manager", salary: "₦400K–₦900K/month", where: "Agencies, e-commerce, banks" },
      { icon: "🏢", title: "Growth Lead", salary: "₦600K–₦1.5M/month", where: "Tech startups, SaaS companies" },
      { icon: "💼", title: "Freelance Consultant", salary: "₦300K–₦1M/month", where: "Multiple clients, self-employed" },
    ],
    curriculum: [
      { week: "Month 1", title: "Marketing Foundations", topics: ["Brand strategy & positioning", "Customer avatar & segmentation", "Marketing funnel architecture", "Competitive analysis"] },
      { week: "Month 2", title: "Content & SEO", topics: ["Content strategy & planning", "On-page & technical SEO", "Keyword research", "Blog & landing page copywriting"] },
      { week: "Month 3", title: "Paid Advertising", topics: ["Meta Ads (Facebook/Instagram)", "Google Ads & search campaigns", "Campaign budgeting & ROAS", "A/B testing creatives"] },
      { week: "Month 4", title: "Email & Automation", topics: ["Email marketing with Mailchimp/Klaviyo", "Marketing automation flows", "Lead magnets & nurture sequences", "CRM management"] },
      { week: "Month 5", title: "Analytics & Reporting", topics: ["Google Analytics 4", "Meta Ads Manager analytics", "Dashboard creation", "Data-driven optimization"] },
      { week: "Month 6", title: "Client Projects", topics: ["Manage a real marketing budget", "Client-facing presentations", "Case study portfolio", "Agency/freelance setup"] },
    ],
    tools: ["Meta Ads Manager", "Google Ads", "Google Analytics 4", "Semrush", "Mailchimp", "Canva", "HubSpot", "Klaviyo", "Notion", "Ahrefs"],
    graduate: {
      name: "Folake Nwosu", role: "Agency Owner · Ibadan", initials: "FN",
      gradient: "linear-gradient(135deg, #66BB6A, #1E88E5)",
      quote: "Six months after CIOS I launched my own agency. My first client was a CIOS recruiter partner. The program didn't just teach marketing — it made me a practitioner from week one.",
    },
    stats: [{ v: "89%", l: "placement rate" }, { v: "₦800K+", l: "first-month revenue" }, { v: "3", l: "live campaigns" }, { v: "6mo", l: "to agency launch" }],
  },

  "ui-ux-design": {
    title: "UI/UX Design",
    badge: "DESIGN TRACK",
    badgeColor: "#AB47BC",
    icon: "🎨",
    gradient: "linear-gradient(135deg, #AB47BC, #EF5350)",
    tagline: "Design products people can't stop using",
    desc: "Learn the full design process — from user research and wireframing to high-fidelity Figma prototypes and usability testing. Build a portfolio of 6+ real product designs that gets you hired.",
    outcomes: [
      { icon: "🎨", title: "Product Designer", salary: "₦450K–₦1M/month", where: "Fintech, healthtech, SaaS" },
      { icon: "💻", title: "UX Researcher", salary: "₦350K–₦800K/month", where: "Large tech companies, agencies" },
      { icon: "🌍", title: "Remote UI Designer", salary: "$1,500–$4,000/month", where: "US/EU product companies" },
    ],
    curriculum: [
      { week: "Month 1", title: "Design Thinking & Research", topics: ["UX research methods", "User interviews & surveys", "Jobs-to-be-done framework", "Competitor UX analysis"] },
      { week: "Month 2", title: "Wireframing & IA", topics: ["Information architecture", "Low-fi wireframing", "User flows & sitemaps", "Rapid prototyping with paper"] },
      { week: "Month 3", title: "Visual Design & Figma", topics: ["Figma mastery", "Typography & color theory", "Design systems & components", "High-fidelity mockups"] },
      { week: "Month 4", title: "Interaction Design", topics: ["Micro-animations in Figma", "Prototyping & transitions", "Mobile-first responsive design", "Accessibility (WCAG)"] },
      { week: "Month 5", title: "Usability & Testing", topics: ["Usability testing sessions", "Heatmaps & session recordings", "Iteration based on data", "Presenting to stakeholders"] },
      { week: "Month 6", title: "Portfolio & Career", topics: ["6-project portfolio site", "Case study writing", "Design interviews prep", "Freelance client acquisition"] },
    ],
    tools: ["Figma", "FigJam", "Maze", "Hotjar", "Miro", "Notion", "Webflow", "Lottie", "Zeroheight", "Framer"],
    graduate: {
      name: "Adaeze Okonkwo", role: "Product Lead · Lagos Fintech", initials: "AO",
      gradient: "linear-gradient(135deg, #1E88E5, #AB47BC)",
      quote: "By month 3 I had 3 freelance clients. By month 6 I was offered a Product Lead role. CIOS forced me to build a real portfolio, not just watch tutorials on repeat.",
    },
    stats: [{ v: "91%", l: "placement rate" }, { v: "6+", l: "portfolio projects" }, { v: "₦450K", l: "avg first salary" }, { v: "3mo", l: "to first freelance client" }],
  },

  "web-development": {
    title: "Web Development",
    badge: "ENGINEERING TRACK",
    badgeColor: "#26C6DA",
    icon: "💻",
    gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
    tagline: "Ship full-stack products from scratch",
    desc: "Learn modern full-stack web development — React, Next.js, Node.js, databases, and cloud deployment. Build real products that go live on the internet, not just tutorial projects.",
    outcomes: [
      { icon: "💻", title: "Full-Stack Developer", salary: "₦600K–₦1.5M/month", where: "Startups, agencies, tech companies" },
      { icon: "🌍", title: "Remote Engineer", salary: "$2,500–$6,000/month", where: "US/EU remote-first companies" },
      { icon: "🚀", title: "Technical Co-founder", salary: "Equity + salary", where: "Launch your own startup" },
    ],
    curriculum: [
      { week: "Month 1", title: "HTML, CSS & JavaScript", topics: ["Semantic HTML5", "Modern CSS & Flexbox/Grid", "JavaScript ES6+", "DOM manipulation & events"] },
      { week: "Month 2", title: "React & Frontend", topics: ["React fundamentals & hooks", "State management", "React Router & SPA patterns", "Tailwind CSS"] },
      { week: "Month 3", title: "Backend & APIs", topics: ["Node.js & Express", "REST API design", "Authentication & JWT", "SQL & PostgreSQL"] },
      { week: "Month 4", title: "Full-Stack with Next.js", topics: ["Next.js App Router", "Server components & actions", "Supabase & databases", "TypeScript"] },
      { week: "Month 5", title: "Cloud & DevOps", topics: ["Git & GitHub workflows", "Vercel & Netlify deployment", "CI/CD pipelines", "Docker basics"] },
      { week: "Month 6", title: "Production Projects", topics: ["Ship 2 full-stack products", "Performance optimization", "Technical interviews", "Open-source contributions"] },
    ],
    tools: ["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Supabase", "Tailwind CSS", "Git", "Docker", "Vercel"],
    graduate: {
      name: "Emeka Okafor", role: "Full-Stack Engineer · Remote (UK)", initials: "EO",
      gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
      quote: "I went from knowing basic HTML to shipping production Next.js apps in 6 months. The accountability system made me consistent when motivation failed. Worth every fine I paid.",
    },
    stats: [{ v: "92%", l: "placement rate" }, { v: "2", l: "live products shipped" }, { v: "₦1.2M", l: "avg remote salary" }, { v: "6mo", l: "to production-ready" }],
  },

  "data-analytics": {
    title: "Data Analytics",
    badge: "ANALYTICS TRACK",
    badgeColor: "#66BB6A",
    icon: "📊",
    gradient: "linear-gradient(135deg, #66BB6A, #FFC107)",
    tagline: "Turn raw data into decisions that make money",
    desc: "Learn SQL, Python, Power BI, and statistical thinking — applied to real business data. Graduate as a data analyst ready to answer questions that move companies forward.",
    outcomes: [
      { icon: "📊", title: "Business Analyst", salary: "₦400K–₦900K/month", where: "Banks, telecoms, FMCG" },
      { icon: "📈", title: "Data Analyst", salary: "₦500K–₦1.2M/month", where: "Tech companies, fintech, consulting" },
      { icon: "🌍", title: "Remote BI Analyst", salary: "$1,800–$4,000/month", where: "US/EU remote companies" },
    ],
    curriculum: [
      { week: "Month 1", title: "Data Foundations", topics: ["How businesses use data", "Excel advanced techniques", "Data types & structures", "Statistics fundamentals"] },
      { week: "Month 2", title: "SQL & Databases", topics: ["SQL from basics to advanced", "Joins, CTEs & window functions", "PostgreSQL & MySQL", "Database design"] },
      { week: "Month 3", title: "Python for Data", topics: ["Python for data analysis", "Pandas & NumPy", "Data cleaning & wrangling", "Matplotlib & Seaborn charts"] },
      { week: "Month 4", title: "Business Intelligence", topics: ["Power BI from scratch", "DAX formulas", "Interactive dashboards", "Tableau basics"] },
      { week: "Month 5", title: "Advanced Analytics", topics: ["A/B testing & experiments", "Cohort & funnel analysis", "Predictive models with Python", "Google Analytics 4"] },
      { week: "Month 6", title: "Capstone & Career", topics: ["Real business datasets", "Stakeholder presentation skills", "Portfolio & GitHub", "Interview preparation"] },
    ],
    tools: ["SQL", "PostgreSQL", "Python", "Pandas", "Power BI", "Tableau", "Excel", "Google Analytics", "Jupyter", "dbt"],
    graduate: {
      name: "Chidi Nwosu", role: "Senior Analyst · GTBank", initials: "CN",
      gradient: "linear-gradient(135deg, #66BB6A, #FFC107)",
      quote: "Three months in, I was already building dashboards for a real fintech startup. The SQL skills alone tripled my value at work. CIOS taught me to think like a data storyteller.",
    },
    stats: [{ v: "88%", l: "placement rate" }, { v: "5+", l: "real datasets analyzed" }, { v: "₦900K", l: "avg first salary" }, { v: "6mo", l: "to analyst-ready" }],
  },

  "content-creation": {
    title: "Content Creation",
    badge: "CREATIVE TRACK",
    badgeColor: "#FFC107",
    icon: "✍️",
    gradient: "linear-gradient(135deg, #FFC107, #FF7043)",
    tagline: "Build an audience. Build a business.",
    desc: "Master video production, social media strategy, copywriting, and brand storytelling — using the same tools as top creators. Graduate with a real audience, a monetized channel, and brand clients.",
    outcomes: [
      { icon: "🎬", title: "Content Manager", salary: "₦250K–₦600K/month", where: "Agencies, media houses, brands" },
      { icon: "📱", title: "Social Media Strategist", salary: "₦300K–₦800K/month", where: "Corporate brands, tech companies" },
      { icon: "✍️", title: "Independent Creator", salary: "₦200K–₦2M/month", where: "YouTube, brand deals, own products" },
    ],
    curriculum: [
      { week: "Month 1", title: "Storytelling & Strategy", topics: ["Brand voice development", "Content pillars & strategy", "Platform algorithms", "Audience persona research"] },
      { week: "Month 2", title: "Writing & Copywriting", topics: ["Persuasive copywriting", "Blog & long-form writing", "Email newsletter writing", "SEO content writing"] },
      { week: "Month 3", title: "Video Production", topics: ["Shooting with a smartphone", "Video editing (CapCut/Premiere)", "YouTube optimization", "Short-form content (Reels/TikTok)"] },
      { week: "Month 4", title: "Design for Content", topics: ["Canva Pro mastery", "Thumbnail design psychology", "Brand visual identity", "Content templates & systems"] },
      { week: "Month 5", title: "Monetization & Growth", topics: ["Brand partnership pitching", "YouTube monetization", "Product & course creation", "Community building"] },
      { week: "Month 6", title: "Portfolio & Launch", topics: ["Live content portfolio", "Case studies for clients", "Agency/freelance setup", "Ongoing content calendar"] },
    ],
    tools: ["CapCut", "Adobe Premiere", "Canva Pro", "YouTube Studio", "Meta Creator Studio", "Beehiiv", "Notion", "Ahrefs", "Mailchimp", "Gumroad"],
    graduate: {
      name: "Samuel Adeyemi", role: "Media Entrepreneur · Accra", initials: "SA",
      gradient: "linear-gradient(135deg, #FF7043, #FFC107)",
      quote: "I built a 50K YouTube channel during the program using CIOS projects as content. The wallet payouts funded my equipment. CIOS doesn't just train — it pays while you build.",
    },
    stats: [{ v: "85%", l: "placement rate" }, { v: "50K+", l: "avg audience built" }, { v: "₦500K", l: "first-month earnings" }, { v: "3mo", l: "to first brand deal" }],
  },
} as const;

type Slug = keyof typeof TRACKS;

/* ─── Metadata ─────────────────────────────────────────────────── */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const track = TRACKS[slug as Slug];
  if (!track) return { title: "Track Not Found · CIOS" };
  return {
    title: `${track.title} Track · CIOS`,
    description: track.desc,
  };
}

export function generateStaticParams() {
  return Object.keys(TRACKS).map((slug) => ({ slug }));
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = TRACKS[slug as Slug];
  if (!track) notFound();

  const allTracks = Object.entries(TRACKS).filter(([s]) => s !== slug);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 80px" }}>

      {/* ── HERO ── */}
      <section style={{ textAlign: "center", marginBottom: 64 }}>
        {/* Large icon */}
        <div style={{
          width: 96, height: 96, borderRadius: 28, margin: "0 auto 20px",
          background: track.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 48, boxShadow: `0 16px 48px rgba(0,0,0,0.4)`,
        }}>
          {track.icon}
        </div>

        <span style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20, marginBottom: 16,
          background: `${track.badgeColor}20`, color: track.badgeColor,
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
        }}>{track.badge}</span>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800,
          color: "#E8EDF5", margin: "0 0 12px", lineHeight: 1.08,
        }}>
          {track.title}
        </h1>

        <p style={{
          fontSize: 22, fontWeight: 700, marginBottom: 16,
          background: track.gradient,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {track.tagline}
        </p>

        <p style={{ fontSize: 16, color: "#8892A4", maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.7 }}>
          {track.desc}
        </p>

        {/* Stats bar */}
        <div style={{
          display: "inline-flex", gap: 0, borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          {track.stats.map((s, i) => (
            <div key={s.l} style={{
              padding: "16px 28px", textAlign: "center",
              borderRight: i < track.stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: "rgba(255,255,255,0.03)",
            }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, background: track.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "#5A6478", fontWeight: 600, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{
            padding: "14px 32px", borderRadius: 12, fontWeight: 800, fontSize: 15,
            background: track.gradient, color: "#fff", textDecoration: "none",
            boxShadow: "0 6px 28px rgba(0,0,0,0.3)",
          }}>
            Apply for this track →
          </Link>
          <Link href="/demo" style={{
            padding: "14px 28px", borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: "rgba(255,255,255,0.05)", color: "#E8EDF5", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            Book a demo
          </Link>
        </div>
      </section>

      {/* ── CAREER OUTCOMES ── */}
      <section style={{ marginBottom: 64 }}>
        <SectionLabel color={track.badgeColor}>WHERE YOU&apos;LL LAND</SectionLabel>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", marginBottom: 24 }}>
          Career outcomes after graduation
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {track.outcomes.map((o) => (
            <div key={o.title} style={{
              padding: 24, borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderTop: `3px solid ${track.badgeColor}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{o.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>{o.title}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: track.badgeColor, marginBottom: 4 }}>{o.salary}</div>
              <div style={{ fontSize: 12, color: "#5A6478" }}>{o.where}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CURRICULUM ── */}
      <section style={{ marginBottom: 64 }}>
        <SectionLabel color={track.badgeColor}>6-MONTH CURRICULUM</SectionLabel>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", marginBottom: 24 }}>
          What you&apos;ll learn — month by month
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {track.curriculum.map((m, i) => (
            <div key={m.week} style={{
              padding: 22, borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: 3,
                background: track.gradient, opacity: 0.6,
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: track.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff",
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: track.badgeColor, letterSpacing: 1 }}>{m.week.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{m.title}</div>
                </div>
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {m.topics.map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#8892A4" }}>
                    <span style={{ color: track.badgeColor, flexShrink: 0, marginTop: 1 }}>✓</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── TOOLS ── */}
      <section style={{ marginBottom: 64 }}>
        <SectionLabel color={track.badgeColor}>TOOLS YOU&apos;LL MASTER</SectionLabel>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", marginBottom: 24 }}>
          Industry-standard stack
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {track.tools.map((t) => (
            <span key={t} style={{
              padding: "9px 18px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              fontSize: 13, fontWeight: 700, color: "#E8EDF5",
            }}>{t}</span>
          ))}
        </div>
      </section>

      {/* ── GRADUATE TESTIMONIAL ── */}
      <section style={{ marginBottom: 64 }}>
        <SectionLabel color={track.badgeColor}>GRADUATE STORY</SectionLabel>
        <div style={{
          padding: "32px 36px", borderRadius: 20,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -40, right: -40, width: 200, height: 200,
            borderRadius: "50%", background: `radial-gradient(circle, ${track.badgeColor}12, transparent 70%)`,
            pointerEvents: "none",
          }} />
          <div style={{ fontSize: 40, color: track.badgeColor, marginBottom: 16, opacity: 0.5 }}>&ldquo;</div>
          <p style={{ fontSize: 17, color: "#B0BEC5", lineHeight: 1.8, margin: "0 0 24px", fontStyle: "italic", maxWidth: 680 }}>
            {track.graduate.quote}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: track.graduate.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0,
            }}>{track.graduate.initials}</div>
            <div>
              <div style={{ fontWeight: 700, color: "#E8EDF5" }}>{track.graduate.name}</div>
              <div style={{ fontSize: 12, color: "#5A6478" }}>{track.graduate.role}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section style={{ marginBottom: 64 }}>
        <SectionLabel color={track.badgeColor}>EVERY TRACK INCLUDES</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { icon: "🎓", title: "Verified Certificate", desc: "Publicly verifiable credential on completion" },
            { icon: "🤖", title: "AI Copilot Access", desc: "8 AI tools for tasks, CV, interview prep" },
            { icon: "💰", title: "Performance Rewards", desc: "Earn real money for high performance scores" },
            { icon: "🏆", title: "Live Leaderboard", desc: "Compete on track-specific rankings globally" },
            { icon: "👥", title: "Mentor Support", desc: "Weekly 1-on-1 guidance from industry mentors" },
            { icon: "💼", title: "Recruiter Matching", desc: "Your profile shown to hiring companies direct" },
          ].map((f) => (
            <div key={f.title} style={{
              padding: "18px 20px", borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#5A6478", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BLOCK ── */}
      <section style={{
        textAlign: "center", padding: "52px 32px", borderRadius: 24,
        background: `linear-gradient(135deg, ${track.badgeColor}12, transparent)`,
        border: `1px solid ${track.badgeColor}25`,
        marginBottom: 64,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>{track.icon}</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px" }}>
          Ready to master {track.title}?
        </h2>
        <p style={{ color: "#8892A4", fontSize: 15, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Applications for the next cohort are open. Spots are limited to maintain quality mentorship ratios.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{
            padding: "14px 36px", borderRadius: 12, fontWeight: 800, fontSize: 15,
            background: track.gradient, color: "#fff", textDecoration: "none",
            boxShadow: "0 6px 28px rgba(0,0,0,0.35)",
          }}>
            Apply Now — It&apos;s Free →
          </Link>
          <Link href="/pricing" style={{
            padding: "14px 24px", borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: "rgba(255,255,255,0.05)", color: "#E8EDF5", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            View Pricing
          </Link>
        </div>
      </section>

      {/* ── OTHER TRACKS ── */}
      <section>
        <SectionLabel color={track.badgeColor}>EXPLORE OTHER TRACKS</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {allTracks.map(([s, t]) => (
            <Link key={s} href={`/solutions/${s}`} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              borderRadius: 12, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)", textDecoration: "none",
              transition: "border-color 0.2s, background 0.2s",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: t.gradient,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{t.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#B0BEC5", lineHeight: 1.3 }}>{t.title}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Helper components ─────────────────────────────────────────── */

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 20, marginBottom: 10,
      background: `${color}18`, color: color,
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    }}>
      {children}
    </div>
  );
}
