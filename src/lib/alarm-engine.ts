"use client";

import { useEffect, useRef } from "react";
import { useProductivityStore, type ProdAlarm, type ProdReminder } from "./use-productivity-store";

/* ── Simple synthesized ringtones via WebAudio (no external assets needed) ── */

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    } catch { return null; }
  }
  return audioCtx;
}

type Tone = ProdAlarm["ringtone"];

export function playRingtone(tone: Tone, volume = 0.7, durationMs = 4000) {
  const ctx = getCtx();
  if (!ctx) return () => {};
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const stops: (() => void)[] = [];

  const beep = (freq: number, start: number, dur: number, type: OscillatorType = "sine") => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + start);
    g.gain.linearRampToValueAtTime(0.8, ctx.currentTime + start + 0.02);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
    osc.connect(g); g.connect(master);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
    stops.push(() => { try { osc.stop(); } catch {} });
  };

  const loops = Math.ceil(durationMs / 1500);
  for (let i = 0; i < loops; i++) {
    const base = i * 1.5;
    if (tone === "chime") {
      beep(880, base + 0, 0.25, "sine");
      beep(1175, base + 0.3, 0.3, "sine");
      beep(1568, base + 0.6, 0.5, "sine");
    } else if (tone === "beep") {
      beep(1000, base + 0, 0.15, "square");
      beep(1000, base + 0.3, 0.15, "square");
      beep(1000, base + 0.6, 0.15, "square");
    } else if (tone === "bell") {
      beep(660, base + 0, 0.8, "triangle");
      beep(990, base + 0.05, 0.8, "triangle");
    } else {
      // digital
      beep(1200, base + 0, 0.08, "sawtooth");
      beep(1800, base + 0.12, 0.08, "sawtooth");
      beep(2400, base + 0.24, 0.1, "sawtooth");
    }
  }

  return () => {
    stops.forEach((s) => s());
    try { master.disconnect(); } catch {}
  };
}

/* ── Browser notification + vibration helpers ── */

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export function showNotification(title: string, body: string, icon?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: title,
    });
  } catch { /* ignore */ }
  if ("vibrate" in navigator) {
    try { navigator.vibrate([300, 150, 300, 150, 600]); } catch {}
  }
}

/* ── Callback that consumers register to show a modal UI ── */

type ActiveAlarmHandler = (alarm: ProdAlarm) => void;
let activeHandler: ActiveAlarmHandler | null = null;
export function onActiveAlarm(fn: ActiveAlarmHandler) {
  activeHandler = fn;
  return () => { if (activeHandler === fn) activeHandler = null; };
}

/* ── The scheduler hook — attach once at app root or on the Productivity page ── */

export function useAlarmEngine() {
  const alarms = useProductivityStore((s) => s.alarms);
  const reminders = useProductivityStore((s) => s.reminders);
  const globalVolume = useProductivityStore((s) => s.globalVolume);
  const updateAlarm = useProductivityStore((s) => s.updateAlarm);
  const markReminderFired = useProductivityStore((s) => s.markReminderFired);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      const now = Date.now();

      for (const al of alarms) {
        if (!al.active) continue;
        const fireMs = al.snoozedUntil
          ? new Date(al.snoozedUntil).getTime()
          : new Date(al.fireAt).getTime();
        if (al.fired && !al.snoozedUntil) continue;
        if (fireMs <= now && !ringingRef.current.has(al.id)) {
          ringingRef.current.add(al.id);
          playRingtone(al.ringtone, Math.min(al.volume, globalVolume), 6000);
          showNotification(`⏰ ${al.label}`, "Your alarm is ringing. Tap to snooze or dismiss.");
          updateAlarm(al.id, { fired: true, snoozedUntil: null });
          if (activeHandler) activeHandler(al);
          setTimeout(() => ringingRef.current.delete(al.id), 8000);
        }
      }

      for (const rem of reminders) {
        if (rem.fired) continue;
        const fireMs = new Date(rem.fireAt).getTime();
        if (fireMs <= now) {
          if (rem.deliverInApp) {
            showNotification(`🔔 ${rem.label}`, `Starts in ${rem.offsetMinutes} min`);
            playRingtone("chime", globalVolume * 0.5, 1200);
          }
          markReminderFired(rem.id);
        }
      }
    };

    check();
    tickRef.current = setInterval(check, 15000); // 15s resolution
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [alarms, reminders, globalVolume, updateAlarm, markReminderFired]);
}

/* ── Utility: build reminders for a task/event at common offsets ── */

export function reminderOffsets() {
  return [5, 15, 60, 1440]; // minutes: 5m, 15m, 1h, 1d
}

export function computeReminder(
  refId: string,
  refType: "task" | "event",
  label: string,
  dueIso: string,
  offsetMinutes: number
): Omit<ProdReminder, "id" | "fired"> {
  const fireAt = new Date(new Date(dueIso).getTime() - offsetMinutes * 60000).toISOString();
  return {
    refId,
    refType,
    label,
    fireAt,
    offsetMinutes,
    deliverInApp: true,
    deliverPush: true,
    deliverEmail: false,
  };
}
