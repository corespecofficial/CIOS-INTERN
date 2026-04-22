"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACCENT,
  RECENTS_EVENT,
  readRecents,
  type Recent,
} from "../_components/workspace-shell";

function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)   return "just now";
  const m = Math.floor(s / 60);  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(mo / 12); return `${y} year${y === 1 ? "" : "s"} ago`;
}

export function ChatsClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<Recent[]>([]);

  useEffect(() => {
    setRecents(readRecents());
    const reload = () => setRecents(readRecents());
    window.addEventListener(RECENTS_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(RECENTS_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recents;
    return recents.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [recents, query]);

  const openChat = (r: Recent) => {
    try { localStorage.setItem("cios-ai-hub-active-chat", r.id); } catch { /* ignore */ }
    router.push("/ai-hub/chat");
  };

  const newChat = () => {
    try { localStorage.removeItem("cios-ai-hub-active-chat"); } catch { /* ignore */ }
    router.push("/ai-hub/chat");
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>Chats</h1>
          <button
            onClick={newChat}
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
            + New chat
          </button>
        </div>

        <div
          style={{
            position: "relative",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
              color: "var(--ws-text-faint, #8F8B80)",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your chats…"
            style={{
              width: "100%",
              padding: "14px 16px 14px 44px",
              borderRadius: 12,
              border: `1.5px solid ${ACCENT}`,
              fontSize: 15,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              background: "var(--ws-canvas, #fff)",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px", color: "var(--ws-text-muted, #55524A)", fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>Your chats with CIOS</span>
          {recents.length > 0 && (
            <Link href="/ai-hub/chat" style={{ color: ACCENT, textDecoration: "underline", fontSize: 13 }}>
              Select
            </Link>
          )}
        </div>

        <div style={{ borderTop: "1px solid #EAE7DF" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ws-text-faint, #8F8B80)", fontSize: 14 }}>
              {recents.length === 0
                ? "No chats yet. Start a new conversation to see it here."
                : `No chats match “${query}”.`}
            </div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => openChat(r)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "18px 12px",
                  borderBottom: "1px solid var(--ws-border, #EAE7DF)",
                  background: "transparent",
                  border: "none",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  cursor: "pointer",
                  display: "block",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FBFAF6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ws-text, #1F2430)" }}>{r.title}</div>
                <div style={{ color: "var(--ws-text-faint, #8F8B80)", fontSize: 13, marginTop: 4 }}>
                  Last message {relTime(r.updatedAt)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
