import webpush from "web-push";
import { supabaseAdmin } from "@/lib/db";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@cospronos.com";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured || !VAPID_PUBLIC || !VAPID_PRIVATE) return;
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  image?: string;
}

/**
 * Sends a Web Push notification to all registered devices for a user.
 * Silently does nothing if VAPID keys are not configured.
 * Automatically removes expired/invalid subscriptions (410/404).
 */
export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  ensureVapid();

  const sb = supabaseAdmin();
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const pushData = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/badge-72.png",
    url: payload.url || "/notifications",
    tag: payload.tag || "cios-notif",
    vibrate: payload.vibrate || [200, 100, 200],
    ...(payload.image ? { image: payload.image } : {}),
  });

  const staleIds: string[] = [];

  await Promise.allSettled(
    (subs as { id: string; endpoint: string; p256dh: string; auth: string }[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushData,
          { TTL: 86400 } // messages live for 24h if device is offline
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired — remove it
          staleIds.push(sub.id);
        } else {
          console.warn("[web-push] send failed:", statusCode, (err as Error).message);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await sb.from("push_subscriptions").delete().in("id", staleIds);
  }
}
