"use client";

import { useEffect, useState } from "react";

/**
 * Fixed offline banner pinned to the top of the viewport. Appears when
 * `navigator.onLine` flips false and on network errors. A manual "Retry"
 * button pings the server so the user can force a reconnect check.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function retry() {
    setRetrying(true);
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      if (r.ok) setOnline(true);
    } catch { /* ignore */ }
    finally { setRetrying(false); }
  }

  if (online) return null;
  return (
    <div role="status" style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9500,
      background: "linear-gradient(90deg, #EF5350, #C62828)",
      color: "#fff", padding: "8px 14px",
      display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
      fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif",
      boxShadow: "0 4px 16px rgba(239,83,80,0.35)",
    }}>
      <span>⚡ You&apos;re offline — changes will sync when you&apos;re back.</span>
      <button onClick={retry} disabled={retrying} style={{
        background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
        color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 11,
        fontWeight: 700, cursor: "pointer",
      }}>
        {retrying ? "Checking…" : "Retry"}
      </button>
    </div>
  );
}
