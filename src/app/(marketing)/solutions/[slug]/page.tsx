import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/* ─── Skill Group definitions ───────────────────────────────────── */

interface Skill {
  name: string;
  desc: string;
  tag?: string; // e.g. "Hot", "New", "AI-Powered"
}

interface SkillGroup {
  title: string;
  badge: string;
  badgeColor: string;
  icon: string;
  gradient: string;
  tagline: string;
  overview: string;
  skills: Skill[];
  outcomes: { icon: string; title: string; salary: string }[];
  tools: string[];
  graduate: { name: string; role: string; initials: string; gradient: string; quote: string };
  stats: { v: string; l: string }[];
}

const GROUPS: Record<string, SkillGroup> = {
  "ai-automation": {
    title: "AI & Automation",
    badge: "AI TRACK",
    badgeColor: "#1E88E5",
    icon: "🤖",
    gradient: "linear-gradient(135deg, #1E88E5, #AB47BC)",
    tagline: "Build the systems that run the future",
    overview: "The most in-demand digital category of the decade. Learn to build AI agents, automate complex workflows, and ship real AI-powered products — using the same tools companies pay $5,000+/month for.",
    skills: [
      { name: "Prompt Engineering & AI Literacy",      desc: "Master the art of talking to AI to get production-quality outputs for any task.", tag: "Foundation" },
      { name: "AI Agents & Agentic Systems",            desc: "Build autonomous AI agents that browse, reason, and execute multi-step tasks without human input.", tag: "🔥 Hot" },
      { name: "Workflow Automation (Make / n8n / Zapier)", desc: "Automate business workflows — lead gen, invoicing, CRM, email — without writing a single line of code.", tag: "High Income" },
      { name: "Machine Learning Fundamentals",          desc: "Understand how models are trained, evaluated, and deployed — from linear regression to neural networks." },
      { name: "Generative AI Application Development", desc: "Build apps powered by GPT-4, Claude, Gemini — chatbots, summarizers, custom AI copilots.", tag: "New" },
      { name: "Retrieval-Augmented Generation (RAG)",   desc: "Connect LLMs to your own data using vector databases and embedding pipelines for custom AI knowledge bases.", tag: "🔥 Hot" },
      { name: "No-Code AI Integration",                 desc: "Use tools like Flowise, Botpress, and Voiceflow to deploy AI products with zero backend code." },
      { name: "Computer Vision Applications",           desc: "Build image recognition, object detection, and document extraction systems using Python and cloud APIs." },
      { name: "Natural Language Processing (NLP)",      desc: "Classify text, extract entities, run sentiment analysis, and build language-aware applications." },
      { name: "AI Ethics & Responsible AI",             desc: "Understand bias, fairness, safety, and compliance — required knowledge for any AI professional." },
      { name: "Voice AI & Conversational Tech",         desc: "Build voice bots, IVR systems, and speech-to-text pipelines using ElevenLabs, Whisper, and Twilio.", tag: "New" },
      { name: "AI Product Management",                  desc: "Define, scope, and ship AI features as a product owner — bridging business needs and technical teams." },
    ],
    outcomes: [
      { icon: "🤖", title: "AI/ML Engineer",         salary: "₦800K–₦2M/month" },
      { icon: "⚡", title: "Automation Specialist",  salary: "₦400K–₦1.2M/month" },
      { icon: "🌍", title: "Remote AI Contractor",   salary: "$2,500–$6,000/month" },
    ],
    tools: ["Python", "OpenAI API", "LangChain", "LlamaIndex", "Make (Integromat)", "n8n", "Zapier", "Flowise", "Pinecone", "Hugging Face", "FastAPI", "Docker"],
    graduate: {
      name: "Tunde Bakare", role: "AI Engineer · Shell Nigeria", initials: "TB",
      gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
      quote: "I built a RAG-powered document assistant for a bank client in month 4 — before I even graduated. CIOS didn't teach me to follow tutorials. It taught me to ship.",
    },
    stats: [{ v: "12+", l: "skills covered" }, { v: "4", l: "production projects" }, { v: "₦1.2M", l: "avg first salary" }, { v: "#1", l: "most hired track" }],
  },

  "development": {
    title: "Development & Engineering",
    badge: "ENGINEERING TRACK",
    badgeColor: "#26C6DA",
    icon: "💻",
    gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
    tagline: "Ship software that solves real problems",
    overview: "Full-stack, mobile, AI-assisted — learn to build anything. Whether you want to build web apps, mobile products, or backend systems, this track covers modern engineering with AI tools woven throughout every module.",
    skills: [
      { name: "Web Development with AI Copilot",        desc: "Build full-stack web apps using React + Next.js, with GitHub Copilot and Cursor AI as your pair programmer.", tag: "Foundation" },
      { name: "Mobile App Development (React Native + AI)", desc: "Ship iOS and Android apps with React Native and Flutter, integrating AI features for smart user experiences.", tag: "🔥 Hot" },
      { name: "Backend & API Engineering",              desc: "Design and build RESTful and GraphQL APIs with Node.js, Python FastAPI, or Go — production-ready from day one." },
      { name: "Frontend Frameworks (React / Vue / Angular)", desc: "Master component-driven UI development, state management, and modern frontend architecture." },
      { name: "AI-Assisted Development (Cursor / Copilot / Codeium)", desc: "Use AI coding tools to ship features 3x faster — code generation, refactoring, debugging, and documentation.", tag: "New" },
      { name: "Cloud-Native Development (AWS / GCP / Azure)", desc: "Deploy and scale apps on the cloud using serverless functions, containers, and managed databases." },
      { name: "Database Design & Engineering",          desc: "Master SQL, NoSQL, and vector databases — schema design, query optimization, and data migrations." },
      { name: "DevOps & CI/CD Pipelines",              desc: "Automate testing and deployment with GitHub Actions, Docker, and Kubernetes — ship confidently every time." },
      { name: "Low-Code / No-Code Platform Development", desc: "Build full products on Webflow, Bubble, Glide, and FlutterFlow — used by startups to ship MVPs in days." },
      { name: "Progressive Web Apps (PWA)",             desc: "Build offline-capable, installable web experiences that rival native apps in performance." },
      { name: "Web3 & Blockchain Development",          desc: "Build smart contracts, NFT platforms, and DeFi apps using Solidity and Ethers.js.", tag: "New" },
      { name: "Cybersecurity for Developers",           desc: "Secure your applications against OWASP Top 10 vulnerabilities, implement auth, and handle secrets safely." },
    ],
    outcomes: [
      { icon: "💻", title: "Full-Stack Developer",    salary: "₦600K–₦1.5M/month" },
      { icon: "📱", title: "Mobile App Developer",    salary: "₦500K–₦1.2M/month" },
      { icon: "🌍", title: "Remote Engineer",         salary: "$2,500–$6,000/month" },
    ],
    tools: ["React", "Next.js", "TypeScript", "Node.js", "Python", "React Native", "Flutter", "PostgreSQL", "Docker", "AWS", "GitHub Copilot", "Cursor AI"],
    graduate: {
      name: "Emeka Okafor", role: "Full-Stack Engineer · Remote (UK)", initials: "EO",
      gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)",
      quote: "I shipped two production apps and landed a remote UK role before leaving the program. The AI coding tools made me produce senior-level output as a junior. That combination is unstoppable.",
    },
    stats: [{ v: "12+", l: "skills covered" }, { v: "2", l: "live products shipped" }, { v: "3×", l: "faster with AI tools" }, { v: "6mo", l: "to job-ready" }],
  },

  "design-creative": {
    title: "Design & Creative",
    badge: "DESIGN TRACK",
    badgeColor: "#AB47BC",
    icon: "🎨",
    gradient: "linear-gradient(135deg, #AB47BC, #EF5350)",
    tagline: "Create things people can't stop looking at",
    overview: "Design is no longer just about making things pretty. With AI tools, a single designer can produce what used to require a full creative team. Learn to design products, brands, motion, and AI-generated visuals — all under one track.",
    skills: [
      { name: "UI/UX Product Design",                  desc: "Design digital products that users love — from wireframes and user flows to high-fidelity Figma prototypes.", tag: "Foundation" },
      { name: "AI Image & Art Generation",              desc: "Master Midjourney, DALL-E, Adobe Firefly, and Stable Diffusion to generate client-ready visuals at scale.", tag: "🔥 Hot" },
      { name: "Brand Identity Design",                  desc: "Build logos, visual systems, typography pairings, and brand guidelines from scratch for real clients." },
      { name: "Design Systems & Component Libraries",   desc: "Build reusable design systems in Figma that scale across products and hand off cleanly to developers." },
      { name: "Motion Graphics & Animation",            desc: "Create scroll animations, micro-interactions, and explainer videos using After Effects and Lottie.", tag: "New" },
      { name: "Video Production & Editing",             desc: "Shoot, edit, and export professional video content using Premiere Pro, DaVinci Resolve, and CapCut AI." },
      { name: "Prototyping & User Testing",             desc: "Build interactive prototypes and run usability tests to validate designs before development starts." },
      { name: "Web Design & Responsive Principles",     desc: "Design pixel-perfect responsive layouts that translate directly into code — mastering grids and breakpoints." },
      { name: "3D Design & Visualization",              desc: "Create 3D product mockups, spatial interfaces, and immersive visuals using Blender and Spline.", tag: "New" },
      { name: "Presentation & Pitch Deck Design",       desc: "Create high-stakes pitch decks, investor reports, and brand presentations that close deals." },
      { name: "User Research Methods",                  desc: "Plan and run user interviews, surveys, card sorts, and heatmap analysis — design with evidence, not assumptions." },
      { name: "Accessibility (A11y) Design",            desc: "Design inclusive products that meet WCAG standards — required for enterprise and government clients." },
    ],
    outcomes: [
      { icon: "🎨", title: "Product Designer",          salary: "₦450K–₦1M/month" },
      { icon: "✨", title: "AI Creative Director",      salary: "₦500K–₦1.5M/month" },
      { icon: "🌍", title: "Remote UI Designer",        salary: "$1,500–$4,000/month" },
    ],
    tools: ["Figma", "Adobe Illustrator", "Photoshop", "After Effects", "Midjourney", "DALL-E 3", "Adobe Firefly", "Blender", "Spline", "CapCut", "DaVinci Resolve", "Framer"],
    graduate: {
      name: "Adaeze Okonkwo", role: "Product Lead · Lagos Fintech", initials: "AO",
      gradient: "linear-gradient(135deg, #1E88E5, #AB47BC)",
      quote: "AI image generation turned me from a Figma designer into a full creative studio. I replaced a 3-person agency for a client by month 5. One person, full output.",
    },
    stats: [{ v: "12+", l: "skills covered" }, { v: "6+", l: "portfolio projects" }, { v: "₦450K", l: "avg first salary" }, { v: "3mo", l: "to first client" }],
  },

  "marketing-growth": {
    title: "Marketing & Growth",
    badge: "MARKETING TRACK",
    badgeColor: "#FF7043",
    icon: "📣",
    gradient: "linear-gradient(135deg, #FF7043, #FFC107)",
    tagline: "Turn attention into revenue at scale",
    overview: "Digital marketing is now inseparable from AI. Learn every channel — paid ads, SEO, email, social, content — and layer in AI tools that let you research, create, and analyse campaigns at 10x the speed of traditional marketers.",
    skills: [
      { name: "AI-Powered Content Marketing",          desc: "Use AI to research, write, repurpose, and distribute content across every channel — at scale.", tag: "Foundation" },
      { name: "Search Engine Optimization (SEO)",      desc: "Rank on Google through on-page optimization, link building, technical SEO, and AI-assisted keyword research." },
      { name: "Paid Advertising (Meta / Google / TikTok)", desc: "Run profitable paid campaigns across Meta, Google, and TikTok Ads — audience targeting, bidding, and creative testing.", tag: "🔥 Hot" },
      { name: "Social Media Strategy & Management",    desc: "Build and manage brand presences on Instagram, LinkedIn, X, and TikTok with platform-native content strategies." },
      { name: "Email Marketing & Automation",          desc: "Build automated email sequences, newsletters, and drip campaigns that convert using Mailchimp, Klaviyo, and Brevo." },
      { name: "Growth Hacking & Viral Loops",          desc: "Design referral programmes, product-led growth mechanics, and retention loops that compound user acquisition.", tag: "High Income" },
      { name: "Influencer & Creator Marketing",        desc: "Identify, negotiate, and manage influencer campaigns — micro to mega — with AI-assisted discovery tools." },
      { name: "Conversion Rate Optimisation (CRO)",    desc: "Increase the percentage of visitors who convert using A/B testing, landing page design, and behavioural analytics." },
      { name: "Community Building & Engagement",       desc: "Build and monetize communities on Discord, Telegram, WhatsApp, and Circle — the highest-trust marketing channel." },
      { name: "Marketing Analytics & Attribution",     desc: "Measure everything — ROAS, LTV, CAC, cohort performance — using GA4, Meta Analytics, and attribution models." },
      { name: "E-commerce & Marketplace Marketing",    desc: "Market and scale products on Jumia, Shopify, Amazon, and Etsy — product listings, ads, and conversion optimisation." },
      { name: "AI Chatbot & Conversational Marketing", desc: "Build AI-powered chatbots for lead capture, customer support, and sales qualification using Manychat and Botpress.", tag: "New" },
    ],
    outcomes: [
      { icon: "📈", title: "Digital Marketing Manager", salary: "₦400K–₦900K/month" },
      { icon: "🚀", title: "Growth Lead",               salary: "₦600K–₦1.5M/month" },
      { icon: "💼", title: "Freelance Consultant",      salary: "₦300K–₦1M/month" },
    ],
    tools: ["Meta Ads Manager", "Google Ads", "Semrush", "Ahrefs", "Mailchimp", "Klaviyo", "HubSpot", "GA4", "Canva", "Notion AI", "ChatGPT", "Manychat"],
    graduate: {
      name: "Folake Nwosu", role: "Agency Owner · Ibadan", initials: "FN",
      gradient: "linear-gradient(135deg, #66BB6A, #1E88E5)",
      quote: "With AI tools I ran 5 client campaigns simultaneously as a one-person agency. The AI did the writing. I did the strategy. Clients couldn't tell — and didn't care.",
    },
    stats: [{ v: "12+", l: "skills covered" }, { v: "3", l: "live campaigns" }, { v: "₦800K+", l: "first-month revenue" }, { v: "6mo", l: "to agency launch" }],
  },

  "data-analytics": {
    title: "Data & Analytics",
    badge: "DATA TRACK",
    badgeColor: "#66BB6A",
    icon: "📊",
    gradient: "linear-gradient(135deg, #66BB6A, #FFC107)",
    tagline: "Turn raw data into decisions that make money",
    overview: "Every company is a data company now — and they need people who can turn raw numbers into clear decisions. From SQL and dashboards to machine learning predictions and AI-powered BI, this track covers the full spectrum of modern data work.",
    skills: [
      { name: "SQL & Advanced Database Querying",      desc: "Write complex queries — joins, CTEs, window functions, stored procedures — across PostgreSQL, MySQL, and BigQuery.", tag: "Foundation" },
      { name: "Data Analysis with Python",             desc: "Clean, transform, and analyse real-world datasets using Pandas, NumPy, and Jupyter notebooks." },
      { name: "Business Intelligence Dashboarding",    desc: "Build interactive dashboards in Power BI and Tableau that executives actually read and act on.", tag: "🔥 Hot" },
      { name: "AI-Assisted Data Analysis",             desc: "Use ChatGPT, Julius AI, and NotebookLM to accelerate data cleaning, insight extraction, and report generation.", tag: "New" },
      { name: "Data Visualization & Storytelling",     desc: "Present data visually with charts, infographics, and narrative structures that persuade stakeholders." },
      { name: "Statistical Analysis & A/B Testing",    desc: "Apply hypothesis testing, confidence intervals, and experimental design to real business problems." },
      { name: "Google Analytics 4 & Web Analytics",   desc: "Track user behaviour on websites and apps — funnels, cohorts, attribution, and conversion paths." },
      { name: "Predictive Analytics & ML Models",      desc: "Build forecasting models, churn predictors, and recommendation engines using Scikit-learn and Python." },
      { name: "Financial Analytics & Modelling",       desc: "Build financial models, P&L analysis, and budget forecasting tools used by CFOs and investors." },
      { name: "Data Engineering Fundamentals",         desc: "Build ETL pipelines, data warehouses, and automated reporting systems using dbt, Airflow, and cloud tools." },
      { name: "Market Research & Competitive Intelligence", desc: "Design research studies, analyse survey data, and produce actionable competitive intelligence reports." },
      { name: "Product Analytics",                     desc: "Measure feature adoption, user retention, and product-market fit using Mixpanel, Amplitude, and custom dashboards.", tag: "New" },
    ],
    outcomes: [
      { icon: "📊", title: "Data Analyst",             salary: "₦400K–₦1M/month" },
      { icon: "📈", title: "Business Intelligence Lead", salary: "₦600K–₦1.5M/month" },
      { icon: "🌍", title: "Remote BI Analyst",        salary: "$1,800–$4,000/month" },
    ],
    tools: ["SQL", "PostgreSQL", "Python", "Pandas", "Power BI", "Tableau", "Google Analytics 4", "dbt", "Jupyter", "Excel", "Julius AI", "Looker"],
    graduate: {
      name: "Chidi Nwosu", role: "Senior Analyst · GTBank", initials: "CN",
      gradient: "linear-gradient(135deg, #66BB6A, #FFC107)",
      quote: "I used AI to triple my analysis speed. What used to take 3 days now takes 3 hours. My manager thought I hired a team. CIOS taught me to think like a data storyteller.",
    },
    stats: [{ v: "12+", l: "skills covered" }, { v: "5+", l: "real datasets" }, { v: "₦900K", l: "avg first salary" }, { v: "6mo", l: "to analyst-ready" }],
  },

  "business-entrepreneurship": {
    title: "Business & Entrepreneurship",
    badge: "BUSINESS TRACK",
    badgeColor: "#FFC107",
    icon: "💼",
    gradient: "linear-gradient(135deg, #FFC107, #FF7043)",
    tagline: "Build, sell, and scale in the digital economy",
    overview: "The digital economy has created entirely new ways to build businesses — and entirely new skills to do it. Whether you want to run a company, manage products, or earn independently as a freelancer, this track teaches real business execution with AI tools baked in.",
    skills: [
      { name: "Product Management & Strategy",          desc: "Define product vision, write PRDs, prioritise features, and lead cross-functional teams to ship on time.", tag: "Foundation" },
      { name: "Business Development & Sales",           desc: "Prospect, qualify, pitch, and close — learn a repeatable B2B and B2C sales system that works in Africa and globally." },
      { name: "Freelancing & Client Acquisition",       desc: "Build a freelance business from zero — niching, portfolio building, pricing, proposals, and client retention.", tag: "🔥 Hot" },
      { name: "Startup Launch & Scaling",               desc: "Validate ideas, build MVPs, find product-market fit, and grow from first users to first revenue." },
      { name: "Financial Literacy & Modelling",         desc: "Manage cash flow, read financial statements, build startup models, and make data-backed financial decisions." },
      { name: "Project Management (Agile / Scrum)",     desc: "Run projects on time and on budget using Agile frameworks, sprint planning, and Jira/Notion workflows." },
      { name: "E-commerce & Digital Selling",           desc: "Build and scale an online store — product selection, Shopify setup, supplier management, and paid traffic." },
      { name: "AI Business Applications",               desc: "Identify where AI can cut costs, increase revenue, or automate processes in any business — and implement it.", tag: "New" },
      { name: "Content Creation & Monetisation",        desc: "Build an audience, grow a channel, and monetise through brand deals, products, subscriptions, and speaking.", tag: "🔥 Hot" },
      { name: "Market Research & Competitive Analysis", desc: "Validate markets, size opportunities, and understand competitors using both manual and AI-assisted research tools." },
      { name: "Leadership & Team Management",           desc: "Hire, motivate, structure, and retain remote and in-person teams — critical for anyone building a company." },
      { name: "Strategic Planning & OKRs",              desc: "Set company goals using OKRs, build execution roadmaps, and hold teams accountable to results — not just activities." },
    ],
    outcomes: [
      { icon: "🚀", title: "Product Manager",           salary: "₦500K–₦1.5M/month" },
      { icon: "💼", title: "Freelance Consultant",      salary: "₦300K–₦1M/month" },
      { icon: "🏢", title: "Founder / Co-founder",      salary: "Equity + revenue" },
    ],
    tools: ["Notion", "Jira", "Asana", "HubSpot CRM", "Shopify", "Stripe", "Google Workspace", "Figma", "ChatGPT", "LinkedIn", "Canva", "Trello"],
    graduate: {
      name: "Ngozi Eze", role: "Director · Marketing Agency", initials: "NE",
      gradient: "linear-gradient(135deg, #AB47BC, #EF5350)",
      quote: "I learned product management on CIOS and applied it to my own agency immediately. Frameworks, OKRs, client management — it's not theory here. You practice it live.",
    },
    stats: [{ v: "12+", l: "skills covered" }, { v: "₦1M+", l: "avg business revenue" }, { v: "3mo", l: "to first client" }, { v: "6mo", l: "to business launch" }],
  },
};

type Slug = keyof typeof GROUPS;

/* ─── Metadata ──────────────────────────────────────────────────── */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = GROUPS[slug as Slug];
  if (!group) return { title: "Track Not Found · CIOS" };
  return {
    title: `${group.title} · CIOS`,
    description: group.overview,
  };
}

export function generateStaticParams() {
  return Object.keys(GROUPS).map((slug) => ({ slug }));
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default async function SolutionGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = GROUPS[slug as Slug];
  if (!group) notFound();

  const otherGroups = Object.entries(GROUPS).filter(([s]) => s !== slug);

  const TAG_COLORS: Record<string, string> = {
    "Foundation": "#1E88E5",
    "🔥 Hot": "#EF5350",
    "High Income": "#FFC107",
    "New": "#66BB6A",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 80px" }}>

      {/* ── HERO ── */}
      <section style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{
          width: 100, height: 100, borderRadius: 28, margin: "0 auto 20px",
          background: group.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 52, boxShadow: "0 20px 56px rgba(0,0,0,0.45)",
        }}>
          {group.icon}
        </div>

        <span style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20, marginBottom: 16,
          background: `${group.badgeColor}22`, color: group.badgeColor,
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
        }}>{group.badge}</span>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 800,
          color: "#E8EDF5", margin: "0 0 12px", lineHeight: 1.08,
        }}>
          {group.title}
        </h1>

        <p style={{
          fontSize: 20, fontWeight: 700, marginBottom: 16,
          background: group.gradient,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {group.tagline}
        </p>

        <p style={{ fontSize: 15, color: "#8892A4", maxWidth: 660, margin: "0 auto 36px", lineHeight: 1.8 }}>
          {group.overview}
        </p>

        {/* Stats row */}
        <div style={{
          display: "inline-flex", borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap", justifyContent: "center",
        }}>
          {group.stats.map((s, i) => (
            <div key={s.l} style={{
              padding: "16px 28px", textAlign: "center", background: "rgba(255,255,255,0.03)",
              borderRight: i < group.stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, background: group.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "#5A6478", fontWeight: 600, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{
            padding: "14px 32px", borderRadius: 12, fontWeight: 800, fontSize: 15,
            background: group.gradient, color: "#fff", textDecoration: "none",
            boxShadow: "0 6px 28px rgba(0,0,0,0.3)",
          }}>
            Apply for this track →
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

      {/* ── SKILLS GRID ── */}
      <section style={{ marginBottom: 64 }}>
        <Label color={group.badgeColor}>SKILLS IN THIS TRACK</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>
            {group.skills.length} skills you&apos;ll master
          </h2>
          <span style={{ fontSize: 13, color: "#5A6478" }}>All included in one track</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {group.skills.map((skill, i) => (
            <div key={skill.name} style={{
              padding: "18px 20px", borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: `3px solid ${group.badgeColor}`,
              position: "relative",
            }}>
              {/* Skill number */}
              <span style={{
                position: "absolute", top: 14, right: 14,
                fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.12)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>{String(i + 1).padStart(2, "0")}</span>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "#E8EDF5", lineHeight: 1.3, marginBottom: 4 }}>
                    {skill.name}
                  </div>
                  {skill.tag && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: `${TAG_COLORS[skill.tag] ?? group.badgeColor}22`,
                      color: TAG_COLORS[skill.tag] ?? group.badgeColor,
                      letterSpacing: 0.5,
                    }}>{skill.tag}</span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.6, margin: 0 }}>{skill.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CAREER OUTCOMES ── */}
      <section style={{ marginBottom: 64 }}>
        <Label color={group.badgeColor}>WHERE YOU&apos;LL LAND</Label>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: "#E8EDF5", marginBottom: 24 }}>
          Career outcomes after graduation
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {group.outcomes.map((o) => (
            <div key={o.title} style={{
              padding: 24, borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderTop: `3px solid ${group.badgeColor}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{o.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>{o.title}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: group.badgeColor }}>{o.salary}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TOOLS ── */}
      <section style={{ marginBottom: 64 }}>
        <Label color={group.badgeColor}>TOOLS YOU&apos;LL MASTER</Label>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", marginBottom: 20 }}>Industry-standard stack</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {group.tools.map((t) => (
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
        <Label color={group.badgeColor}>GRADUATE STORY</Label>
        <div style={{
          padding: "32px 36px", borderRadius: 20,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%",
            background: `radial-gradient(circle, ${group.badgeColor}12, transparent 70%)`, pointerEvents: "none",
          }} />
          <div style={{ fontSize: 40, color: group.badgeColor, marginBottom: 12, opacity: 0.4, lineHeight: 1 }}>&ldquo;</div>
          <p style={{ fontSize: 17, color: "#B0BEC5", lineHeight: 1.8, margin: "0 0 24px", fontStyle: "italic", maxWidth: 700 }}>
            {group.graduate.quote}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: group.graduate.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0,
            }}>{group.graduate.initials}</div>
            <div>
              <div style={{ fontWeight: 700, color: "#E8EDF5" }}>{group.graduate.name}</div>
              <div style={{ fontSize: 12, color: "#5A6478" }}>{group.graduate.role}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section style={{ marginBottom: 64 }}>
        <Label color={group.badgeColor}>EVERY TRACK INCLUDES</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { icon: "🎓", title: "Verified Certificate",  desc: "Publicly verifiable on completion" },
            { icon: "🤖", title: "AI Copilot Access",     desc: "8 AI tools for every task" },
            { icon: "💰", title: "Performance Rewards",   desc: "Earn real money as you learn" },
            { icon: "🏆", title: "Live Leaderboard",      desc: "Compete on track-specific rankings" },
            { icon: "👥", title: "Mentor Support",        desc: "Weekly 1-on-1 industry mentors" },
            { icon: "💼", title: "Recruiter Matching",    desc: "Hired companies see your profile" },
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

      {/* ── CTA ── */}
      <section style={{
        textAlign: "center", padding: "52px 32px", borderRadius: 24, marginBottom: 64,
        background: `linear-gradient(135deg, ${group.badgeColor}12, transparent)`,
        border: `1px solid ${group.badgeColor}25`,
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>{group.icon}</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px" }}>
          Ready to master {group.title}?
        </h2>
        <p style={{ color: "#8892A4", fontSize: 15, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Applications for the next cohort are open. Spots are limited.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{
            padding: "14px 36px", borderRadius: 12, fontWeight: 800, fontSize: 15,
            background: group.gradient, color: "#fff", textDecoration: "none",
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
        <Label color={group.badgeColor}>EXPLORE OTHER TRACKS</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
          {otherGroups.map(([s, g]) => (
            <Link key={s} href={`/solutions/${s}`} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              borderRadius: 12, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)", textDecoration: "none",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: g.gradient,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{g.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#B0BEC5", lineHeight: 1.3 }}>{g.title}</div>
                <div style={{ fontSize: 11, color: "#5A6478" }}>{g.skills.length} skills</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 20, marginBottom: 10,
      background: `${color}18`, color, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    }}>{children}</div>
  );
}
