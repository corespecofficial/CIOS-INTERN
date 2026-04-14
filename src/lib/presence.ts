/**
 * Presence accuracy — WhatsApp-style.
 *
 * A user is considered ONLINE only if their last_seen column was updated
 * within the threshold below. `last_seen` is refreshed by:
 *  - ActivityTracker on every page_view (covers all signed-in tabs)
 *  - logActivity() on any tracked event
 *  - markRoomViewed / markRoomDelivered
 *
 * Previously the UI used Ably presence, which reported "online" from
 * stale channel subscriptions. This DB-backed check is the source of truth.
 */

export const ONLINE_THRESHOLD_MS = 60_000; // 60 seconds

export function isOnline(lastSeen: string | Date | null | undefined): boolean {
  if (!lastSeen) return false;
  const ts = typeof lastSeen === "string" ? new Date(lastSeen).getTime() : lastSeen.getTime();
  return Number.isFinite(ts) && Date.now() - ts < ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastSeen: string | Date | null | undefined, fallback = "offline"): string {
  if (!lastSeen) return fallback;
  const ts = typeof lastSeen === "string" ? new Date(lastSeen).getTime() : lastSeen.getTime();
  const delta = Date.now() - ts;
  if (delta < ONLINE_THRESHOLD_MS) return "online";
  const mins = Math.floor(delta / 60_000);
  if (mins < 60) return `last seen ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `last seen ${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `last seen ${days} day${days === 1 ? "" : "s"} ago`;
  return "last seen a long time ago";
}
