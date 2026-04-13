"use client";

import { useCallback, useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Minimal Web Push subscriber.
 * Server side needs: VAPID key pair + web-push library + an endpoint to store subscriptions + route that sends pushes.
 * This hook handles the client half. See /docs/push-notifications.md for server setup steps.
 */
export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
        if (reg) reg.pushManager.getSubscription().then((s) => setSubscribed(!!s));
      });
    }
  }, []);

  const register = useCallback(async () => {
    if (!supported) throw new Error("Push not supported in this browser");
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  }, [supported]);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!VAPID_PUBLIC) {
      throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured. See docs/push-notifications.md.");
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return null;
    const reg = await register();
    const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC);
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    });
    // Send to server to store
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sub),
    }).catch((e) => console.warn("[push] subscribe POST failed:", e));
    setSubscribed(true);
    return sub;
  }, [register]);

  const unsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      setSubscribed(false);
    }
  }, []);

  return { supported, permission, subscribed, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}
