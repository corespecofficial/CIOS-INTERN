import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Lesson { id: string; title: string; body: string | null; video_url: string | null; position: number; }

const PAGE_SIZE = 50;

export default async function StudentLessonsList({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageStr } = await searchParams;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseAdmin();
  const { data, count } = await sb
    .from("org_lessons")
    .select("id, title, body, video_url, position", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("position", { ascending: true })
    .range(from, to);
  const lessons = (data || []) as Lesson[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 24px 0" }}>Lessons</h1>
      {lessons.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>No lessons yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lessons.map((l) => (
            <Link key={l.id} href={`/s/${orgSlug}/lessons/${l.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#111827", border: "1px solid #1F2937", borderRadius: 10, textDecoration: "none", color: "#E8EDF5" }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#5A6478", fontWeight: 700 }}>
                {l.position || "—"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{l.title}</div>
              </div>
              {l.video_url && <span style={{ fontSize: 11, color: "#26A69A" }}>🎬</span>}
            </Link>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          {page > 1 && <Link href={`/s/${orgSlug}/lessons?page=${page - 1}`} style={pagerStyle}>← Prev</Link>}
          <span style={{ ...pagerStyle, background: "#1E2937" }}>Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`/s/${orgSlug}/lessons?page=${page + 1}`} style={pagerStyle}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

const pagerStyle: React.CSSProperties = { display: "inline-block", padding: "6px 12px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#8892A4", fontSize: 12, textDecoration: "none" };
