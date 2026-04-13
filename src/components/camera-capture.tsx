"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/** Live webcam preview with capture-to-File. Works on desktop and mobile. */
export function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");

  useEffect(() => {
    let cancelled = false;
    let s: MediaStream | null = null;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not supported on this device");
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera access denied";
        setErr(msg);
      }
    })();
    return () => {
      cancelled = true;
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  const switchCamera = () => setFacing((f) => (f === "user" ? "environment" : "user"));

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { toast.error("Camera not ready"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) { toast.error("Failed to capture"); return; }
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onClose();
    }, "image/jpeg", 0.92);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
        <button onClick={switchCamera} style={btnIcon} title="Switch camera">🔄</button>
        <button onClick={onClose} style={btnIcon}>✕</button>
      </div>

      {err ? (
        <div style={{ background: "#111827", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 14, padding: 30, textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
          <h2 style={{ fontSize: 18, color: "#E8EDF5", margin: "0 0 8px 0" }}>Camera unavailable</h2>
          <p style={{ fontSize: 13, color: "#8892A4", marginBottom: 16, lineHeight: 1.5 }}>{err}</p>
          <p style={{ fontSize: 11, color: "#5A6478" }}>Make sure your browser has camera permission for this site.</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} playsInline muted style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 16, background: "#000", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }} />
          <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center" }}>
            <button onClick={capture} disabled={!stream} style={{
              width: 72, height: 72, borderRadius: "50%", background: "#fff", border: "5px solid rgba(255,255,255,0.3)",
              cursor: stream ? "pointer" : "wait", boxShadow: "0 4px 20px rgba(255,255,255,0.3)",
              padding: 0, fontSize: 0,
            }} title="Capture photo">
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "2px solid #0A0E1A" }} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const btnIcon: React.CSSProperties = {
  width: 40, height: 40, borderRadius: "50%",
  background: "rgba(255,255,255,0.15)", color: "#fff", border: "none",
  fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
