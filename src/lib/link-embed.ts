/**
 * Tiny link-embed resolver. Returns a structured embed hint for a URL so
 * the feed can render YouTube/Vimeo iframes, Twitter/GitHub cards, or fall
 * back to a generic OpenGraph preview (fetched via /api/og).
 */

export type LinkEmbed =
  | { kind: "youtube"; embedUrl: string; id: string }
  | { kind: "vimeo"; embedUrl: string; id: string }
  | { kind: "twitter"; url: string }
  | { kind: "github"; url: string; kindLabel: string }
  | { kind: "generic"; url: string };

export function detectEmbed(raw: string): LinkEmbed | null {
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  const host = url.hostname.replace(/^www\./, "");

  // YouTube (watch / youtu.be / shorts)
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = url.searchParams.get("v");
    if (v) return { kind: "youtube", id: v, embedUrl: `https://www.youtube.com/embed/${v}` };
    const shorts = url.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shorts) return { kind: "youtube", id: shorts[1], embedUrl: `https://www.youtube.com/embed/${shorts[1]}` };
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (id) return { kind: "youtube", id, embedUrl: `https://www.youtube.com/embed/${id}` };
  }
  // Vimeo
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) return { kind: "vimeo", id, embedUrl: `https://player.vimeo.com/video/${id}` };
  }
  // Twitter / X
  if (host === "twitter.com" || host === "x.com") return { kind: "twitter", url: raw };
  // GitHub
  if (host === "github.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const label = parts[2] === "pull" ? "Pull request" : parts[2] === "issues" ? "Issue" : "Repository";
      return { kind: "github", url: raw, kindLabel: label };
    }
  }
  return { kind: "generic", url: raw };
}
