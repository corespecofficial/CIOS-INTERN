"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getBuddyHistory, sendBuddyMessage, type BuddyMessage } from "@/app/actions/study-buddy";

export function StudyBuddyWidget({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    getBuddyHistory(courseId).then((r) => { if (r.ok) setMessages(r.data!); });
  }, [open, courseId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = () => start(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg: BuddyMessage = { id: `tmp-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    const r = await sendBuddyMessage(courseId, text);
    if (!r.ok) { toast.error(r.error); return; }
    const botMsg: BuddyMessage = { id: `tmp-${Date.now() + 1}`, role: "assistant", content: r.data!.reply, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, botMsg]);
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 90,
          width: 60, height: 60, borderRadius: "50%",
          background: "linear-gradient(135deg,#AB47BC,#7B1FA2)",
          color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(171,71,188,0.5)",
          fontSize: 28, cursor: "pointer",
        }}
        title="AI Study Buddy"
      >
        🤖
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 90,
      width: 360, maxWidth: "calc(100vw - 40px)", height: 480,
      background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "12px 14px", background: "linear-gradient(135deg,#AB47BC,#7B1FA2)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 22 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>AI Study Buddy</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>Knows this course · ask anything</div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#8892A4", fontSize: 12, padding: 24 }}>
            Ask me to explain a concept, give you a hint, or suggest which lesson to review.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%",
            padding: "8px 12px", borderRadius: 12,
            background: m.role === "user" ? "linear-gradient(135deg,#1E88E5,#1565C0)" : "#0A0E1A",
            color: m.role === "user" ? "#fff" : "#E8EDF5",
            fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
          }}>
            {m.content}
          </div>
        ))}
        {pending && (
          <div style={{ alignSelf: "flex-start", fontSize: 11, color: "#8892A4", padding: "4px 12px" }}>🤖 thinking…</div>
        )}
      </div>

      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask a question…"
          disabled={pending}
          style={{ flex: 1, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", color: "#E8EDF5", fontSize: 12, outline: "none" }}
        />
        <button onClick={send} disabled={pending || !input.trim()} style={{ padding: "0 14px", background: "linear-gradient(135deg,#AB47BC,#7B1FA2)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          →
        </button>
      </div>
    </div>
  );
}
