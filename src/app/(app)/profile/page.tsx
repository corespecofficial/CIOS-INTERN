import { redirect } from "next/navigation";
import { getCurrentDbUser, getPublicProfile } from "@/lib/db";
import { getMyActivityHeatmap } from "@/app/actions/activity-heatmap";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [profile, heatmapRes] = await Promise.all([
    getPublicProfile(me.id),
    getMyActivityHeatmap(),
  ]);
  if (!profile) redirect("/dashboard");
  const heatmap = heatmapRes.ok ? heatmapRes.data : null;
  return <ProfileClient profile={profile} editable heatmap={heatmap} />;
}
