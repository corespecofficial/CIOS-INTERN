/**
 * Shared "Phase 4" placeholder used by sidebar items whose feature ships
 * later. One file so the visual treatment stays consistent.
 */

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>{title}</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 28px 0" }}>{description}</p>
      <div style={{ background: "#111827", border: "1px dashed #1F2937", borderRadius: 12, padding: 32, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
        🚧 Ships in Phase 4. The data model is already in place — just the UI is pending.
      </div>
    </div>
  );
}
