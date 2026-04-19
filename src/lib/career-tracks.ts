// Career tracks config — predefined paths with milestones.
// Stored as code (not DB) so admins update via PR, not schema changes.

export interface Milestone {
  id: string;
  title: string;
  description: string;
  tier: "foundation" | "intermediate" | "advanced";
  suggested_week: number;
  cta_href?: string;
}

export interface CareerTrack {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  roles: string[];
  milestones: Milestone[];
}

export const CAREER_TRACKS: CareerTrack[] = [
  {
    slug: "product-design",
    title: "Product Design",
    description: "From Figma basics to end-to-end product design systems.",
    emoji: "🎨",
    color: "#AB47BC",
    roles: ["Junior UI Designer", "Product Designer", "Senior Designer"],
    milestones: [
      { id: "pd-1", tier: "foundation", suggested_week: 1, title: "Figma fundamentals", description: "Master Figma's component system, auto-layout, and variants.", cta_href: "/classroom" },
      { id: "pd-2", tier: "foundation", suggested_week: 2, title: "Design principles", description: "Hierarchy, contrast, spacing, and typography systems." },
      { id: "pd-3", tier: "foundation", suggested_week: 3, title: "First wireframe", description: "Design a 3-screen onboarding flow from a written brief.", cta_href: "/projects" },
      { id: "pd-4", tier: "intermediate", suggested_week: 6, title: "UX research basics", description: "Run a user interview, write a usability report." },
      { id: "pd-5", tier: "intermediate", suggested_week: 9, title: "Design system build", description: "Build a mini design system with 10+ reusable components." },
      { id: "pd-6", tier: "intermediate", suggested_week: 12, title: "Real client project", description: "Ship a client-ready design with score 8+." },
      { id: "pd-7", tier: "advanced", suggested_week: 16, title: "Portfolio with 3 projects", description: "Publish a portfolio showing process + outcomes.", cta_href: "/profile" },
      { id: "pd-8", tier: "advanced", suggested_week: 20, title: "Land first interview", description: "Get your first recruiter contact via CIOS." },
    ],
  },
  {
    slug: "fullstack-dev",
    title: "Fullstack Development",
    description: "From HTML basics to shipping production React apps.",
    emoji: "💻",
    color: "#1E88E5",
    roles: ["Junior Developer", "Frontend Engineer", "Fullstack Engineer"],
    milestones: [
      { id: "fs-1", tier: "foundation", suggested_week: 1, title: "HTML + CSS", description: "Build 3 responsive landing pages.", cta_href: "/classroom" },
      { id: "fs-2", tier: "foundation", suggested_week: 3, title: "JavaScript fundamentals", description: "Variables, loops, functions, DOM manipulation." },
      { id: "fs-3", tier: "foundation", suggested_week: 5, title: "First React app", description: "Todo app with state, props, and local storage." },
      { id: "fs-4", tier: "intermediate", suggested_week: 8, title: "REST APIs", description: "Build a CRUD app against a real backend." },
      { id: "fs-5", tier: "intermediate", suggested_week: 11, title: "Next.js project", description: "Deploy a full-stack app to Vercel." },
      { id: "fs-6", tier: "intermediate", suggested_week: 14, title: "Authentication + DB", description: "Auth with Clerk, database with Supabase." },
      { id: "fs-7", tier: "advanced", suggested_week: 18, title: "Open-source contribution", description: "Get a PR merged in a real repo." },
      { id: "fs-8", tier: "advanced", suggested_week: 22, title: "GitHub portfolio", description: "5 repos with clear READMEs and demos." },
    ],
  },
  {
    slug: "marketing",
    title: "Digital Marketing",
    description: "From content basics to running paid campaigns.",
    emoji: "📣",
    color: "#EC4899",
    roles: ["Content Associate", "Growth Marketer", "Marketing Lead"],
    milestones: [
      { id: "mk-1", tier: "foundation", suggested_week: 1, title: "Content writing basics", description: "Write 5 blog posts at 700+ words each." },
      { id: "mk-2", tier: "foundation", suggested_week: 3, title: "SEO fundamentals", description: "Keyword research, on-page SEO, link-building basics." },
      { id: "mk-3", tier: "foundation", suggested_week: 5, title: "Social media strategy", description: "Run a 30-day posting calendar for a real brand." },
      { id: "mk-4", tier: "intermediate", suggested_week: 8, title: "Email marketing", description: "Design and A/B test an email sequence." },
      { id: "mk-5", tier: "intermediate", suggested_week: 11, title: "Analytics fluency", description: "Read GA4 + social analytics, spot 3 insights." },
      { id: "mk-6", tier: "intermediate", suggested_week: 14, title: "First paid ad campaign", description: "Run a small Meta or Google Ads test." },
      { id: "mk-7", tier: "advanced", suggested_week: 18, title: "Growth loop design", description: "Design a referral or viral loop end-to-end." },
      { id: "mk-8", tier: "advanced", suggested_week: 22, title: "Case study portfolio", description: "3 published case studies with results." },
    ],
  },
  {
    slug: "data-analytics",
    title: "Data & Analytics",
    description: "From Excel to building dashboards and BI models.",
    emoji: "📊",
    color: "#66BB6A",
    roles: ["Data Analyst", "BI Analyst", "Data Scientist"],
    milestones: [
      { id: "da-1", tier: "foundation", suggested_week: 1, title: "Excel mastery", description: "Pivot tables, VLOOKUP, INDEX-MATCH." },
      { id: "da-2", tier: "foundation", suggested_week: 4, title: "SQL fundamentals", description: "SELECT, JOIN, GROUP BY, window functions." },
      { id: "da-3", tier: "foundation", suggested_week: 7, title: "Python for data", description: "Pandas, NumPy, Jupyter notebook workflow." },
      { id: "da-4", tier: "intermediate", suggested_week: 10, title: "Power BI / Tableau", description: "Build your first 5-chart dashboard." },
      { id: "da-5", tier: "intermediate", suggested_week: 13, title: "Statistics basics", description: "Hypothesis testing, A/B tests, regression." },
      { id: "da-6", tier: "intermediate", suggested_week: 16, title: "Real-world project", description: "End-to-end analysis with a published report." },
      { id: "da-7", tier: "advanced", suggested_week: 20, title: "Advanced SQL + dbt", description: "Write maintainable data models." },
      { id: "da-8", tier: "advanced", suggested_week: 24, title: "Data portfolio", description: "3 case studies on Kaggle / public datasets." },
    ],
  },
];

export function getTrack(slug: string): CareerTrack | undefined {
  return CAREER_TRACKS.find((t) => t.slug === slug);
}
