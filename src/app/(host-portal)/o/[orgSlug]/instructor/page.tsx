import Link from "next/link";
import type React from "react";
import { getOrgContextOr404, requireOrgRole } from "@/lib/active-org";
import { getOrgCoursesForInstructor } from "@/lib/db";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["owner", "org_admin", "instructor"] as const;

export default async function OrgInstructorPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContextOr404(orgSlug);
  requireOrgRole(ctx, STAFF_ROLES);
  const courses = await getOrgCoursesForInstructor(ctx.org.id);
  const basePath = `/o/${orgSlug}/instructor`;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <section style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.14), rgba(30,136,229,0.08))",
        border: "1px solid rgba(171,71,188,0.24)",
        borderRadius: 16,
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
      }}>
        <div>
          <span style={{ display: "inline-block", background: "#AB47BC", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999, letterSpacing: 0.5 }}>
            ORG INSTRUCTOR
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#E8EDF5", margin: "10px 0 4px" }}>
            Instructor Dashboard
          </h1>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0 }}>
            Manage courses, lessons, quizzes, assignments, and progress for {ctx.org.name}.
          </p>
        </div>
        <Link href={`${basePath}/create-course`} style={primaryButton}>+ Create course</Link>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href={`${basePath}/create-course`} style={primaryButton}>+ Create course</Link>
        <Link href={`${basePath}/students`} style={ghostButton}>👥 Students</Link>
        <Link href={`${basePath}/submissions`} style={ghostButton}>📝 Submissions</Link>
        <Link href={`${basePath}/schedule-class`} style={ghostButton}>📅 Schedule class</Link>
        <Link href={`${basePath}/certificates`} style={ghostButton}>🏆 Certificates</Link>
        <Link href={`${basePath}/earnings`} style={ghostButton}>💰 Earnings</Link>
      </div>

      <section>
        <h2 style={{ color: "#E8EDF5", fontSize: 18, margin: "0 0 16px" }}>
          Org Courses
        </h2>
        {courses.length === 0 ? (
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 32, textAlign: "center" }}>
            <p style={{ color: "#8892A4", margin: "0 0 14px" }}>No courses yet. Create the first org course to unlock the full builder.</p>
            <Link href={`${basePath}/create-course`} style={primaryButton}>Create first course</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`${basePath}/course-builder/${course.id}`}
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", textDecoration: "none", color: "#E8EDF5" }}
              >
                <div style={{ height: 132, background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : "linear-gradient(135deg, #AB47BC, #1E88E5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {!course.thumbnail_url && <span style={{ fontSize: 46 }}>📚</span>}
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ color: "#1E88E5", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{course.category} · {course.difficulty}</div>
                  <h3 style={{ fontSize: 16, margin: "8px 0", color: "#E8EDF5" }}>{course.title}</h3>
                  <p style={{ margin: 0, color: "#8892A4", fontSize: 13 }}>
                    {course.total_modules} lesson{course.total_modules === 1 ? "" : "s"} · {course.total_enrolled} student{course.total_enrolled === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  background: "linear-gradient(135deg, #AB47BC, #8E24AA)",
  color: "#fff",
  textDecoration: "none",
  border: "none",
  borderRadius: 12,
  padding: "12px 20px",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const ghostButton: React.CSSProperties = {
  background: "#111827",
  color: "#E8EDF5",
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: "12px 20px",
  fontSize: 13,
  fontWeight: 700,
};
