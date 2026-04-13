import type { Metadata } from "next";
import Link from "next/link";

interface Payload { name?: string; body?: string; emoji?: string; xp?: number }

function decode(code: string): Payload | null {
  try {
    const padded = code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const p = decode(code);
  const title = p ? `${p.body || "Achievement"} — ${p.name || "CIOS Intern"}` : "CIOS Achievement";
  const description = p ? `${p.name || "A CIOS intern"} earned: ${p.body || "an achievement"}${p.xp ? ` (+${p.xp} XP)` : ""}.` : "Verified achievement on CIOS.";
  return {
    title, description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AchievementSharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const p = decode(code);
  if (!p) {
    return <div style={{ padding: 40, color: "#EF5350", textAlign: "center" }}>Invalid achievement link.</div>;
  }
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A0E1A, #111827)", color: "#E8EDF5", fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#FFC107", letterSpacing: 3, marginBottom: 12 }}>🏆 ACHIEVEMENT UNLOCKED</div>
        <div style={{ fontSize: 96, marginBottom: 12 }}>{p.emoji || "🏆"}</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.1, fontFamily: "'Space Grotesk', sans-serif" }}>{p.body || "Achievement unlocked"}</h1>
        <p style={{ fontSize: 16, color: "#B0BEC5", margin: "0 0 6px" }}>by <strong style={{ color: "#E8EDF5" }}>{p.name || "CIOS Intern"}</strong></p>
        {p.xp ? <div style={{ display: "inline-block", marginTop: 10, padding: "8px 18px", background: "rgba(255,193,7,0.15)", color: "#FFC107", fontSize: 16, fontWeight: 800, borderRadius: 99 }}>+{p.xp.toLocaleString()} XP</div> : null}
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <Link href="/sign-up" style={{ display: "inline-block", padding: "14px 32px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Start your own internship →</Link>
          <div style={{ marginTop: 16, fontSize: 11, color: "#5A6478" }}>Verified on CIOS — COSPRONOS Media × Corespec Engineering</div>
        </div>
      </div>
    </div>
  );
}
