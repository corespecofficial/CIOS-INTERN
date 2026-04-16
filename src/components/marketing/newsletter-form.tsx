"use client";
import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    await new Promise(r => setTimeout(r, 900));
    setStatus("done");
  }

  if (status === "done") {
    return (
      <p style={{ fontSize: 12, color: "#66BB6A", fontWeight: 700, margin: "12px 0 0" }}>
        ✓ You&apos;re on the list — guide incoming!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6, marginTop: 12, maxWidth: 260 }}>
      <input
        type="email" required value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        style={{
          flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#E8EDF5", fontSize: 12, outline: "none",
        }}
      />
      <button type="submit" disabled={status === "loading"} style={{
        padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
        background: "linear-gradient(135deg, #1E88E5, #1565C0)",
        color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
        opacity: status === "loading" ? 0.6 : 1,
      }}>
        {status === "loading" ? "…" : "Send →"}
      </button>
    </form>
  );
}
