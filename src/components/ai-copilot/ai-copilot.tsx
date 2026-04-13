"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { useCurrentUser } from "@/lib/use-current-user";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const AI_RESPONSES_TEMPLATES = [
  "Based on your progress, I'd recommend focusing on the AI Fundamentals module first. You're 73% through it!",
  "You're doing amazing! Your ranking improved by 12 positions this week. Keep the momentum going!",
  "I can help with that! Let me check the schedule for upcoming mentorship sessions with Mr. Joshua.",
  "Pro tip: Break your project into smaller tasks. The task board makes it much easier to track progress.",
  "Your weekly report is due in 2 days. Want me to help you draft it based on your completed tasks?",
  "I noticed you haven't logged any hours today. Remember, consistency is key to staying on the leaderboard!",
  "The community forum has a thread about that exact topic. Check the AI/ML channel for discussions.",
  "Great question, {name}! Your performance score is 78% — focus on community engagement to push it higher.",
];

interface Msg { text: string; isUser: boolean }

export function AICopilot() {
  const user = useCurrentUser();
  const firstName = user.firstName || "there";

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { text: "Hello! I am your CIOS AI Copilot. I can help with tasks, study tips, navigation, and more. What would you like to know?", isUser: false },
  ]);
  const [input, setInput] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);

  // Update greeting once Clerk user loads (only if it's still the default)
  useEffect(() => {
    if (!user.isLoaded || !user.firstName) return;
    setMsgs(prev => {
      if (prev.length !== 1 || prev[0].isUser) return prev;
      const greeting = `Hello ${user.firstName}! I am your CIOS AI Copilot. I can help with tasks, study tips, navigation, and more. What would you like to know?`;
      if (prev[0].text === greeting) return prev;
      return [{ text: greeting, isUser: false }];
    });
  }, [user.isLoaded, user.firstName]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs(prev => [...prev, { text: userMsg, isUser: true }]);
    setTimeout(() => {
      const template = AI_RESPONSES_TEMPLATES[Math.floor(Math.random() * AI_RESPONSES_TEMPLATES.length)];
      const resp = template.replace(/\{name\}/g, firstName);
      setMsgs(prev => [...prev, { text: resp, isUser: false }]);
      setTimeout(() => msgsRef.current?.scrollTo(0, msgsRef.current.scrollHeight), 50);
    }, 800);
    setTimeout(() => msgsRef.current?.scrollTo(0, msgsRef.current.scrollHeight), 50);
  };

  return (
    <>
      {/* FAB Button — gold glow ring like HTML prototype */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "radial-gradient(circle at 40% 40%, #FFC107 0%, #1E88E5 60%, #0A0E1A 100%)",
          padding: 3, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(255,193,7,0.35), 0 0 12px rgba(30,136,229,0.3)",
          animation: "float 3s ease-in-out infinite",
          transition: "transform 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <img src={LOGO} alt="AI" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
      </button>

      {/* Panel — compact card like HTML prototype */}
      {open && (
        <div style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 999,
          width: 380, maxHeight: 440,
          background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "scaleIn 0.25s ease",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <img src={LOGO} alt="AI" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>CIOS AI Copilot</span>
            <button onClick={() => setOpen(false)} style={{
              background: "none", border: "none", color: "#8892A4", fontSize: 18, cursor: "pointer",
              padding: 4, lineHeight: 1,
            }}>×</button>
          </div>

          {/* Messages */}
          <div ref={msgsRef} style={{
            flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10,
            maxHeight: 280, minHeight: 200,
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.6,
                alignSelf: m.isUser ? "flex-end" : "flex-start",
                background: m.isUser
                  ? "linear-gradient(135deg, #1E88E5, #1565C0)"
                  : "rgba(255,255,255,0.06)",
                color: m.isUser ? "#fff" : "#B0BEC5",
                border: m.isUser ? "none" : "1px solid rgba(255,255,255,0.07)",
                borderBottomRightRadius: m.isUser ? 4 : 14,
                borderBottomLeftRadius: m.isUser ? 14 : 4,
              }}>
                {m.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask me anything..."
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 10,
                background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
                color: "#E8EDF5", fontSize: 13, outline: "none",
              }}
            />
            <button onClick={send} style={{
              padding: "8px 16px", borderRadius: 10, border: "none",
              background: "#1E88E5", color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer",
            }}>Send</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes scaleIn { from { opacity:0; transform: scale(0.9) translateY(10px); } to { opacity:1; transform: scale(1) translateY(0); } }
      `}</style>
    </>
  );
}
