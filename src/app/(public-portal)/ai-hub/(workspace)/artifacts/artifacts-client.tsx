"use client";

import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function ArtifactsClient() {
  const router = useRouter();

  const createArtifact = () => {
    try { localStorage.removeItem("cios-ai-hub-active-chat"); } catch { /* ignore */ }
    toast("Ask CIOS to build an artifact right in chat");
    router.push("/ai-hub/chat");
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>Artifacts</h1>
          <button
            onClick={createArtifact}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              borderRadius: 10,
              background: "var(--ws-text, #1F2430)",
              color: "var(--ws-canvas, #fff)",
              fontWeight: 800,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
          >
            New artifact
          </button>
        </div>

        <div style={{ borderBottom: "1px solid var(--ws-border, #EAE7DF)", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-block",
              padding: "10px 4px",
              borderBottom: "2px solid #1F2430",
              color: "var(--ws-text, #1F2430)",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Your artifacts
          </div>
        </div>

        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🧩</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--ws-text, #1F2430)", marginBottom: 8 }}>
            What will you build with artifacts?
          </div>
          <div style={{ color: "var(--ws-text-muted, #55524A)", fontSize: 14, lineHeight: 1.55, maxWidth: 520, margin: "0 auto 22px" }}>
            If you can dream it, you can build it. Take apps, games, templates, and tools from thought to reality.
          </div>
          <button
            onClick={createArtifact}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid var(--ws-border, #EAE7DF)",
              background: "var(--ws-canvas, #fff)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Create artifact
          </button>
        </div>
      </div>
    </div>
  );
}
