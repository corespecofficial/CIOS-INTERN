import Link from "next/link";

export function PublicPortalFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.015)",
        marginTop: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "28px 20px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 16,
          alignItems: "center",
          fontSize: 12,
          color: "#6B7280",
        }}
      >
        <div>
          © {new Date().getFullYear()} CIOS · Built by Cospronos Media · Lagos, Nigeria
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/about" style={{ color: "#94A3B8", textDecoration: "none" }}>About</Link>
          <Link href="/privacy" style={{ color: "#94A3B8", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "#94A3B8", textDecoration: "none" }}>Terms</Link>
          <Link href="/contact" style={{ color: "#94A3B8", textDecoration: "none" }}>Contact</Link>
        </div>
      </div>
    </footer>
  );
}
