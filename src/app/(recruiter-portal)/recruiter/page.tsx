import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { getRecruiterKPIs } from "@/app/actions/recruiter";

export const dynamic = "force-dynamic";

export default async function RecruiterHubPage() {
  const me = await getCurrentDbUser();
  const kpiRes = await getRecruiterKPIs();
  const kpis = kpiRes.ok ? kpiRes.data! : null;

  // Onboarding gate — no profile yet
  const { data: profile } = await supabaseAdmin().from("recruiter_profiles").select("company_name, verified").eq("user_id", me!.id).maybeSingle();
  if (!profile) {
    return (
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>🏢</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "8px 0" }}>Set up your company profile</h1>
        <p style={{ fontSize: 13, color: "#8892A4", marginBottom: 20 }}>One-time step before you can post opportunities and access talent.</p>
        <Link href="/recruiter/profile" style={btnPrimary}>Set up profile →</Link>
      </div>
    );
  }

  const hourGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const tasks: { label: string; count: number; href: string; color: string }[] = [
    { label: "Applicants to review",   count: kpis?.totalApplicants   || 0, href: "/recruiter/opportunities", color: "#1E88E5" },
    { label: "Shortlisted candidates", count: kpis?.shortlisted       || 0, href: "/recruiter/talent-pool",   color: "#FFC107" },
    { label: "Interviews scheduled",   count: kpis?.interviewsScheduled || 0, href: "/recruiter/interviews",  color: "#AB47BC" },
    { label: "Active opportunities",   count: kpis?.activeListings    || 0, href: "/recruiter/opportunities", color: "#66BB6A" },
  ];

  return (
    <div>
      {/* Welcome */}
      <div style={{ background: "linear-gradient(135deg, rgba(30,136,229,0.18), rgba(171,71,188,0.08))", border: "1px solid rgba(30,136,229,0.25)", borderRadius: 16, padding: 24, marginBottom: 18 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>RECRUITER WORKSPACE</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{hourGreeting}, {me?.name.split(" ")[0]} 👋</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 0 0" }}>Welcome to <strong style={{ color: "#E8EDF5" }}>{profile.company_name}</strong>{profile.verified && <span style={{ color: "#1E88E5", marginLeft: 6 }}>✓ verified</span>}</p>
      </div>

      {/* Today's tasks */}
      <h2 style={sectionH}>📌 Today's priorities</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20 }}>
        {tasks.map((t) => (
          <Link key={t.label} href={t.href} style={{ background: "#111827", border: `1px solid ${t.color}33`, borderRadius: 12, padding: 14, textDecoration: "none" }}>
            <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{t.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{t.count}</div>
          </Link>
        ))}
      </div>

      {/* Navigation cards */}
      <h2 style={sectionH}>🧭 Workspace</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 20 }}>
        <NavCard href="/recruiter/dashboard"     emoji="📊" title="Dashboard"      desc="KPIs, funnel, activity feed" />
        <NavCard href="/recruiter/opportunities" emoji="💼" title="Opportunities"  desc="Post, edit, track listings" />
        <NavCard href="/recruiter/talent-pool"   emoji="🌟" title="Talent Pool"    desc="Discover CIOS interns" />
        <NavCard href="/recruiter/interviews"    emoji="🎯" title="Interviews"     desc="Schedule + track outcomes" />
        <NavCard href="/recruiter/messages"      emoji="💬" title="Messages"       desc="Chat with candidates" />
        <NavCard href="/recruiter/reports"       emoji="📈" title="Reports"        desc="Hiring analytics + export" />
        <NavCard href="/recruiter/profile"       emoji="🏢" title="Company Profile" desc="Branding + preferences" />
        <NavCard href="/recruiter/settings"      emoji="⚙️" title="Settings"       desc="Account + team + privacy" />
      </div>

      {/* Recent activity */}
      <h2 style={sectionH}>🔔 Recent activity</h2>
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 14 }}>
        {(!kpis || kpis.activity.length === 0) && <div style={{ padding: 20, textAlign: "center", color: "#8892A4", fontSize: 13 }}>No recent activity yet. Post an opportunity to start.</div>}
        {kpis?.activity.map((a, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
            <span style={{ color: "#E8EDF5" }}>{a.summary}</span>
            <span style={{ color: "#8892A4", fontSize: 11 }}>{new Date(a.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavCard({ href, emoji, title, desc }: { href: string; emoji: string; title: string; desc: string }) {
  return (
    <Link href={href} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, textDecoration: "none", display: "block", transition: "border-color 0.15s" }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{title}</div>
      <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{desc}</div>
    </Link>
  );
}

const sectionH: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
const btnPrimary: React.CSSProperties = { padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block" };
