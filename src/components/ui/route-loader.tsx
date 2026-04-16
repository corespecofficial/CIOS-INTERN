"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const LOGO_URL = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";
const SHOW_AFTER_MS = 800;   // don't show unless nav takes longer than this
const MAX_MS = 4000;         // hard cap

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
];

// Marketing paths that should never show the loader between each other.
const MARKETING_PREFIXES = [
  "/about", "/pricing", "/contact", "/recruiters", "/talent-showcase",
  "/terms", "/verify", "/privacy", "/demo", "/success-stories", "/press",
  "/careers", "/solutions", "/portals", "/join", "/faq",
];

function isMarketingPath(p: string) {
  return p === "/" || MARKETING_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
}

/**
 * Route-change loader. Suppressed entirely when navigating between
 * marketing/public pages so there's no interruption for visitors.
 * Only shows for authenticated app pages where data loading is heavier.
 */
export function RouteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [quote, setQuote] = useState("");
  const pathRef = useRef(pathname);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hide the loader as soon as the pathname actually updates.
  useEffect(() => {
    if (pathname !== pathRef.current) {
      pathRef.current = pathname;
      if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
      if (maxTimer.current) { clearTimeout(maxTimer.current); maxTimer.current = null; }
      if (visible) {
        setLeaving(true);
        setTimeout(() => { setVisible(false); setLeaving(false); }, 300);
      }
    }
  }, [pathname, visible]);

  // Intercept clicks + popstate to know when a navigation *starts*.
  useEffect(() => {
    const startNav = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
      showTimer.current = setTimeout(() => {
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        setLeaving(false);
        setVisible(true);
        maxTimer.current = setTimeout(() => {
          setLeaving(true);
          setTimeout(() => { setVisible(false); setLeaving(false); }, 300);
        }, MAX_MS);
      }, SHOW_AFTER_MS);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
        // Only show the full-screen loader when going FROM a marketing/public page
        // into the app (e.g. landing → sign-in → dashboard). Never show it for
        // portal-to-portal navigation — those pages have their own skeleton states.
        if (!isMarketingPath(window.location.pathname)) return;
      } catch { return; }
      startNav();
    };

    const onPopState = () => startNav();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "#0A0E1A",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 24, padding: 24, textAlign: "center",
      opacity: leaving ? 0 : 1, transition: "opacity 0.3s ease",
      pointerEvents: leaving ? "none" : "auto",
    }}>
      <style>{`
        @keyframes cios-rl-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes cios-rl-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>

      <img src={LOGO_URL} alt="CIOS" width={72} height={72}
        style={{ borderRadius: "50%", objectFit: "cover", animation: "cios-rl-pulse 1.6s ease-in-out infinite" }} />

      <p style={{
        fontStyle: "italic", color: "#9CA3AF", fontSize: 15, lineHeight: 1.6,
        margin: 0, maxWidth: 440,
      }}>
        &ldquo;{quote}&rdquo;
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 11, height: 11, borderRadius: "50%",
            background: "linear-gradient(135deg,#1E88E5,#FFC107)",
            animation: `cios-rl-dot 1.4s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
