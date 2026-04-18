"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
    setTimeout(() => { try { n.close(); } catch {} }, 6000);
  } catch {}
}

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
  mutedCategories: string[];
  quietFromHour: number;
  quietToHour: number;
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

/* ── Audio ── */
let chimeCtx: AudioContext | null = null;
let audioUnlocked = false;
let pendingChimePriority: ("critical" | "important" | "normal") | null = null;

function doPlayChime(priority: "critical" | "important" | "normal") {
  try {
    if (!chimeCtx) chimeCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = chimeCtx;
    if (ctx.state === "suspended") { ctx.resume().catch(() => {}); return; }
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
      beep(1400, 0, "square"); beep(1400, 0.18, "square"); beep(1400, 0.36, "square");
    } else if (priority === "important") {
      beep(1000, 0, "triangle"); beep(1400, 0.16, "triangle");
    } else {
      beep(880, 0); beep(1175, 0.15);
    }
  } catch {}
}

function playChime(priority: "critical" | "important" | "normal" = "normal") {
  if (!audioUnlocked) {
    // Queue it — will fire immediately when the user next interacts
    pendingChimePriority = priority;
    return;
  }
  doPlayChime(priority);
}

/** Call once on any user gesture to unlock the AudioContext */
function unlockAudioContext() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    if (!chimeCtx) chimeCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (chimeCtx.state === "suspended") chimeCtx.resume().catch(() => {});
  } catch {}
  if (pendingChimePriority) {
    const p = pendingChimePriority;
    pendingChimePriority = null;
    setTimeout(() => doPlayChime(p), 50);
  }
}

/** Mount once in the app to unlock audio on first gesture */
export function AudioUnlocker() {
  useEffect(() => {
    const handler = () => unlockAudioContext();
    document.addEventListener("click", handler, { passive: true, once: true });
    document.addEventListener("touchstart", handler, { passive: true, once: true });
    document.addEventListener("keydown", handler, { passive: true, once: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
  }, []);
  return null;
}

function priorityOf(type: string): "critical" | "important" | "normal" {
  if (type === "error") return "critical";
  if (type === "warning" || type === "fine") return "important";
  return "normal";
}

/* ── Top-drop banner system ── */
export interface BannerItem {
  id: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  priority: "critical" | "important" | "normal";
  actionUrl?: string | null;
}
type BannerListener = (item: BannerItem) => void;
const bannerListeners = new Set<BannerListener>();
function emitBanner(item: BannerItem) {
  bannerListeners.forEach((fn) => fn(item));
}

function BannerCard({ banner, onDismiss }: { banner: BannerItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Slide in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    const duration = banner.priority === "critical" ? 8000 : banner.priority === "important" ? 5500 : 4500;
    const t2 = setTimeout(() => { setLeaving(true); setTimeout(onDismiss, 340); }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [banner.priority, onDismiss]);

  const handleClick = () => {
    if (banner.actionUrl) window.location.href = banner.actionUrl;
    setLeaving(true);
    setTimeout(onDismiss, 340);
  };
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLeaving(true);
    setTimeout(onDismiss, 340);
  };

  const transform = visible && !leaving ? "translateY(0)" : "translateY(-110%)";
  const opacity = visible && !leaving ? 1 : 0;

  return (
    <div
      onClick={handleClick}
      style={{
        background: banner.priority === "critical"
          ? "linear-gradient(135deg, #1a0a0a 0%, #1F2937 100%)"
          : "linear-gradient(135deg, #0f172a 0%, #1F2937 100%)",
        border: `1px solid ${banner.priority === "critical" ? "rgba(239,83,80,0.4)" : "rgba(255,255,255,0.12)"}`,
        borderLeft: `4px solid ${banner.color}`,
        borderRadius: 14,
        padding: "12px 14px",
        cursor: banner.actionUrl ? "pointer" : "default",
        boxShadow: banner.priority === "critical"
          ? "0 16px 40px rgba(239,83,80,0.35), 0 4px 12px rgba(0,0,0,0.5)"
          : "0 16px 40px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.3)",
        transform,
        opacity,
        transition: "transform 0.34s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: 2, background: banner.color,
        animation: `cios-banner-shrink ${banner.priority === "critical" ? 8 : banner.priority === "important" ? 5.5 : 4.5}s linear forwards`,
        opacity: 0.6,
      }} />
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: `${banner.color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0, border: `1px solid ${banner.color}33`,
        }}>
          {banner.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {banner.priority === "critical" && (
            <div style={{ fontSize: 9, fontWeight: 800, color: "#EF5350", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 }}>Critical Alert</div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", marginBottom: banner.message ? 2 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {banner.title}
          </div>
          {banner.message && (
            <div style={{ fontSize: 11.5, color: "#94A3B8", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {banner.message}
            </div>
          )}
          {banner.actionUrl && (
            <div style={{ fontSize: 11, color: banner.color, fontWeight: 700, marginTop: 4 }}>Tap to open →</div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 0 0 4px", lineHeight: 1, flexShrink: 0 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Mount once in the app layout (inside any server-notification-aware parent).
 * Renders drop-down banner notifications from the top of the screen.
 */
export function NotificationBanners() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler: BannerListener = (item) => {
      setBanners((prev) => [item, ...prev].slice(0, 5));
    };
    bannerListeners.add(handler);
    return () => { bannerListeners.delete(handler); };
  }, []);

  const dismiss = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  if (!mounted || banners.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes cios-banner-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          left: "auto",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: 370,
          maxWidth: "calc(100vw - 24px)",
          pointerEvents: "none",
        }}
      >
        {banners.map((b) => (
          <BannerCard key={b.id} banner={b} onDismiss={() => dismiss(b.id)} />
        ))}
      </div>
    </>,
    document.body
  );
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
        const categoryMuted = prefs.mutedCategories.includes(d.type);
        const quiet = isQuietNow(prefs);
        const muted = categoryMuted || quiet;
        const criticalOverride = priority === "critical";

        // OS notification — fires unless category explicitly muted
        if (!categoryMuted || criticalOverride) {
          showBrowserNotification(d.title, d.message || "", d.actionUrl);
          if (prefs.soundOn || criticalOverride) playChime(priority);
          if ("vibrate" in navigator) {
            try {
              if (priority === "critical") navigator.vibrate([200, 100, 200, 100, 400]);
              else if (priority === "important") navigator.vibrate([150]);
              else navigator.vibrate(60);
            } catch {}
          }
        }

        // Top-drop in-app banner — same conditions as old toast but shows from top
        if ((!muted && !routeSuppressed && prefs.toastsOn) || criticalOverride) {
          const icon = iconFor(d.type);
          const color = colorFor(d.type);
          emitBanner({ id: d.id, title: d.title, message: d.message || "", icon, color, priority, actionUrl: d.actionUrl });
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
  return ({
    message: "💬", task: "📋", achievement: "🏆", fine: "💸",
    info: "🔔", success: "✅", warning: "⚠️", error: "🚨", system: "⚙️",
  } as Record<string, string>)[type] || "🔔";
}

function colorFor(type: string): string {
  return ({
    message: "#1E88E5", task: "#AB47BC", achievement: "#FFC107", fine: "#EF5350",
    info: "#1E88E5", success: "#66BB6A", warning: "#FFC107", error: "#EF5350", system: "#8892A4",
  } as Record<string, string>)[type] || "#1E88E5";
}
