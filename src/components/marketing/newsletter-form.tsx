"use client";
import { useState } from "react";
import { submitWeb3Form } from "@/lib/web3forms";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [botcheck, setBotcheck] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg(null);
    const r = await submitWeb3Form({
      email: email.trim(),
      botcheck,
      subject: "📨 CIOS newsletter signup",
      from_name: "CIOS Newsletter (footer)",
      source: "footer-newsletter",
    });
    if (r.ok) setStatus("done");
    else { setStatus("error"); setErrorMsg(r.error); }
  }

  if (status === "done") {
    return (
      <p style={{ fontSize: 12, color: "#66BB6A", fontWeight: 700, margin: "12px 0 0" }}>
        ✓ You&apos;re subscribed — first issue lands soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12, maxWidth: 260 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          name="botcheck"
          value={botcheck}
          onChange={(e) => setBotcheck(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
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
      </div>
      {status === "error" && errorMsg && (
        <span style={{ fontSize: 10, color: "#EF5350" }}>Failed: {errorMsg}</span>
      )}
    </form>
  );
}
