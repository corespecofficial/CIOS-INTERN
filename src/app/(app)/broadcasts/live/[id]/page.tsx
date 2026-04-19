import { notFound, redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getLiveRoomToken } from "@/app/actions/livekit";
import LiveRoomClient from "./live-room-client";

export const dynamic = "force-dynamic";

export default async function LiveRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getLiveRoomToken(id);
  if (!res.ok) {
    return (
      <div style={{ padding: 32, color: "#EF5350", background: "#0A0E1A", minHeight: "100vh" }}>
        Live room unavailable: {res.error}
        <br />
        <a href="/broadcasts" style={{ color: "#4DA8FF", marginTop: 14, display: "inline-block" }}>← Back to broadcasts</a>
      </div>
    );
  }
  return <LiveRoomClient broadcastId={id} token={res.data.token} wsUrl={res.data.ws_url} isHost={res.data.is_host} />;
}
