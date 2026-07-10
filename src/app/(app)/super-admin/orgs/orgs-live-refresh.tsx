"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Ably from "ably";
import { createAblyToken } from "@/app/actions/messages";

let singleton: Ably.Realtime | null = null;

async function getAblyClient(): Promise<Ably.Realtime | null> {
  if (!process.env.NEXT_PUBLIC_ABLY_API_KEY) return null;
  if (singleton) return singleton;
  try {
    singleton = new Ably.Realtime({
      authCallback: async (_params, cb) => {
        const r = await createAblyToken();
        if (!r.ok) cb(r.error, null);
        else cb(null, r.data!.tokenRequest as unknown as Ably.TokenRequest);
      },
    });
    return singleton;
  } catch {
    return null;
  }
}

export function OrgsLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30_000);
    let channel: Ably.RealtimeChannel | null = null;
    let cancelled = false;

    getAblyClient().then((client) => {
      if (!client || cancelled) return;
      channel = client.channels.get("platform-orgs");
      channel.subscribe("event", () => router.refresh());
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (channel) channel.unsubscribe();
    };
  }, [router]);

  return null;
}
