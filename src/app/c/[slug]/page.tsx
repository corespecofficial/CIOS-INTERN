import { supabaseAdmin } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadCert(slug: string) {
  const sb = supabaseAdmin();
  const { data } = await sb.from("certificates")
    .select(`
      certificate_number, issued_at,
      user:user_id(name, avatar_url),
      course:course_id(title, difficulty, duration_hours, instructor_name)
    `)
    .eq("share_slug", slug).maybeSingle();
  if (!data) return null;
  const d = data as {
    certificate_number: string; issued_at: string;
    user?: { name: string | null; avatar_url: string | null } | Array<{ name: string | null; avatar_url: string | null }> | null;
    course?: { title: string; difficulty: string; duration_hours: number; instructor_name: string | null } | Array<{ title: string; difficulty: string; duration_hours: number; instructor_name: string | null }> | null;
  };
  const user = d.user ? (Array.isArray(d.user) ? d.user[0] : d.user) : null;
  const course = d.course ? (Array.isArray(d.course) ? d.course[0] : d.course) : null;
  return { certificate_number: d.certificate_number, issued_at: d.issued_at, user, course };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await loadCert(slug);
  if (!c) return { title: "Certificate · CIOS" };
  const title = `${c.user?.name || "An intern"} earned a CIOS certificate in ${c.course?.title || "their course"}`;
  return { title, description: `Verified credential ${c.certificate_number}` };
}

export default async function PublicCertificatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadCert(slug);
  if (!c) notFound();

  const date = c.issued_at ? new Date(c.issued_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A0E1A 0%, #111827 60%, #1E3A5F 100%)", padding: 24, fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "40px auto", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 64 }}>🏆</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1E88E5", letterSpacing: 3, textTransform: "uppercase", marginTop: 12 }}>CIOS</div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>Certificate of Completion</div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#8892A4", marginBottom: 6 }}>This certifies that</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#fff", marginBottom: 16, lineHeight: 1.1 }}>
            {c.user?.name || "CIOS Intern"}
          </div>
          <div style={{ fontSize: 14, color: "#8892A4", marginBottom: 6 }}>successfully completed</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#FFC107", marginBottom: 28, lineHeight: 1.2 }}>
            {c.course?.title}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "20px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>Issued</div>
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginTop: 2 }}>{date}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>Credential ID</div>
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginTop: 2, fontFamily: "monospace" }}>{c.certificate_number}</div>
          </div>
          {c.course?.instructor_name && (
            <div>
              <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>Instructor</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginTop: 2 }}>{c.course.instructor_name}</div>
            </div>
          )}
          {c.course?.duration_hours && (
            <div>
              <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>Duration</div>
              <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginTop: 2 }}>{c.course.duration_hours}h</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ display: "inline-block", padding: "12px 24px", background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", textDecoration: "none", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
            Start your own internship →
          </Link>
        </div>
      </div>
    </div>
  );
}
