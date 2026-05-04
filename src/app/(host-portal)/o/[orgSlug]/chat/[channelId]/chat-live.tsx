"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Client island that renders the chat message list and subscribes to
 * Ably for live updates. The parent server page does the initial
 * fetch (last N messages) so this component starts populated; new
 * messages arrive via Ably and are prepended to local state.
 *
 * Falls back gracefully when Ably isn't configured: the parent page
 * already has `revalidate = 5` so polling keeps the list fresh.
 */

import { useEffect, useRef, useState } from "react";
import { useOrgChatRealtime, type OrgChatMessage } from "@/lib/use-org-chat-realtime";

interface Message {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; name: string; avatar_url: string | null } | null;
}

interface Props {
  orgId: string;
  channelId: string;
  initialMessages: Message[];
}

export function ChatLive({ orgId, channelId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const seen = useRef(new Set<string>(initialMessages.map((m) => m.id)));

  // When the page navigates between channels the parent re-mounts us
  // with a fresh `initialMessages`. Reset state to match.
  useEffect(() => {
    setMessages(initialMessages);
    seen.current = new Set(initialMessages.map((m) => m.id));
  }, [initialMessages, channelId]);

  useOrgChatRealtime(orgId, channelId, (m: OrgChatMessage) => {
    if (seen.current.has(m.id)) return;
    seen.current.add(m.id);
    setMessages((prev) => [...prev, {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      author: m.author ? {
        id: m.author.id,
        name: m.author.name ?? "Unknown",
        avatar_url: m.author.avatar_url,
      } : null,
    }]);
  });

  // Auto-scroll to bottom when new messages land. Only auto-scroll if
  // the user is already near the bottom — otherwise they're reading
  // history and we'd yank them out of context.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 240) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      {messages.length === 0 ? (
        <div style={{ textAlign: "center", color: "#5A6478", fontSize: 13, marginTop: 40 }}>
          No messages yet — start the conversation.
        </div>
      ) : (
        messages.map((m) => (
          <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#8892A4", overflow: "hidden", flexShrink: 0 }}>
              {m.author?.avatar_url
                ? <img src={m.author.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (m.author?.name?.[0]?.toUpperCase() ?? "?")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{m.author?.name ?? "Unknown"}</span>
                <span style={{ fontSize: 10, color: "#5A6478" }}>{new Date(m.created_at).toLocaleTimeString()}</span>
              </div>
              <div style={{ fontSize: 13, color: "#C7CFD8", lineHeight: 1.5, whiteSpace: "pre-wrap", marginTop: 2 }}>{m.body}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
