import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getMySessions, getMyMentorships } from "@/app/actions/mentorship";
import { MentorSessionsClient } from "./sessions-client";

export const dynamic = "force-dynamic";

export default async function MentorSessionsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [sessionsRes, mentorshipsRes] = await Promise.all([
    getMySessions(50),
    getMyMentorships(),
  ]);

  const activeMentorships = (mentorshipsRes.ok ? mentorshipsRes.data! : []).filter((m) => m.status === "active");

  return (
    <MentorSessionsClient
      userId={me.id}
      sessions={sessionsRes.ok ? sessionsRes.data! : []}
      activeMentorships={activeMentorships}
    />
  );
}
