"use client";

import { useState } from "react";
import toast from "react-hot-toast";

/**
 * Context-aware AI tutor embedded in a lesson page. Feeds the current
 * lesson text to the model so answers stay grounded.
 */
export function StudyBuddy({ context, label }: { context: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);

  async function ask(q: string) {
    if (!q.trim()) return;
    setBusy(true); setAnswer("");
    try {
      const r = await fetch("/api/ai/study-buddy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, question: q }),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || "AI unavailable"); setBusy(false); return; }
      setAnswer(data.text);
      setHistory((h) => [{ q, a: data.text }, ...h].slice(0, 10));
      setQuestion("");
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: "fixed", right: 16, bottom: 96, zIndex: 400,
        background: "linear-gradient(135deg,#AB47BC,#6A1B9A)", color: "#fff",
        border: "none", borderRadius: 999, padding: "10px 16px",
        fontSize: 13, fontWeight: 800, cursor: "pointer",
        boxShadow: "0 8px 24px rgba(171,71,188,0.4)", display: "flex", alignItems: "center", gap: 8,
      }}>
        🦉 {label || "Study Buddy"}
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", right: 16, bottom: 16, width: "min(380px, calc(100vw - 24px))",
      maxHeight: "80vh", zIndex: 500,
      background: "#111827", border: "1px solid rgba(171,71,188,0.3)", borderRadius: 14,
      boxShadow: "0 16px 40px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "linear-gradient(135deg,rgba(171,71,188,0.25),rgba(106,27,154,0.1))", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 20 }}>🦉</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5" }}>Study Buddy</div>
          <div style={{ fontSize: 10, color: "#B0BEC5" }}>Knows this lesson</div>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", width: 28, height: 28, borderRadius: 8, cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {answer && <Bubble role="buddy" text={answer} />}
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Bubble role="you" text={h.q} />
            <Bubble role="buddy" text={h.a} />
          </div>
        ))}
        {!answer && history.length === 0 && (
          <div style={{ fontSize: 12, color: "#8892A4", textAlign: "center", padding: 16 }}>
            Ask anything about this lesson. Try <i>&ldquo;Summarise the key ideas&rdquo;</i> or <i>&ldquo;Give me a practice question&rdquo;</i>.
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(question); }}
        style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this lesson…"
          style={{ flex: 1, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "8px 14px", color: "#E8EDF5", fontSize: 12, outline: "none" }} />
        <button type="submit" disabled={busy || !question.trim()} style={{
          background: busy ? "#4A1F5E" : "linear-gradient(135deg,#AB47BC,#6A1B9A)",
          color: "#fff", border: "none", borderRadius: 999, padding: "0 14px", fontSize: 12, fontWeight: 800, cursor: busy ? "wait" : "pointer",
        }}>
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, text }: { role: "you" | "buddy"; text: string }) {
  const mine = role === "you";
  return (
    <div style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "88%" }}>
      <div style={{ fontSize: 9, color: "#8892A4", marginBottom: 2, textAlign: mine ? "right" : "left", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
        {mine ? "You" : "🦉 Study Buddy"}
      </div>
      <div style={{
        background: mine ? "rgba(30,136,229,0.16)" : "#0A0E1A",
        border: `1px solid ${mine ? "rgba(30,136,229,0.3)" : "rgba(255,255,255,0.06)"}`,
        color: "#E8EDF5", padding: "8px 10px", borderRadius: 10, fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap",
      }}>{text}</div>
    </div>
  );
}
