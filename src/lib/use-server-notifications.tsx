"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Ably from "ably";
import toast from "react-hot-toast";
import { usePathname } from "next/navigation";
import {
  listMyNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, type NotificationRow,
} from "@/app/actions/notifications";
import { createAblyToken } from "@/app/actions/messages";

/** Show an OS notification on every incoming message — works even when the tab is focused. */
function showBrowserNotification(title: string, body: string, url?: string | null) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    // Each notification gets a unique tag so Chrome doesn't silently merge / suppress duplicates
    // when the user is already on the page. Same-origin PNGs guarantee the icon renders.
    const tag = `${title}-${Date.now()}`;
    const n = new Notification(title, {
      body: body.slice(0, 200),
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag,
      requireInteraction: false,
      silent: false,
    });
    n.onclick = () => { window.focus(); if (url) window.location.href = url; n.close(); };
    // Auto-close after 6s so the desktop doesn't pile them up
    setTimeout(() => { try { n.close(); } catch {} }, 6000);
  } catch {}
}

// Notifications now fire on every incoming event — no route-based suppression.
function isRouteSuppressed(_pathname: string | null, _type: string): boolean { return false; }

let ablyClient: Ably.Realtime | null = null;
async function getAbly(): Promise<Ably.Realtime | null> {
  if (ablyClient) return ablyClient;
  try {
    ablyClient = new Ably.Realtime({
      authCallback: async (_data, cb) => {
        const r = await createAblyToken();
        if (!r.ok) return cb(r.error, null);
        cb(null, r.data!.tokenRequest as unknown as Ably.TokenRequest);
      },
      echoMessages: false,
    });
    return ablyClient;
  } catch { return null; }
}

export interface NotifPrefs {
  soundOn: boolean;
  toastsOn: boolean;
  mutedCategories: string[];   // notification.type values
  quietFromHour: number;       // 0-23
  quietToHour: number;         // 0-23
}

const PREFS_KEY = "cios-notif-prefs-v1";
const DEFAULT_PREFS: NotifPrefs = { soundOn: true, toastsOn: true, mutedCategories: [], quietFromHour: 22, quietToHour: 7 };

function loadPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try { const raw = localStorage.getItem(PREFS_KEY); if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) }; } catch {}
  return DEFAULT_PREFS;
}
export function savePrefs(p: NotifPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}
export function usePrefs(): [NotifPrefs, (p: NotifPrefs) => void] {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  useEffect(() => { setPrefs(loadPrefs()); }, []);
  const set = useCallback((next: NotifPrefs) => { setPrefs(next); savePrefs(next); }, []);
  return [prefs, set];
}

function isQuietNow(p: NotifPrefs): boolean {
  const h = new Date().getHours();
  const from = p.quietFromHour, to = p.quietToHour;
  if (from === to) return false;
  return from < to ? h >= from && h < to : h >= from || h < to;
}

let chimeCtx: AudioContext | null = null;
function playChime(priority: "critical" | "important" | "normal" = "normal") {
  try {
    if (!chimeCtx) chimeCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = chimeCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    const beep = (f: number, t: number, type: OscillatorType = "sine") => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = type; osc.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + t);
      g.gain.linearRampToValueAtTime(0.6, ctx.currentTime + t + 0.02);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + t + 0.22);
      osc.connect(g); g.connect(master);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.3);
    };
    if (priority === "critical") {
      // Triple-beep alarm
      beep(1400, 0, "square"); beep(1400, 0.18, "square"); beep(1400, 0.36, "square");
    } else if (priority === "important") {
      beep(1000, 0, "triangle"); beep(1400, 0.16, "triangle");
    } else {
      // Soft 2-note chime
      beep(880, 0); beep(1175, 0.15);
    }
  } catch {}
}

function priorityOf(type: string): "critical" | "important" | "normal" {
  if (type === "error") return "critical";
  if (type === "warning" || type === "fine") return "important";
  return "normal";
}

export function useServerNotifications(currentClerkId: string | null) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [justArrived, setJustArrived] = useState(false);
  const [prefs] = usePrefs();
  const seenIds = useRef<Set<string>>(new Set());
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const refresh = useCallback(async () => {
    const r = await listMyNotifications(30);
    if (r.ok) {
      setNotifications(r.data!.notifications);
      setUnread(r.data!.unread);
      r.data!.notifications.forEach((n) => seenIds.current.add(n.id));
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscribe
  useEffect(() => {
    if (!currentClerkId) return;
    let cancelled = false;
    let ch: Ably.RealtimeChannel | null = null;
    (async () => {
      const client = await getAbly();
      if (!client || cancelled) return;
      ch = client.channels.get(`notif:${currentClerkId}`);
      ch.subscribe("new", (msg) => {
        const d = msg.data as { id: string; title: string; message: string; type: string; actionUrl?: string | null; createdAt: string };
        if (seenIds.current.has(d.id)) return;
        seenIds.current.add(d.id);
        const row: NotificationRow = {
          id: d.id, user_id: "", title: d.title, message: d.message,
          type: d.type as NotificationRow["type"], action_url: d.actionUrl || null,
          is_read: false, created_at: d.createdAt,
        };
        setNotifications((prev) => [row, ...prev].slice(0, 30));
        setUnread((u) => u + 1);

        // Bell pulse
        setJustArrived(true);
        setTimeout(() => setJustArrived(false), 1500);

        const priority = priorityOf(d.type);
        const routeSuppressed = isRouteSuppressed(pathRef.current, d.type);
        const muted = prefs.mutedCategories.includes(d.type) || isQuietNow(prefs);
        const criticalOverride = priority === "critical"; // Critical always toasts/sounds

        // Browser desktop notification (when tab is hidden)
        if (!muted || criticalOverride) {
          showBrowserNotification(d.title, d.message || "", d.actionUrl);
        }

        // In-app toast
        if ((!muted && !routeSuppressed && prefs.toastsOn) || criticalOverride) {
          const icon = iconFor(d.type);
          const color = colorFor(d.type);
          const borderWidth = priority === "critical" ? 4 : 3;
          toast.custom((t) => (
            <div
              onClick={() => { if (d.actionUrl) window.location.href = d.actionUrl; toast.dismiss(t.id); }}
              style={{
                background: "#111827",
                border: `1px solid ${priority === "critical" ? "rgba(239,83,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderLeft: `${borderWidth}px solid ${color}`,
                borderRadius: 12, padding: "12px 14px", minWidth: 280, maxWidth: 380,
                color: "#E8EDF5", fontFamily: "'Nunito', sans-serif", cursor: d.actionUrl ? "pointer" : "default",
                boxShadow: priority === "critical" ? "0 12px 30px rgba(239,83,80,0.3)" : "0 10px 25px rgba(0,0,0,0.3)",
                animation: priority === "critical" ? "critShake 0.4s ease-in-out" : undefined,
              }}>
              <style>{`@keyframes critShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }`}</style>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ fontSize: priority === "critical" ? 22 : 20 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {priority === "critical" && <div style={{ fontSize: 9, fontWeight: 700, color: "#EF5350", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Critical</div>}
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                  {d.message && <div style={{ fontSize: 11, color: "#8892A4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.message}</div>}
                </div>
                {d.actionUrl && <div style={{ fontSize: 11, color: color, fontWeight: 700, flexShrink: 0 }}>Open →</div>}
              </div>
            </div>
          ), { duration: priority === "critical" ? 8000 : priority === "important" ? 5500 : 4500 });
          if (prefs.soundOn || criticalOverride) playChime(priority);
          if ("vibrate" in navigator && priority === "critical") { try { navigator.vibrate([200, 100, 200, 100, 400]); } catch {} }
          else if ("vibrate" in navigator && priority === "important") { try { navigator.vibrate([150]); } catch {} }
        }
      });
    })();
    return () => { cancelled = true; if (ch) { try { ch.unsubscribe(); } catch {} } };
  }, [currentClerkId, prefs]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnread((u) => Math.max(0, u - 1));
  }, []);
  const markAll = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }, []);
  const remove = useCallback(async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const enableBrowserNotifications = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
    return await Notification.requestPermission();
  }, []);

  return { notifications, unread, loading, refresh, markRead, markAll, remove, justArrived, enableBrowserNotifications };
}

export function browserNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function iconFor(type: string): string {
  return {
    message: "💬", task: "📋", achievement: "🏆", fine: "💸",
    info: "🔔", success: "✅", warning: "⚠️", error: "🚨", system: "⚙️",
  }[type] || "🔔";
}

function colorFor(type: string): string {
  return {
    message: "#1E88E5", task: "#AB47BC", achievement: "#FFC107", fine: "#EF5350",
    info: "#1E88E5", success: "#66BB6A", warning: "#FFC107", error: "#EF5350", system: "#8892A4",
  }[type] || "#1E88E5";
}
