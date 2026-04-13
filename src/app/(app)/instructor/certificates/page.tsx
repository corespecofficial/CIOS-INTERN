import Link from "next/link";
import { getMyCertificates } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const certs = await getMyCertificates();

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,193,7,0.15)", color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
          ACHIEVEMENTS
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>My certificates</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>{certs.length} certificate{certs.length === 1 ? "" : "s"} earned</p>
      </div>

      {certs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🏆</div>
          <p style={{ fontSize: 14, color: "#8892A4", margin: "0 0 16px 0" }}>Complete a course to earn your first certificate.</p>
          <Link href="/courses" style={btnPrimary}>Browse courses</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {certs.map((c) => (
            <div key={c.id} style={{
              background: "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(30,136,229,0.08))",
              border: "1px solid rgba(255,193,7,0.25)", borderRadius: 14,
              padding: 20, display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ fontSize: 40, textAlign: "center" }}>🏆</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#FFC107", textTransform: "uppercase", letterSpacing: 0.5 }}>Certificate of completion</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", margin: "4px 0" }}>{c.courseTitle}</h3>
                {c.instructorName && (
                  <p style={{ fontSize: 12, color: "#8892A4", margin: 0 }}>Taught by {c.instructorName}</p>
                )}
              </div>
              <div style={{ fontSize: 10, color: "#5A6478", fontFamily: "monospace" }}>
                {c.certificateNumber} · {new Date(c.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`/api/certificates/${c.id}`} download style={btnPrimary}>⬇ Download PDF</a>
                <Link href={`/courses/${c.courseId}`} style={btnGhost}>View course</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "9px 14px",
  fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "9px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};
