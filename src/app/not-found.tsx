import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 · Page Not Found · CIOS",
};

export default function NotFound() {
  const LINKS = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/sign-in", label: "Sign In", icon: "🔑" },
    { href: "/sign-up", label: "Join Program", icon: "🚀" },
    { href: "/about", label: "About", icon: "ℹ️" },
    { href: "/contact", label: "Contact", icon: "💬" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {/* Ambient stars */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 2, height: 2, background: "#fff", borderRadius: "50%",
            left: `${(i * 37 + 13) % 100}%`, top: `${(i * 53 + 7) % 100}%`,
            opacity: 0.05 + (i % 5) * 0.04,
          }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 520 }}>
        {/* 404 number */}
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(80px, 20vw, 140px)",
          fontWeight: 900,
          background: "linear-gradient(135deg, rgba(30,136,229,0.3), rgba(171,71,188,0.3))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          marginBottom: 8,
          userSelect: "none",
        }}>
          404
        </div>

        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛸</div>

        {/* Heading */}
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px", lineHeight: 1.2 }}>
          This page drifted off course
        </h1>
        <p style={{ fontSize: 15, color: "#8892A4", lineHeight: 1.6, margin: "0 0 36px" }}>
          The page you&apos;re looking for doesn&apos;t exist, was moved, or is only accessible after sign-in.
        </p>

        {/* Quick links */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 32 }}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#B0BEC5", fontSize: 13, fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Primary CTA */}
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 28px", borderRadius: 12,
            background: "linear-gradient(135deg, #1E88E5, #1565C0)",
            color: "#fff", fontWeight: 700, fontSize: 15,
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(30,136,229,0.35)",
          }}
        >
          ← Back to CIOS
        </Link>

        <p style={{ fontSize: 11, color: "#3A4256", marginTop: 24 }}>
          If you believe this is an error, contact{" "}
          <a href="mailto:support@cospronos.com" style={{ color: "#5A6478", textDecoration: "none" }}>
            support@cospronos.com
          </a>
        </p>
      </div>

      <style>{`
        @keyframes cios-pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
