"use client";

/**
 * Highlights unread digest items on the student dashboard. Tracks the
 * most-recent timestamp the student has seen per-org in localStorage.
 *
 * Why client-side (not server):
 *   - Zero migration / no last_seen_at column.
 *   - The digest itself is a 7-day "what's new" surface — losing the
 *     mark-as-read state when switching devices is acceptable for that
 *     window. If we later need cross-device, we'll add a column.
 *
 * How it works:
 *   - Server-rendered list contains data-digest-time on each row.
 *   - On mount, we read `cios:digest-seen:<orgId>` from localStorage.
 *   - Any row with data-digest-time > seen gets the .digest-unread
 *     class (CSS in globals.css paints a blue dot + bold).
 *   - We update localStorage to the newest timestamp visible after a
 *     short delay (4s) so a student passing through still gets the
 *     visual cue, but reopening later doesn't re-flag them.
 */

import { useEffect } from "react";

interface Props {
  orgId: string;
  newest: string | null;
}

export function DigestTracker({ orgId, newest }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `cios:digest-seen:${orgId}`;
    const seen = window.localStorage.getItem(key);
    const seenMs = seen ? new Date(seen).getTime() : 0;

    // Mark unread rows. We re-query because the markup may not be
    // mounted yet on first paint when this effect runs.
    const apply = () => {
      const rows = document.querySelectorAll<HTMLElement>("[data-digest-time]");
      rows.forEach((el) => {
        const t = el.dataset.digestTime;
        if (!t) return;
        if (new Date(t).getTime() > seenMs) el.classList.add("digest-unread");
        else el.classList.remove("digest-unread");
      });
    };
    apply();

    // Bump the seen marker after 4s of dwell so the next visit doesn't
    // re-flag rows the student has now seen.
    if (newest) {
      const t = setTimeout(() => {
        try { window.localStorage.setItem(key, newest); } catch { /* quota / private mode */ }
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [orgId, newest]);

  return null;
}
