import Link from "next/link";
import type React from "react";
import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

type CourseRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  difficulty: string;
  thumbnail_url: string | null;
  total_modules: number;
  total_enrolled: number;
  status: string;
};

const STAFF_ROLES = new Set(["owner", "org_admin", "instructor", "moderator", "finance", "support", "mentor"]);

export default async function OrgCoursesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const canPreviewDraft = ctx.isSuperAdmin || STAFF_ROLES.has(ctx.memberRole || "");
  let coursesQuery = sb
    .from("courses")
    .select("id, title, subtitle, category, difficulty, thumbnail_url, total_modules, total_enrolled, status")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  coursesQuery = canPreviewDraft
    ? coursesQuery.in("status", ["published", "draft"])
    : coursesQuery.eq("status", "published");

  const [coursesRes, enrollmentRes, legacyLessonCount, assignmentCountRes] = await Promise.all([
    coursesQuery,
    sb.from("course_enrollments")
      .select("course_id, progress, status")
      .eq("org_id", ctx.org.id)
      .eq("user_id", ctx.me.id),
    sb.from("org_lessons")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.org.id),
    sb.from("org_assignments")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.org.id),
  ]);

  const courses = (coursesRes.data || []) as CourseRow[];
  const enrollments = new Map(((enrollmentRes.data || []) as Array<{ course_id: string; progress: number; status: string }>).map((row) => [row.course_id, row]));
  const completeCount = Array.from(enrollments.values()).filter((row) => row.progress >= 100 || row.status === "completed").length;

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={hero}>
        <div style={{ fontSize: 38 }}>🎓</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={eyebrow}>LEARNING HUB</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#E8EDF5", margin: 0 }}>Courses</h1>
          <p style={{ fontSize: 14, color: "#8892A4", margin: "4px 0 0" }}>
            {completeCount} completed · {courses.length} available · {assignmentCountRes.count ?? 0} assignments
          </p>
        </div>
        <Link href={`/s/${orgSlug}/classroom`} style={btnPrimary}>Open classroom</Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <span style={activeTab}>📖 Continue learning ({enrollments.size})</span>
        <span style={activeTabAlt}>🔍 Browse catalog ({courses.length})</span>
        <Link href={`/s/${orgSlug}/tasks`} style={tabLink}>📋 Tasks</Link>
        <Link href={`/s/${orgSlug}/files`} style={tabLink}>📁 Resources</Link>
      </div>

      {courses.length === 0 ? (
        <div style={empty}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📚</div>
          <p style={{ fontSize: 14, color: "#8892A4", margin: "0 0 16px" }}>
            No rich LMS courses are available in this organization yet.
          </p>
          {(legacyLessonCount.count ?? 0) > 0 && (
            <Link href={`/s/${orgSlug}/lessons`} style={btnPrimary}>
              View legacy lessons
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {courses.map((course) => {
            const enrollment = enrollments.get(course.id);
            const progress = enrollment?.progress ?? 0;
            return (
              <Link key={course.id} href={`/s/${orgSlug}/courses/${course.id}`} style={card}>
                <div style={{
                  height: 178,
                  background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : "linear-gradient(135deg, #1E88E5, #AB47BC)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {!course.thumbnail_url && <span style={{ fontSize: 64 }}>📚</span>}
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ color: "#1E88E5", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                    {course.category} · {course.difficulty}
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 900, color: "#E8EDF5", margin: "0 0 6px" }}>{course.title}</h2>
                  <p style={{ color: "#8892A4", fontSize: 13, lineHeight: 1.45, minHeight: 38, margin: 0 }}>
                    {course.subtitle || "Open this course to continue learning."}
                  </p>
                  <div style={{ color: "#8892A4", fontSize: 13, marginTop: 18 }}>
                    {course.total_modules} lesson{course.total_modules === 1 ? "" : "s"} · {course.total_enrolled} student{course.total_enrolled === 1 ? "" : "s"}
                  </div>
                  <div style={{ marginTop: 12, height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #1E88E5, #66BB6A)" }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const hero: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(30,136,229,0.15), rgba(171,71,188,0.08))",
  border: "1px solid rgba(30,136,229,0.2)",
  borderRadius: 18,
  padding: "26px 30px",
  marginBottom: 24,
  display: "flex",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
};

const eyebrow: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  background: "rgba(30,136,229,0.18)",
  color: "#1E88E5",
  fontSize: 11,
  fontWeight: 900,
  borderRadius: 999,
  letterSpacing: 0.5,
  marginBottom: 6,
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: 10,
  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 900,
  textDecoration: "none",
};

const activeTab: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "11px 16px",
  borderRadius: 10,
  background: "#1E88E5",
  color: "#fff",
  fontSize: 13,
  fontWeight: 900,
};

const activeTabAlt: React.CSSProperties = {
  ...activeTab,
  background: "#111827",
  color: "#A9B4C7",
  border: "1px solid rgba(255,255,255,0.07)",
};

const tabLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "11px 16px",
  borderRadius: 10,
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "#8892A4",
  fontSize: 13,
  fontWeight: 900,
  textDecoration: "none",
};

const empty: React.CSSProperties = {
  padding: 44,
  textAlign: "center",
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
};

const card: React.CSSProperties = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  overflow: "hidden",
  textDecoration: "none",
  color: "#E8EDF5",
};
