import Link from "next/link";
import { getMyCoursesAsInstructor, getCourseStudents } from "@/lib/db";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function StudentsPage() {
  const courses = await getMyCoursesAsInstructor();
  const withStudents = await Promise.all(courses.map(async (c) => ({
    course: c, students: await getCourseStudents(c.id),
  })));

  const totalStudents = withStudents.reduce((s, c) => s + c.students.length, 0);
  const avgProgress = totalStudents > 0
    ? Math.round(withStudents.flatMap((c) => c.students).reduce((s, st) => s + st.progress, 0) / totalStudents)
    : 0;

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
          INSTRUCTOR
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>Students</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>{totalStudents} learner{totalStudents === 1 ? "" : "s"} across {courses.length} course{courses.length === 1 ? "" : "s"} · {avgProgress}% average progress</p>
      </div>

      {courses.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🎤</div>
          <p style={{ fontSize: 14, color: "#8892A4", margin: "0 0 16px 0" }}>You haven&apos;t created any courses yet.</p>
          <Link href="/instructor/create-course" style={btnPrimary}>+ Create your first course</Link>
        </div>
      )}

      {withStudents.map(({ course, students }) => (
        <div key={course.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>{course.title}</h3>
              <p style={{ fontSize: 11, color: "#8892A4", margin: "2px 0 0 0" }}>{students.length} enrolled · {course.status}</p>
            </div>
            <Link href={`/instructor/course-builder/${course.id}`} style={btnGhost}>Manage course</Link>
          </div>
          {students.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8892A4", textAlign: "center", padding: 20 }}>No enrollments yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Student", "Progress", "Status", "Enrolled"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const color = s.progress >= 80 ? "#66BB6A" : s.progress >= 40 ? "#FFC107" : "#EF5350";
                  return (
                    <tr key={s.userId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {s.avatarUrl ? (
                            <img src={s.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                              {(s.name[0] || "?").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "#8892A4" }}>{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", minWidth: 140 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${s.progress}%`, height: "100%", background: color }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#8892A4", minWidth: 32 }}>{s.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", fontSize: 11, color: "#8892A4", textTransform: "capitalize" }}>{s.status}</td>
                      <td style={{ padding: "10px 10px", fontSize: 11, color: "#8892A4" }}>{timeAgo(s.enrolledAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "10px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};
