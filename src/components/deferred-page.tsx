/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

interface Alt { label: string; href: string; }

export function DeferredPage({ icon, title, description, alternatives = [] }: {
  icon: string; title: string; description: string; alternatives?: Alt[];
}) {
  return (
    <div style={{ maxWidth: 620, margin: "80px auto 0", textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>{icon}</div>
      <div style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,193,7,0.15)", color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 12 }}>
        COMING SOON
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px 0" }}>{title}</h1>
      <p style={{ fontSize: 15, color: "#8892A4", lineHeight: 1.7, margin: "0 0 24px 0" }}>{description}</p>
      {alternatives.length > 0 && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {alternatives.map((a) => (
            <Link key={a.href} href={a.href} style={{
              background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 18px",
              fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block",
            }}>{a.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
