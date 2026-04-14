/** Parse a pasted LIVE stream URL into an embeddable iframe src.
 *
 * Distinct from parseVideoEmbed (for VOD) because the supported providers
 * differ — live streams come from YouTube Live, Twitch, TikTok Live,
 * Google Meet, Google Classroom, and generic meeting tools. Each has
 * different embed rules and iframe restrictions.
 *
 * Meet/Classroom can't be iframed at all (they set X-Frame-Options: DENY),
 * so we flag them as `directOnly` and the UI renders a big launch button
 * instead of an iframe.
 */

export type LiveProvider =
  | "youtube-live"
  | "twitch"
  | "tiktok-live"
  | "google-meet"
  | "google-classroom"
  | "zoom"
  | "whatsapp-video"
  | "whatsapp-voice"
  | "generic";

export interface LiveEmbed {
  provider: LiveProvider;
  embedUrl: string | null;   // null when the provider can't be iframed
  directUrl: string;          // always present — opens in new tab
  directOnly: boolean;        // true → UI shows a "Join" button, not an iframe
  label: string;              // human-readable name
}

const TWITCH_PARENT = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL)
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : "cios-intern.vercel.app";

export function parseLiveEmbed(raw: string | null | undefined): LiveEmbed | null {
  if (!raw) return null;
  const input = raw.trim();
  if (!input) return null;

  let u: URL;
  try { u = new URL(input); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");

  // ── YouTube Live ──
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).slice(0, 11);
    if (id) return {
      provider: "youtube-live",
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      directUrl: `https://youtu.be/${id}`,
      directOnly: false,
      label: "YouTube Live",
    };
  }
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = u.searchParams.get("v");
    const id = v?.slice(0, 11);
    const liveMatch = u.pathname.match(/^\/(live|embed)\/([A-Za-z0-9_-]{11})/);
    const channelLive = u.pathname.match(/^\/@?([\w.-]+)\/live\/?$/);
    if (id) return { provider: "youtube-live", embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`, directUrl: input, directOnly: false, label: "YouTube Live" };
    if (liveMatch) return { provider: "youtube-live", embedUrl: `https://www.youtube.com/embed/${liveMatch[2]}?autoplay=1&rel=0`, directUrl: input, directOnly: false, label: "YouTube Live" };
    if (channelLive) return { provider: "youtube-live", embedUrl: `https://www.youtube.com/embed/live_stream?channel=${channelLive[1]}&autoplay=1`, directUrl: input, directOnly: false, label: "YouTube Live" };
  }

  // ── Twitch ──
  if (host === "twitch.tv" || host.endsWith(".twitch.tv")) {
    const ch = u.pathname.replace(/^\/+/, "").split("/")[0];
    if (ch) return {
      provider: "twitch",
      embedUrl: `https://player.twitch.tv/?channel=${ch}&parent=${TWITCH_PARENT}&autoplay=true`,
      directUrl: input,
      directOnly: false,
      label: "Twitch",
    };
  }

  // ── TikTok Live ──
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const user = u.pathname.match(/^\/@([\w.]+)(?:\/live)?/);
    if (user) return {
      provider: "tiktok-live",
      embedUrl: `https://www.tiktok.com/embed/live/@${user[1]}`,
      directUrl: `https://www.tiktok.com/@${user[1]}/live`,
      directOnly: false,
      label: "TikTok Live",
    };
  }

  // ── Google Meet (cannot be iframed) ──
  if (host === "meet.google.com") {
    return {
      provider: "google-meet",
      embedUrl: null,
      directUrl: input,
      directOnly: true,
      label: "Google Meet",
    };
  }

  // ── Google Classroom (cannot be iframed) ──
  if (host === "classroom.google.com") {
    return {
      provider: "google-classroom",
      embedUrl: null,
      directUrl: input,
      directOnly: true,
      label: "Google Classroom",
    };
  }

  // ── Zoom (cannot be iframed reliably) ──
  if (host === "zoom.us" || host.endsWith(".zoom.us")) {
    return {
      provider: "zoom",
      embedUrl: null,
      directUrl: input,
      directOnly: true,
      label: "Zoom",
    };
  }

  // ── WhatsApp call links (call.whatsapp.com/voice|video/SLUG) ──
  if (host === "call.whatsapp.com") {
    const isVideo = u.pathname.startsWith("/video/");
    const isVoice = u.pathname.startsWith("/voice/");
    if (isVideo || isVoice) {
      return {
        provider: isVideo ? "whatsapp-video" : "whatsapp-voice",
        embedUrl: null,
        directUrl: input,
        directOnly: true,
        label: isVideo ? "WhatsApp video call" : "WhatsApp voice call",
      };
    }
  }

  // Fallback — allow any URL, launch-only
  if (u.protocol === "https:" || u.protocol === "http:") {
    return {
      provider: "generic",
      embedUrl: null,
      directUrl: input,
      directOnly: true,
      label: host,
    };
  }

  return null;
}
