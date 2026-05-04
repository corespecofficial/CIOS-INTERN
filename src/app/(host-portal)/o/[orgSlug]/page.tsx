/**
 * Host-portal dashboard — the first thing the host sees when entering
 * their org. Shows a few signal counts; deeper analytics ship in Phase 5.
 */

import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { cached, orgCacheKey, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

interface DashboardCounts {
  students: number;
  instructors: number;
  lessons: number;
  assignments: number;
}

/**
 * Dashboard counts. Cached at TTL.short (60s) + busted on every write via
 * bustOrgCache() in org-portal.ts. At 1000 students × 100 orgs × 10 page
 * views/day this drops Postgres count() traffic by >95%.
 */
async function getCounts(orgId: string): Promise<DashboardCounts> {
  return cached<DashboardCounts>(orgCacheKey.dashboard(orgId), TTL.short, async () => {
    const sb = supabaseAdmin();
    const [students, instructors, lessons, assignments] = await Promise.all([
      sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("role", "student").eq("status", "active"),
      sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("role", ["instructor", "org_admin"]).eq("status", "active"),
      sb.from("org_lessons").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      sb.from("org_assignments").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]);
    return {
      students: students.count ?? 0,
      instructors: instructors.count ?? 0,
      lessons: lessons.count ?? 0,
      assignments: assignments.count ?? 0,
    };
  });
}

export default async function OrgDashboard({ params }: Props) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const counts = await getCounts(ctx.org.id);

  const cards = [
    { label: "Students", value: counts.students, color: "#1E88E5" },
    { label: "Staff", value: counts.instructors, color: "#9C27B0" },
    { label: "Lessons", value: counts.lessons, color: "#26A69A" },
    { label: "Assignments", value: counts.assignments, color: "#FFA726" },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px 0" }}>
        {ctx.org.name}
      </h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 28px 0" }}>
        Welcome back. This is your private host portal — nothing here is visible to other orgs.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: "#111827",
              border: "1px solid #1F2937",
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: 20, background: "#111827", border: "1px solid #1F2937", borderRadius: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px 0" }}>Get started</h2>
        <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#8892A4", fontSize: 13, lineHeight: 1.8 }}>
          <li>Add your first lesson under <strong style={{ color: "#E8EDF5" }}>Lessons</strong></li>
          <li>Invite co-instructors from <strong style={{ color: "#E8EDF5" }}>Members</strong></li>
          <li>Pin an announcement so new students see it first</li>
        </ul>
      </div>
    </div>
  );
}
