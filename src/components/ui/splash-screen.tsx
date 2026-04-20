"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LOGO_URL = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";
const MAX_MS = 1800;
const SESSION_KEY = "cios-splash-shown";

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
 * One-per-session splash — only on first portal page load, never on marketing pages.
 * Caps at 1.8s then gets out of the way instantly.
 */
export function SplashScreen() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (isMarketingPath(pathname)) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);

    const finish = () => {
      setLeaving(true);
      setTimeout(() => setVisible(false), 350);
    };

    const maxTimer = setTimeout(finish, MAX_MS);
    const onLoad = () => { clearTimeout(maxTimer); setTimeout(finish, 200); };

    if (document.readyState === "complete") {
      setTimeout(finish, 500);
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      clearTimeout(maxTimer);
      window.removeEventListener("load", onLoad);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "var(--bg-primary, #0A0E1A)",
      color: "var(--text-primary, #F8FAFC)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 20, padding: 24, textAlign: "center",
      opacity: leaving ? 0 : 1, transition: "opacity 0.35s ease",
      pointerEvents: leaving ? "none" : "auto",
    }}>
      <style>{`
        @keyframes cios-sp-logo {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 6px 20px rgba(30,136,229,0.3)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 10px 30px rgba(30,136,229,0.5)); }
        }
        @keyframes cios-sp-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cios-sp-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>

      <img
        src={LOGO_URL} alt="CIOS" width={80} height={80}
        style={{ borderRadius: "50%", objectFit: "cover", animation: "cios-sp-logo 2s ease-in-out infinite" }}
      />

      <div style={{ animation: "cios-sp-in 0.5s ease 0.1s backwards" }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 52, fontWeight: 800, letterSpacing: 3,
          background: "linear-gradient(135deg, #1E88E5 0%, #FFC107 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", color: "transparent", lineHeight: 1,
        }}>
          CIOS
        </div>
        <div style={{ marginTop: 10, color: "#6B7280", fontSize: 13, fontWeight: 500, animation: "cios-sp-in 0.5s ease 0.3s backwards" }}>
          COSPRONOS Media AI Internship OS
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "linear-gradient(135deg, #1E88E5, #FFC107)",
            animation: `cios-sp-dot 1.2s ${i * 0.16}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
