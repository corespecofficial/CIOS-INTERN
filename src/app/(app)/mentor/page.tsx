import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getMyMentorships, getMySessions } from "@/app/actions/mentorship";
import { MentorDashboardClient } from "./mentor-dashboard-client";

export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [mentorshipsRes, sessionsRes] = await Promise.all([
    getMyMentorships(),
    getMySessions(10),
  ]);

  return (
    <MentorDashboardClient
      userId={me.id}
      userName={me.name || ""}
      mentorships={mentorshipsRes.ok ? mentorshipsRes.data! : []}
      sessions={sessionsRes.ok ? sessionsRes.data! : []}
    />
  );
}
