import Link from "next/link";
import type React from "react";
import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { getCourseWithModulesForEditor, getCourseWithModulesForViewer, getMyEnrollment } from "@/lib/db";

export const dynamic = "force-dynamic";

const STAFF_ROLES = new Set(["owner", "org_admin", "instructor", "moderator", "finance", "support", "mentor"]);

export default async function OrgCourseDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const canPreviewDraft = ctx.isSuperAdmin || STAFF_ROLES.has(ctx.memberRole || "");
  const result = canPreviewDraft
    ? await getCourseWithModulesForEditor(id)
    : await getCourseWithModulesForViewer(id);
  const { course, modules } = result;

  if (!course || course.org_id !== ctx.org.id) notFound();
  if (course.status !== "published" && !canPreviewDraft) notFound();

  const enrollment = await getMyEnrollment(course.id);
  const completed = new Set(enrollment?.completedModules || []);
  const progress = enrollment?.progress ?? 0;

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <Link href={`/s/${orgSlug}/courses`} style={backLink}>
        ← Courses
      </Link>

      <section style={hero}>
        <div
          style={{
            ...thumbnail,
            background: course.thumbnail_url
              ? `url(${course.thumbnail_url}) center/cover`
              : "linear-gradient(135deg, #1E88E5, #AB47BC)",
          }}
        >
          {!course.thumbnail_url && <span style={{ fontSize: 74 }}>📚</span>}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={eyebrow}>{course.category || "Learning"} · {course.difficulty || "Beginner"}</div>
          <h1 style={{ color: "#E8EDF5", fontSize: 34, lineHeight: 1.1, fontWeight: 900, margin: "8px 0" }}>
            {course.title}
          </h1>
          <p style={{ color: "#A9B4C7", fontSize: 16, lineHeight: 1.6, maxWidth: 760, margin: 0 }}>
            {course.description || course.subtitle || "Continue through the course modules at your own pace."}
          </p>

          <div style={statsRow}>
            <span>{modules.length} module{modules.length === 1 ? "" : "s"}</span>
            <span>{course.duration_hours || 0}h</span>
            <span>{course.total_enrolled || 0} enrolled</span>
            {course.status !== "published" && <span style={draftBadge}>Draft preview</span>}
          </div>

          <div style={progressShell}>
            <div style={{ ...progressFill, width: `${progress}%` }} />
          </div>
          <div style={{ color: "#8892A4", fontSize: 13, marginTop: 8 }}>{progress}% complete</div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 20, alignItems: "start" }}>
        <section style={panel}>
          <h2 style={sectionTitle}>Course Modules</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {modules.length === 0 ? (
              <div style={empty}>No modules have been added to this course yet.</div>
            ) : (
              modules.map((module, index) => {
                const isDone = completed.has(module.id);
                return (
                  <article key={module.id} style={moduleCard}>
                    <div style={moduleNumber}>{isDone ? "✓" : index + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <h3 style={{ color: "#E8EDF5", fontSize: 16, fontWeight: 900, margin: 0 }}>{module.title}</h3>
                        <span style={moduleType}>{module.type}</span>
                      </div>
                      <p style={{ color: "#8892A4", fontSize: 13, lineHeight: 1.5, margin: "6px 0 0" }}>
                        {module.summary || "Open this module in the classroom flow when it is assigned by your organization."}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside style={panel}>
          <h2 style={sectionTitle}>Org Course</h2>
          <div style={sideMetric}>
            <span>Status</span>
            <strong>{enrollment?.enrolled ? enrollment.status : "Available"}</strong>
          </div>
          <div style={sideMetric}>
            <span>Completed</span>
            <strong>{completed.size}/{modules.length}</strong>
          </div>
          <Link href={`/s/${orgSlug}/classroom`} style={primaryButton}>
            Open classroom
          </Link>
          <Link href={`/s/${orgSlug}/tasks`} style={secondaryButton}>
            View tasks
          </Link>
        </aside>
      </div>
    </div>
  );
}

const backLink: React.CSSProperties = {
  display: "inline-flex",
  color: "#8892A4",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 16,
};

const hero: React.CSSProperties = {
  display: "flex",
  gap: 24,
  flexWrap: "wrap",
  background: "linear-gradient(135deg, rgba(30,136,229,0.16), rgba(171,71,188,0.08))",
  border: "1px solid rgba(30,136,229,0.22)",
  borderRadius: 18,
  padding: 26,
  marginBottom: 22,
};

const thumbnail: React.CSSProperties = {
  width: 300,
  maxWidth: "100%",
  aspectRatio: "16 / 10",
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
};

const eyebrow: React.CSSProperties = {
  display: "inline-flex",
  padding: "5px 12px",
  borderRadius: 999,
  background: "rgba(30,136,229,0.18)",
  color: "#1E88E5",
  fontSize: 12,
  fontWeight: 900,
};

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 18,
  color: "#8892A4",
  fontSize: 13,
  fontWeight: 800,
};

const draftBadge: React.CSSProperties = {
  color: "#FFD54F",
  background: "rgba(255,213,79,0.12)",
  borderRadius: 999,
  padding: "2px 8px",
};

const progressShell: React.CSSProperties = {
  height: 8,
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
  marginTop: 18,
};

const progressFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #1E88E5, #66BB6A)",
};

const panel: React.CSSProperties = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  color: "#E8EDF5",
  fontSize: 18,
  fontWeight: 900,
  margin: "0 0 16px",
};

const moduleCard: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  padding: 16,
  borderRadius: 12,
  background: "rgba(10,14,26,0.72)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const moduleNumber: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  background: "rgba(30,136,229,0.16)",
  color: "#1E88E5",
  fontWeight: 900,
};

const moduleType: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  color: "#A9B4C7",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "capitalize",
};

const empty: React.CSSProperties = {
  color: "#8892A4",
  fontSize: 14,
  padding: 24,
  textAlign: "center",
};

const sideMetric: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#8892A4",
  fontSize: 13,
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const primaryButton: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: 18,
  padding: "12px 14px",
  borderRadius: 10,
  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
  color: "#fff",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  marginTop: 10,
  background: "rgba(255,255,255,0.06)",
  color: "#A9B4C7",
};
