import Link from "next/link";
import { supabaseAdmin } from "@/lib/db";
import { GradeRow } from "./grade-row";

interface Assignment {
  id: string;
  title: string;
  brief: string | null;
  due_at: string | null;
}

interface Submission {
  id: string;
  body: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  student: { id: string; name: string; email: string } | null;
}

export async function SubmissionsTable({ orgId, orgSlug, assignment }: { orgId: string; orgSlug: string; assignment: Assignment }) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_submissions")
    .select("id, body, grade, feedback, submitted_at, graded_at, student:users!org_submissions_student_id_fkey(id, name, email)")
    .eq("org_id", orgId)
    .eq("assignment_id", assignment.id)
    .order("submitted_at", { ascending: false })
    .limit(500);
  const subs = (data || []) as unknown as Submission[];

  return (
    <div>
      <Link href={`/o/${orgSlug}/assignments`} style={{ fontSize: 12, color: "#5A6478", textDecoration: "none" }}>← All assignments</Link>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "10px 0 4px 0" }}>{assignment.title}</h2>
      {assignment.due_at && <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>Due {new Date(assignment.due_at).toLocaleString()}</div>}
      {assignment.brief && <p style={{ color: "#C7CFD8", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px 0" }}>{assignment.brief}</p>}

      <h3 style={{ fontSize: 12, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 10px 0" }}>
        {subs.length} submission{subs.length === 1 ? "" : "s"}
      </h3>

      {subs.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          No submissions yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {subs.map((s) => (
            <GradeRow key={s.id} orgId={orgId} submission={s} />
          ))}
        </div>
      )}
    </div>
  );
}
