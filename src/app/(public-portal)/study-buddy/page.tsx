"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import toast from "react-hot-toast";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "Explain prompt engineering in simple terms",
  "What's the difference between AI and machine learning?",
  "How do I write a strong cover letter?",
  "What are the SMART goal principles?",
  "How can I improve my communication skills?",
  "What is personal branding and why does it matter?",
];

export default function StudyBuddyPage() {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || pending) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);

    start(async () => {
      try {
        const res = await fetch("/api/ai/study-buddy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: msg, context: "" }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || "Failed to get response"); return; }
        const botMsg: Message = { id: `b-${Date.now()}`, role: "assistant", content: data.text };
        setMessages((prev) => [...prev, botMsg]);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      maxWidth: 720, margin: "0 auto", height: isMobile ? "calc(100dvh - 130px)" : "calc(100dvh - 120px)",
      display: "flex", flexDirection: "column", fontFamily: "'Nunito', sans-serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #AB47BC, #7B1FA2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
            boxShadow: "0 4px 16px rgba(171,71,188,0.4)",
          }}>🤖</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>AI Study Buddy</h1>
            <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Ask anything — I'm your personal CIOS learning assistant</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={listRef}
        style={{
          flex: 1, overflowY: "auto", minHeight: 0,
          display: "flex", flexDirection: "column", gap: 12,
          padding: "4px 0", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        }}
      >
        {/* Empty state with suggestions */}
        {isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 24, padding: "20px 0" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>Hey! What are we learning today?</div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>Ask me anything about your courses, career, or skills.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, width: "100%" }}>
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    background: "#111827", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 14px", textAlign: "left",
                    color: "#9CA3AF", fontSize: 12, cursor: "pointer",
                    transition: "all 0.15s", lineHeight: 1.4,
                  }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "#1a2234"); (e.currentTarget.style.color = "#E8EDF5"); (e.currentTarget.style.borderColor = "rgba(171,71,188,0.4)"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "#111827"); (e.currentTarget.style.color = "#9CA3AF"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"); }}
                >
                  💬 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: m.role === "user" ? "linear-gradient(135deg,#1E88E5,#1565C0)" : "linear-gradient(135deg,#AB47BC,#7B1FA2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>
              {m.role === "user" ? "👤" : "🤖"}
            </div>
            <div style={{
              maxWidth: "78%",
              background: m.role === "user" ? "rgba(30,136,229,0.15)" : "#111827",
              border: m.role === "user" ? "1px solid rgba(30,136,229,0.25)" : "1px solid rgba(255,255,255,0.07)",
              borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
              padding: "10px 14px",
            }}>
              <p style={{
                fontSize: 13, color: "#E8EDF5", margin: 0, lineHeight: 1.7,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {m.content}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {pending && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#AB47BC,#7B1FA2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px 14px 14px 14px", padding: "12px 16px", display: "flex", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#AB47BC",
                  animation: `sb-dot 1.2s ${i * 0.18}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        flexShrink: 0, paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        <style>{`
          @keyframes sb-dot { 0%,70%,100%{transform:translateY(0);opacity:.3} 35%{transform:translateY(-6px);opacity:1} }
          .sb-input:focus { outline: none; border-color: rgba(171,71,188,0.5) !important; box-shadow: 0 0 0 3px rgba(171,71,188,0.1) !important; }
          .sb-send:disabled { opacity: 0.4; cursor: not-allowed; }
          .sb-send:not(:disabled):hover { background: #7B1FA2 !important; }
        `}</style>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            className="sb-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{
              flex: 1, resize: "none", background: "#111827",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              padding: "11px 14px", color: "#E8EDF5", fontSize: 13,
              fontFamily: "'Nunito', sans-serif", lineHeight: 1.5,
              maxHeight: 120, overflowY: "auto",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            className="sb-send"
            onClick={() => send()}
            disabled={pending || !input.trim()}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,#AB47BC,#7B1FA2)",
              border: "none", color: "#fff", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(171,71,188,0.4)",
              transition: "background 0.2s",
            }}
          >
            {pending ? "⏳" : "↑"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#374151", textAlign: "center", marginTop: 6 }}>
          CIOS Study Buddy · Powered by AI · Responses may be inaccurate — always verify
        </div>
      </div>
    </div>
  );
}
