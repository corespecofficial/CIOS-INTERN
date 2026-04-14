import { BackBar } from "@/components/back-bar";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listUpcomingSessions } from "@/app/actions/live-sessions";
import { LiveListClient } from "./live-list-client";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listUpcomingSessions();
  const sessions = res.ok ? res.data! : [];
  const canHost = ["instructor", "admin", "super_admin", "team_lead"].includes(me.role);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/dashboard" label="Back" />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📡 Live classes</h1>
      <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 20px" }}>
        Join live sessions from your instructors. Watch YouTube Live, Twitch, TikTok Live, Google Meet, Classroom, or Zoom — all in one place.
      </p>
      <LiveListClient initialSessions={sessions} canHost={canHost} />
    </div>
  );
}
