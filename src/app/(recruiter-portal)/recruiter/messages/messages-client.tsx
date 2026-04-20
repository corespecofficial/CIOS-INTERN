/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getOrCreateDirectRoom, sendMessage, markRoomRead } from "@/app/actions/messages";
import { useChatRealtime } from "@/lib/use-chat-realtime";
import { useUser } from "@clerk/nextjs";
import type { RecruiterCandidate } from "@/app/actions/recruiter-messaging";

const ACCENT = "#FB923C";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

interface ApiMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  message_type: "text" | "image" | "file" | "system" | "reply";
  attachment_url: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
}

interface Props {
  candidates: RecruiterCandidate[];
  meId: string;
}

const STATUS_COLOR: Record<string, string> = {
  submitted: "#60A5FA",
  viewed: "#26C6DA",
  shortlisted: "#FBBF24",
  interview: "#A855F7",
  accepted: "#34D399",
  hired: "#34D399",
  rejected: "#F87171",
};

/**
 * Recruiter-portal-native messaging.
 *
 * Reuses the same Ably realtime layer + sendMessage / getOrCreateDirectRoom
 * server actions as the intern /messages page, but only shows candidates who
 * have applied to one of the recruiter's listings. No redirect, no intern
 * sidebar exposure.
 *
 * Layout: candidate list (left) + active thread (right). On mobile, the
 * candidate list collapses to a top sheet and the thread takes the full
 * screen once a candidate is opened.
 */
export function RecruiterMessagesClient({ candidates, meId }: Props) {
  const { user } = useUser();
  const meClerkId = user?.id ?? null;

  const [activeUserId, setActiveUserId] = useState<string | null>(candidates[0]?.user_id ?? null);
  const active = candidates.find((c) => c.user_id === activeUserId) ?? null;

  const [roomIdByUser, setRoomIdByUser] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const c of candidates) if (c.room_id) m.set(c.user_id, c.room_id);
    return m;
  });
  const activeRoomId = active ? roomIdByUser.get(active.user_id) ?? null : null;

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.headline ?? "").toLowerCase().includes(q) ||
      c.via.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  // Realtime subscription on the active room.
  const { presence, onMessage, publishMessage, publishTyping } = useChatRealtime(activeRoomId, meClerkId);

  // Load thread when active room changes.
  useEffect(() => {
    if (!activeRoomId) { setMessages([]); return; }
    let cancelled = false;
    setLoadingThread(true);
    fetch(`/api/messages/${activeRoomId}`)
      .then((r) => r.json())
      .then((rows) => {
        if (cancelled) return;
        setMessages((rows as ApiMessage[]).slice().reverse());
        // Mark read in the background.
        markRoomRead(activeRoomId).catch(() => {});
      })
      .catch(() => { if (!cancelled) toast.error("Couldn't load conversation"); })
      .finally(() => { if (!cancelled) setLoadingThread(false); });
    return () => { cancelled = true; };
  }, [activeRoomId]);

  // Live message ingestion.
  useEffect(() => {
    if (!activeRoomId) return;
    return onMessage((m) => {
      if (m.kind !== "new") return;
      setMessages((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        return [...prev, {
          id: m.id,
          chat_room_id: activeRoomId,
          sender_id: m.senderId,
          sender_name: null,
          sender_avatar: null,
          content: m.content,
          message_type: (m.messageType as ApiMessage["message_type"]) ?? "text",
          attachment_url: m.attachmentUrl ?? null,
          is_edited: false,
          is_deleted: false,
          reactions: m.reactions ?? {},
          created_at: m.createdAt,
        }];
      });
      markRoomRead(activeRoomId).catch(() => {});
    });
  }, [activeRoomId, onMessage]);

  const ensureRoom = async (candidate: RecruiterCandidate): Promise<string | null> => {
    const cached = roomIdByUser.get(candidate.user_id);
    if (cached) return cached;
    const r = await getOrCreateDirectRoom(candidate.user_id);
    if (!r.ok || !r.data) {
      toast.error(r.ok ? "Couldn't open conversation" : r.error);
      return null;
    }
    setRoomIdByUser((prev) => {
      const next = new Map(prev);
      next.set(candidate.user_id, r.data!.roomId);
      return next;
    });
    return r.data.roomId;
  };

  const openCandidate = async (c: RecruiterCandidate) => {
    setActiveUserId(c.user_id);
    if (!roomIdByUser.has(c.user_id)) await ensureRoom(c);
  };

  const showMobileThread = !!active && !!activeRoomId;

  if (candidates.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.025)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: INK }}>No applicants to message yet</h3>
        <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>
          Once candidates apply to your listings, they appear here. Open a candidate to start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rmsg-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 14,
        height: "calc(100dvh - 130px)",
        minHeight: 480,
      }}
    >
      {/* LEFT: candidate list */}
      <aside
        className={`rmsg-list ${showMobileThread ? "rmsg-list-hidden-mobile" : ""}`}
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search candidates"
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.35)",
              color: INK,
              border: "1px solid rgba(255,255,255,0.07)",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((c) => {
            const isActive = c.user_id === activeUserId;
            const online = c.clerk_id ? presence.online.has(c.clerk_id) : false;
            return (
              <button
                key={c.user_id}
                onClick={() => openCandidate(c)}
                style={{
                  display: "flex",
                  width: "100%",
                  textAlign: "left",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: isActive ? "rgba(251,146,60,0.10)" : "transparent",
                  borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #FB923C, #F97316)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {online && (
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#34D399", border: "2px solid #0F172A" }} />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                    {c.latest_status && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: STATUS_COLOR[c.latest_status] ?? DIM, padding: "2px 6px", background: `${STATUS_COLOR[c.latest_status] ?? DIM}22`, borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>
                        {c.latest_status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.via}
                  </div>
                  {c.xp > 0 && (
                    <div style={{ fontSize: 10, color: "#FBBF24", fontWeight: 700, marginTop: 2 }}>
                      Lv {c.level} · {c.xp >= 1000 ? `${(c.xp / 1000).toFixed(1)}K` : c.xp} XP
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* RIGHT: active thread */}
      <section
        className={`rmsg-thread ${showMobileThread ? "" : "rmsg-thread-hidden-mobile"}`}
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!active ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13, padding: 30, textAlign: "center" }}>
            Pick a candidate on the left to start chatting.
          </div>
        ) : (
          <>
            <ThreadHeader
              candidate={active}
              online={!!(active.clerk_id && presence.online.has(active.clerk_id))}
              onBack={() => setActiveUserId(null)}
            />
            <ThreadBody
              messages={messages}
              loading={loadingThread}
              meId={meId}
              candidate={active}
              typing={!!(active.clerk_id && presence.typing.has(active.clerk_id))}
            />
            <Composer
              roomId={activeRoomId}
              ensureRoomId={() => ensureRoom(active)}
              meClerkId={meClerkId}
              meId={meId}
              candidateName={active.name.split(" ")[0]}
              onLocalAdd={(m) => setMessages((prev) => [...prev, m])}
              publishMessage={publishMessage}
              publishTyping={publishTyping}
            />
          </>
        )}
      </section>

      <style>{`
        @media (max-width: 820px) {
          .rmsg-grid { grid-template-columns: 1fr !important; height: calc(100dvh - 110px) !important; }
          .rmsg-list-hidden-mobile { display: none !important; }
          .rmsg-thread-hidden-mobile { display: none !important; }
        }
        @media (min-width: 821px) {
          .rmsg-list-hidden-mobile, .rmsg-thread-hidden-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function ThreadHeader({ candidate, online, onBack }: { candidate: RecruiterCandidate; online: boolean; onBack: () => void }) {
  return (
    <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={onBack}
        className="rmsg-back-mobile"
        aria-label="Back"
        style={{
          display: "none",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.08)",
          color: DIM,
          width: 30,
          height: 30,
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        ←
      </button>
      {candidate.avatar_url ? (
        <img src={candidate.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, #F97316)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>
          {candidate.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {candidate.name}
        </div>
        <div style={{ fontSize: 11, color: online ? "#34D399" : MUTED, fontWeight: 700 }}>
          {online ? "● Online" : candidate.via}
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .rmsg-back-mobile { display: inline-flex !important; align-items: center; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

function ThreadBody({ messages, loading, meId, candidate, typing }: {
  messages: ApiMessage[];
  loading: boolean;
  meId: string;
  candidate: RecruiterCandidate;
  typing: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, typing]);

  return (
    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
      {loading && <div style={{ color: MUTED, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Loading conversation…</div>}
      {!loading && messages.length === 0 && (
        <div style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "30px 20px" }}>
          No messages yet — send the first message to {candidate.name.split(" ")[0]}.
        </div>
      )}
      {messages.map((m) => {
        const isMe = m.sender_id === meId;
        return (
          <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "72%",
                padding: "9px 13px",
                borderRadius: 14,
                background: isMe ? `linear-gradient(135deg, ${ACCENT}, #F97316)` : "rgba(255,255,255,0.04)",
                color: isMe ? "#fff" : INK,
                fontSize: 13,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {m.is_deleted ? <em style={{ opacity: 0.6 }}>Message deleted</em> : m.content}
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4, textAlign: "right", letterSpacing: 0.3 }}>
                {new Date(m.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                {m.is_edited && " · edited"}
              </div>
            </div>
          </div>
        );
      })}
      {typing && (
        <div style={{ color: MUTED, fontSize: 12, fontStyle: "italic", padding: "4px 0" }}>
          {candidate.name.split(" ")[0]} is typing…
        </div>
      )}
    </div>
  );
}

function Composer({
  roomId,
  ensureRoomId,
  meClerkId,
  meId,
  candidateName,
  onLocalAdd,
  publishMessage,
  publishTyping,
}: {
  roomId: string | null;
  ensureRoomId: () => Promise<string | null>;
  meClerkId: string | null;
  meId: string;
  candidateName: string;
  onLocalAdd: (m: ApiMessage) => void;
  publishMessage: (m: import("@/lib/use-chat-realtime").InboundMessage) => Promise<void>;
  publishTyping: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const send = () => {
    const body = text.trim();
    if (!body) return;
    start(async () => {
      const targetRoom = roomId || (await ensureRoomId());
      if (!targetRoom) return;
      const r = await sendMessage({ roomId: targetRoom, content: body });
      if (!r.ok) { toast.error(r.error); return; }
      const localMsg: ApiMessage = {
        id: r.data!.messageId,
        chat_room_id: targetRoom,
        sender_id: meId,
        sender_name: null,
        sender_avatar: null,
        content: body,
        message_type: "text",
        attachment_url: null,
        is_edited: false,
        is_deleted: false,
        reactions: {},
        created_at: r.data!.createdAt,
      };
      onLocalAdd(localMsg);
      // Realtime fan-out so the recipient sees it instantly.
      await publishMessage({
        id: r.data!.messageId,
        senderId: meId,
        content: body,
        createdAt: r.data!.createdAt,
        kind: "new",
        messageType: "text",
        reactions: {},
      });
      setText("");
    });
  };

  return (
    <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, alignItems: "flex-end" }}>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (meClerkId) publishTyping().catch(() => {});
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={`Message ${candidateName}…`}
        rows={1}
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.35)",
          color: INK,
          border: "1px solid rgba(255,255,255,0.07)",
          fontSize: 14,
          outline: "none",
          fontFamily: "inherit",
          resize: "none",
          maxHeight: 140,
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={send}
        disabled={pending || !text.trim()}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          background: text.trim() && !pending ? `linear-gradient(135deg, ${ACCENT}, #F97316)` : "rgba(255,255,255,0.04)",
          color: text.trim() && !pending ? "#fff" : MUTED,
          border: "none",
          fontSize: 13,
          fontWeight: 800,
          cursor: pending || !text.trim() ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "…" : "Send"}
      </button>
    </div>
  );
}
