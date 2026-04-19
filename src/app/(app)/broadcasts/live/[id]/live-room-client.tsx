"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { endLiveBroadcast } from "@/app/actions/livekit";

const C = {
  bg: "#05070F",
  text: "#E8EDF5",
  dim: "#8892A4",
  red: "#EF5350",
};

interface Props {
  broadcastId: string;
  token: string;
  wsUrl: string;
  isHost: boolean;
}

export default function LiveRoomClient({ broadcastId, token, wsUrl, isHost }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleEnd() {
    if (!confirm("End this live broadcast for everyone?")) return;
    startTransition(async () => {
      await endLiveBroadcast(broadcastId);
      router.push("/broadcasts");
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }} data-lk-theme="default">
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.red, fontWeight: 800, fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, animation: "pulse 1.5s infinite" }} />
          LIVE
        </div>
        <div style={{ fontSize: 12, color: C.dim }}>{isHost ? "You're broadcasting" : "You're watching live"}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a href="/broadcasts" style={{ padding: "7px 14px", background: "transparent", color: C.dim, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            ← Back
          </a>
          {isHost && (
            <button
              onClick={handleEnd}
              disabled={pending}
              style={{ padding: "7px 14px", background: C.red, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {pending ? "Ending…" : "⏹ End Broadcast"}
            </button>
          )}
        </div>
      </div>

      <div style={{ height: "calc(100vh - 54px)" }}>
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          video={isHost}
          audio={isHost}
          data-lk-theme="default"
          style={{ height: "100%" }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
