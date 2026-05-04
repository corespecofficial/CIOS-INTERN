"use client";

/**
 * Realtime subscriber for org-chat. Pairs with the server-side publish
 * in src/app/actions/org-portal.ts:postMessage. The hook subscribes to
 * `org-chat:<orgId>:<channelId>` and surfaces every inbound message to
 * the caller via a callback.
 *
 * Auth uses the same createAblyToken endpoint the rooms-chat hook uses
 * (singleton client, token-callback auth, echoMessages off so the
 * sender doesn't see their own publish twice).
 *
 * If Ably isn't configured (no NEXT_PUBLIC_ABLY_API_KEY), the hook is
 * a no-op and the chat page's `revalidate = 5` polling provides the
 * fallback live-update path.
 */

import { useEffect, useRef } from "react";
import * as Ably from "ably";
import { createAblyToken } from "@/app/actions/messages";

let singleton: Ably.Realtime | null = null;

async function getAblyClient(): Promise<Ably.Realtime | null> {
  if (singleton) return singleton;
  // No-op when the key is missing — chat polling carries the load.
  if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) return null;
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
    console.error("[org-chat-ably] init failed:", e);
    return null;
  }
}

export interface OrgChatMessage {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; name: string | null; avatar_url: string | null } | null;
}

/**
 * Subscribe to live messages for one org channel.
 *
 * @param orgId       — the creative_orgs.id (NOT slug)
 * @param channelId   — the org_channels.id
 * @param onMessage   — fired for each inbound message
 *
 * The callback is held in a ref internally so its identity doesn't need
 * to be stable; the effect only re-subscribes on org/channel changes.
 */
export function useOrgChatRealtime(
  orgId: string | null,
  channelId: string | null,
  onMessage: (m: OrgChatMessage) => void,
) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!orgId || !channelId) return;
    let cancelled = false;
    let ch: Ably.RealtimeChannel | null = null;

    (async () => {
      const client = await getAblyClient();
      if (!client || cancelled) return;
      ch = client.channels.get(`org-chat:${orgId}:${channelId}`);
      ch.subscribe("message", (msg) => {
        if (cancelled) return;
        const m = msg.data as OrgChatMessage;
        if (!m || !m.id) return;
        try { cbRef.current(m); } catch (e) { console.warn("[org-chat-ably] callback threw:", e); }
      });
    })();

    return () => {
      cancelled = true;
      if (ch) {
        try { ch.unsubscribe(); } catch { /* */ }
      }
    };
  }, [orgId, channelId]);
}
