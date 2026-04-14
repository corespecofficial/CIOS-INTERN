import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/db";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG image for a public certificate. Rendered on-demand when a share link
 * (/c/:slug) is scraped by LinkedIn, IG, Twitter, etc.
 */
export default async function CertificateOG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = supabaseAdmin();

  const { data } = await sb.from("certificates")
    .select(`
      certificate_number, issued_at,
      user:user_id(name, avatar_url, xp, level),
      course:course_id(title, difficulty, duration_hours)
    `)
    .eq("share_slug", slug).maybeSingle();

  const c = data as {
    certificate_number: string; issued_at: string;
    user?: { name: string | null; avatar_url: string | null; xp: number; level: number } | Array<{ name: string | null; avatar_url: string | null; xp: number; level: number }> | null;
    course?: { title: string; difficulty: string; duration_hours: number } | Array<{ title: string; difficulty: string; duration_hours: number }> | null;
  } | null;

  const user = c?.user ? (Array.isArray(c.user) ? c.user[0] : c.user) : null;
  const course = c?.course ? (Array.isArray(c.course) ? c.course[0] : c.course) : null;
  const name = user?.name || "CIOS Intern";
  const courseTitle = course?.title || "CIOS Course";
  const certNo = c?.certificate_number || "";
  const dateStr = c?.issued_at ? new Date(c.issued_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "linear-gradient(135deg, #0A0E1A 0%, #111827 60%, #1E3A5F 100%)",
        padding: "60px 80px", color: "#fff", fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30 }}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1E88E5", letterSpacing: 3, textTransform: "uppercase" }}>CIOS</div>
            <div style={{ fontSize: 14, color: "#8892A4" }}>Certificate of Completion</div>
          </div>
        </div>

        <div style={{ fontSize: 18, color: "#8892A4", marginBottom: 6 }}>This certifies that</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", marginBottom: 8, lineHeight: 1.1 }}>{name}</div>
        <div style={{ fontSize: 18, color: "#8892A4", marginBottom: 6 }}>has successfully completed</div>
        <div style={{ fontSize: 44, fontWeight: 800, color: "#FFC107", marginBottom: 20, lineHeight: 1.15 }}>{courseTitle}</div>

        <div style={{ display: "flex", gap: 24, marginTop: "auto", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, color: "#8892A4" }}>Issued</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{dateStr}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, color: "#8892A4" }}>Credential</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{certNo}</div>
          </div>
          {user && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: 14, color: "#8892A4" }}>Intern level</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#66BB6A" }}>Lv {user.level} · {user.xp.toLocaleString()} XP</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
