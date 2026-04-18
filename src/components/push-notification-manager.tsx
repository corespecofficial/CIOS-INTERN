"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const STORAGE_KEY = "cios-push-subscribed-v2";
const PROMPT_DELAY_MS = 6000; // Wait 6s after page load before prompting

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

async function registerAndSubscribe(): Promise<boolean> {
  if (!VAPID_PUBLIC) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  // Register service worker (safe to call multiple times)
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  // Check if already subscribed
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Re-send to server in case it was lost from DB
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(existing),
    }).catch(() => {});
    return true;
  }

  const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sub),
  });

  return res.ok;
}

/**
 * Mounts once in the app layout.
 * - If permission is already "granted": silently subscribes in the background.
 * - If permission is "default": shows a friendly toast prompt after 6 seconds.
 * - If permission is "denied": does nothing.
 * Once subscribed, never prompts again (tracks via localStorage).
 */
export function PushNotificationManager() {
  const prompted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!VAPID_PUBLIC) return;

    const alreadyHandled = localStorage.getItem(STORAGE_KEY) === "1";

    if (Notification.permission === "granted") {
      // Silent background subscription — just make sure we're registered
      registerAndSubscribe().catch(() => {});
      return;
    }

    if (Notification.permission === "denied") return;
    if (alreadyHandled) return;

    // permission === "default" — prompt after a delay so the user is settled in
    const timer = setTimeout(() => {
      if (prompted.current) return;
      prompted.current = true;

      toast(
        (t) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#E8EDF5" }}>
              🔔 Enable Notifications?
            </div>
            <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.4 }}>
              Get instant alerts for messages, tasks, and achievements — even when the app is closed.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  const perm = await Notification.requestPermission();
                  if (perm === "granted") {
                    try {
                      await registerAndSubscribe();
                      localStorage.setItem(STORAGE_KEY, "1");
                      toast.success("Notifications enabled! You'll see alerts on your phone.", { duration: 4000 });
                    } catch (e) {
                      console.warn("[push] subscribe failed:", e);
                    }
                  } else {
                    localStorage.setItem(STORAGE_KEY, "1");
                  }
                }}
                style={{ flex: 1, padding: "7px 0", background: "linear-gradient(135deg, #F59E0B, #EF4444)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Enable
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  localStorage.setItem(STORAGE_KEY, "1");
                }}
                style={{ padding: "7px 12px", background: "rgba(255,255,255,0.06)", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Later
              </button>
            </div>
          </div>
        ),
        {
          duration: 15000,
          position: "bottom-right",
          style: { background: "#1F2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", maxWidth: 320 },
        }
      );
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
