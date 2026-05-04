/**
 * Visitor home dashboard — the landing surface every signed-in
 * public_user sees first. Sections, in priority order:
 *
 *   1. My classes — orgs the visitor is an active member of, with a
 *      direct link to /s/<slug>. THIS IS THE MOST IMPORTANT BIT —
 *      without it a visitor who enrolled via a code has no way back
 *      into their class from the home page.
 *   2. Applications — pending / decided role applications, since
 *      those are the user's open loops with the platform.
 *   3. Recommended spaces — filtered by the tracks the visitor
 *      tagged during the welcome carousel; falls back to
 *      top-by-rating if they tagged nothing.
 *   4. Discover tiles — Opportunities / Hackathons / Mentorship.
 */

import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

const TRACK_TO_CATEGORY: Record<string, string> = {
  design: "UI/UX Design",
  dev: "Web Development",
  marketing: "Digital Marketing",
  content: "Copywriting",
  ai: "AI & Automation",
  video: "Video Editing",
  data: "Data Analytics",
  product: "Business Development",
};

export default async function VisitorDashboard() {
  const me = await getCurrentDbUser();
  if (!me) return null;
  const sb = supabaseAdmin();

  // Pull visitor preferences (tagged during /onboarding/visitor-welcome)
  // so we can personalise the spaces section.
  const { data: signalsRow } = await sb
    .from("users")
    .select("signup_signals")
    .eq("id", me.id)
    .maybeSingle();
  const signals = (signalsRow as { signup_signals?: Record<string, unknown> } | null)?.signup_signals ?? {};
  const tracks = Array.isArray((signals as { visitor_prefs?: { tracks?: string[] } }).visitor_prefs?.tracks)
    ? ((signals as { visitor_prefs: { tracks: string[] } }).visitor_prefs.tracks)
    : [];
  const preferredCategories = Array.from(new Set(tracks.map((t) => TRACK_TO_CATEGORY[t]).filter(Boolean)));

  const [classesRes, applicationsRes, spacesRes] = await Promise.all([
    // org_members joined to creative_orgs — visitor's active enrollments.
    // Order by joined_at so the most recently joined comes first.
    sb
      .from("org_members")
      .select("role, joined_at, creative_orgs!inner(id, slug, name, status)")
      .eq("user_id", me.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(8),
    sb
      .from("role_applications")
      .select("id, applied_role, status, created_at")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(5),
    // Personalised pull. If the visitor tagged tracks, fetch spaces in
    // those categories first; otherwise fall back to top-by-rating.
    preferredCategories.length > 0
      ? sb
          .from("creative_spaces")
          .select("id, slug, title, category, rating, enrollment_count")
          .eq("status", "approved")
          .in("category", preferredCategories)
          .order("rating", { ascending: false })
          .order("enrollment_count", { ascending: false })
          .limit(6)
      : sb
          .from("creative_spaces")
          .select("id, slug, title, category, rating, enrollment_count")
          .eq("status", "approved")
          .order("rating", { ascending: false })
          .limit(6),
  ]);

  type ClassRow = { role: string; joined_at: string; creative_orgs: { id: string; slug: string; name: string; status: string } };
  type App = { id: string; applied_role: string; status: string; created_at: string };
  type Space = { id: string; slug: string; title: string; category: string; rating: number; enrollment_count: number };

  // Filter out enrollments in suspended/archived orgs from the home
  // surface — those orgs already render the "your class is paused"
  // explainer page, no need to surface a broken-feeling card here.
  const classes = ((classesRes.data || []) as unknown as ClassRow[])
    .filter((c) => c.creative_orgs.status === "active");
  const apps = (applicationsRes.data || []) as App[];
  let spaces = (spacesRes.data || []) as Space[];

  // Personalised pull may return empty (visitor's preferred categories
  // have no approved spaces yet). Fall through to a generic top-rated
  // pull so the section is never blank when there ARE spaces overall.
  if (preferredCategories.length > 0 && spaces.length === 0) {
    const fallback = await sb
      .from("creative_spaces")
      .select("id, slug, title, category, rating, enrollment_count")
      .eq("status", "approved")
      .order("rating", { ascending: false })
      .limit(6);
    spaces = (fallback.data || []) as Space[];
  }

  // De-dup: if the visitor is already a member of a recommended
  // space's org, we shouldn't recommend it back to them. Map by
  // creative_orgs.id; we already have the IDs from the classes pull.
  const memberOrgIds = new Set(classes.map((c) => c.creative_orgs.id));

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px 0" }}>Welcome, {me.name?.split(" ")[0] || "friend"}</h1>
      <p style={{ color: "#8892A4", fontSize: 14, margin: "0 0 28px 0" }}>
        Your visitor space. Browse, apply, save — when you find the right org or program you can level up from here.
      </p>

      {/* My classes — the user's active enrollments. Largest, top of page. */}
      {classes.length > 0 && (
        <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🏫 My classes</h2>
            <Link href="/s" style={{ fontSize: 11, color: "#26A69A", textDecoration: "none" }}>All my classes →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {classes.map((c) => (
              <Link
                key={c.creative_orgs.id}
                href={`/s/${c.creative_orgs.slug}`}
                style={{ background: "#0A0E1A", border: "1px solid rgba(38,166,154,0.30)", borderRadius: 10, padding: 14, textDecoration: "none", color: "#E8EDF5", display: "block" }}
              >
                <div style={{ fontSize: 10, color: "#26A69A", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 }}>
                  {c.role === "student" ? "Student" : c.role.replace("_", " ")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.creative_orgs.name}</div>
                <div style={{ fontSize: 11, color: "#5A6478" }}>Joined {new Date(c.joined_at).toLocaleDateString()}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Applications — pending or decided. Hidden when empty. */}
      {apps.length > 0 && (
        <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>📨 My applications</h2>
            <Link href="/visitor/applications" style={{ fontSize: 11, color: "#1E88E5", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {apps.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0A0E1A", borderRadius: 8, fontSize: 13 }}>
                <span>Applied as <strong>{a.applied_role.replace("_", " ")}</strong> · {new Date(a.created_at).toLocaleDateString()}</span>
                <StatusBadge value={a.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended spaces — personalised when we have signals. */}
      <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
            {preferredCategories.length > 0 ? "🌟 Picked for you" : "🌟 Top creative spaces"}
          </h2>
          <Link href="/creative-space" style={{ fontSize: 11, color: "#1E88E5", textDecoration: "none" }}>Browse all →</Link>
        </div>
        {preferredCategories.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {preferredCategories.slice(0, 6).map((c) => (
              <span key={c} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 999, background: "rgba(30,136,229,0.10)", color: "#1E88E5", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                {c}
              </span>
            ))}
          </div>
        )}
        {spaces.length === 0 ? (
          <div style={{ padding: 20, color: "#5A6478", fontSize: 13, textAlign: "center" }}>No spaces approved yet — check back soon.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {spaces.filter((s) => !memberOrgIds.has(s.id)).map((s) => (
              <Link key={s.id} href={`/creative-space/${s.slug || s.id}`} style={{ background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 10, padding: 14, textDecoration: "none", color: "#E8EDF5" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.category}</div>
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 6 }}>{s.enrollment_count} enrolled · ⭐ {Number(s.rating || 0).toFixed(1)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Discover tiles */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Discover href="/opportunities" emoji="💼" title="Opportunities" blurb="Internships, gigs, and roles." />
        <Discover href="/hackathons" emoji="🏆" title="Hackathons" blurb="Compete and win." />
        <Discover href="/mentorship" emoji="🎓" title="Mentorship" blurb="Find a mentor." />
        <Discover href="/onboarding/intent" emoji="🚀" title="Become more" blurb="Apply as recruiter, mentor, instructor…" />
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
