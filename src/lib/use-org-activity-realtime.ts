"use client";

/**
 * Realtime subscriber for the host-dashboard activity feed. Pairs with
 * the publish in src/lib/org-audit.ts (called from every logOrgAudit
 * write). Channel: `org-activity:<orgId>` (org-id, not slug, so renames
 * don't break in-flight subscriptions).
 *
 * Auth uses the same createAblyToken endpoint chat does, so members are
 * gated by the same publishCapability whitelist on the server.
 *
 * If Ably isn't configured this hook is a no-op — the dashboard's
 * server-rendered initial list still shows historical activity.
 */

import { useEffect, useRef } from "react";
import * as Ably from "ably";
import { createAblyToken } from "@/app/actions/messages";

let singleton: Ably.Realtime | null = null;

async function getAblyClient(): Promise<Ably.Realtime | null> {
  if (singleton) return singleton;
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
    console.error("[org-activity-ably] init failed:", e);
    return null;
  }
}

export interface OrgActivityEvent {
  id: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  actor_name: string | null;
}

export function useOrgActivityRealtime(
  orgId: string | null,
  onEvent: (e: OrgActivityEvent) => void,
) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    let ch: Ably.RealtimeChannel | null = null;

    (async () => {
      const client = await getAblyClient();
      if (!client || cancelled) return;
      ch = client.channels.get(`org-activity:${orgId}`);
      ch.subscribe("event", (msg) => {
        if (cancelled) return;
        const e = msg.data as OrgActivityEvent;
        if (!e || !e.id) return;
        try { cbRef.current(e); } catch (err) { console.warn("[org-activity-ably] callback threw:", err); }
      });
    })();

    return () => {
      cancelled = true;
      if (ch) {
        try { ch.unsubscribe(); } catch { /* */ }
      }
    };
  }, [orgId]);
}
