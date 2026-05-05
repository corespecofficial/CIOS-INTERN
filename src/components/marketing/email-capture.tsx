"use client";
import { useState } from "react";
import { submitWeb3Form } from "@/lib/web3forms";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [botcheck, setBotcheck] = useState(""); // honeypot — bots fill it
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg(null);
    const r = await submitWeb3Form({
      email: email.trim(),
      name: name.trim() || undefined,
      botcheck,
      subject: "📘 CIOS program guide request",
      from_name: "CIOS Landing — Program guide",
    });
    if (r.ok) setStatus("done");
    else { setStatus("error"); setErrorMsg(r.error); }
  }

  return (
    <section style={{
      padding: "80px 24px", position: "relative", zIndex: 1,
      borderTop: "1px solid rgba(255,255,255,0.04)",
      background: "linear-gradient(135deg, rgba(30,136,229,0.06), rgba(171,71,188,0.04))",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          display: "inline-block", padding: "5px 14px", marginBottom: 16, borderRadius: 99,
          background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.25)",
          color: "#FFC107", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          Free Resource
        </div>

        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#E8EDF5",
          margin: "0 0 12px", lineHeight: 1.15,
        }}>
          Get the complete CIOS program guide
        </h2>

        <p style={{ fontSize: 16, color: "#8892A4", maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Curriculum breakdown, earning potential, career outcomes, and how to get hired — everything in one free PDF.
        </p>

        {status === "done" ? (
          <div style={{
            padding: "28px 32px", borderRadius: 16,
            background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.25)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color: "#66BB6A", marginBottom: 6 }}>
              You&apos;re on the list!
            </div>
            <p style={{ fontSize: 14, color: "#8892A4", margin: 0 }}>
              Check your inbox — the guide should arrive within a few minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480, margin: "0 auto" }}>
            {/* Honeypot — hidden from humans, bots fill it, Web3Forms drops the submit */}
            <input
              type="text"
              name="botcheck"
              value={botcheck}
              onChange={(e) => setBotcheck(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              style={{
                padding: "14px 18px", borderRadius: 12,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#E8EDF5", fontSize: 14, outline: "none",
                fontFamily: "'Nunito', sans-serif",
              }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{
                  flex: 1, minWidth: 200, padding: "14px 18px", borderRadius: 12,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#E8EDF5", fontSize: 14, outline: "none",
                  fontFamily: "'Nunito', sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  padding: "14px 28px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #FFC107, #FF7043)",
                  color: "#000", fontSize: 14, fontWeight: 800,
                  opacity: status === "loading" ? 0.7 : 1, whiteSpace: "nowrap",
                  boxShadow: "0 4px 20px rgba(255,193,7,0.3)",
                }}
              >
                {status === "loading" ? "Sending…" : "Send Me the Guide →"}
              </button>
            </div>
            {status === "error" && errorMsg && (
              <div style={{ fontSize: 12, color: "#EF5350", marginTop: 4 }}>
                Couldn&apos;t send: {errorMsg}. Please try again.
              </div>
            )}
          </form>
        )}

        <p style={{ fontSize: 11, color: "#3A4256", marginTop: 14 }}>
          No spam. Unsubscribe anytime. We never sell your email.
        </p>
      </div>
    </section>
  );
}
