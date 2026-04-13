import { NextResponse } from "next/server";
import { getStudentAnalytics, getCurrentDbUser } from "@/lib/db";
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import React from "react";

export const runtime = "nodejs";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", backgroundColor: "#0A0E1A", color: "#E8EDF5" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  logo: { width: 46, height: 46, borderRadius: 23 },
  brand: { fontSize: 9, color: "#8892A4", letterSpacing: 1.5 },
  brandStrong: { fontSize: 11, color: "#1E88E5", fontWeight: 700, letterSpacing: 1.5 },
  title: { fontSize: 24, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#8892A4", marginBottom: 18 },
  section: { marginBottom: 16, padding: 12, border: "1 solid rgba(255,255,255,0.1)", borderRadius: 8 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { width: "24%", padding: 10, backgroundColor: "#111827", borderRadius: 6 },
  statLabel: { fontSize: 8, color: "#8892A4", marginBottom: 4, textTransform: "uppercase" },
  statVal: { fontSize: 16, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "0.5 solid rgba(255,255,255,0.05)" },
  rowLabel: { fontSize: 10, color: "#E8EDF5" },
  rowVal: { fontSize: 10, color: "#FFC107", fontWeight: 700 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: "#5A6478", textAlign: "center" },
});

export async function GET() {
  const [me, a] = await Promise.all([getCurrentDbUser(), getStudentAnalytics()]);
  if (!me || !a) return NextResponse.json({ error: "unauthorized or no data" }, { status: 401 });

  const h = React.createElement;
  const doc = h(Document, {},
    h(Page, { size: "A4", style: styles.page },
      h(View, { style: styles.topRow },
        h(Image, { src: LOGO, style: styles.logo }),
        h(View, {},
          h(Text, { style: styles.brandStrong }, "CIOS · COSPRONOS MEDIA"),
          h(Text, { style: styles.brand }, "× CORESPEC ENGINEERING · LEARNING ANALYTICS")
        )
      ),
      h(Text, { style: styles.title }, `${me.name}'s Learning Report`),
      h(Text, { style: styles.subtitle }, `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`),

      h(View, { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Key Metrics"),
        h(View, { style: styles.statsRow },
          [
            { label: "Hours Learned", val: `${a.hoursLearned}h`, c: "#1E88E5" },
            { label: "Courses Completed", val: a.coursesCompleted.toString(), c: "#66BB6A" },
            { label: "In Progress", val: a.coursesInProgress.toString(), c: "#FFC107" },
            { label: "Attendance", val: `${a.attendancePct}%`, c: "#AB47BC" },
            { label: "Quiz Average", val: `${a.quizAverage}%`, c: "#26C6DA" },
            { label: "XP", val: a.xp.toLocaleString(), c: "#FFC107" },
            { label: "Streak", val: `${a.streak}d`, c: "#FF7043" },
            { label: "Rank", val: `#${a.rank} / ${a.totalUsers}`, c: "#EF5350" },
          ].map((s, i) =>
            h(View, { key: i, style: styles.stat },
              h(Text, { style: styles.statLabel }, s.label),
              h(Text, { style: [styles.statVal, { color: s.c }] }, s.val)
            )
          )
        )
      ),

      a.enrollments.length > 0 && h(View, { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Courses"),
        ...a.enrollments.slice(0, 10).map((e, i) =>
          h(View, { key: i, style: styles.row },
            h(Text, { style: styles.rowLabel }, e.title),
            h(Text, { style: styles.rowVal }, `${e.progress}%`)
          )
        )
      ),

      a.quizAttempts.length > 0 && h(View, { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Recent Quiz Attempts"),
        ...a.quizAttempts.slice(-8).reverse().map((q, i) =>
          h(View, { key: i, style: styles.row },
            h(Text, { style: styles.rowLabel }, `${q.passed ? "✓" : "✗"} ${q.title} · ${new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`),
            h(Text, { style: [styles.rowVal, { color: q.passed ? "#66BB6A" : "#EF5350" }] }, `${q.score}%`)
          )
        )
      ),

      h(Text, { style: styles.footer }, `Verified by CIOS · COSPRONOS Media × Corespec Engineering · ${new Date().toLocaleDateString()}`)
    )
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = await renderToBuffer(doc as any);
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="CIOS-Analytics-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
