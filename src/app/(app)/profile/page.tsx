import { redirect } from "next/navigation";
import { getCurrentDbUser, getPublicProfile } from "@/lib/db";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const profile = await getPublicProfile(me.id);
  if (!profile) redirect("/dashboard");
  return <ProfileClient profile={profile} editable />;
}
