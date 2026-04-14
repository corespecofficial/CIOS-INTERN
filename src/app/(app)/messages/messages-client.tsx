"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import type { RoomListItem, DirectoryUser, DbMessage, StatusRow } from "@/lib/db";
import {
  createStatus as saCreateStatus,
  deleteStatus as saDeleteStatus,
  markStatusViewed as saMarkStatusViewed,
  reactToStatus as saReactStatus,
  getStatusViewers as saGetViewers,
} from "@/app/actions/statuses";
import {
  sendMessage as saSend,
  editMessage as saEdit,
  deleteMessage as saDelete,
  toggleReaction as saReact,
  toggleStarMessage as saStar,
  markRoomRead as saMarkRead,
  setRoomPref as saPref,
  getOrCreateDirectRoom as saDirect,
  createGroupRoom as saCreateGroup,
  addMembersToGroup as saAddMembers,
  leaveRoom as saLeave,
  blockUser as saBlock,
  forwardMessage as saForward,
} from "@/app/actions/messages";
import { useChatRealtime, useGlobalPresence, type InboundMessage } from "@/lib/use-chat-realtime";
import { useChatLock, isWebAuthnAvailable } from "@/lib/use-chat-lock";
import { uploadToCloudinary, compressImage, isImage, humanFileSize } from "@/lib/cloudinary-upload";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { CameraCapture } from "@/components/camera-capture";
import { createPoll as saCreatePoll, votePoll as saVotePoll, closePoll as saClosePoll, getPoll as saGetPoll } from "@/app/actions/polls";
import { markRoomViewed as saMarkRoomViewed, markRoomDelivered as saMarkRoomDelivered, getOutgoingStatuses as saGetStatuses, type MessageStatus } from "@/app/actions/message-status";
import { isOnline, formatLastSeen as formatLastSeenNew } from "@/lib/presence";

interface MeInfo { id: string; clerkId: string; name: string; avatarUrl: string | null; }

interface Props {
  initialRooms: RoomListItem[];
  directory: DirectoryUser[];
  initialStatuses: StatusRow[];
  me: MeInfo;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"];

function initialsOf(name: string | null | undefined): string {
  if (!name) return "👤";
  const cleaned = name.trim();
  if (!cleaned) return "👤";
  // Email: use the part before @
  const base = cleaned.includes("@") ? cleaned.split("@")[0].replace(/[._-]+/g, " ") : cleaned;
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "👤";
  const first = parts[0][0] || "";
  const second = parts[1]?.[0] || (parts[0].length > 1 ? parts[0][1] : "");
  return (first + second).toUpperCase() || "👤";
}

function colorFromId(id: string): string {
  const palette = ["#1E88E5", "#AB47BC", "#FF7043", "#66BB6A", "#26C6DA", "#FFC107", "#EF5350"];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % palette.length;
  return palette[h];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** WhatsApp-style tick indicator. */
function TickIndicator({ status }: { status: MessageStatus }) {
  const color = status === "read" ? "#34B7F1" : "#A4B0BB";
  if (status === "sent") {
    return <svg width="16" height="12" viewBox="0 0 16 12" style={{ verticalAlign: "middle" }}><path d="M2 7 L6 11 L14 3" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  // delivered or read — double tick
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" style={{ verticalAlign: "middle" }}>
      <path d="M1 7 L5 11 L13 3" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7 L10 11 L18 3" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatLastSeen(iso: string | null, online: boolean): string {
  if (online) return "Online";
  if (!iso) return "Offline";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 5) return "Just now";
  if (m < 60) return `Last seen ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Last seen ${h}h ago`;
  return `Last seen ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function MessagesClient({ initialRooms, directory, initialStatuses, me }: Props) {
  const [rooms, setRooms] = useState<RoomListItem[]>(initialRooms);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRooms[0]?.id || null);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<DbMessage | null>(null);
  const [editing, setEditing] = useState<DbMessage | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [messageMenuFor, setMessageMenuFor] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<DbMessage | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [statuses, setStatuses] = useState<StatusRow[]>(initialStatuses);
  const [viewingStatuses, setViewingStatuses] = useState<{ list: StatusRow[]; index: number } | null>(null);
  const [showStatusesSheet, setShowStatusesSheet] = useState(false);
  const [showCreateStatus, setShowCreateStatus] = useState(false);
  const [showLockSettings, setShowLockSettings] = useState(false);
  const chatLock = useChatLock();
  const [showArchived, setShowArchived] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;
  const onlineIds = useGlobalPresence(me.clerkId);
  const { presence, onMessage, publishMessage, publishTyping } = useChatRealtime(activeRoomId, me.clerkId);

  // Deep-link support: /messages?to=USER_ID → open or create that DM.
  // Used by /messages/contacts and anywhere else that links to a conversation.
  const searchParams = useSearchParams();
  useEffect(() => {
    const to = searchParams?.get("to");
    if (!to) return;
    let cancelled = false;
    (async () => {
      // If we already have a DM with this user in the list, just open it.
      const existing = rooms.find((r) => r.type === "direct" && r.other_user_id === to);
      if (existing) { if (!cancelled) setActiveRoomId(existing.id); return; }
      // Otherwise ask the server to get-or-create
      const r = await saDirect(to);
      if (cancelled) return;
      if (!r.ok) {
        toast((t) => (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span>{r.error}</span>
            <a href="/messages/contacts" onClick={() => toast.dismiss(t.id)} style={{ color: "#1E88E5", fontWeight: 700, textDecoration: "underline" }}>Fix →</a>
          </span>
        ), { duration: 6000, icon: "🔒" });
        return;
      }
      setActiveRoomId(r.data!.roomId);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch messages when active room changes — with localStorage cache + delta sync
  useEffect(() => {
    if (!activeRoomId) { setMessages([]); return; }
    let cancelled = false;
    const cacheKey = `cios-chat-${activeRoomId}`;

    // 1. Load cache instantly
    let cached: DbMessage[] = [];
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      if (raw) {
        cached = JSON.parse(raw) as DbMessage[];
        if (Array.isArray(cached) && cached.length > 0) {
          setMessages(cached);
          setLoadingMessages(false);
        } else {
          cached = [];
          setLoadingMessages(true);
        }
      } else {
        setLoadingMessages(true);
      }
    } catch {
      cached = [];
      setLoadingMessages(true);
    }

    // 2. Delta fetch: only messages newer than the latest cached one
    (async () => {
      const latestCachedAt = cached.length > 0 ? cached[cached.length - 1].created_at : null;
      const qs = latestCachedAt ? `?since=${encodeURIComponent(latestCachedAt)}` : "";
      const res = await fetch(`/api/messages/${activeRoomId}${qs}`);
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        const fresh = (data.messages || []) as DbMessage[];
        if (fresh.length === 0 && cached.length > 0) {
          // Nothing new — cache is authoritative
          setLoadingMessages(false);
          return;
        }
        if (latestCachedAt) {
          // Merge: cached + delta (dedupe by id)
          const seen = new Set(cached.map((m) => m.id));
          const merged = [...cached, ...fresh.filter((m) => !seen.has(m.id))];
          setMessages(merged);
          try { localStorage.setItem(cacheKey, JSON.stringify(merged.slice(-100))); } catch {}
        } else {
          setMessages(fresh);
          try { localStorage.setItem(cacheKey, JSON.stringify(fresh.slice(-100))); } catch {}
        }
      }
      setLoadingMessages(false);
    })();
    return () => { cancelled = true; };
  }, [activeRoomId]);

  // Persist cache on message list change (keeps last 100 messages per room)
  useEffect(() => {
    if (!activeRoomId || messages.length === 0) return;
    try {
      localStorage.setItem(`cios-chat-${activeRoomId}`, JSON.stringify(messages.slice(-100)));
    } catch { /* quota exceeded — skip */ }
  }, [messages, activeRoomId]);

  // Mark room read when opening/viewing
  useEffect(() => {
    if (!activeRoomId) return;
    saMarkRead(activeRoomId);
    setRooms((prev) => prev.map((r) => (r.id === activeRoomId ? { ...r, unread_count: 0 } : r)));
    // WhatsApp-style: mark every message in the open room as delivered+read.
    saMarkRoomViewed(activeRoomId).catch(() => {});
    // INSTANT tick flip: broadcast a "read" event over Ably with the IDs of
    // their messages I'm reading. The sender's client flips ticks to blue
    // in <100ms rather than waiting 6s for the next poll.
    const theirMessageIds = messages.filter((m) => m.sender_id !== me.id).map((m) => m.id);
    if (theirMessageIds.length > 0) {
      publishMessage({
        id: `read_${Date.now()}`,
        senderId: me.clerkId,
        content: "",
        createdAt: new Date().toISOString(),
        kind: "read",
        ackMessageIds: theirMessageIds,
      }).catch(() => {});
    }
  }, [activeRoomId, messages.length]);

  // Ticks: fetch status for every message I've sent
  const myMessageIds = useMemo(
    () => messages.filter((m) => m.sender_id === me.id).map((m) => m.id),
    [messages, me.id],
  );
  const [statusMap, setStatusMap] = useState<Record<string, "sent" | "delivered" | "read">>({});
  useEffect(() => {
    if (myMessageIds.length === 0) return;
    let cancelled = false;
    const tick = async () => {
      const r = await saGetStatuses(myMessageIds);
      if (!cancelled && r.ok) setStatusMap(r.data!);
    };
    tick();
    const i = setInterval(tick, 6000); // refresh ticks every 6s while chat open
    return () => { cancelled = true; clearInterval(i); };
  }, [myMessageIds.length, activeRoomId]);

  // Realtime message listener
  useEffect(() => {
    const off = onMessage((m: InboundMessage) => {
      if (m.kind === "new") {
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          const newMsg: DbMessage = {
            id: m.id,
            chat_room_id: activeRoomId || "",
            sender_id: m.senderId,
            sender_name: null,
            sender_avatar: null,
            content: m.content,
            message_type: (m.messageType || "text") as DbMessage["message_type"],
            reply_to_id: m.replyToId || null,
            reply_preview: null,
            attachment_url: m.attachmentUrl || null,
            is_edited: false,
            is_deleted: false,
            reactions: {},
            created_at: m.createdAt,
          };
          return [...prev, newMsg];
        });
        // If the chat is open AND this message is from someone else, mark read.
        // If chat is closed, just mark delivered.
        if (m.senderId !== me.id && activeRoomId) {
          saMarkRoomViewed(activeRoomId).catch(() => {});
        }
      } else if (m.kind === "edit") {
        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, content: m.content, is_edited: true } : x));
      } else if (m.kind === "delete") {
        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, is_deleted: true, content: "" } : x));
      } else if (m.kind === "reaction" && m.reactions) {
        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, reactions: m.reactions! } : x));
      } else if (m.kind === "read" && m.ackMessageIds && m.senderId !== me.clerkId) {
        // The other side just opened the chat — instantly flip their-side acks to "read"
        setStatusMap((prev) => {
          const next = { ...prev };
          for (const id of m.ackMessageIds!) next[id] = "read";
          return next;
        });
      } else if (m.kind === "delivered" && m.ackMessageIds && m.senderId !== me.clerkId) {
        setStatusMap((prev) => {
          const next = { ...prev };
          for (const id of m.ackMessageIds!) if (next[id] !== "read") next[id] = "delivered";
          return next;
        });
      }
    });
    return off;
  }, [onMessage, activeRoomId, me.clerkId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, activeRoomId]);

  // Filter rooms by search + archive state
  const visibleRooms = useMemo(() => {
    let r = rooms.filter((x) => (showArchived ? x.is_archived : !x.is_archived));
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      r = r.filter((x) => x.name.toLowerCase().includes(q) || x.last_message.toLowerCase().includes(q));
    }
    return r;
  }, [rooms, searchFilter, showArchived]);

  const threadFilteredMessages = useMemo(() => {
    if (!threadSearch.trim()) return messages;
    const q = threadSearch.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, threadSearch]);

  /* ─── Actions ─── */

  async function onSend() {
    if (!activeRoomId || !draft.trim()) return;
    const content = draft.trim();

    if (editing) {
      const r = await saEdit(editing.id, content);
      if (!r.ok) { toast.error(r.error); return; }
      setMessages((prev) => prev.map((m) => m.id === editing.id ? { ...m, content, is_edited: true } : m));
      publishMessage({ id: editing.id, senderId: me.clerkId, content, createdAt: editing.created_at, kind: "edit" });
      setEditing(null);
      setDraft("");
      return;
    }

    // Optimistic
    const tempId = `tmp_${Date.now()}`;
    const optimistic: DbMessage = {
      id: tempId,
      chat_room_id: activeRoomId,
      sender_id: me.id,
      sender_name: me.name,
      sender_avatar: me.avatarUrl,
      content,
      message_type: replyTo ? "reply" : "text",
      reply_to_id: replyTo?.id || null,
      reply_preview: replyTo ? { content: replyTo.content, sender_name: replyTo.sender_name } : null,
      attachment_url: null,
      is_edited: false,
      is_deleted: false,
      reactions: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    const savedReplyTo = replyTo;
    setReplyTo(null);

    const res = await saSend({ roomId: activeRoomId, content, replyToId: savedReplyTo?.id || null });
    if (!res.ok) {
      toast.error(res.error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }
    const { messageId, createdAt } = res.data!;
    setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: messageId, created_at: createdAt } : m));
    publishMessage({ id: messageId, senderId: me.clerkId, content, createdAt, replyToId: savedReplyTo?.id || null, kind: "new" });

    // Update room list last message
    setRooms((prev) => prev.map((r) => r.id === activeRoomId ? { ...r, last_message: content, last_message_at: createdAt } : r));
  }

  async function onSendMedia(opts: { url: string; kind: "image" | "file" | "audio"; caption?: string; filename?: string; sizeBytes?: number }) {
    if (!activeRoomId) return;
    // Encode metadata into content: for image → caption only (url is attachment); file → "filename|sizeBytes"; audio → duration stored client-side, not needed to send
    let content = "";
    if (opts.kind === "image") content = opts.caption || "📷 Image";
    else if (opts.kind === "file") content = `${opts.filename || "file"}|${opts.sizeBytes || 0}`;
    else if (opts.kind === "audio") content = `🎙 Voice note`;

    const tempId = `tmp_${Date.now()}`;
    const optimistic: DbMessage = {
      id: tempId,
      chat_room_id: activeRoomId,
      sender_id: me.id,
      sender_name: me.name,
      sender_avatar: me.avatarUrl,
      content,
      message_type: opts.kind === "image" ? "image" : "file",
      reply_to_id: null,
      reply_preview: null,
      attachment_url: opts.url,
      is_edited: false,
      is_deleted: false,
      reactions: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await saSend({
      roomId: activeRoomId,
      content,
      attachmentUrl: opts.url,
      messageType: opts.kind === "image" ? "image" : "file",
    });
    if (!res.ok) {
      toast.error(res.error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }
    const { messageId, createdAt } = res.data!;
    setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: messageId, created_at: createdAt } : m));
    publishMessage({
      id: messageId, senderId: me.clerkId, content, createdAt,
      attachmentUrl: opts.url,
      messageType: opts.kind === "image" ? "image" : "file",
      kind: "new",
    });
    setRooms((prev) => prev.map((r) => r.id === activeRoomId ? { ...r, last_message: content, last_message_at: createdAt } : r));
  }

  async function onDelete(msg: DbMessage, forEveryone: boolean) {
    setMessageMenuFor(null);
    const r = await saDelete(msg.id, forEveryone);
    if (!r.ok) { toast.error(r.error); return; }
    if (forEveryone) {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_deleted: true, content: "" } : m));
      publishMessage({ id: msg.id, senderId: me.clerkId, content: "", createdAt: msg.created_at, kind: "delete" });
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    }
  }

  async function onReact(msg: DbMessage, emoji: string) {
    setMessageMenuFor(null);
    const r = await saReact(msg.id, emoji);
    if (!r.ok) { toast.error(r.error); return; }
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, reactions: r.data!.reactions } : m));
    publishMessage({ id: msg.id, senderId: me.clerkId, content: "", createdAt: msg.created_at, kind: "reaction", reactions: r.data!.reactions });
  }

  async function onStar(msg: DbMessage) {
    setMessageMenuFor(null);
    await saStar(msg.id);
    toast.success("Toggled star");
  }

  function onCopy(msg: DbMessage) {
    setMessageMenuFor(null);
    navigator.clipboard.writeText(msg.content).then(() => toast.success("Copied"));
  }

  async function onBlockSender(msg: DbMessage) {
    setMessageMenuFor(null);
    if (!confirm("Block this user? They won't be able to message you and will disappear from your directory.")) return;
    const r = await saBlock(msg.sender_id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("User blocked");
  }

  async function onForwardConfirm(targetRoomIds: string[]) {
    if (!forwardingMessage) return;
    const r = await saForward(forwardingMessage.id, targetRoomIds);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Forwarded to ${r.data!.sent} chat${r.data!.sent === 1 ? "" : "s"}`);
    setForwardingMessage(null);
  }

  async function onTogglePref(roomId: string, key: "is_muted" | "is_pinned" | "is_archived_for_user", current: boolean) {
    const r = await saPref(roomId, { [key]: !current });
    if (!r.ok) { toast.error(r.error); return; }
    setRooms((prev) => prev.map((x) => x.id === roomId ? { ...x, [key === "is_archived_for_user" ? "is_archived" : key]: !current } : x));
  }

  async function onStartDm(userId: string, userName: string) {
    const r = await saDirect(userId);
    if (!r.ok) {
      // Don't swallow — route the user to the right place to fix it.
      if (r.error.includes("permission") || r.error.includes("connected")) {
        toast((t) => (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span>{r.error}</span>
            <a href="/messages/contacts" onClick={() => toast.dismiss(t.id)} style={{ color: "#1E88E5", fontWeight: 700, textDecoration: "underline" }}>Request contact →</a>
          </span>
        ), { duration: 6000, icon: "🔒" });
      } else {
        toast.error(r.error);
      }
      return;
    }
    const roomId = r.data!.roomId;
    setShowNewChat(false);
    // If not in list, add minimal stub
    if (!rooms.some((x) => x.id === roomId)) {
      const u = directory.find((x) => x.id === userId);
      setRooms((prev) => [
        { id: roomId, name: userName, type: "direct", avatar_url: u?.avatar_url || null, other_user_id: userId, other_user_clerk_id: u?.clerk_id || null, other_user_name: userName, other_user_avatar: u?.avatar_url || null, other_user_last_seen: null, last_message: "", last_message_at: null, unread_count: 0, is_muted: false, is_pinned: false, is_archived: false },
        ...prev,
      ]);
    }
    setActiveRoomId(roomId);
  }

  async function onLeaveRoom(roomId: string) {
    if (!confirm("Leave this chat?")) return;
    const r = await saLeave(roomId);
    if (!r.ok) { toast.error(r.error); return; }
    setRooms((prev) => prev.filter((x) => x.id !== roomId));
    if (activeRoomId === roomId) setActiveRoomId(null);
    setShowRoomMenu(false);
  }

  function onDraftChange(v: string) {
    setDraft(v);
    if (v.trim()) publishTyping();
  }

  // Tick every 20s so isOnline(last_seen) re-evaluates without needing a refresh
  const [, setPresenceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPresenceTick((t) => t + 1), 20_000);
    return () => clearInterval(id);
  }, []);

  // WhatsApp-accurate, INSTANT presence. A user is ONLINE only if EITHER:
  //   - Ably global presence currently contains their clerk_id (real-time,
  //     <100ms propagation), OR
  //   - their last_seen was refreshed within the last 60s (fallback for users
  //     we don't have a clerk_id for yet).
  const otherOnline = activeRoom?.type === "direct"
    ? ((activeRoom.other_user_clerk_id && onlineIds.has(activeRoom.other_user_clerk_id)) ||
       isOnline(activeRoom.other_user_last_seen))
    : false;

  const activeTyping = Array.from(presence.typing).length > 0;

  if (chatLock.hydrated && chatLock.locked) {
    return (
      <LockScreen
        hasBiometric={chatLock.config.useBiometric}
        hasPin={!!chatLock.config.pinHash}
        onUnlockPin={chatLock.verifyPin}
        onUnlockBiometric={chatLock.authenticateBiometric}
      />
    );
  }

  return (
    <div className="cios-messages-root" style={{ display: "flex", height: "calc(100vh - 80px)", minHeight: 500, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
      <style>{`
        @media (max-width: 768px) {
          .cios-messages-root {
            border-radius: 0 !important;
            border: none !important;
            position: fixed !important;
            top: 56px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: ${activeRoomId ? "0" : "64px"} !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            z-index: ${activeRoomId ? "850" : "50"};
          }
          .cios-messages-root aside.cios-room-list {
            width: 100% !important;
            display: ${activeRoomId ? "none" : "flex"} !important;
            flex-direction: column !important;
            min-height: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          /* The room list itself MUST be the only scrolling child. */
          .cios-messages-root aside.cios-room-list .cios-room-scroll {
            flex: 1 1 0 !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          /* Everything above the scroll list must be fixed-height (no grow). */
          .cios-messages-root aside.cios-room-list > *:not(.cios-room-scroll) {
            flex-shrink: 0 !important;
          }
          /* Compact the All/Archived tabs on phone */
          .cios-messages-root aside.cios-room-list [role="tablist"],
          .cios-messages-root aside.cios-room-list .cios-chat-tabs {
            gap: 4px !important;
          }
          .cios-messages-root aside.cios-room-list .cios-chat-tabs button {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          /* Compact statuses strip — was eating 90px+ */
          .cios-messages-root aside.cios-room-list .cios-status-strip {
            padding: 8px 10px !important;
            gap: 8px !important;
          }
          .cios-messages-root aside.cios-room-list .cios-status-strip .cios-status-bubble {
            width: 44px !important; height: 44px !important;
          }
          .cios-messages-root aside.cios-room-list .cios-status-strip .cios-status-label {
            font-size: 10px !important; margin-top: 2px !important;
          }
          /* Shrink the me-footer so it doesn't eat the list on phones */
          .cios-messages-root aside.cios-room-list > div:last-child {
            padding: 8px 14px !important;
            flex-shrink: 0 !important;
          }
          .cios-messages-root main.cios-thread {
            display: ${activeRoomId ? "flex" : "none"} !important;
            min-height: 0 !important;
            height: 100% !important;
            flex: 1 !important;
          }
          /* Hide bottom-nav only inside an active chat thread (composer replaces it). */
          ${activeRoomId ? ".bottom-nav-mobile { display: none !important; }" : ""}
        }
      `}</style>
      {/* ── Sidebar: rooms list ── */}
      <aside className="cios-room-list" style={{ width: 320, background: "#111827", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 6 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>Messages</h2>
            <div style={{ display: "flex", gap: 4 }}>
              <a href="/messages/contacts" style={{ ...iconBtn, color: "#1E88E5", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Contacts">🤝</a>
              <a href="/messages/requests" style={{ ...iconBtn, color: "#AB47BC", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Connect requests">📨</a>
              <button onClick={() => setShowNewChat(true)} style={iconBtn} title="New chat">✉️</button>
              <button onClick={() => setShowNewGroup(true)} style={iconBtn} title="New group">👥</button>
              <button onClick={() => setShowLockSettings(true)} style={iconBtn} title="Lock & privacy">{chatLock.config.enabled ? "🔒" : "🔓"}</button>
            </div>
          </div>
          <input
            placeholder="Search chats..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "8px 12px", color: "#E8EDF5", fontSize: 13, outline: "none" }}
          />
          <div className="cios-chat-tabs" style={{ display: "flex", gap: 4, marginTop: 10 }}>
            <button onClick={() => setShowArchived(false)} style={{ ...tabBtn, ...(showArchived ? {} : tabBtnActive) }}>All</button>
            <button onClick={() => setShowArchived(true)} style={{ ...tabBtn, ...(showArchived ? tabBtnActive : {}) }}>Archived</button>
            <button onClick={() => setShowStatusesSheet(true)} style={{ ...tabBtn, position: "relative" }} title="Statuses">
              📸 Statuses{statuses.length > 0 && <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: "50%", background: "#66BB6A" }} />}
            </button>
          </div>
        </div>

        {/* Statuses now live behind a dedicated tab — see showStatusesSheet modal below. */}

        <div className="cios-room-scroll" style={{ flex: "1 1 0", overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
          {visibleRooms.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#8892A4", fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              {showArchived ? "No archived chats" : "No chats yet. Start a new one."}
            </div>
          )}
          {visibleRooms.map((r) => (
            <RoomRow
              key={r.id}
              room={r}
              active={r.id === activeRoomId}
              onlineIds={onlineIds}
              onClick={() => setActiveRoomId(r.id)}
              onPin={() => onTogglePref(r.id, "is_pinned", r.is_pinned)}
              onMute={() => onTogglePref(r.id, "is_muted", r.is_muted)}
              onArchive={() => onTogglePref(r.id, "is_archived_for_user", r.is_archived)}
            />
          ))}
        </div>

        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: colorFromId(me.id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
              {initialsOf(me.name)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me.name}</div>
            <div style={{ fontSize: 10, color: "#66BB6A" }}>● Online</div>
          </div>
        </div>
      </aside>

      {/* ── Main thread ── */}
      <main className="cios-thread" style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0A0E1A", minWidth: 0 }}>
        {!activeRoom ? (
          <EmptyState />
        ) : (
          <>
            {/* Header */}
            <header className="cios-thread-header" style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#111827", display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
              <style>{`
                @media (max-width: 768px) {
                  .cios-mobile-back { display: block !important; }
                  .cios-thread-search-input { display: none !important; }
                  .cios-thread-search-toggle { display: inline-flex !important; }
                  .cios-thread-search-mobile.open .cios-thread-search-input { display: block !important; position: absolute !important; top: 100%; left: 0; right: 0; padding: 10px 14px; background: #111827; border-bottom: 1px solid rgba(255,255,255,0.07); width: 100% !important; z-index: 5; box-sizing: border-box; }
                  .cios-thread-name { font-size: 15px !important; }
                  .cios-thread-sub { font-size: 11px !important; }
                }
              `}</style>
              <button className="cios-mobile-back" onClick={() => setActiveRoomId(null)} aria-label="Back to chats" style={{ display: "none", background: "transparent", border: "none", color: "#E8EDF5", fontSize: 24, cursor: "pointer", padding: "4px 4px 4px 0", lineHeight: 1, flexShrink: 0 }}>←</button>
              <Avatar size={38} name={activeRoom.name} url={activeRoom.avatar_url} id={activeRoom.id} />
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <div className="cios-thread-name" style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeRoom.name}</div>
                <div className="cios-thread-sub" style={{ fontSize: 11, color: activeTyping ? "#1E88E5" : "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeRoom.type === "direct"
                    ? (activeTyping ? "Typing..." : (otherOnline ? "online" : formatLastSeenNew(activeRoom.other_user_last_seen, "offline")))
                    : `${presence.online.size} online · group chat`}
                </div>
              </div>
              <div className={`cios-thread-search-mobile${threadSearch ? " open" : ""}`} style={{ display: "contents" }}>
                <input
                  className="cios-thread-search-input"
                  placeholder="Search in chat..."
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                  style={{ width: 180, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "6px 10px", color: "#E8EDF5", fontSize: 12, outline: "none" }}
                />
                <button className="cios-thread-search-toggle" onClick={() => setThreadSearch(threadSearch ? "" : " ")} aria-label="Search in chat" style={{ display: "none", background: "transparent", border: "none", color: "#E8EDF5", fontSize: 18, cursor: "pointer", padding: 6, alignItems: "center", justifyContent: "center", minWidth: 36 }}>🔍</button>
              </div>
              <button onClick={() => setShowRoomMenu(!showRoomMenu)} style={iconBtn} title="Options">⋯</button>
              {showRoomMenu && (
                <div style={menuBox}>
                  <MenuItem onClick={() => { onTogglePref(activeRoom.id, "is_pinned", activeRoom.is_pinned); setShowRoomMenu(false); }}>{activeRoom.is_pinned ? "Unpin" : "Pin"} chat</MenuItem>
                  <MenuItem onClick={() => { onTogglePref(activeRoom.id, "is_muted", activeRoom.is_muted); setShowRoomMenu(false); }}>{activeRoom.is_muted ? "Unmute" : "Mute"} notifications</MenuItem>
                  <MenuItem onClick={() => { onTogglePref(activeRoom.id, "is_archived_for_user", activeRoom.is_archived); setShowRoomMenu(false); }}>{activeRoom.is_archived ? "Unarchive" : "Archive"}</MenuItem>
                  <MenuItem danger onClick={() => onLeaveRoom(activeRoom.id)}>
                    {activeRoom.type === "direct" ? "Delete chat" : "Leave group"}
                  </MenuItem>
                </div>
              )}
            </header>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {loadingMessages && <p style={{ fontSize: 12, color: "#8892A4", textAlign: "center" }}>Loading…</p>}
              {!loadingMessages && threadFilteredMessages.length === 0 && (
                <p style={{ fontSize: 13, color: "#8892A4", textAlign: "center", marginTop: 32 }}>
                  {threadSearch ? "No messages match your search." : "No messages yet. Say hi! 👋"}
                </p>
              )}
              {threadFilteredMessages.map((m, i) => {
                const prev = threadFilteredMessages[i - 1];
                const sameSender = prev && prev.sender_id === m.sender_id && !prev.reply_to_id;
                const mine = m.sender_id === me.id;
                return (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    mine={mine}
                    showAvatar={!sameSender}
                    meId={me.id}
                    status={mine ? (statusMap[m.id] || "sent") : undefined}
                    onReply={() => setReplyTo(m)}
                    onEdit={mine && !m.is_deleted ? () => { setEditing(m); setDraft(m.content); } : undefined}
                    onDelete={(forEveryone) => onDelete(m, forEveryone)}
                    onCopy={() => onCopy(m)}
                    onReact={(emoji) => onReact(m, emoji)}
                    onStar={() => onStar(m)}
                    onForward={() => { setMessageMenuFor(null); setForwardingMessage(m); }}
                    onBlockSender={mine ? undefined : () => onBlockSender(m)}
                    menuOpen={messageMenuFor === m.id}
                    onToggleMenu={() => setMessageMenuFor(messageMenuFor === m.id ? null : m.id)}
                  />
                );
              })}
              {activeTyping && (
                <div style={{ fontSize: 11, color: "#8892A4", padding: "4px 8px", fontStyle: "italic" }}>Typing…</div>
              )}
            </div>

            {/* Composer */}
            <Composer
              activeRoomId={activeRoomId!}
              me={me}
              draft={draft}
              onDraftChange={onDraftChange}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
              editing={editing}
              onCancelEdit={() => { setEditing(null); setDraft(""); }}
              onSendText={onSend}
              onSendMedia={onSendMedia}
              onOpenPoll={() => setShowPollModal(true)}
            />
          </>
        )}
      </main>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal
          users={directory}
          onClose={() => setShowNewChat(false)}
          onPick={onStartDm}
        />
      )}
      {showLockSettings && (
        <LockSettingsModal
          config={chatLock.config}
          meId={me.id}
          meName={me.name}
          onClose={() => setShowLockSettings(false)}
          setPin={chatLock.setPin}
          verifyPin={chatLock.verifyPin}
          removePin={chatLock.removePin}
          registerBiometric={chatLock.registerBiometric}
          updateConfig={chatLock.updateConfig}
          lockNow={chatLock.lock}
        />
      )}
      {/* Statuses sheet — opens from the Statuses tab */}
      {showStatusesSheet && (
        <div onClick={(e) => e.target === e.currentTarget && setShowStatusesSheet(false)} style={{
          position: "fixed", inset: 0, zIndex: 250,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          animation: "cios-fade 0.15s ease",
        }}>
          <div style={{
            background: "#111827", width: "100%", maxWidth: 560,
            borderRadius: "16px 16px 0 0",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            padding: "6px 0 20px",
            maxHeight: "80dvh", overflowY: "auto",
            animation: "cios-slide-up 0.22s ease",
          }}>
            {/* Pull handle */}
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 99, margin: "8px auto 12px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px 10px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📸 Statuses</h3>
              <button onClick={() => setShowStatusesSheet(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
            <StatusStrip
              statuses={statuses}
              meId={me.id}
              onOpen={(list, index) => { setShowStatusesSheet(false); setViewingStatuses({ list, index }); }}
              onCreate={() => { setShowStatusesSheet(false); setShowCreateStatus(true); }}
            />
          </div>
          <style>{`
            @keyframes cios-fade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes cios-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
          `}</style>
        </div>
      )}

      {viewingStatuses && (
        <StatusViewer
          list={viewingStatuses.list}
          startIndex={viewingStatuses.index}
          meId={me.id}
          onClose={() => setViewingStatuses(null)}
          onDeleted={(id) => setStatuses((prev) => prev.filter((s) => s.id !== id))}
          onReactionUpdate={(id, reactions) => setStatuses((prev) => prev.map((s) => s.id === id ? { ...s, reactions } : s))}
          onViewed={(id) => setStatuses((prev) => prev.map((s) => s.id === id ? { ...s, has_viewed: true, viewer_count: s.viewer_count + (s.has_viewed ? 0 : 1) } : s))}
        />
      )}
      {showCreateStatus && (
        <CreateStatusModal
          onClose={() => setShowCreateStatus(false)}
          onCreated={(status) => setStatuses((prev) => [status, ...prev])}
          me={me}
        />
      )}
      {showPollModal && activeRoomId && (
        <CreatePollModal
          roomId={activeRoomId}
          onClose={() => setShowPollModal(false)}
          onPosted={(msg) => {
            setMessages((prev) => [...prev, msg]);
            setRooms((prev) => prev.map((r) => r.id === activeRoomId ? { ...r, last_message: `📊 ${msg.content}`, last_message_at: msg.created_at } : r));
            publishMessage({
              id: msg.id,
              senderId: me.clerkId,
              content: msg.content,
              createdAt: msg.created_at,
              attachmentUrl: msg.attachment_url,
              messageType: "file",
              kind: "new",
            });
          }}
        />
      )}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          rooms={rooms}
          onClose={() => setForwardingMessage(null)}
          onConfirm={onForwardConfirm}
        />
      )}
      {showNewGroup && (
        <NewGroupModal
          users={directory}
          onClose={() => setShowNewGroup(false)}
          onCreated={(roomId, name) => {
            setShowNewGroup(false);
            setRooms((prev) => [
              { id: roomId, name, type: "group", avatar_url: null, other_user_id: null, other_user_name: null, other_user_avatar: null, last_message: "", last_message_at: null, unread_count: 0, is_muted: false, is_pinned: false, is_archived: false },
              ...prev,
            ]);
            setActiveRoomId(roomId);
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* SUB-COMPONENTS                                                   */
/* ═══════════════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#8892A4" }}>
      <div style={{ fontSize: 60 }}>💬</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>Select a chat</h2>
      <p style={{ fontSize: 13 }}>Or start a new one from the sidebar.</p>
    </div>
  );
}

function RoomRow({
  room, active, onlineIds, onClick, onPin, onMute, onArchive,
}: {
  room: RoomListItem; active: boolean; onlineIds: Set<string>; onClick: () => void;
  onPin: () => void; onMute: () => void; onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Real-time online check via Ably global presence, falls back to 60s DB heartbeat.
  const online = room.type === "direct" && (
    (room.other_user_clerk_id ? onlineIds.has(room.other_user_clerk_id) : false) ||
    isOnline(room.other_user_last_seen)
  );
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        cursor: "pointer", position: "relative",
        background: active ? "rgba(30,136,229,0.12)" : "transparent",
        borderLeft: active ? "3px solid #1E88E5" : "3px solid transparent",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ position: "relative" }}>
        <Avatar size={42} name={room.name} url={room.avatar_url} id={room.id} />
        {room.type === "direct" && (
          <span
            title={online ? "Online" : "Offline"}
            style={{
              position: "absolute", bottom: -1, right: -1,
              width: 12, height: 12, borderRadius: "50%",
              background: online ? "#66BB6A" : "#5A6478",
              border: "2px solid #111827",
              boxShadow: online ? "0 0 6px rgba(102,187,106,0.5)" : "none",
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {room.is_pinned && "📌 "}{room.name}{room.is_muted && " 🔇"}
          </div>
          <div style={{ fontSize: 10, color: "#8892A4", flexShrink: 0 }}>
            {formatRelative(room.last_message_at)}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 2 }}>
          <div style={{ fontSize: 12, color: "#8892A4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {room.last_message || "No messages yet"}
          </div>
          {room.unread_count > 0 && (
            <span style={{ background: "#1E88E5", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, minWidth: 18, textAlign: "center" }}>
              {room.unread_count > 99 ? "99+" : room.unread_count}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        style={{ ...iconBtn, fontSize: 14 }}
        title="Options"
      >⋯</button>
      {menuOpen && (
        <>
          <div onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div onClick={(e) => e.stopPropagation()} style={{ ...menuBox, top: 40, right: 8, zIndex: 100, minWidth: 160, maxWidth: "calc(100vw - 24px)" }}>
            <MenuItem onClick={() => { onPin(); setMenuOpen(false); }}>{room.is_pinned ? "Unpin" : "📌 Pin"}</MenuItem>
            <MenuItem onClick={() => { onMute(); setMenuOpen(false); }}>{room.is_muted ? "Unmute" : "🔇 Mute"}</MenuItem>
            <MenuItem onClick={() => { onArchive(); setMenuOpen(false); }}>{room.is_archived ? "Unarchive" : "📦 Archive"}</MenuItem>
          </div>
        </>
      )}
    </div>
  );
}

function Avatar({ size, name, url, id }: { size: number; name: string; url: string | null; id: string }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colorFromId(id),
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {initialsOf(name)}
    </div>
  );
}

function MessageBubble({
  msg, mine, showAvatar, meId, status,
  onReply, onEdit, onDelete, onCopy, onReact, onStar, onForward, onBlockSender,
  menuOpen, onToggleMenu,
}: {
  msg: DbMessage; mine: boolean; showAvatar: boolean; meId: string;
  status?: MessageStatus;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: (forEveryone: boolean) => void;
  onCopy: () => void;
  onReact: (emoji: string) => void;
  onStar: () => void;
  onForward: () => void;
  onBlockSender?: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const [reactBarOpen, setReactBarOpen] = useState(false);
  const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);

  return (
    <div style={{
      display: "flex", justifyContent: mine ? "flex-end" : "flex-start",
      gap: 8, marginBottom: showAvatar ? 12 : 2, alignItems: "flex-end",
    }}>
      {!mine && (
        <div style={{ width: 32, flexShrink: 0 }}>
          {showAvatar && <Avatar size={32} name={msg.sender_name || "?"} url={msg.sender_avatar} id={msg.sender_id} />}
        </div>
      )}
      <div style={{ maxWidth: "70%", position: "relative" }}>
        {showAvatar && !mine && (
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 2, paddingLeft: 4 }}>
            {msg.sender_name}
          </div>
        )}
        {msg.reply_preview && (
          <div style={{
            background: "#0A0E1A", borderLeft: "3px solid #1E88E5",
            padding: "6px 10px", borderRadius: "8px 8px 0 0", marginBottom: 2,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#1E88E5" }}>{msg.reply_preview.sender_name}</div>
            <div style={{ fontSize: 12, color: "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }}>
              {msg.reply_preview.content}
            </div>
          </div>
        )}
        <div
          style={{
            padding: msg.attachment_url && msg.message_type === "image" ? 4 : "8px 14px",
            borderRadius: mine ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
            background: mine ? "linear-gradient(135deg, #1E88E5, #1565C0)" : "#111827",
            color: mine ? "#fff" : "#E8EDF5",
            fontSize: 14, lineHeight: 1.45,
            border: !mine ? "1px solid rgba(255,255,255,0.05)" : "none",
            opacity: msg.is_deleted ? 0.5 : 1,
            fontStyle: msg.is_deleted ? "italic" : "normal",
            wordBreak: "break-word",
            overflow: "hidden",
            maxWidth: 400,
          }}
          onDoubleClick={onReply}
        >
          {msg.is_deleted ? (
            "🗑️ Message deleted"
          ) : (
            <MessageContent msg={msg} mine={mine} meId={meId} />
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3, justifyContent: mine ? "flex-end" : "flex-start" }}>
          {reactionEntries.map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              style={{
                background: users.includes(meId) ? "rgba(30,136,229,0.2)" : "rgba(255,255,255,0.05)",
                border: users.includes(meId) ? "1px solid rgba(30,136,229,0.4)" : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "2px 8px", fontSize: 11, cursor: "pointer",
                color: "#E8EDF5",
              }}
            >
              {emoji} {users.length}
            </button>
          ))}
          <span style={{ fontSize: 10, color: "#5A6478", display: "inline-flex", alignItems: "center", gap: 4 }}>
            {formatTime(msg.created_at)}{msg.is_edited && " · edited"}
            {mine && status && <TickIndicator status={status} />}
          </span>
          {!msg.is_deleted && (
            <button onClick={onToggleMenu} style={{ background: "transparent", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 12, padding: 0 }}>⋯</button>
          )}
        </div>
        {menuOpen && !msg.is_deleted && (
          <div style={{ ...menuBox, right: mine ? 0 : "auto", left: mine ? "auto" : 0, top: "auto", bottom: 28, width: 160 }}>
            <MenuItem onClick={() => { setReactBarOpen(!reactBarOpen); }}>😀 React</MenuItem>
            {reactBarOpen && (
              <div style={{ display: "flex", gap: 4, padding: 6, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {REACTION_EMOJIS.map((e) => (
                  <button key={e} onClick={() => { onReact(e); setReactBarOpen(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18 }}>{e}</button>
                ))}
              </div>
            )}
            <MenuItem onClick={onReply}>↩ Reply</MenuItem>
            <MenuItem onClick={onForward}>↪ Forward</MenuItem>
            <MenuItem onClick={onCopy}>📋 Copy</MenuItem>
            <MenuItem onClick={onStar}>⭐ Star</MenuItem>
            {onEdit && <MenuItem onClick={onEdit}>✏️ Edit</MenuItem>}
            <MenuItem onClick={() => onDelete(false)}>🗑 Delete for me</MenuItem>
            {mine && <MenuItem danger onClick={() => onDelete(true)}>🗑 Delete for everyone</MenuItem>}
            {onBlockSender && <MenuItem danger onClick={onBlockSender}>🚫 Block sender</MenuItem>}
          </div>
        )}
      </div>
    </div>
  );
}

function NewChatModal({ users, onClose, onPick }: { users: DirectoryUser[]; onClose: () => void; onPick: (id: string, name: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title="Start a new chat" onClose={onClose}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search users by name or email..."
        style={modalInput}
        autoFocus
      />
      <div style={{ maxHeight: 400, overflowY: "auto", marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.length === 0 && <p style={{ fontSize: 13, color: "#8892A4", padding: 16, textAlign: "center" }}>No users found.</p>}
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => onPick(u.id, u.name)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: "transparent", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10, cursor: "pointer", textAlign: "left", color: "#E8EDF5",
            }}
          >
            <Avatar size={36} name={u.name} url={u.avatar_url} id={u.id} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "#8892A4", textTransform: "capitalize" }}>{u.role.replace("_", " ")} · {u.email}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function NewGroupModal({ users, onClose, onCreated }: { users: DirectoryUser[]; onClose: () => void; onCreated: (roomId: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const filtered = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()));

  async function create() {
    if (!name.trim()) { toast.error("Group name required"); return; }
    if (selected.size === 0) { toast.error("Pick at least one member"); return; }
    setBusy(true);
    const r = await saCreateGroup(name.trim(), Array.from(selected));
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Group created");
    onCreated(r.data!.roomId, name.trim());
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" style={modalInput} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members..." style={{ ...modalInput, marginTop: 10 }} />
      <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map((u) => {
          const checked = selected.has(u.id);
          return (
            <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, cursor: "pointer", background: checked ? "rgba(30,136,229,0.08)" : "transparent", border: "1px solid rgba(255,255,255,0.05)" }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const n = new Set(selected);
                  if (checked) n.delete(u.id); else n.add(u.id);
                  setSelected(n);
                }}
              />
              <Avatar size={32} name={u.name} url={u.avatar_url} id={u.id} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{u.name}</div>
                <div style={{ fontSize: 11, color: "#8892A4", textTransform: "capitalize" }}>{u.role.replace("_", " ")}</div>
              </div>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={create} disabled={busy} style={btnPrimary}>{busy ? "Creating..." : `Create (${selected.size})`}</button>
      </div>
    </Modal>
  );
}

function CreatePollModal({ roomId, onClose, onPosted }: { roomId: string; onClose: () => void; onPosted: (msg: DbMessage) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);

  function setOption(i: number, v: string) {
    setOptions((prev) => prev.map((o, idx) => idx === i ? v : o));
  }
  function addOption() {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, ""]);
  }
  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q) { toast.error("Question required"); return; }
    if (opts.length < 2) { toast.error("Add at least 2 options"); return; }
    setBusy(true);
    const r = await saCreatePoll({ roomId, question: q, options: opts, multiSelect: multi, anonymous: anon });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    const msg: DbMessage = {
      id: r.data!.messageId,
      chat_room_id: roomId,
      sender_id: "",       // populated from me via parent
      sender_name: null,
      sender_avatar: null,
      content: q,
      message_type: "file",
      reply_to_id: null,
      reply_preview: null,
      attachment_url: `poll://${r.data!.pollId}`,
      is_edited: false,
      is_deleted: false,
      reactions: {},
      created_at: new Date().toISOString(),
    };
    toast.success("Poll posted");
    onPosted(msg);
    onClose();
  }

  return (
    <Modal title="Create a poll" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Question</div>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should we decide?" style={modalInput} autoFocus />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Options</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {options.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 6 }}>
                <input
                  value={o}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  style={modalInput}
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} style={{ ...iconBtn, color: "#EF5350" }}>✕</button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button onClick={addOption} style={{ marginTop: 8, background: "transparent", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px", color: "#1E88E5", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
              + Add option
            </button>
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#E8EDF5", cursor: "pointer" }}>
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          Allow multiple selections
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#E8EDF5", cursor: "pointer" }}>
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
          Anonymous poll (hide who voted)
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Posting…" : "Post poll"}</button>
        </div>
      </div>
    </Modal>
  );
}

function ForwardModal({
  message, rooms, onClose, onConfirm,
}: { message: DbMessage; rooms: RoomListItem[]; onClose: () => void; onConfirm: (roomIds: string[]) => void }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const visible = rooms.filter((r) => !r.is_archived && r.name.toLowerCase().includes(q.toLowerCase()));

  async function confirm() {
    if (selected.size === 0) { toast.error("Pick at least one chat"); return; }
    setBusy(true);
    await onConfirm(Array.from(selected));
    setBusy(false);
  }

  return (
    <Modal title="Forward message" onClose={onClose}>
      <div style={{ padding: "10px 12px", background: "#0A0E1A", borderRadius: 10, marginBottom: 12, borderLeft: "3px solid #1E88E5" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5", marginBottom: 4 }}>Forwarding</div>
        <div style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {message.attachment_url ? (message.message_type === "image" ? "🖼 Image" : "📄 Attachment") : message.content.slice(0, 80)}
        </div>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats..." style={modalInput} />
      <div style={{ maxHeight: 340, overflowY: "auto", marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {visible.length === 0 && <p style={{ fontSize: 13, color: "#8892A4", padding: 16, textAlign: "center" }}>No chats.</p>}
        {visible.map((r) => {
          const checked = selected.has(r.id);
          return (
            <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, cursor: "pointer", background: checked ? "rgba(30,136,229,0.08)" : "transparent", border: "1px solid rgba(255,255,255,0.05)" }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const n = new Set(selected);
                  if (checked) n.delete(r.id); else n.add(r.id);
                  setSelected(n);
                }}
              />
              <Avatar size={32} name={r.name} url={r.avatar_url} id={r.id} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#8892A4", textTransform: "capitalize" }}>{r.type}</div>
              </div>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={confirm} disabled={busy} style={btnPrimary}>{busy ? "Sending..." : `Forward (${selected.size})`}</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ ...iconBtn, fontSize: 18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
        background: "transparent", border: "none",
        color: danger ? "#EF5350" : "#E8EDF5",
        fontSize: 13, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ── In-app media viewer (no browser redirects) ── */

function getExtension(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const m = path.match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/);
    return m ? m[1].toLowerCase() : "";
  } catch { return ""; }
}

function cloudinaryDownloadUrl(url: string, filename?: string): string {
  // fl_attachment only works on /image/upload/ and /video/upload/ — NOT /raw/upload/
  try {
    if (!url.includes("res.cloudinary.com")) return url;
    if (!/\/(image|video)\/upload\//.test(url)) return url;
    const safe = (filename || "file").replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9._-]/g, "_");
    return url.replace(/\/(image|video)\/upload\//, `/$1/upload/fl_attachment:${safe}/`);
  } catch { return url; }
}

async function cachedDownload(url: string, filename: string) {
  // Primary: fetch as blob and save client-side. Works when CORS is permitted (Cloudinary delivery allows it).
  try {
    const res = await fetch(url, { credentials: "omit", mode: "cors" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    const obj = URL.createObjectURL(blob);
    a.href = obj;
    a.download = filename || "file";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(obj); a.remove(); }, 1000);
    return;
  } catch (e) {
    console.warn("[download] blob path failed, trying fl_attachment:", e);
  }
  // Fallback 1: Cloudinary fl_attachment (image/video only)
  const forced = cloudinaryDownloadUrl(url, filename);
  if (forced !== url) {
    const a = document.createElement("a");
    a.href = forced;
    a.download = filename || "file";
    a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  // Fallback 2: open original URL (browser will show or save depending on content-type)
  window.open(url, "_blank", "noopener");
}

function MediaViewer({
  url, filename, kind, onClose,
}: { url: string; filename?: string; kind: "image" | "file"; onClose: () => void }) {
  const ext = getExtension(url);
  const isPdf = ext === "pdf";
  const isOfficeDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [officeReady, setOfficeReady] = useState(false);

  // Fetch PDF as blob so browser uses native viewer regardless of Cloudinary content-type
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false; let objUrl: string | null = null;
    setPdfLoading(true); setPdfFailed(false);
    (async () => {
      try {
        const r = await fetch(url, { mode: "cors" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const b = await r.blob();
        if (cancelled) return;
        // Force proper mime in case server returned octet-stream
        const pdfBlob = b.type === "application/pdf" ? b : new Blob([b], { type: "application/pdf" });
        objUrl = URL.createObjectURL(pdfBlob);
        setPdfBlobUrl(objUrl);
      } catch (e) {
        console.warn("[pdf] blob fetch failed:", e);
        if (!cancelled) setPdfFailed(true);
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => { cancelled = true; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [isPdf, url]);

  // Office Online viewer needs a public https URL
  const officeViewerSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  const googleViewerSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  async function onDownload() {
    toast.loading("Preparing download…", { id: "dl" });
    await cachedDownload(url, filename || `file.${ext}`);
    toast.success("Downloaded", { id: "dl" });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 300,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Top bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "14px 20px", background: "linear-gradient(180deg, rgba(0,0,0,0.75), transparent)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          zIndex: 2,
        }}
      >
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {filename || "Media"} <span style={{ opacity: 0.6, marginLeft: 6, textTransform: "uppercase", fontSize: 11 }}>{ext}</span>
        </div>
        <button onClick={onDownload} style={viewerBtn}>⬇ Download</button>
        <button onClick={onClose} style={{ ...viewerBtn, fontSize: 18 }}>✕</button>
      </div>

      {/* Body */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "96vw", maxHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}
      >
        {kind === "image" && (
          <img src={url} alt={filename || ""} style={{ maxWidth: "92vw", maxHeight: "86vh", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
        )}
        {kind === "file" && isPdf && (
          <>
            {pdfLoading && <LoadingCard label="Loading PDF…" />}
            {!pdfLoading && pdfBlobUrl && (
              <iframe
                src={pdfBlobUrl}
                title={filename || "PDF"}
                style={{ width: "92vw", height: "86vh", border: "none", borderRadius: 8, background: "#fff" }}
              />
            )}
            {!pdfLoading && !pdfBlobUrl && pdfFailed && (
              <iframe
                src={googleViewerSrc}
                title={filename || "PDF"}
                style={{ width: "92vw", height: "86vh", border: "none", borderRadius: 8, background: "#fff" }}
              />
            )}
          </>
        )}
        {kind === "file" && isOfficeDoc && (
          <div style={{ width: "92vw", height: "86vh", position: "relative", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            {!officeReady && <LoadingCard label="Loading document… Office viewer can take 10-30s. Click Download for instant access." />}
            <iframe
              src={officeViewerSrc}
              title={filename || "Document"}
              onLoad={() => setOfficeReady(true)}
              style={{ width: "100%", height: "100%", border: "none", background: "#fff", opacity: officeReady ? 1 : 0 }}
            />
          </div>
        )}
        {kind === "file" && !isPdf && !isOfficeDoc && (
          <UnsupportedFile url={url} filename={filename} ext={ext} onDownload={onDownload} />
        )}
      </div>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "#fff", padding: 20, textAlign: "center" }}>
      <div style={{ width: 42, height: 42, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#1E88E5", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", maxWidth: 420 }}>{label}</div>
    </div>
  );
}

function UnsupportedFile({ url, filename, ext, onDownload }: { url: string; filename?: string; ext: string; onDownload: () => void }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 40, textAlign: "center", maxWidth: 440 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#E8EDF5", margin: "0 0 6px 0" }}>
        {filename || "Attachment"}
      </h3>
      <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 20px 0" }}>
        Inline preview not supported for <b>.{ext || "this"}</b> files. Download to view on your device.
      </p>
      <button onClick={onDownload} style={{ background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        ⬇ Download
      </button>
      <div style={{ marginTop: 10 }}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#8892A4" }}>Open in new tab</a>
      </div>
    </div>
  );
}

function ImageThumbnail({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{ cursor: "zoom-in", display: "block", lineHeight: 0 }}
      >
        <img
          src={url}
          alt="attachment"
          style={{ width: "100%", maxWidth: 360, maxHeight: 360, objectFit: "cover", borderRadius: 10, display: "block" }}
        />
      </div>
      {open && <MediaViewer url={url} kind="image" onClose={() => setOpen(false)} />}
    </>
  );
}

function FileCard({ url, filename, bytes, mine }: { url: string; filename: string; bytes: number; mine: boolean }) {
  const [open, setOpen] = useState(false);
  const ext = getExtension(url);
  const icon = ext === "pdf" ? "📕" : ["doc","docx"].includes(ext) ? "📘" : ["xls","xlsx","csv"].includes(ext) ? "📗" : ["ppt","pptx"].includes(ext) ? "📙" : ext === "zip" ? "🗜" : "📄";
  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minWidth: 220 }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: mine ? "rgba(255,255,255,0.15)" : "rgba(30,136,229,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {filename}
          </div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>
            {bytes > 0 ? humanFileSize(bytes) + " · " : ""}<span style={{ textTransform: "uppercase" }}>{ext}</span> · Tap to open
          </div>
        </div>
      </div>
      {open && <MediaViewer url={url} filename={filename} kind="file" onClose={() => setOpen(false)} />}
    </>
  );
}

const viewerBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10,
  padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  backdropFilter: "blur(10px)",
};

/* ── Message content renderer (image / file / audio / text) ── */

function MessageContent({ msg, mine, meId }: { msg: DbMessage; mine: boolean; meId: string }) {
  const url = msg.attachment_url;

  // POLL (attachment_url is poll://<id>)
  if (url && url.startsWith("poll://")) {
    const pollId = url.slice("poll://".length);
    return <PollCard pollId={pollId} mine={mine} meId={meId} />;
  }

  // IMAGE
  if (msg.message_type === "image" && url) {
    const caption = msg.content && msg.content !== "📷 Image" ? msg.content : "";
    return (
      <div>
        <ImageThumbnail url={url} />
        {caption && (
          <div style={{ padding: "6px 10px", fontSize: 13 }}>{caption}</div>
        )}
      </div>
    );
  }

  // AUDIO (voice note)
  if (msg.message_type === "file" && url && (url.endsWith(".webm") || url.endsWith(".mp4") || url.endsWith(".ogg") || url.endsWith(".mp3") || msg.content.includes("🎙"))) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
        <span style={{ fontSize: 18 }}>🎙</span>
        <audio controls src={url} style={{ height: 32, flex: 1, maxWidth: 240 }} />
      </div>
    );
  }

  // FILE
  if (msg.message_type === "file" && url) {
    const [filename, sizeStr] = msg.content.split("|");
    const bytes = parseInt(sizeStr || "0", 10);
    return <FileCard url={url} filename={filename || "Attachment"} bytes={bytes} mine={mine} />;
  }

  // TEXT (with link detection + preview)
  const firstUrl = msg.content.match(/https?:\/\/[^\s]+/)?.[0] || null;
  return (
    <>
      <LinkifiedText text={msg.content} />
      {firstUrl && <LinkPreview url={firstUrl} mine={mine} />}
    </>
  );
}

/* ── Poll card (inline in message bubble) ── */

interface PollData {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  multiSelect: boolean;
  anonymous: boolean;
  closedAt: string | null;
  createdBy: string;
  creatorName: string | null;
  totals: Record<string, number>;
  myVotes: string[];
  totalVoters: number;
}

function PollCard({ pollId, mine, meId }: { pollId: string; mine: boolean; meId: string }) {
  const cacheKey = `cios-poll-${pollId}`;
  const [data, setData] = useState<PollData | null>(() => {
    if (typeof window === "undefined") return null;
    try { const raw = localStorage.getItem(cacheKey); return raw ? JSON.parse(raw) as PollData : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(!data);
  const [voting, setVoting] = useState(false);

  const persist = (d: PollData) => {
    try { localStorage.setItem(cacheKey, JSON.stringify(d)); } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await saGetPoll(pollId);
      if (cancelled) return;
      if (r.ok) {
        const fresh: PollData = {
          id: r.data!.id,
          question: r.data!.question,
          options: r.data!.options,
          multiSelect: r.data!.multi_select,
          anonymous: r.data!.is_anonymous,
          closedAt: r.data!.closed_at,
          createdBy: r.data!.created_by,
          creatorName: r.data!.creator_name,
          totals: r.data!.totals,
          myVotes: r.data!.myVotes,
          totalVoters: r.data!.totalVoters,
        };
        setData(fresh);
        persist(fresh);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  async function vote(optionId: string) {
    if (!data || data.closedAt || voting) return;
    setVoting(true);
    let next: string[];
    if (data.multiSelect) {
      next = data.myVotes.includes(optionId)
        ? data.myVotes.filter((id) => id !== optionId)
        : [...data.myVotes, optionId];
    } else {
      next = data.myVotes[0] === optionId ? [] : [optionId];
    }

    // Optimistic local update + cache
    const prevTotals = data.totals;
    const prevMyVotes = data.myVotes;
    const optimisticTotals: Record<string, number> = { ...prevTotals };
    for (const id of prevMyVotes) optimisticTotals[id] = Math.max(0, (optimisticTotals[id] || 0) - 1);
    for (const id of next) optimisticTotals[id] = (optimisticTotals[id] || 0) + 1;
    const optimistic: PollData = {
      ...data, myVotes: next, totals: optimisticTotals,
      totalVoters: Object.values(optimisticTotals).reduce((a, b) => a + b, 0),
    };
    setData(optimistic);
    persist(optimistic);

    const r = await saVotePoll(pollId, next);
    setVoting(false);
    if (!r.ok) {
      toast.error(r.error);
      // revert
      const reverted: PollData = { ...data, myVotes: prevMyVotes, totals: prevTotals };
      setData(reverted); persist(reverted);
      return;
    }
    const confirmed: PollData = { ...data, myVotes: r.data!.myVotes, totals: r.data!.totals, totalVoters: Object.values(r.data!.totals).reduce((a, b) => a + b, 0) };
    setData(confirmed);
    persist(confirmed);
  }

  async function onClose() {
    if (!data) return;
    if (!confirm("Close this poll? No more votes will be accepted.")) return;
    const r = await saClosePoll(pollId);
    if (!r.ok) { toast.error(r.error); return; }
    const closed: PollData = { ...data, closedAt: new Date().toISOString() };
    setData(closed); persist(closed);
    toast.success("Poll closed");
  }

  if (loading) {
    return <div style={{ padding: 10, fontSize: 12, color: mine ? "rgba(255,255,255,0.7)" : "#8892A4" }}>Loading poll…</div>;
  }
  if (!data) {
    return <div style={{ padding: 10, fontSize: 12, color: "#EF5350" }}>Poll unavailable</div>;
  }

  const totalVotes = Object.values(data.totals).reduce((s, n) => s + n, 0);
  const isClosed = !!data.closedAt;

  return (
    <div style={{ minWidth: 280, maxWidth: 380, padding: "4px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: mine ? "rgba(255,255,255,0.7)" : "#8892A4" }}>
          Poll{data.multiSelect ? " · multi-select" : ""}{data.anonymous ? " · anonymous" : ""}{isClosed ? " · closed" : ""}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{data.question}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.options.map((opt) => {
          const count = data.totals[opt.id] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const voted = data.myVotes.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={isClosed || voting}
              style={{
                position: "relative", overflow: "hidden",
                textAlign: "left", padding: "8px 12px", borderRadius: 10,
                background: "transparent", cursor: isClosed ? "default" : "pointer",
                border: voted ? `2px solid ${mine ? "#fff" : "#1E88E5"}` : `1px solid ${mine ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                color: "inherit",
              }}
            >
              <div style={{
                position: "absolute", inset: 0,
                background: mine ? "rgba(255,255,255,0.15)" : "rgba(30,136,229,0.12)",
                width: `${pct}%`, transition: "width 0.4s ease",
              }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {voted && <span style={{ fontSize: 12 }}>{data.multiSelect ? "☑" : "●"}</span>}
                  <span style={{ fontSize: 13, fontWeight: voted ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.text}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{pct}%</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 11, color: mine ? "rgba(255,255,255,0.7)" : "#8892A4", gap: 8 }}>
        <span>{data.totalVoters} voter{data.totalVoters === 1 ? "" : "s"} · {totalVotes} vote{totalVotes === 1 ? "" : "s"}</span>
        {data.createdBy === meId && !isClosed && (
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "inherit", borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            Close poll
          </button>
        )}
        {!isClosed && data.createdBy !== meId && data.creatorName && <span>by {data.creatorName}</span>}
      </div>
    </div>
  );
}

function LinkPreview({ url, mine }: { url: string; mine: boolean }) {
  const [data, setData] = useState<{ title: string; description: string; image: string | null; siteName: string | null } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cacheKey = `cios-linkprev-${url}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) { setData(JSON.parse(raw)); return; }
    } catch {}
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!r.ok) { if (!cancelled) setFailed(true); return; }
        const d = await r.json();
        if (cancelled) return;
        setData(d);
        try { localStorage.setItem(cacheKey, JSON.stringify(d)); } catch {}
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (failed || !data || !data.title) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "block",
      marginTop: 8,
      background: mine ? "rgba(255,255,255,0.1)" : "#0A0E1A",
      borderRadius: 10,
      overflow: "hidden",
      textDecoration: "none",
      color: "inherit",
      border: mine ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.07)",
      maxWidth: 340,
    }}>
      {data.image && (
        <img src={data.image} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
      )}
      <div style={{ padding: "8px 12px" }}>
        {data.siteName && <div style={{ fontSize: 10, fontWeight: 700, color: mine ? "rgba(255,255,255,0.7)" : "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{data.siteName}</div>}
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {data.title}
        </div>
        {data.description && (
          <div style={{ fontSize: 11, color: mine ? "rgba(255,255,255,0.8)" : "#8892A4", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {data.description}
          </div>
        )}
      </div>
    </a>
  );
}

function LinkifiedText({ text }: { text: string }) {
  const parts = useMemo(() => {
    const re = /(https?:\/\/[^\s]+)/g;
    const out: { type: "text" | "link"; value: string }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
      out.push({ type: "link", value: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ type: "text", value: text.slice(last) });
    return out;
  }, [text]);

  return (
    <>
      {parts.map((p, i) =>
        p.type === "link" ? (
          <a key={i} href={p.value} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
            {p.value}
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </>
  );
}

/* ── Composer ── */

function Composer({
  activeRoomId, me, draft, onDraftChange, replyTo, onClearReply, editing, onCancelEdit, onSendText, onSendMedia, onOpenPoll,
}: {
  activeRoomId: string;
  me: MeInfo;
  draft: string;
  onDraftChange: (v: string) => void;
  replyTo: DbMessage | null;
  onClearReply: () => void;
  editing: DbMessage | null;
  onCancelEdit: () => void;
  onSendText: () => void;
  onSendMedia: (o: { url: string; kind: "image" | "file" | "audio"; caption?: string; filename?: string; sizeBytes?: number }) => void;
  onOpenPoll: () => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);

  async function handleImageFile(files: FileList | null) {
    if (!files || !files[0]) return;
    const file = files[0];
    if (file.size > 15 * 1024 * 1024) { toast.error("File too big (max 15 MB)"); return; }
    setUploading(true);
    const toastId = toast.loading("Uploading image…");
    try {
      const compressed = isImage(file) ? await compressImage(file, { maxBytes: 2 * 1024 * 1024 }) : file;
      const up = await uploadToCloudinary(compressed, { folder: `cios-chat/${activeRoomId}/images`, resourceType: "image" });
      toast.success("Sent", { id: toastId });
      onSendMedia({ url: up.secureUrl, kind: "image", caption: "" });
    } catch (e) {
      toast.error((e as Error).message, { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  async function handleFileAttach(files: FileList | null) {
    if (!files || !files[0]) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error("File too big (max 10 MB)"); return; }
    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}…`);
    try {
      // Use "auto" so Cloudinary picks the right pipeline: PDFs go to image (proper content-type, inline preview works);
      // docx/xlsx/pptx go to raw; audio/video to video. fl_attachment only works on image/video delivery URLs.
      const up = await uploadToCloudinary(file, { folder: `cios-chat/${activeRoomId}/files`, resourceType: "auto", filename: file.name });
      toast.success("Sent", { id: toastId });
      onSendMedia({ url: up.secureUrl, kind: "file", filename: file.name, sizeBytes: file.size });
    } catch (e) {
      toast.error((e as Error).message, { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  return (
    <footer style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#111827", position: "relative" }}>
      {replyTo && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 8, background: "#0A0E1A", borderRadius: 10, borderLeft: "3px solid #1E88E5" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5" }}>Replying to {replyTo.sender_name}</div>
            <div style={{ fontSize: 12, color: "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyTo.content}</div>
          </div>
          <button onClick={onClearReply} style={iconBtn}>✕</button>
        </div>
      )}
      {editing && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 8, background: "rgba(255,193,7,0.1)", borderRadius: 10, borderLeft: "3px solid #FFC107" }}>
          <div style={{ fontSize: 12, color: "#FFC107" }}>Editing message</div>
          <button onClick={onCancelEdit} style={iconBtn}>✕</button>
        </div>
      )}
      {showQuickReplies && (
        <QuickReplies
          onPick={(t) => { onDraftChange(draft ? draft + " " + t : t); setShowQuickReplies(false); }}
          onClose={() => setShowQuickReplies(false)}
        />
      )}

      {showAttachSheet && (
        <AttachSheet
          onClose={() => setShowAttachSheet(false)}
          onPickImage={() => { imageInput.current?.click(); setShowAttachSheet(false); }}
          onPickCamera={() => {
            const isMobile = typeof window !== "undefined" && /iphone|ipad|android|mobile/i.test(navigator.userAgent);
            if (isMobile) cameraInput.current?.click();
            else setShowCamera(true);
            setShowAttachSheet(false);
          }}
          onPickFile={() => { fileInput.current?.click(); setShowAttachSheet(false); }}
          onPickQuickReply={() => { setShowQuickReplies(true); setShowAttachSheet(false); }}
          onPickPoll={() => { onOpenPoll(); setShowAttachSheet(false); }}
        />
      )}
      {recording ? (
        <VoiceRecorderPanel
          onCancel={() => setRecording(false)}
          onSend={async (blob, durMs) => {
            setRecording(false);
            setUploading(true);
            const toastId = toast.loading("Uploading voice note…");
            try {
              const ext = blob.type.includes("mp4") ? "mp4" : "webm";
              const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
              const up = await uploadToCloudinary(file, { folder: `cios-chat/${activeRoomId}/voice`, resourceType: "video", filename: file.name });
              toast.success("Sent", { id: toastId });
              onSendMedia({ url: up.secureUrl, kind: "audio", filename: `Voice note (${Math.round(durMs / 1000)}s)` });
            } catch (e) {
              toast.error((e as Error).message, { id: toastId });
            } finally {
              setUploading(false);
            }
          }}
        />
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <input ref={imageInput} type="file" accept="image/*" hidden onChange={(e) => handleImageFile(e.target.files)} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleImageFile(e.target.files)} />
          {showCamera && <CameraCapture onClose={() => setShowCamera(false)} onCapture={(file) => { const dt = new DataTransfer(); dt.items.add(file); handleImageFile(dt.files); }} />}
          <input ref={fileInput} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.csv,.zip" hidden onChange={(e) => handleFileAttach(e.target.files)} />
          <button
            onClick={() => setShowAttachSheet(true)}
            disabled={uploading}
            title="Attach"
            style={{ ...composerBtn, fontSize: 22, lineHeight: 1 }}
          >+</button>
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendText(); }
            }}
            placeholder={uploading ? "Uploading…" : "Type a message…"}
            rows={1}
            disabled={uploading}
            style={{ flex: 1, resize: "none", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "#E8EDF5", fontSize: 14, outline: "none", fontFamily: "inherit", maxHeight: 120 }}
          />
          {draft.trim() ? (
            <button
              onClick={onSendText}
              style={{ background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {editing ? "Save" : "Send"}
            </button>
          ) : (
            <button onClick={() => setRecording(true)} title="Voice note" aria-label="Record voice note" style={{ ...composerBtn, width: 44, height: 44, fontSize: 18 }}>🎤</button>
          )}
        </div>
      )}
    </footer>
  );
}

/* ── Voice recorder panel ── */

function VoiceRecorderPanel({ onCancel, onSend }: { onCancel: () => void; onSend: (blob: Blob, durationMs: number) => void }) {
  const rec = useVoiceRecorder();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) {
      rec.start().then(() => setStarted(true)).catch((e) => {
        toast.error("Mic permission denied or unavailable");
        console.error(e);
        onCancel();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const secs = Math.floor(rec.durationMs / 1000);
  const mm = Math.floor(secs / 60).toString().padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "#0A0E1A", borderRadius: 12, padding: "10px 14px" }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: rec.state === "recording" ? "#EF5350" : "#8892A4",
          animation: rec.state === "recording" ? "recpulse 1s ease-in-out infinite" : "none",
        }} />
        <style>{`@keyframes recpulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
        <Waveform active={rec.state === "recording"} />
        <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "#E8EDF5", minWidth: 44 }}>{mm}:{ss}</div>
        {rec.audioUrl && rec.state === "stopped" && (
          <audio src={rec.audioUrl} controls style={{ height: 28, maxWidth: 200 }} />
        )}
      </div>
      {rec.state === "recording" && (
        <button onClick={rec.pause} style={composerBtn} title="Pause">⏸</button>
      )}
      {rec.state === "paused" && (
        <button onClick={rec.resume} style={composerBtn} title="Resume">▶</button>
      )}
      {rec.state !== "stopped" && (
        <button onClick={rec.stop} style={composerBtn} title="Stop">⏹</button>
      )}
      <button onClick={() => { rec.reset(); onCancel(); }} title="Cancel" style={composerBtn}>✕</button>
      {rec.state === "stopped" && rec.blob && (
        <button
          onClick={() => onSend(rec.blob!, rec.durationMs)}
          style={{ background: "linear-gradient(135deg, #66BB6A, #2E7D32)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Send
        </button>
      )}
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, maxWidth: 180 }}>
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: active ? `${6 + ((i * 7) % 18)}px` : "4px",
            background: active ? "#1E88E5" : "rgba(255,255,255,0.2)",
            borderRadius: 2,
            animation: active ? `wave 0.9s ease-in-out ${i * 0.04}s infinite alternate` : "none",
          }}
        />
      ))}
      <style>{`@keyframes wave { 0%{transform:scaleY(0.4)} 100%{transform:scaleY(1.2)} }`}</style>
    </div>
  );
}

/* ── Quick replies (localStorage-persisted) ── */

const DEFAULT_QUICK_REPLIES = [
  "Received 👌",
  "Working on it",
  "Check your dashboard",
  "Please submit before the deadline",
  "Thanks!",
  "Will revert shortly",
];

function QuickReplies({ onPick, onClose }: { onPick: (text: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<string[]>(DEFAULT_QUICK_REPLIES);
  const [newText, setNewText] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cios-quick-replies");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);
  function save(next: string[]) {
    setItems(next);
    try { localStorage.setItem("cios-quick-replies", JSON.stringify(next)); } catch {}
  }
  return (
    <div style={{ position: "absolute", bottom: "calc(100% - 8px)", left: 16, right: 16, background: "#1A2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, zIndex: 40, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5 }}>⚡ QUICK REPLIES</span>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {items.map((t, i) => (
          <button key={i} onClick={() => onPick(t)} style={{ background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "6px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {t}
            <span
              onClick={(e) => { e.stopPropagation(); save(items.filter((_, idx) => idx !== i)); }}
              style={{ color: "#EF5350", cursor: "pointer" }}
              role="button"
            >×</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a new quick reply..."
          style={modalInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newText.trim()) { save([...items, newText.trim()]); setNewText(""); }
          }}
        />
        <button
          onClick={() => { if (newText.trim()) { save([...items, newText.trim()]); setNewText(""); } }}
          style={btnPrimary}
        >Add</button>
      </div>
    </div>
  );
}

/* ── Status / Stories strip + viewer + creator ── */

const STATUS_BACKGROUNDS = [
  "linear-gradient(135deg, #1E88E5, #1565C0)",
  "linear-gradient(135deg, #AB47BC, #7B1FA2)",
  "linear-gradient(135deg, #EF5350, #C62828)",
  "linear-gradient(135deg, #66BB6A, #2E7D32)",
  "linear-gradient(135deg, #FFC107, #F57C00)",
  "linear-gradient(135deg, #26C6DA, #00838F)",
  "linear-gradient(135deg, #5C6BC0, #283593)",
  "#0A0E1A",
];

function StatusStrip({
  statuses, meId, onOpen, onCreate,
}: { statuses: StatusRow[]; meId: string; onOpen: (list: StatusRow[], index: number) => void; onCreate: () => void }) {
  // Group by user, preserve newest order
  const byUser: { userId: string; name: string | null; avatar: string | null; list: StatusRow[]; isMine: boolean; hasUnviewed: boolean }[] = [];
  const seen = new Map<string, number>();
  for (const s of statuses) {
    let idx = seen.get(s.user_id);
    if (idx === undefined) {
      idx = byUser.length;
      seen.set(s.user_id, idx);
      byUser.push({ userId: s.user_id, name: s.user_name, avatar: s.user_avatar, list: [], isMine: s.is_mine, hasUnviewed: false });
    }
    byUser[idx].list.push(s);
    if (!s.has_viewed && !s.is_mine) byUser[idx].hasUnviewed = true;
  }
  // Sort mine first, then unviewed, then viewed
  byUser.sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
    return 0;
  });

  const myGroup = byUser.find((g) => g.isMine);

  return (
    <div className="cios-status-strip" style={{ padding: "10px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
        Statuses · expire in 24h
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* My status / create button */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => { if (myGroup) onOpen(myGroup.list, 0); else onCreate(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (myGroup) onOpen(myGroup.list, 0); else onCreate(); } }}
          style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 64, flexShrink: 0 }}
        >
          <div style={{ position: "relative" }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              border: myGroup ? "3px solid #1E88E5" : "2px dashed rgba(255,255,255,0.2)",
              padding: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {myGroup?.list[0]?.kind === "image" && myGroup.list[0].media_url ? (
                <img src={myGroup.list[0].media_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              ) : myGroup?.list[0]?.kind === "text" ? (
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: myGroup.list[0].background || "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: myGroup.list[0].text_color || "#fff", padding: 4, textAlign: "center", overflow: "hidden" }}>
                  {myGroup.list[0].content.slice(0, 12)}
                </div>
              ) : (
                <Avatar size={46} name="Me" url={null} id={meId} />
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onCreate(); }}
              style={{
                position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%",
                background: "#1E88E5", color: "#fff", border: "2px solid #111827",
                cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, padding: 0,
              }}
            >+</button>
          </div>
          <span style={{ fontSize: 10, color: "#8892A4", fontWeight: 600, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis" }}>
            {myGroup ? "Your status" : "Add status"}
          </span>
        </div>

        {/* Other users' statuses */}
        {byUser.filter((g) => !g.isMine).map((g) => (
          <button
            key={g.userId}
            onClick={() => onOpen(g.list, 0)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 64, flexShrink: 0 }}
          >
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              padding: 2,
              background: g.hasUnviewed ? "conic-gradient(#1E88E5, #AB47BC, #FFC107, #66BB6A, #1E88E5)" : "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Avatar size={46} name={g.name || "?"} url={g.avatar} id={g.userId} />
            </div>
            <span style={{ fontSize: 10, color: "#8892A4", fontWeight: g.hasUnviewed ? 700 : 500, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(g.name || "").split(" ")[0] || "User"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusViewer({
  list, startIndex, meId, onClose, onDeleted, onReactionUpdate, onViewed,
}: {
  list: StatusRow[]; startIndex: number; meId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onReactionUpdate: (id: string, reactions: Record<string, string[]>) => void;
  onViewed: (id: string) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<{ id: string; name: string; avatar_url: string | null; viewed_at: string }[]>([]);

  const current = list[index];
  const currentId = current?.id;
  const currentKind = current?.kind;
  const currentIsMine = current?.is_mine;
  const currentHasViewed = current?.has_viewed;
  const listLength = list.length;

  const onCloseRef = useRef(onClose);
  const onViewedRef = useRef(onViewed);
  useEffect(() => { onCloseRef.current = onClose; onViewedRef.current = onViewed; }, [onClose, onViewed]);

  // Advance timer — depends only on primitive values that actually change per status/pause
  useEffect(() => {
    if (!currentId || paused) return;
    const DURATION_MS = currentKind === "text" ? 5000 : 7000;
    setProgress(0);
    const start = Date.now();
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          setIndex((prev) => {
            if (prev < listLength - 1) return prev + 1;
            // Last status done — close via ref (outside of React render phase)
            setTimeout(() => onCloseRef.current(), 0);
            return prev;
          });
        }, 0);
      }
    }, 50);
    return () => clearInterval(tick);
  }, [currentId, currentKind, paused, listLength]);

  // Mark viewed once per status id — track what we've marked in a ref to prevent loop
  const markedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentId || currentIsMine || currentHasViewed) return;
    if (markedRef.current.has(currentId)) return;
    markedRef.current.add(currentId);
    saMarkStatusViewed(currentId);
    onViewedRef.current(currentId);
  }, [currentId, currentIsMine, currentHasViewed]);

  if (!current) return null;

  async function loadViewers() {
    setShowViewers(true);
    const r = await saGetViewers(current.id);
    if (r.ok) setViewers(r.data!.viewers);
  }

  async function onReact(emoji: string) {
    const r = await saReactStatus(current.id, emoji);
    if (!r.ok) { toast.error(r.error); return; }
    onReactionUpdate(current.id, r.data!.reactions);
  }

  async function onDelete() {
    if (!confirm("Delete this status?")) return;
    const r = await saDeleteStatus(current.id);
    if (!r.ok) { toast.error(r.error); return; }
    onDeleted(current.id);
    toast.success("Deleted");
    if (list.length === 1) onClose();
    else if (index === list.length - 1) setIndex(index - 1);
  }

  const bg = current.kind === "text"
    ? (current.background || "linear-gradient(135deg, #1E88E5, #1565C0)")
    : "#000";

  return (
    <div className="cios-status-viewer" style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @media (max-width: 768px) {
          .cios-status-viewer .cios-status-body { aspect-ratio: auto !important; max-height: none !important; height: 100% !important; width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
          .cios-status-viewer .cios-status-controls { bottom: 90px !important; }
          .cios-status-viewer .cios-status-viewers { z-index: 1100 !important; }
        }
      `}</style>
      {/* Progress bars */}
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 4, zIndex: 5 }}>
        {list.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#fff", width: `${i < index ? 100 : i === index ? progress : 0}%`, transition: "width 0.05s linear" }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ position: "absolute", top: 24, left: 16, right: 16, display: "flex", alignItems: "center", gap: 10, zIndex: 5, color: "#fff" }}>
        <Avatar size={36} name={current.user_name || "?"} url={current.user_avatar} id={current.user_id} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{current.is_mine ? "You" : current.user_name}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{formatRelative(current.created_at)} ago</div>
        </div>
        <button onClick={() => setPaused((p) => !p)} style={viewerBtn}>{paused ? "▶" : "⏸"}</button>
        <button onClick={onClose} style={{ ...viewerBtn, fontSize: 18 }}>✕</button>
      </div>

      {/* Left / Right tap zones */}
      <div onClick={() => index > 0 ? setIndex(index - 1) : null} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "30%", zIndex: 2, cursor: index > 0 ? "pointer" : "default" }} />
      <div onClick={() => { if (index < list.length - 1) setIndex(index + 1); else onClose(); }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "30%", zIndex: 2, cursor: "pointer" }} />

      {/* Body */}
      <div
        className="cios-status-body"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        style={{
          width: "100%", maxWidth: 520, aspectRatio: "9/16",
          background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", padding: 24, overflow: "hidden",
          borderRadius: 12, maxHeight: "92vh",
        }}
      >
        {current.kind === "text" && (
          <div style={{ fontSize: 28, fontWeight: 700, color: current.text_color || "#fff", textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>
            {current.content}
          </div>
        )}
        {current.kind === "image" && current.media_url && (
          <img src={current.media_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        )}
        {current.kind === "video" && current.media_url && (
          <video src={current.media_url} autoPlay muted playsInline controls style={{ maxWidth: "100%", maxHeight: "100%" }} />
        )}
      </div>

      {/* Caption + actions */}
      <div className="cios-status-controls" style={{ position: "absolute", bottom: 20, left: 16, right: 16, zIndex: 5, display: "flex", flexDirection: "column", gap: 10 }}>
        {current.kind !== "text" && current.content && (
          <div style={{ color: "#fff", fontSize: 14, textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
            {current.content}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {REACTION_EMOJIS.map((e) => {
            const users = current.reactions?.[e] || [];
            const mine = users.includes(meId);
            return (
              <button
                key={e}
                onClick={() => onReact(e)}
                style={{
                  background: mine ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 999, padding: "6px 12px",
                  color: "#fff", fontSize: 14, cursor: "pointer",
                }}
              >
                {e} {users.length > 0 && users.length}
              </button>
            );
          })}
        </div>
        {current.is_mine && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={loadViewers} style={viewerBtn}>👁 {current.viewer_count} viewer{current.viewer_count === 1 ? "" : "s"}</button>
            <button onClick={onDelete} style={{ ...viewerBtn, color: "#EF5350" }}>🗑 Delete</button>
          </div>
        )}
      </div>

      {showViewers && (
        <div
          className="cios-status-viewers"
          onClick={(e) => { e.stopPropagation(); setShowViewers(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 10, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#111827", borderRadius: 16, padding: 20, maxHeight: "70vh", width: "100%", maxWidth: 420, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>Viewed by {viewers.length}</h3>
              <button onClick={() => setShowViewers(false)} style={iconBtn}>✕</button>
            </div>
            {viewers.length === 0 && <p style={{ fontSize: 13, color: "#8892A4", textAlign: "center" }}>No viewers yet.</p>}
            {viewers.map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <Avatar size={32} name={v.name} url={v.avatar_url} id={v.id} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#E8EDF5" }}>{v.name}</div>
                  <div style={{ fontSize: 10, color: "#8892A4" }}>{formatRelative(v.viewed_at)} ago</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateStatusModal({ onClose, onCreated, me }: { onClose: () => void; onCreated: (s: StatusRow) => void; me: MeInfo }) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [bg, setBg] = useState(STATUS_BACKGROUNDS[0]);
  const [textColor, setTextColor] = useState("#fff");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function pickImage(files: FileList | null) {
    if (!files || !files[0]) return;
    setUploading(true);
    const t = toast.loading("Uploading…");
    try {
      const compressed = await compressImage(files[0], { maxBytes: 2 * 1024 * 1024 });
      const up = await uploadToCloudinary(compressed, { folder: "cios-status", resourceType: "image" });
      setImageUrl(up.secureUrl);
      toast.success("Uploaded", { id: t });
    } catch (e) { toast.error((e as Error).message, { id: t }); }
    finally { setUploading(false); }
  }

  async function submit() {
    if (mode === "text" && !text.trim()) { toast.error("Write something"); return; }
    if (mode === "image" && !imageUrl) { toast.error("Add an image"); return; }
    setBusy(true);
    const r = await saCreateStatus({
      kind: mode,
      content: mode === "text" ? text : caption,
      mediaUrl: mode === "image" ? imageUrl : null,
      background: mode === "text" ? bg : null,
      textColor: mode === "text" ? textColor : null,
      privacy: "everyone",
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Status posted");
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    onCreated({
      id: r.data!.id,
      user_id: me.id,
      user_name: me.name,
      user_avatar: me.avatarUrl,
      kind: mode,
      content: mode === "text" ? text : caption,
      media_url: mode === "image" ? imageUrl : null,
      background: mode === "text" ? bg : null,
      text_color: mode === "text" ? textColor : null,
      reactions: {},
      viewer_count: 0,
      has_viewed: false,
      created_at: now,
      expires_at: expires,
      is_mine: true,
    });
    onClose();
  }

  return (
    <Modal title="New status" onClose={onClose}>
      <div style={{ display: "flex", gap: 4, background: "#0A0E1A", padding: 4, borderRadius: 10, marginBottom: 12 }}>
        <button onClick={() => setMode("text")} style={{ ...tabBtn, ...(mode === "text" ? tabBtnActive : {}) }}>📝 Text</button>
        <button onClick={() => setMode("image")} style={{ ...tabBtn, ...(mode === "image" ? tabBtnActive : {}) }}>🖼 Photo</button>
      </div>

      {mode === "text" && (
        <>
          <div style={{
            width: "100%", aspectRatio: "9/12", background: bg, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            marginBottom: 12,
          }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your status…"
              maxLength={200}
              style={{
                width: "100%", height: "100%", background: "transparent",
                border: "none", outline: "none", resize: "none",
                color: textColor, fontSize: 22, fontWeight: 700, textAlign: "center",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Background</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {STATUS_BACKGROUNDS.map((b, i) => (
              <button key={i} onClick={() => setBg(b)} style={{ width: 36, height: 36, borderRadius: 10, background: b, border: bg === b ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Text color</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["#fff", "#000", "#FFC107", "#EF5350", "#66BB6A", "#1E88E5"].map((c) => (
              <button key={c} onClick={() => setTextColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: textColor === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }} />
            ))}
          </div>
        </>
      )}

      {mode === "image" && (
        <>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files)} />
          {!imageUrl ? (
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              style={{
                width: "100%", aspectRatio: "9/12", background: "#0A0E1A",
                border: "2px dashed rgba(255,255,255,0.2)", borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10,
                cursor: "pointer", color: "#8892A4", fontSize: 14,
              }}
            >
              <span style={{ fontSize: 40 }}>🖼</span>
              <span>{uploading ? "Uploading…" : "Tap to choose a photo"}</span>
            </button>
          ) : (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <img src={imageUrl} alt="" style={{ width: "100%", aspectRatio: "9/12", objectFit: "cover", borderRadius: 12 }} />
              <button onClick={() => setImageUrl(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer" }}>✕</button>
            </div>
          )}
          {imageUrl && (
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption (optional)…" style={modalInput} maxLength={200} />
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={submit} disabled={busy || uploading} style={btnPrimary}>{busy ? "Posting…" : "Post status"}</button>
      </div>
    </Modal>
  );
}

/* ── Chat lock screen + settings ── */

function LockScreen({
  hasBiometric, hasPin, onUnlockPin, onUnlockBiometric,
}: {
  hasBiometric: boolean; hasPin: boolean;
  onUnlockPin: (pin: string) => Promise<boolean>;
  onUnlockBiometric: () => Promise<boolean>;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function tryPin() {
    if (pin.length < 4) { setError("PIN must be at least 4 digits"); return; }
    setBusy(true); setError(null);
    const ok = await onUnlockPin(pin);
    setBusy(false);
    if (!ok) setError("Wrong PIN"); else { setPin(""); }
  }

  async function tryBio() {
    setBusy(true); setError(null);
    const ok = await onUnlockBiometric();
    setBusy(false);
    if (!ok) setError("Authentication cancelled or failed");
  }

  // Auto-offer biometric on mount if available
  useEffect(() => {
    if (hasBiometric) { tryBio().catch(() => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100vh - 80px)", padding: 20,
    }}>
      <div style={{
        background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20, padding: 32, textAlign: "center", maxWidth: 360, width: "100%",
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: "0 0 6px 0" }}>Chats are locked</h2>
        <p style={{ fontSize: 13, color: "#8892A4", margin: "0 0 20px 0" }}>
          {hasBiometric ? "Use your fingerprint, face, or PIN to unlock." : "Enter your PIN to unlock."}
        </p>
        {hasBiometric && (
          <button onClick={tryBio} disabled={busy} style={{
            width: "100%", padding: "12px", marginBottom: 12,
            background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>👆 Use biometric</button>
        )}
        {hasPin && (
          <>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              onKeyDown={(e) => { if (e.key === "Enter") tryPin(); }}
              placeholder="Enter PIN"
              style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#E8EDF5", fontSize: 18, textAlign: "center", letterSpacing: 6, outline: "none" }}
              autoFocus={!hasBiometric}
              inputMode="numeric"
            />
            <button onClick={tryPin} disabled={busy} style={{
              width: "100%", padding: "12px", marginTop: 10,
              background: "rgba(255,255,255,0.06)", color: "#E8EDF5",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Unlock with PIN</button>
          </>
        )}
        {error && <p style={{ color: "#EF5350", fontSize: 12, marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
}

function LockSettingsModal({
  config, meId, meName, onClose,
  setPin, verifyPin, removePin, registerBiometric, updateConfig, lockNow,
}: {
  config: import("@/lib/use-chat-lock").ChatLockConfig;
  meId: string; meName: string;
  onClose: () => void;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  removePin: () => void;
  registerBiometric: (userId: string, name: string) => Promise<boolean>;
  updateConfig: (patch: Partial<import("@/lib/use-chat-lock").ChatLockConfig>) => void;
  lockNow: () => void;
}) {
  const [mode, setMode] = useState<"main" | "setPin" | "changePin" | "removePin">("main");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [busy, setBusy] = useState(false);
  const biometricAvailable = isWebAuthnAvailable();

  async function onSetPin() {
    if (pin1.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    if (pin1 !== pin2) { toast.error("PINs don't match"); return; }
    setBusy(true);
    try {
      await setPin(pin1);
      toast.success("PIN set · chats are now locked");
      setMode("main"); setPin1(""); setPin2("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function onChangePin() {
    const ok = await verifyPin(oldPin);
    if (!ok) { toast.error("Current PIN incorrect"); return; }
    if (pin1.length < 4 || pin1 !== pin2) { toast.error("New PINs don't match or are too short"); return; }
    await setPin(pin1);
    toast.success("PIN changed");
    setMode("main"); setOldPin(""); setPin1(""); setPin2("");
  }

  async function onRemove() {
    const ok = await verifyPin(oldPin);
    if (!ok) { toast.error("PIN incorrect"); return; }
    removePin();
    toast.success("Lock removed");
    setMode("main"); setOldPin("");
  }

  async function onEnableBiometric() {
    if (!config.pinHash) { toast.error("Set a PIN first (required as fallback)"); return; }
    try {
      const ok = await registerBiometric(meId, meName);
      if (ok) toast.success("Biometric unlock enabled");
      else toast.error("Biometric registration cancelled");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Modal title="Chat lock & privacy" onClose={onClose}>
      {mode === "main" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: 14, background: "#0A0E1A", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>PIN lock</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>{config.pinHash ? "PIN is set" : "Not set"}</div>
              </div>
              <span style={{ fontSize: 14 }}>{config.pinHash ? "✅" : "❌"}</span>
            </div>
            {!config.pinHash && (
              <button onClick={() => setMode("setPin")} style={{ ...btnPrimary, width: "100%" }}>Set PIN</button>
            )}
            {config.pinHash && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setMode("changePin")} style={{ ...btnGhost, flex: 1 }}>Change</button>
                <button onClick={() => setMode("removePin")} style={{ ...btnGhost, flex: 1, color: "#EF5350" }}>Remove</button>
              </div>
            )}
          </div>

          <div style={{ padding: 14, background: "#0A0E1A", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>Biometric unlock</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>
                  {!biometricAvailable ? "Not supported on this device" :
                   config.useBiometric ? "Fingerprint / face enabled" : "Not enabled"}
                </div>
              </div>
              <span style={{ fontSize: 14 }}>{config.useBiometric ? "✅" : biometricAvailable ? "🔓" : "🚫"}</span>
            </div>
            {biometricAvailable && !config.useBiometric && (
              <button onClick={onEnableBiometric} disabled={!config.pinHash} style={{ ...btnPrimary, width: "100%", opacity: config.pinHash ? 1 : 0.5 }}>
                {config.pinHash ? "Enable biometric" : "Set a PIN first"}
              </button>
            )}
            {config.useBiometric && (
              <button onClick={() => updateConfig({ useBiometric: false, webauthnCredentialId: null })} style={{ ...btnGhost, width: "100%", color: "#EF5350" }}>
                Disable biometric
              </button>
            )}
          </div>

          <div style={{ padding: 14, background: "#0A0E1A", borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>Auto-lock after inactivity</div>
            <select
              value={config.autoLockMinutes}
              onChange={(e) => updateConfig({ autoLockMinutes: parseInt(e.target.value) })}
              style={modalInput}
            >
              <option value={0}>Never</option>
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          {config.enabled && (
            <button onClick={() => { lockNow(); onClose(); }} style={{ ...btnPrimary, background: "#EF5350" }}>
              🔒 Lock now
            </button>
          )}
        </div>
      )}

      {mode === "setPin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Choose a 4–12 digit PIN.</p>
          <input type="password" inputMode="numeric" maxLength={12} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))} placeholder="New PIN" style={modalInput} autoFocus />
          <input type="password" inputMode="numeric" maxLength={12} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" style={modalInput} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setMode("main")} style={btnGhost}>Cancel</button>
            <button onClick={onSetPin} disabled={busy} style={btnPrimary}>Save PIN</button>
          </div>
        </div>
      )}

      {mode === "changePin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="password" inputMode="numeric" maxLength={12} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} placeholder="Current PIN" style={modalInput} autoFocus />
          <input type="password" inputMode="numeric" maxLength={12} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))} placeholder="New PIN" style={modalInput} />
          <input type="password" inputMode="numeric" maxLength={12} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} placeholder="Confirm new PIN" style={modalInput} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setMode("main")} style={btnGhost}>Cancel</button>
            <button onClick={onChangePin} style={btnPrimary}>Update PIN</button>
          </div>
        </div>
      )}

      {mode === "removePin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "#EF5350" }}>This removes PIN + biometric lock entirely.</p>
          <input type="password" inputMode="numeric" maxLength={12} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} placeholder="Current PIN" style={modalInput} autoFocus />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setMode("main")} style={btnGhost}>Cancel</button>
            <button onClick={onRemove} style={{ ...btnPrimary, background: "#EF5350" }}>Remove lock</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Attach sheet (the + button popover) ── */

function AttachSheet({ onClose, onPickImage, onPickCamera, onPickFile, onPickQuickReply, onPickPoll }: {
  onClose: () => void;
  onPickImage: () => void;
  onPickCamera: () => void;
  onPickFile: () => void;
  onPickQuickReply: () => void;
  onPickPoll: () => void;
}) {
  const items = [
    { icon: "🖼", label: "Photo", desc: "Send an image", color: "#1E88E5", action: onPickImage },
    { icon: "📷", label: "Camera", desc: "Take a picture now", color: "#AB47BC", action: onPickCamera },
    { icon: "📄", label: "Document", desc: "PDF, DOCX, XLSX…", color: "#66BB6A", action: onPickFile },
    { icon: "📊", label: "Poll", desc: "Create a vote", color: "#FF7043", action: onPickPoll },
    { icon: "⚡", label: "Quick reply", desc: "Pick a saved template", color: "#FFC107", action: onPickQuickReply },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 30 }} />
      <div style={{
        position: "absolute", bottom: "calc(100% - 4px)", left: 16,
        background: "#1A2332", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14, padding: 6, minWidth: 240,
        boxShadow: "0 12px 32px rgba(0,0,0,0.5)", zIndex: 40,
        animation: "attachPop 0.15s ease-out",
      }}>
        <style>{`@keyframes attachPop { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.action}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "10px 12px", border: "none", borderRadius: 10,
              background: "transparent", cursor: "pointer", textAlign: "left",
              color: "#E8EDF5",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: `${it.color}22`, color: it.color,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
            }}>{it.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.label}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>{it.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

const composerBtn: React.CSSProperties = {
  background: "#0A0E1A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  width: 40, height: 40,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontSize: 16, color: "#E8EDF5",
  flexShrink: 0,
};

const iconBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
  color: "#E8EDF5", width: 32, height: 32, borderRadius: 8,
  cursor: "pointer", fontSize: 14, padding: 0,
};
const tabBtn: React.CSSProperties = {
  flex: 1, padding: "6px 10px", borderRadius: 8, border: "none",
  background: "transparent", color: "#8892A4", fontSize: 11,
  fontWeight: 600, cursor: "pointer",
};
const tabBtnActive: React.CSSProperties = { background: "#1E88E5", color: "#fff" };
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "10px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const modalInput: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
};
const menuBox: React.CSSProperties = {
  position: "absolute", top: 60, right: 20,
  background: "#1A2332", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: 4, minWidth: 180,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50,
};
