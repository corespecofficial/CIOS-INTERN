"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cios-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAProvider() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  /* Register service worker */
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const register = async () => {
      try {
        // In dev, unregister any previously installed SW to avoid stale caches + hydration mismatches
        if (isDev) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) await r.unregister();
          if (window.caches) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Watch for updates
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateReady(true);
        }
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newSW);
              setUpdateReady(true);
            }
          });
        });

        // When the new SW takes control, reload
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      } catch (e) {
        console.warn("[pwa] SW registration failed:", e);
      }
    };
    register();
  }, []);

  /* Install prompt detection */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Respect recent dismissal
      try {
        const last = localStorage.getItem(DISMISS_KEY);
        if (last && Date.now() - parseInt(last) < DISMISS_TTL_MS) return;
      } catch {}
      // Don't prompt immediately on first page — wait 10 seconds so it doesn't interrupt
      setTimeout(() => setShowInstall(true), 10000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowInstall(false);
      setInstallPrompt(null);
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  /* Online / offline tracking */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setIsOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    try { await installPrompt.prompt(); } catch {}
    setShowInstall(false);
    setInstallPrompt(null);
  }
  function dismissInstall() {
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch {}
    setShowInstall(false);
  }
  function applyUpdate() {
    if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <>
      {/* Offline badge — sticks to the bottom-left when offline */}
      {isOffline && (
        <div style={{
          position: "fixed", bottom: 16, left: 16, zIndex: 9990,
          background: "rgba(239,83,80,0.95)", color: "#fff",
          padding: "8px 14px", borderRadius: 20,
          fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
          boxShadow: "0 8px 20px rgba(239,83,80,0.4)",
          display: "flex", alignItems: "center", gap: 6,
          animation: "pwaSlideIn 0.3s ease-out",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", animation: "pwaPulse 1.4s infinite" }} />
          OFFLINE — changes queued
          <style>{`
            @keyframes pwaSlideIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes pwaPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
          `}</style>
        </div>
      )}

      {/* Update available banner */}
      {updateReady && (
        <div style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 9991,
          background: "#111827", border: "1px solid rgba(30,136,229,0.3)",
          borderRadius: 14, padding: "12px 16px",
          color: "#E8EDF5", fontFamily: "'Nunito', sans-serif",
          display: "flex", alignItems: "center", gap: 12, maxWidth: 340,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          animation: "pwaSlideUp 0.3s ease-out",
        }}>
          <div style={{ fontSize: 22 }}>✨</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Update available</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>Reload to get the latest features.</div>
          </div>
          <button onClick={applyUpdate} style={{ background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Reload
          </button>
          <style>{`@keyframes pwaSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
      )}

      {/* Install banner */}
      {showInstall && (
        <div style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 9992,
          background: "linear-gradient(135deg, #111827, #0A0E1A)",
          border: "1px solid rgba(30,136,229,0.3)",
          borderRadius: 14, padding: 16, maxWidth: 340,
          color: "#E8EDF5", fontFamily: "'Nunito', sans-serif",
          boxShadow: "0 14px 40px rgba(30,136,229,0.25)",
          animation: "pwaSlideUp 0.3s ease-out",
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <img
              src="https://res.cloudinary.com/detsk6uql/image/upload/w_96,h_96,c_fill,r_max,f_png/v1775646964/Adobe_Express_-_file_lydnbc.png"
              alt="CIOS" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Install CIOS</div>
              <div style={{ fontSize: 11, color: "#8892A4", lineHeight: 1.6, marginTop: 2 }}>
                Faster launch · Works offline · Home-screen icon · Background alerts
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={install} style={{ flex: 1, background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              📲 Install
            </button>
            <button onClick={dismissInstall} style={{ background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
