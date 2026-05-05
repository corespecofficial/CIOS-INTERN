/**
 * Host analytics. Pulls from three primary sources:
 *
 *   - org_members (active student roster)
 *   - org_assignments + org_submissions (engagement + grades)
 *   - user_events (page_view meta.path = `/s/<slug>/lessons/...`)
 *
 * No new tables, no migration. All queries are bounded (last 30 days
 * window for engagement) and indexed.
 *
 * The goal is to give the host the two questions they actually ask:
 *   1. Are people engaging with my lessons?
 *   2. Who's behind and needs a nudge?
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Student { id: string; name: string | null; email: string | null }
interface Assignment { id: string; title: string; due_at: string | null; created_at: string }
interface Submission { id: string; assignment_id: string; student_id: string; grade: number | null; submitted_at: string }

const WINDOW_DAYS = 30;

export default async function AnalyticsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const isHost = ctx.isSuperAdmin || (ctx.memberRole && ["owner", "org_admin", "instructor"].includes(ctx.memberRole));
  if (!isHost) notFound();

  const sb = supabaseAdmin();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const lessonPathPrefix = `/s/${orgSlug}/lessons/`;

  const [rosterRes, assignmentsRes, submissionsRes, lessonViewsRes] = await Promise.all([
    sb.from("org_members")
      .select("user_id, users:user_id(id, name, email)")
      .eq("org_id", ctx.org.id)
      .eq("role", "student")
      .eq("status", "active"),
    sb.from("org_assignments")
      .select("id, title, due_at, created_at")
      .eq("org_id", ctx.org.id)
      .order("created_at", { ascending: false })
      .limit(20),
    sb.from("org_submissions")
      .select("id, assignment_id, student_id, grade, submitted_at")
      .eq("org_id", ctx.org.id)
      .gte("submitted_at", since),
    // Lesson page-views in the last window. user_events.meta is JSONB;
    // we filter by path prefix on the JSON field. This works because
    // logActivity stores meta = { path: "/s/<slug>/lessons/<id>" } for
    // page_view events.
    sb.from("user_events")
      .select("user_id, meta, created_at")
      .eq("event", "page_view")
      .gte("created_at", since)
      .like("meta->>path", `${lessonPathPrefix}%`)
      .limit(5000),
  ]);

  const roster = ((rosterRes.data || []) as unknown as Array<{ user_id: string; users: Student | null }>)
    .map((r) => r.users)
    .filter((u): u is Student => !!u);
  const assignments = (assignmentsRes.data || []) as Assignment[];
  const submissions = (submissionsRes.data || []) as Submission[];
  type ViewRow = { user_id: string; meta: { path?: string } | null; created_at: string };
  const lessonViews = (lessonViewsRes.data || []) as ViewRow[];

  // ─── Top-level metrics ──────────────────────────────────────────
  const studentCount = roster.length;
  const activeStudentIds = new Set<string>();
  for (const v of lessonViews) activeStudentIds.add(v.user_id);
  for (const s of submissions) activeStudentIds.add(s.student_id);
  const activeCount = activeStudentIds.size;
  const inactiveCount = Math.max(0, studentCount - activeCount);
  const avgGrade = (() => {
    const graded = submissions.filter((s) => s.grade !== null) as Array<Submission & { grade: number }>;
    if (graded.length === 0) return null;
    return graded.reduce((acc, s) => acc + s.grade, 0) / graded.length;
  })();

  // ─── Per-assignment engagement ──────────────────────────────────
  const subsByAssignment = new Map<string, Submission[]>();
  for (const s of submissions) {
    const arr = subsByAssignment.get(s.assignment_id) || [];
    arr.push(s);
    subsByAssignment.set(s.assignment_id, arr);
  }
  const assignmentRows = assignments.map((a) => {
    const subs = subsByAssignment.get(a.id) || [];
    const submitterIds = new Set(subs.map((s) => s.student_id));
    const submitted = submitterIds.size;
    const rate = studentCount > 0 ? submitted / studentCount : 0;
    const grades = subs.map((s) => s.grade).filter((g): g is number => g !== null);
    const avg = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
    return { ...a, submitted, rate, avg };
  });

  // ─── "Behind" list ──────────────────────────────────────────────
  // Students with zero submissions in the window AND zero lesson views.
  // Sorted by name; capped at 20 to keep the page tight.
  const behind = roster
    .filter((u) => !activeStudentIds.has(u.id))
    .slice()
    .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""))
    .slice(0, 20);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>📈 Analytics</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: 0 }}>
            Last {WINDOW_DAYS} days of activity for <strong style={{ color: "#E8EDF5" }}>{ctx.org.name}</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <a
            href={`/api/orgs/${ctx.org.id}/analytics.csv?kind=assignments`}
            style={csvBtn}
            title="Download per-assignment CSV"
          >⬇ Assignments.csv</a>
          <a
            href={`/api/orgs/${ctx.org.id}/analytics.csv?kind=students`}
            style={csvBtn}
            title="Download per-student CSV"
          >⬇ Students.csv</a>
        </div>
      </div>

      {/* Top-level stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat label="Active students" value={`${activeCount} / ${studentCount}`} sub={studentCount > 0 ? `${Math.round((activeCount / studentCount) * 100)}% engaged` : "—"} color="#26A69A" />
        <Stat label="Inactive (need nudge)" value={String(inactiveCount)} sub={`${WINDOW_DAYS}-day quiet`} color={inactiveCount > 0 ? "#FFA726" : "#5A6478"} />
        <Stat label="Submissions" value={String(submissions.length)} sub={`${assignments.length} assignments tracked`} color="#1E88E5" />
        <Stat label="Average grade" value={avgGrade === null ? "—" : `${avgGrade.toFixed(1)}`} sub={avgGrade === null ? "No graded work yet" : "across graded subs"} color="#9C27B0" />
      </div>

      {/* Per-assignment table */}
      <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Per-assignment engagement</h2>
        {assignmentRows.length === 0 ? (
          <Empty text="No assignments yet — create one to start tracking submissions." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <Th>Assignment</Th>
                  <Th align="right">Submitted</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Avg grade</Th>
                  <Th align="right">Due</Th>
                </tr>
              </thead>
              <tbody>
                {assignmentRows.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <Td>
                      <Link href={`/o/${orgSlug}/assignments/${r.id}`} style={{ color: "#E8EDF5", textDecoration: "none" }}>
                        {r.title}
                      </Link>
                    </Td>
                    <Td align="right">{r.submitted} / {studentCount}</Td>
                    <Td align="right">
                      <span style={{ color: r.rate >= 0.7 ? "#26A69A" : r.rate >= 0.4 ? "#FFA726" : "#EF5350" }}>
                        {Math.round(r.rate * 100)}%
                      </span>
                    </Td>
                    <Td align="right">{r.avg === null ? "—" : r.avg.toFixed(1)}</Td>
                    <Td align="right" muted>{r.due_at ? new Date(r.due_at).toLocaleDateString() : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Behind list */}
      <section style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>Students who haven&apos;t engaged</h2>
        <p style={{ fontSize: 12, color: "#5A6478", margin: "0 0 14px" }}>
          No lesson views or submissions in the last {WINDOW_DAYS} days. Consider an announcement or a personal message.
        </p>
        {behind.length === 0 ? (
          <Empty text="🎉 Everyone has been active in the window. Nice." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {behind.map((u) => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#0A0E1A", borderRadius: 8, fontSize: 13 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: "#E8EDF5", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.name || "Unnamed"}
                  </div>
                  <div style={{ color: "#5A6478", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.email || "—"}
                  </div>
                </div>
                <Link href={`/o/${orgSlug}/members`} style={{ fontSize: 11, color: "#1E88E5", textDecoration: "none", flexShrink: 0 }}>View →</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#5A6478", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ textAlign: align, padding: "8px 6px", color: "#5A6478", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {children}
    </th>
  );
}
function Td({ children, align = "left", muted = false }: { children: React.ReactNode; align?: "left" | "right"; muted?: boolean }) {
  return (
    <td style={{ textAlign: align, padding: "10px 6px", color: muted ? "#5A6478" : "#E8EDF5" }}>
      {children}
    </td>
  );
}
function Empty({ text }: { text: string }) {
  return <div style={{ padding: 20, color: "#5A6478", fontSize: 13, textAlign: "center" }}>{text}</div>;
}

const csvBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "8px 12px",
  background: "rgba(38,166,154,0.10)",
  color: "#26A69A",
  border: "1px solid rgba(38,166,154,0.30)",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
};
