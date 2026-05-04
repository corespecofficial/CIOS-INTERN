import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { AssignmentComposer } from "./assignment-composer";
import { SubmissionsTable } from "./submissions-table";

export const dynamic = "force-dynamic";

interface Assignment {
  id: string;
  title: string;
  brief: string | null;
  due_at: string | null;
  created_at: string;
  submission_count?: number;
}

const PAGE_SIZE = 50;

export default async function AssignmentsPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string; a?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageStr, a: focusedId } = await searchParams;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const isHost = ctx.isSuperAdmin || (ctx.memberRole && ["owner", "org_admin", "instructor"].includes(ctx.memberRole));

  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseAdmin();
  const { data, count } = await sb
    .from("org_assignments")
    .select("id, title, brief, due_at, created_at", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("due_at", { ascending: true, nullsFirst: false })
    .range(from, to);
  const assignments = (data || []) as Assignment[];

  // Submission counts per assignment — single grouped query (cheap; bounded
  // by PAGE_SIZE assignments per page). We aggregate in JS rather than rely
  // on a SQL group-by because supabase-js doesn't expose it cleanly.
  if (assignments.length > 0) {
    const ids = assignments.map((a) => a.id);
    const { data: subs } = await sb
      .from("org_submissions")
      .select("assignment_id")
      .eq("org_id", ctx.org.id)
      .in("assignment_id", ids);
    const counts = new Map<string, number>();
    for (const s of (subs || []) as { assignment_id: string }[]) {
      counts.set(s.assignment_id, (counts.get(s.assignment_id) || 0) + 1);
    }
    for (const a of assignments) a.submission_count = counts.get(a.id) || 0;
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // If a host clicks "View submissions" on an assignment, render the
  // submissions table instead. Cheaper than a dedicated route because we
  // already have the org context loaded.
  let focused: Assignment | null = null;
  if (isHost && focusedId) {
    focused = assignments.find((a) => a.id === focusedId) || null;
    if (!focused) {
      const { data } = await sb.from("org_assignments").select("id, title, brief, due_at, created_at").eq("id", focusedId).eq("org_id", ctx.org.id).maybeSingle();
      focused = data as Assignment | null;
    }
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Assignments</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 24px 0" }}>{total} total</p>

      {isHost && !focused && <AssignmentComposer orgId={ctx.org.id} />}

      {focused && isHost ? (
        <SubmissionsTable orgId={ctx.org.id} orgSlug={orgSlug} assignment={focused} />
      ) : assignments.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13, marginTop: 16 }}>
          No assignments yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {assignments.map((a) => {
            const overdue = a.due_at && new Date(a.due_at) < new Date();
            return (
              <div key={a.id} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                  {a.brief && <div style={{ fontSize: 12, color: "#5A6478", marginTop: 2 }}>{a.brief.slice(0, 100)}</div>}
                  {a.due_at && (
                    <div style={{ fontSize: 11, color: overdue ? "#FF8A80" : "#8892A4", marginTop: 4 }}>
                      Due {new Date(a.due_at).toLocaleString()} {overdue ? "· overdue" : ""}
                    </div>
                  )}
                </div>
                {isHost && (
                  <a
                    href={`/o/${orgSlug}/assignments?a=${a.id}`}
                    style={{ fontSize: 12, color: "#1E88E5", textDecoration: "none", padding: "6px 10px", border: "1px solid #1E88E5", borderRadius: 6 }}
                  >
                    {a.submission_count ?? 0} submissions →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!focused && totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          {page > 1 && <a href={`/o/${orgSlug}/assignments?page=${page - 1}`} style={pagerStyle}>← Prev</a>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <a href={`/o/${orgSlug}/assignments?page=${page + 1}`} style={pagerStyle}>Next →</a>}
        </div>
      )}
    </div>
  );
}

const pagerStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  background: "#111827",
  border: "1px solid #1F2937",
  borderRadius: 6,
  color: "#8892A4",
  fontSize: 12,
  textDecoration: "none",
};
