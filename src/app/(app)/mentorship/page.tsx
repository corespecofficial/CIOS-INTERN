import { listAvailableMentors } from "@/app/actions/mentorship";
import { MentorBrowserClient } from "./mentor-browser-client";

export const dynamic = "force-dynamic";

export default async function MentorshipPage() {
  const res = await listAvailableMentors(40);
  return <MentorBrowserClient mentors={res.ok ? res.data! : []} />;
}
