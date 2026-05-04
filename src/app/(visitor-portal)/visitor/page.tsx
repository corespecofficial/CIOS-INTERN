import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VisitorDashboard() {
  const me = await getCurrentDbUser();
  if (!me) return null;
  const sb = supabaseAdmin();

  const [applicationsRes, spacesRes] = await Promise.all([
    sb.from("role_applications").select("id, applied_role, status, created_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(5),
    sb.from("creative_spaces").select("id, slug, title, category, rating, enrollment_count").eq("status", "approved").order("rating", { ascending: false }).limit(6),
  ]);

  type App = { id: string; applied_role: string; status: string; created_at: string };
  type Space = { id: string; slug: string; title: string; category: string; rating: number; enrollment_count: number };
  const apps = (applicationsRes.data || []) as App[];
  const spaces = (spacesRes.data || []) as Space[];

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px 0" }}>Welcome, {me.name?.split(" ")[0] || "friend"}</h1>
      <p style={{ color: "#8892A4", fontSize: 14, margin: "0 0 28px 0" }}>
        Your visitor space. Browse, apply, save — when you find the right org or program you can level up from here.
      </p>

      {apps.length > 0 && (
        <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>📨 My applications</h2>
            <Link href="/visitor/applications" style={{ fontSize: 11, color: "#1E88E5", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {apps.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0A0E1A", borderRadius: 8, fontSize: 13 }}>
                <span>Applied as <strong>{a.applied_role}</strong> · {new Date(a.created_at).toLocaleDateString()}</span>
                <StatusBadge value={a.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🌟 Top creative spaces</h2>
          <Link href="/creative-space" style={{ fontSize: 11, color: "#1E88E5", textDecoration: "none" }}>Browse all →</Link>
        </div>
        {spaces.length === 0 ? (
          <div style={{ padding: 20, color: "#5A6478", fontSize: 13, textAlign: "center" }}>No spaces approved yet — check back soon.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {spaces.map((s) => (
              <Link key={s.id} href={`/creative-space/${s.slug || s.id}`} style={{ background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 10, padding: 14, textDecoration: "none", color: "#E8EDF5" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.category}</div>
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 6 }}>{s.enrollment_count} enrolled · ⭐ {Number(s.rating || 0).toFixed(1)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Discover href="/opportunities" emoji="💼" title="Opportunities" blurb="Internships, gigs, and roles." />
        <Discover href="/hackathons" emoji="🏆" title="Hackathons" blurb="Compete and win." />
        <Discover href="/mentorship" emoji="🎓" title="Mentorship" blurb="Find a mentor." />
      </section>
    </div>
  );
}

function Discover({ href, emoji, title, blurb }: { href: string; emoji: string; title: string; blurb: string }) {
  return (
    <Link href={href} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16, textDecoration: "none", color: "#E8EDF5" }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{blurb}</div>
    </Link>
  );
}

function StatusBadge({ value }: { value: string }) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "#FFA726", label: "Pending review" },
    approved: { color: "#26A69A", label: "Approved" },
    rejected: { color: "#FF8A80", label: "Not approved" },
    withdrawn: { color: "#5A6478", label: "Withdrawn" },
  };
  const x = map[value] || map.pending;
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${x.color}22`, color: x.color, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{x.label}</span>;
}
