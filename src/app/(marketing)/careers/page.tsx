import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers · CIOS",
  description: "Join the COSPRONOS Media team building Africa's most ambitious digital internship platform.",
};

const OPEN_ROLES = [
  {
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    type: "Full-time · Remote",
    location: "Lagos, Nigeria (Remote OK)",
    level: "Senior",
    desc: "Own large product features end-to-end on a Next.js 15 + Supabase + Clerk stack. You'll ship features used by thousands of interns daily, architect scalable DB schemas, and collaborate directly with the founding team.",
    skills: ["Next.js", "TypeScript", "Supabase", "PostgreSQL", "Tailwind"],
  },
  {
    title: "AI/ML Engineer",
    department: "Engineering",
    type: "Full-time · Remote",
    location: "Lagos, Nigeria (Remote OK)",
    level: "Mid–Senior",
    desc: "Build and improve the AI features that make CIOS unique — interview prep, plagiarism detection, personalized learning paths, and the AI Copilot. Work with OpenAI APIs, fine-tune models, and improve context quality.",
    skills: ["Python", "OpenAI API", "LangChain", "TypeScript", "Prompt Engineering"],
  },
  {
    title: "Product Designer (UI/UX)",
    department: "Design",
    type: "Full-time · Remote",
    location: "Lagos, Nigeria (Remote OK)",
    level: "Mid",
    desc: "Design experiences for a platform used across 12 countries. You'll own the design system, prototype new features, run user research with interns and recruiters, and ship polished UI in collaboration with engineers.",
    skills: ["Figma", "Design Systems", "User Research", "Prototyping"],
  },
  {
    title: "Community Manager",
    department: "Operations",
    type: "Full-time · On-site",
    location: "Lagos, Nigeria",
    level: "Mid",
    desc: "Manage the CIOS intern community — moderate discussions, run weekly events, coordinate team challenges, support interns day-to-day, and maintain the culture of accountability and excellence the program is known for.",
    skills: ["Community Management", "Event Planning", "Communication", "Google Suite"],
  },
  {
    title: "Growth & Marketing Lead",
    department: "Marketing",
    type: "Full-time · Hybrid",
    location: "Lagos, Nigeria",
    level: "Senior",
    desc: "Own user acquisition and brand growth for CIOS. Run paid campaigns, manage our social presence, build partnerships with universities, and grow recruiter sign-ups. Report directly to the CEO.",
    skills: ["Performance Marketing", "SEO", "Social Media", "Analytics", "CRM"],
  },
  {
    title: "Internship Program Coordinator",
    department: "Operations",
    type: "Full-time · On-site",
    location: "Lagos, Nigeria",
    level: "Junior–Mid",
    desc: "Coordinate day-to-day internship operations: onboarding new cohorts, managing compliance enforcement, communicating with mentors and team leads, and ensuring interns complete the program successfully.",
    skills: ["Project Management", "Communication", "Google Suite", "Data Entry"],
  },
];

const LEVEL_COLORS: Record<string, string> = {
  "Junior–Mid": "#66BB6A",
  "Mid": "#1E88E5",
  "Mid–Senior": "#AB47BC",
  "Senior": "#FFC107",
};

const DEPT_ICONS: Record<string, string> = {
  Engineering: "⚙️",
  Design: "🎨",
  Operations: "📋",
  Marketing: "📣",
};

export default function CareersPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <span style={{ display: "inline-block", padding: "4px 14px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 16 }}>WE&apos;RE HIRING</span>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, color: "#E8EDF5", margin: "0 0 16px", lineHeight: 1.1 }}>
          Build the future of African talent
        </h1>
        <p style={{ fontSize: 17, color: "#8892A4", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
          COSPRONOS Media is a small team with outsized impact. We&apos;re building the platform that will train, place, and pay the next generation of African digital professionals.
        </p>
      </div>

      {/* Why work here */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { icon: "🚀", title: "Real impact", desc: "Your work directly affects thousands of interns building careers across Africa." },
            { icon: "🌍", title: "Remote first", desc: "Most roles are fully remote or hybrid. Build from wherever you work best." },
            { icon: "🎓", title: "Platform access", desc: "Full access to CIOS tools, AI features, and the intern community." },
            { icon: "💰", title: "Performance pay", desc: "Competitive salaries with performance bonuses tied to platform growth." },
            { icon: "⚡", title: "Move fast", desc: "Small team, big decisions. You ship, own, and iterate on full features — fast." },
            { icon: "📈", title: "Equity potential", desc: "Senior hires may be eligible for equity in the company's growth upside." },
          ].map((b) => (
            <div key={b.title} style={{ padding: "20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Open roles */}
      <section>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", marginBottom: 28 }}>
          Open positions ({OPEN_ROLES.length})
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {OPEN_ROLES.map((role) => (
            <div key={role.title} style={{ padding: "24px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{DEPT_ICONS[role.department] ?? "💼"}</span>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>{role.title}</h3>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#8892A4" }}>{role.department}</span>
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#8892A4" }}>{role.type}</span>
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#8892A4" }}>📍 {role.location}</span>
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${LEVEL_COLORS[role.level]}22`, color: LEVEL_COLORS[role.level] ?? "#8892A4" }}>{role.level}</span>
                  </div>
                </div>
                <a
                  href={`mailto:careers@cospronos.com?subject=Application: ${encodeURIComponent(role.title)}`}
                  style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  Apply →
                </a>
              </div>

              <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: "0 0 12px" }}>{role.desc}</p>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {role.skills.map((s) => (
                  <span key={s} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(30,136,229,0.1)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.2)" }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open application */}
      <div style={{ marginTop: 48, textAlign: "center", padding: "36px 24px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🙌</div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>Don&apos;t see your role?</h3>
        <p style={{ color: "#8892A4", fontSize: 14, marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
          We build teams around exceptional people. If you believe you can make CIOS better, send us a note.
        </p>
        <a
          href="mailto:careers@cospronos.com?subject=Open Application"
          style={{ display: "inline-block", padding: "11px 24px", borderRadius: 12, background: "rgba(255,255,255,0.06)", color: "#E8EDF5", fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          Send open application
        </a>
      </div>
    </div>
  );
}
