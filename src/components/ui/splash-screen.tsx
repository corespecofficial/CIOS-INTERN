"use client";

import { useEffect, useState } from "react";

const LOGO_URL = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";
const MIN_MS = 5000;
const MAX_MS = 8000;

/**
 * Full-screen boot splash. Shown ONCE per tab/session (sessionStorage flag)
 * so it doesn't interrupt every soft navigation. Hides on window `load`
 * or after MAX_MS, whichever is first. A short fade-out transition runs
 * before unmount so it never cuts abruptly.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let windowLoaded = document.readyState === "complete";

    // Progress bar: fills smoothly to 98% across MIN_MS, regardless of actual load.
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(98, (elapsed / MIN_MS) * 100));
    }, 60);

    const finish = () => {
      setProgress(100);
      setLeaving(true);
      setTimeout(() => setVisible(false), 400);
    };

    const tryFinish = () => {
      const elapsed = Date.now() - start;
      if (windowLoaded && elapsed >= MIN_MS) finish();
    };

    const onLoad = () => { windowLoaded = true; tryFinish(); };
    if (!windowLoaded) window.addEventListener("load", onLoad);

    // Check every 200ms whether both conditions are met.
    const checker = setInterval(tryFinish, 200);
    // Hard cap so it can never stick.
    const maxTimer = setTimeout(finish, MAX_MS);

    return () => {
      clearInterval(tick);
      clearInterval(checker);
      clearTimeout(maxTimer);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#0A0E1A",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 22, padding: 24, textAlign: "center",
      opacity: leaving ? 0 : 1, transition: "opacity 0.4s ease",
      pointerEvents: leaving ? "none" : "auto",
    }}>
      <style>{`
        @keyframes cios-logo-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.04); }
        }
        @keyframes cios-wordmark-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cios-progress-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <img src={LOGO_URL} alt="CIOS" width={96} height={96}
        style={{ borderRadius: "50%", objectFit: "cover", animation: "cios-logo-float 2.6s ease-in-out infinite", filter: "drop-shadow(0 8px 24px rgba(30,136,229,0.25))" }} />

      <div style={{ animation: "cios-wordmark-in 0.6s ease 0.2s backwards" }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 64, fontWeight: 800, letterSpacing: 2,
          background: "linear-gradient(135deg,#1E88E5 0%,#FFC107 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", color: "transparent",
          lineHeight: 1,
        }}>
          CIOS
        </div>
        <div style={{ marginTop: 14, color: "#B0BEC5", fontSize: 15, fontWeight: 500 }}>
          COSPRONOS Media AI Internship Operating System
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "min(320px, 70vw)", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
        <div style={{
          width: `${progress}%`, height: "100%",
          background: "linear-gradient(90deg,#1E88E5 0%,#FFC107 50%,#1E88E5 100%)",
          backgroundSize: "200% 100%",
          animation: "cios-progress-shimmer 2s linear infinite",
          transition: "width 0.2s ease",
          borderRadius: 999,
        }} />
      </div>

      <div style={{ color: "#5A6478", fontSize: 12, fontWeight: 500, marginTop: 6 }}>
        Powered by COSPRONOS Media × Corespec Engineering Ltd.
      </div>
    </div>
  );
}
