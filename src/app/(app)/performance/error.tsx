"use client";

export default function PerformanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: 32, color: "#E8EDF5", fontFamily: "monospace", background: "#0A0E1A", minHeight: "100vh" }}>
      <h1 style={{ color: "#EF5350", fontSize: 20, marginBottom: 16 }}>Performance page crashed</h1>
      <div style={{ background: "#111827", padding: 16, borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", marginBottom: 12 }}>
        <div style={{ color: "#FFC107", marginBottom: 8, fontSize: 13 }}>{error.message}</div>
        {error.digest && <div style={{ color: "#8892A4", fontSize: 11 }}>digest: {error.digest}</div>}
      </div>
      <pre style={{ background: "#111827", padding: 16, borderRadius: 8, fontSize: 11, color: "#8892A4", whiteSpace: "pre-wrap", overflow: "auto", maxHeight: 400 }}>
        {error.stack}
      </pre>
      <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", background: "#1E88E5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Retry</button>
    </div>
  );
}
