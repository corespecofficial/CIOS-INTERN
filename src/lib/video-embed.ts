export type VideoProvider = "youtube" | "instagram" | "tiktok" | "vimeo" | "unknown";

export interface VideoEmbed {
  provider: VideoProvider;
  embedUrl: string;
  canonicalUrl: string;
}

/**
 * Parse a pasted video URL (or bare YouTube 11-char ID) into an embeddable iframe src.
 * Supports YouTube, Instagram (posts & reels), TikTok, Vimeo.
 * Returns null if we can't recognise the URL.
 */
export function parseVideoEmbed(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  const input = raw.trim();
  if (!input) return null;

  // Bare YouTube 11-char ID (legacy rows stored this way).
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube.com/embed/${input}?rel=0&modestbranding=1`,
      canonicalUrl: `https://youtu.be/${input}`,
    };
  }

  let u: URL;
  try { u = new URL(input); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");

  // YouTube
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).slice(0, 11);
    if (id) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`, canonicalUrl: `https://youtu.be/${id}` };
  }
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    // /watch?v=, /shorts/ID, /embed/ID, /live/ID
    const v = u.searchParams.get("v");
    if (v) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${v.slice(0, 11)}?rel=0&modestbranding=1`, canonicalUrl: `https://youtu.be/${v.slice(0, 11)}` };
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${m[2]}?rel=0&modestbranding=1`, canonicalUrl: `https://youtu.be/${m[2]}` };
  }

  // Instagram — /p/{code}, /reel/{code}, /tv/{code}
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (m) {
      const code = m[2];
      const kind = m[1] === "reels" ? "reel" : m[1];
      return {
        provider: "instagram",
        embedUrl: `https://www.instagram.com/${kind}/${code}/embed/captioned/`,
        canonicalUrl: `https://www.instagram.com/${kind}/${code}/`,
      };
    }
  }

  // TikTok — /@user/video/{id}, /v/{id}.html, vm.tiktok.com/{short}
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const m = u.pathname.match(/\/video\/(\d+)/) || u.pathname.match(/^\/v\/(\d+)/);
    if (m) {
      return {
        provider: "tiktok",
        embedUrl: `https://www.tiktok.com/player/v1/${m[1]}?music_info=1&description=1`,
        canonicalUrl: `https://www.tiktok.com${u.pathname}`,
      };
    }
    // Short links (vm.tiktok.com/XXXX) can't be resolved client-side; fall through.
  }

  // Vimeo
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
    const m = u.pathname.match(/^\/(\d+)/);
    if (m) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${m[1]}`, canonicalUrl: `https://vimeo.com/${m[1]}` };
  }

  return null;
}

/** Iframe allow/sandbox attributes tuned per provider. */
export function embedIframeProps(provider: VideoProvider): { allow: string; allowFullScreen: boolean } {
  if (provider === "instagram") {
    return { allow: "encrypted-media", allowFullScreen: true };
  }
  if (provider === "tiktok") {
    return { allow: "accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture", allowFullScreen: true };
  }
  return { allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen", allowFullScreen: true };
}
