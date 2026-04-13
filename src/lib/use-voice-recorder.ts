"use client";

import { useRef, useState, useCallback } from "react";

export interface VoiceRecorderState {
  state: "idle" | "recording" | "paused" | "stopped";
  durationMs: number;
  audioUrl: string | null;
  blob: Blob | null;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState["state"]>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startMsRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseAccumRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4");
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      startMsRef.current = Date.now();
      pauseAccumRef.current = 0;
      setDurationMs(0);
      setAudioUrl(null);
      setBlob(null);
      setState("recording");
      intervalRef.current = setInterval(() => {
        setDurationMs(Date.now() - startMsRef.current - pauseAccumRef.current);
      }, 100);
    } catch (e) {
      console.error("[voice] start failed:", e);
      throw e;
    }
  }, []);

  const pause = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;
    mr.pause();
    pausedAtRef.current = Date.now();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "paused") return;
    mr.resume();
    pauseAccumRef.current += Date.now() - pausedAtRef.current;
    setState("recording");
    intervalRef.current = setInterval(() => {
      setDurationMs(Date.now() - startMsRef.current - pauseAccumRef.current);
    }, 100);
  }, []);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try { mr.stop(); } catch { /* ignore */ }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("stopped");
  }, []);

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setState("idle");
    setDurationMs(0);
    setAudioUrl(null);
    setBlob(null);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }, [audioUrl]);

  return { state, durationMs, audioUrl, blob, start, pause, resume, stop, reset };
}
