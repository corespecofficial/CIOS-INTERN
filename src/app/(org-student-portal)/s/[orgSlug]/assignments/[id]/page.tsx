import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { SubmitForm } from "./submit-form";

export const dynamic = "force-dynamic";

interface Assignment { id: string; title: string; brief: string | null; due_at: string | null; }
interface MySub { id: string; body: string | null; grade: number | null; feedback: string | null; submitted_at: string; graded_at: string | null; }

export default async function StudentAssignmentView({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const [aRes, sRes] = await Promise.all([
    sb.from("org_assignments").select("id, title, brief, due_at").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    sb.from("org_submissions").select("id, body, grade, feedback, submitted_at, graded_at").eq("assignment_id", id).eq("org_id", ctx.org.id).eq("student_id", ctx.me.id).maybeSingle(),
  ]);
  const a = aRes.data as Assignment | null;
  if (!a) notFound();
  const sub = sRes.data as MySub | null;

  const overdue = a.due_at && new Date(a.due_at) < new Date();

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href={`/s/${orgSlug}/assignments`} style={{ fontSize: 12, color: "#5A6478", textDecoration: "none" }}>← All assignments</Link>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "10px 0 4px 0" }}>{a.title}</h1>
      {a.due_at && <div style={{ fontSize: 12, color: overdue ? "#FF8A80" : "#8892A4", marginBottom: 16 }}>Due {new Date(a.due_at).toLocaleString()}{overdue ? " · overdue" : ""}</div>}
      {a.brief && <p style={{ color: "#C7CFD8", fontSize: 13, lineHeight: 1.7, margin: "0 0 24px 0" }}>{a.brief}</p>}

      {sub?.grade != null && (
        <div style={{ background: "#0E2723", border: "1px solid #1A4640", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Grade</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#26A69A" }}>{sub.grade}/100</div>
          {sub.feedback && <div style={{ marginTop: 10, fontSize: 13, color: "#C7CFD8", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{sub.feedback}</div>}
        </div>
      )}

      <SubmitForm orgId={ctx.org.id} assignmentId={a.id} initial={sub?.body ?? ""} graded={sub?.grade != null} />
    </div>
  );
}
