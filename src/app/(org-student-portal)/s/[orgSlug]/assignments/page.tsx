import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Assignment { id: string; title: string; brief: string | null; due_at: string | null; }
interface MySub { assignment_id: string; grade: number | null; submitted_at: string; }

export default async function StudentAssignmentsList({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const [assignmentsRes, subsRes] = await Promise.all([
    sb.from("org_assignments").select("id, title, brief, due_at").eq("org_id", ctx.org.id).order("due_at", { ascending: true, nullsFirst: false }).limit(200),
    sb.from("org_submissions").select("assignment_id, grade, submitted_at").eq("org_id", ctx.org.id).eq("student_id", ctx.me.id),
  ]);
  const assignments = (assignmentsRes.data || []) as Assignment[];
  const subs = (subsRes.data || []) as MySub[];
  const subMap = new Map(subs.map((s) => [s.assignment_id, s]));

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 24px 0" }}>Assignments</h1>
      {assignments.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>No assignments yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assignments.map((a) => {
            const sub = subMap.get(a.id);
            const overdue = a.due_at && new Date(a.due_at) < new Date() && !sub;
            const status = sub ? (sub.grade != null ? `${sub.grade}/100` : "Submitted") : overdue ? "Overdue" : "Open";
            const statusColor = sub ? (sub.grade != null ? "#26A69A" : "#1E88E5") : overdue ? "#FF8A80" : "#FFA726";
            return (
              <Link key={a.id} href={`/s/${orgSlug}/assignments/${a.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#111827", border: "1px solid #1F2937", borderRadius: 10, textDecoration: "none", color: "#E8EDF5" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                  {a.due_at && <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>Due {new Date(a.due_at).toLocaleString()}</div>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{status}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
