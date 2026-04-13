import Link from "next/link";

export default function RecruiterMessagesPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>💬 Candidate messages</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Real-time chat — powered by the platform messaging system</p>
      </div>
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 30, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", margin: "0 0 4px 0" }}>Open your inbox</h2>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 16px 0" }}>Candidate conversations use the same Ably-backed messaging as the rest of the platform.</p>
        <Link href="/messages" style={btnPrimary}>Open messages →</Link>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block" };
