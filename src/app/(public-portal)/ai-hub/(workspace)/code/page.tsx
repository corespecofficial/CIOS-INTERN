export const dynamic = "force-dynamic";

export default function CodePage() {
  return <ComingSoon emoji="💻" title="Code" subtitle="A dedicated CIOS workspace for code chats, repo context and refactors. Coming soon." />;
}

function ComingSoon({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 68, marginBottom: 14 }}>{emoji}</div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>{title}</h1>
      <p style={{ color: "var(--ws-text-muted, #55524A)", fontSize: 14, maxWidth: 520, marginTop: 10, lineHeight: 1.55 }}>{subtitle}</p>
      <span style={{ marginTop: 16, padding: "6px 14px", borderRadius: 999, background: "var(--ws-chip, #F2F1ED)", color: "var(--ws-text-muted, #55524A)", fontSize: 12, fontWeight: 700 }}>
        Coming soon
      </span>
    </div>
  );
}
