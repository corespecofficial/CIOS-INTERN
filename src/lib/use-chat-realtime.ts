"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Ably from "ably";
import { createAblyToken } from "@/app/actions/messages";

let singleton: Ably.Realtime | null = null;

async function getAblyClient(): Promise<Ably.Realtime | null> {
  if (singleton) return singleton;
  try {
    singleton = new Ably.Realtime({
      authCallback: async (_data, cb) => {
        const r = await createAblyToken();
        if (!r.ok) return cb(r.error, null);
        cb(null, r.data!.tokenRequest as unknown as Ably.TokenRequest);
      },
      echoMessages: false,
    });
    return singleton;
  } catch (e) {
    console.error("[ably] init failed:", e);
    return null;
  }
}

export interface InboundMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  replyToId?: string | null;
  attachmentUrl?: string | null;
  messageType?: "text" | "image" | "file" | "reply" | "system";
  kind: "new" | "edit" | "delete" | "reaction" | "read" | "delivered";
  reactions?: Record<string, string[]>;
  // For read/delivered events: which of my sent messages are now acknowledged
  ackMessageIds?: string[];
}

export interface PresenceState {
  online: Set<string>;
  typing: Set<string>;
}

export function useChatRealtime(roomId: string | null, currentClerkId: string | null) {
  const [presence, setPresence] = useState<PresenceState>({ online: new Set(), typing: new Set() });
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const listenersRef = useRef<Set<(m: InboundMessage) => void>>(new Set());

  useEffect(() => {
    if (!roomId || !currentClerkId) return;
    let cancelled = false;
    let ch: Ably.RealtimeChannel | null = null;

    (async () => {
      const client = await getAblyClient();
      if (!client || cancelled) return;
      ch = client.channels.get(`room:${roomId}`);
      channelRef.current = ch;

      // Message events
      ch.subscribe("message", (msg) => {
        const data = msg.data as InboundMessage;
        listenersRef.current.forEach((fn) => fn(data));
      });

      // Typing events
      ch.subscribe("typing", (msg) => {
        const senderId = msg.data?.senderId as string | undefined;
        if (!senderId || senderId === currentClerkId) return;
        setPresence((p) => {
          const next = new Set(p.typing);
          next.add(senderId);
          return { ...p, typing: next };
        });
        const prev = typingTimers.current.get(senderId);
        if (prev) clearTimeout(prev);
        const t = setTimeout(() => {
          setPresence((p) => {
            const next = new Set(p.typing);
            next.delete(senderId);
            return { ...p, typing: next };
          });
          typingTimers.current.delete(senderId);
        }, 2500);
        typingTimers.current.set(senderId, t);
      });

      // Presence
      const syncPresence = async () => {
        if (!ch || ch.state !== "attached") return;
        try {
          const members = await ch.presence.get();
          if (cancelled) return;
          setPresence((p) => ({ ...p, online: new Set(members.map((m) => m.clientId)) }));
        } catch (e) { console.warn("[ably] presence.get:", e); }
      };
      ch.presence.subscribe(["enter", "leave", "update"], syncPresence);
      try { await ch.presence.enter(); } catch (e) { console.warn("[ably] presence.enter:", e); }
      syncPresence();
    })();

    return () => {
      cancelled = true;
      typingTimers.current.forEach((t) => clearTimeout(t));
      typingTimers.current.clear();
      if (ch) {
        try { if (ch.state === "attached") ch.presence.leave(); } catch { /* ignore */ }
        try { ch.unsubscribe(); } catch { /* ignore */ }
      }
      channelRef.current = null;
    };
  }, [roomId, currentClerkId]);

  const onMessage = useCallback((fn: (m: InboundMessage) => void) => {
    listenersRef.current.add(fn);
    return () => { listenersRef.current.delete(fn); };
  }, []);

  const publishMessage = useCallback(async (m: InboundMessage) => {
    const ch = channelRef.current;
    if (!ch) return;
    // Skip if channel not in a publishable state (suspended/failed/detached). DB is still source of truth.
    if (ch.state !== "attached" && ch.state !== "attaching" && ch.state !== "initialized") {
      console.warn("[ably] publish skipped, channel state:", ch.state);
      return;
    }
    try { await ch.publish("message", m); } catch (e) { console.warn("[ably] publish failed:", e); }
  }, []);

  const publishTyping = useCallback(async () => {
    const ch = channelRef.current;
    if (!ch || !currentClerkId) return;
    if (ch.state !== "attached") return;
    try { await ch.publish("typing", { senderId: currentClerkId }); } catch { /* ignore */ }
  }, [currentClerkId]);

  return { presence, onMessage, publishMessage, publishTyping };
}

/** Hook for the global online-presence across the whole app (rooms list). */
export function useGlobalPresence(currentClerkId: string | null) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentClerkId) return;
    let cancelled = false;
    let ch: Ably.RealtimeChannel | null = null;

    (async () => {
      const client = await getAblyClient();
      if (!client || cancelled) return;
      ch = client.channels.get("presence:global");
      const sync = async () => {
        if (!ch || ch.state !== "attached") return;
        try {
          const members = await ch.presence.get();
          if (cancelled) return;
          setOnlineIds(new Set(members.map((m) => m.clientId)));
        } catch (e) { console.warn("[ably] global presence get:", e); }
      };
      ch.presence.subscribe(["enter", "leave", "update"], sync);
      try { await ch.presence.enter(); } catch (e) { console.warn("[ably] global presence.enter:", e); }
      sync();
    })();

    return () => {
      cancelled = true;
      if (ch) { try { if (ch.state === "attached") ch.presence.leave(); } catch {} }
    };
  }, [currentClerkId]);

  return onlineIds;
}
