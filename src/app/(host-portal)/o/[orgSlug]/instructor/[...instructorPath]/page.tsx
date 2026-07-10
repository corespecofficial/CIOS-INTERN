import Link from "next/link";
import type React from "react";
import { getOrgContextOr404, requireOrgRole } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["owner", "org_admin", "instructor"] as const;

const MODULES: Record<string, { title: string; icon: string; desc: string }> = {
  students: { title: "Students", icon: "👥", desc: "Interns enrolled in this organization." },
  submissions: { title: "Submissions", icon: "📝", desc: "Assignments and course submissions for this org." },
  "schedule-class": { title: "Schedule Class", icon: "📅", desc: "Plan live classes for this org." },
  quizzes: { title: "Quizzes", icon: "❓", desc: "Quiz activity from org-scoped courses." },
  certificates: { title: "Certificates", icon: "🏆", desc: "Completion certificates issued inside this org." },
  earnings: { title: "Earnings", icon: "💰", desc: "Org-scoped instructor earnings and payouts." },
};

export default async function OrgInstructorModulePage({
  params,
}: {
  params: Promise<{ orgSlug: string; instructorPath: string[] }>;
}) {
  const { orgSlug, instructorPath } = await params;
  const ctx = await getOrgContextOr404(orgSlug);
  requireOrgRole(ctx, STAFF_ROLES);
  const key = instructorPath.join("/");
  const mod = MODULES[key] ?? { title: titleize(instructorPath.at(-1) || "Instructor"), icon: "🎓", desc: "Org-scoped instructor workspace." };

  const sb = supabaseAdmin();
  const [students, courses, submissions] = await Promise.all([
    sb.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id).eq("role", "student").eq("status", "active"),
    sb.from("courses").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    sb.from("module_submissions").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
  ]);

  return (
    <div style={{ maxWidth: 1050, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
      <section style={{ background: "linear-gradient(135deg, rgba(171,71,188,0.14), rgba(30,136,229,0.08))", border: "1px solid rgba(171,71,188,0.22)", borderRadius: 16, padding: 24 }}>
        <span style={{ display: "inline-block", background: "rgba(171,71,188,0.22)", color: "#EC5CFF", fontSize: 11, fontWeight: 900, padding: "4px 12px", borderRadius: 999 }}>
          ORG INSTRUCTOR
        </span>
        <h1 style={{ margin: "10px 0 4px", color: "#E8EDF5", fontSize: 28, fontWeight: 900 }}>{mod.icon} {mod.title}</h1>
        <p style={{ margin: 0, color: "#A9B4C7" }}>{mod.desc}</p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <Stat label="Students" value={students.count ?? 0} color="#1E88E5" />
        <Stat label="Courses" value={courses.count ?? 0} color="#AB47BC" />
        <Stat label="Submissions" value={submissions.count ?? 0} color="#66BB6A" />
      </div>

      <section style={panel}>
        <h2 style={{ margin: "0 0 12px", color: "#E8EDF5", fontSize: 18 }}>Org-scoped workflow</h2>
        <p style={{ color: "#8892A4", margin: "0 0 16px", lineHeight: 1.6 }}>
          This page is wired to the current org. Use the course builder for rich lessons, quizzes, and assignments while the detailed reporting surfaces are filled from this org&apos;s data.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/o/${orgSlug}/instructor/create-course`} style={primary}>Create course</Link>
          <Link href={`/o/${orgSlug}/instructor`} style={ghost}>Course dashboard</Link>
          <Link href={`/o/${orgSlug}/admin/audit-logs`} style={ghost}>Audit logs</Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ ...panel, borderLeft: `4px solid ${color}` }}>
      <div style={{ color, fontSize: 28, fontWeight: 900 }}>{value.toLocaleString()}</div>
      <div style={{ color: "#A9B4C7", fontSize: 13 }}>{label}</div>
    </div>
  );
}

function titleize(input: string) {
  return input.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 22 };
const primary: React.CSSProperties = { background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", textDecoration: "none", borderRadius: 12, padding: "11px 16px", fontWeight: 800 };
const ghost: React.CSSProperties = { background: "#0A0E1A", color: "#E8EDF5", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "11px 16px", fontWeight: 800 };
