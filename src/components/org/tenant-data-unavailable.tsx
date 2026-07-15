import Link from "next/link";
import type React from "react";

export function TenantDataUnavailable({
  orgSlug,
  title,
  description,
}: {
  orgSlug: string;
  title: string;
  description: string;
}) {
  return (
    <section style={shell}>
      <div style={icon} aria-hidden="true">&#128274;</div>
      <p style={eyebrow}>ORGANIZATION DATA ISOLATION</p>
      <h1 style={heading}>{title}</h1>
      <p style={copy}>{description}</p>
      <p style={notice}>
        Platform-account records are never reused inside an organization workspace.
      </p>
      <Link href={`/s/${orgSlug}`} style={link}>Return to organization dashboard</Link>
    </section>
  );
}

const shell: React.CSSProperties = { maxWidth: 720, margin: "40px auto", padding: 32, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18 };
const icon: React.CSSProperties = { fontSize: 42, marginBottom: 10 };
const eyebrow: React.CSSProperties = { color: "#26A69A", fontSize: 11, fontWeight: 900, letterSpacing: 1.2 };
const heading: React.CSSProperties = { color: "#E8EDF5", fontSize: 28, margin: "8px 0" };
const copy: React.CSSProperties = { color: "#A9B4C7", lineHeight: 1.65 };
const notice: React.CSSProperties = { color: "#8892A4", fontSize: 13, padding: 12, background: "rgba(38,166,154,.08)", borderRadius: 10 };
const link: React.CSSProperties = { display: "inline-flex", marginTop: 8, padding: "11px 16px", borderRadius: 10, color: "white", background: "#1E88E5", textDecoration: "none", fontWeight: 900, fontSize: 13 };
