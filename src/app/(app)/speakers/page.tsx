import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listUpcomingSessions, listPastSessions, getMyRsvps } from "@/app/actions/speakers";
import SpeakersClient from "./speakers-client";

export const dynamic = "force-dynamic";

export default async function SpeakersPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [upRes, pastRes, rsvpRes] = await Promise.all([listUpcomingSessions(), listPastSessions(12), getMyRsvps()]);
  return (
    <SpeakersClient
      upcoming={upRes.ok ? upRes.data ?? [] : []}
      past={pastRes.ok ? pastRes.data ?? [] : []}
      rsvped={rsvpRes.ok ? rsvpRes.data ?? [] : []}
    />
  );
}
