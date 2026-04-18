"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

const LOGO_URL = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";
const MAX_MS = 5000;

const QUOTES = [
  "Integrity is doing the right thing even when no one is watching.",
  "Consistency is the true foundation of trust.",
  "Hard work beats talent when talent doesn't work hard.",
  "Transparency breeds legitimacy.",
  "Discipline is the bridge between goals and accomplishment.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Excellence is not a destination but a continuous journey.",
  "Great things never come from comfort zones.",
  "Strive for progress, not perfection.",
  "Your only limit is your mind.",
  "Champions keep playing until they get it right.",
  "Push yourself, because no one else is going to do it for you.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does — keep going.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
];

const MARKETING_PREFIXES = [
  "/about", "/pricing", "/contact", "/recruiters", "/talent-showcase",
  "/terms", "/verify", "/privacy", "/demo", "/success-stories", "/press",
  "/careers", "/solutions", "/portals", "/join", "/faq", "/investors",
  "/guardian", "/suspended",
];

function isMarketingPath(p: string) {
  return p === "/" || MARKETING_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
}

/**
 * Portal-only route transition overlay.
 * - Shows ONLY when navigating between portal (authenticated) pages.
 * - Never shows on or between marketing/public pages.
 * - Appears immediately on click — covers the old page so the user never
 *   sees it update beneath the loader.
 * - Dismisses the moment the new pathname resolves in React.
 * - Quotes rotate every 2.5s while loading.
 */
export function RouteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const pathRef = useRef(pathname);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quoteInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const navPending = useRef(false);

  const stopRotation = useCallback(() => {
    if (quoteInterval.current) { clearInterval(quoteInterval.current); quoteInterval.current = null; }
  }, []);

  const dismiss = useCallback(() => {
    navPending.current = false;
    if (maxTimer.current) { clearTimeout(maxTimer.current); maxTimer.current = null; }
    stopRotation();
    setLeaving(true);
    setTimeout(() => { setVisible(false); setLeaving(false); }, 280);
  }, [stopRotation]);

  // Dismiss as soon as the new page's pathname lands in React
  useEffect(() => {
    if (pathname !== pathRef.current) {
      pathRef.current = pathname;
      if (navPending.current) dismiss();
    }
  }, [pathname, dismiss]);

  useEffect(() => {
    const show = () => {
      const startIdx = Math.floor(Math.random() * QUOTES.length);
      navPending.current = true;
      // Defer state updates to avoid scheduling them during React's
      // useInsertionEffect / render phase (throws in Next.js 16+ / Turbopack)
      setTimeout(() => {
        setLeaving(false);
        setQuoteIdx(startIdx);
        setVisible(true);

        stopRotation();
        quoteInterval.current = setInterval(() => {
          setQuoteIdx((i) => (i + 1) % QUOTES.length);
        }, 2500);

        if (maxTimer.current) clearTimeout(maxTimer.current);
        maxTimer.current = setTimeout(dismiss, MAX_MS);
      }, 0);
    };

    const tryShow = (fromPath: string, toPath: string) => {
      if (navPending.current) return; // already showing
      if (isMarketingPath(fromPath) || isMarketingPath(toPath)) return;
      if (toPath === fromPath) return;
      show();
    };

    // 1. Click listener — catches <Link> / <a> taps on both desktop and mobile
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        tryShow(window.location.pathname, url.pathname);
      } catch { return; }
    };

    // 2. history.pushState interceptor — catches router.push() calls (command palette,
    //    programmatic navigation) and iOS where click fires after navigation completes.
    const origPushState = history.pushState.bind(history);
    (history as History).pushState = function(state: unknown, title: string, url?: string | URL | null) {
      const prevPath = window.location.pathname;
      origPushState(state as Parameters<typeof history.pushState>[0], title, url as string);
      if (url) {
        try {
          const newPath = new URL(String(url), window.location.origin).pathname;
          tryShow(prevPath, newPath);
        } catch {}
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      (history as History).pushState = origPushState;
      if (maxTimer.current) clearTimeout(maxTimer.current);
      stopRotation();
    };
  }, [dismiss, stopRotation]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "#080C18",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 28, padding: 32, textAlign: "center",
      opacity: leaving ? 0 : 1,
      transition: leaving ? "opacity 0.28s ease" : "opacity 0.15s ease",
      pointerEvents: leaving ? "none" : "auto",
    }}>
      <style>{`
        @keyframes cios-rl-logo {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 18px rgba(30,136,229,0.4)); }
          50% { transform: scale(1.07); filter: drop-shadow(0 8px 28px rgba(255,193,7,0.4)); }
        }
        @keyframes cios-rl-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cios-rl-dot {
          0%, 70%, 100% { transform: translateY(0) scale(1); opacity: 0.25; }
          35% { transform: translateY(-10px) scale(1.25); opacity: 1; }
        }
        @keyframes cios-rl-quote {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Logo with spinning gradient ring */}
      <div style={{ position: "relative", width: 92, height: 92 }}>
        <svg
          width="92" height="92"
          style={{ position: "absolute", inset: 0, animation: "cios-rl-spin 1.5s linear infinite", transformOrigin: "46px 46px" }}
          viewBox="0 0 92 92"
        >
          <defs>
            <linearGradient id="rl-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E88E5" />
              <stop offset="50%" stopColor="#AB47BC" />
              <stop offset="100%" stopColor="#FFC107" />
            </linearGradient>
          </defs>
          <circle cx="46" cy="46" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <circle cx="46" cy="46" r="42" fill="none"
            stroke="url(#rl-ring-grad)" strokeWidth="3"
            strokeDasharray="264" strokeDashoffset="198"
            strokeLinecap="round"
          />
        </svg>
        <img
          src={LOGO_URL} alt="CIOS" width={68} height={68}
          style={{
            borderRadius: "50%", objectFit: "cover",
            position: "absolute", top: 12, left: 12,
            animation: "cios-rl-logo 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Rotating quote */}
      <p
        key={quoteIdx}
        style={{
          fontStyle: "italic", color: "#94A3B8", fontSize: 14, lineHeight: 1.7,
          margin: 0, maxWidth: 360,
          animation: "cios-rl-quote 0.35s ease forwards",
        }}
      >
        &ldquo;{QUOTES[quoteIdx]}&rdquo;
      </p>

      {/* Bouncing dots */}
      <div style={{ display: "flex", gap: 10 }}>
        {(["#1E88E5", "#AB47BC", "#FFC107"] as const).map((color, i) => (
          <span key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: color,
            animation: `cios-rl-dot 1.3s ${i * 0.18}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
