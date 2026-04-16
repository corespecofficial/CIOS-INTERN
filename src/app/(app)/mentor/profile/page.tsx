import { getMyMentorProfile } from "@/app/actions/mentorship";
import { MentorProfilePageClient } from "./mentor-profile-page-client";

export const dynamic = "force-dynamic";

export default async function MentorProfilePage() {
  const res = await getMyMentorProfile();
  const profile = res.ok ? res.data ?? null : null;
  return <MentorProfilePageClient existing={profile} />;
}
