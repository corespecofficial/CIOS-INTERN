/**
 * Meeting link helpers.
 *
 * Google Meet: anyone signed in can spawn a fresh room via /new — works without OAuth.
 * Zoom: full automation needs Zoom OAuth; until then we use the user's saved Personal Meeting URL.
 */

export type MeetingProvider = "meet" | "zoom" | "custom";

export interface MeetingLinkInput {
  provider: MeetingProvider;
  /** Display title (optional, embedded in the join URL where possible). */
  topic?: string;
  /** Personal Zoom URL or custom link if provider is zoom/custom. */
  fallbackUrl?: string;
}

export function generateMeetingLink(input: MeetingLinkInput): { url: string; provider: MeetingProvider; instructions?: string } {
  if (input.provider === "meet") {
    // Google Meet "instant" link — opens a new room when the host signs in.
    return { url: "https://meet.google.com/new", provider: "meet" };
  }
  if (input.provider === "zoom") {
    if (input.fallbackUrl) return { url: input.fallbackUrl, provider: "zoom" };
    return {
      url: "https://zoom.us/start/personal",
      provider: "zoom",
      instructions: "Save your Personal Meeting URL in Settings → Integrations to get a one-click link.",
    };
  }
  return { url: input.fallbackUrl || "", provider: "custom" };
}

/** Plain ICS string for emailing/calendar download — pairs with our calendar feature. */
export function buildICS(input: { uid: string; title: string; description?: string; start: Date; end: Date; url?: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CIOS//Class//EN",
    "BEGIN:VEVENT",
    `UID:${input.uid}@cios`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(input.start)}`,
    `DTEND:${fmt(input.end)}`,
    `SUMMARY:${input.title.replace(/[\r\n]+/g, " ")}`,
    input.description ? `DESCRIPTION:${input.description.replace(/[\r\n]+/g, "\\n")}` : "",
    input.url ? `URL:${input.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
