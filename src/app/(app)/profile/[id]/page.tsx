import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/db";
import { getActivityHeatmapFor } from "@/app/actions/activity-heatmap";
import { ProfileClient } from "../profile-client";

export const dynamic = "force-dynamic";

export default async function ViewProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, heatmapRes] = await Promise.all([
    getPublicProfile(id),
    getActivityHeatmapFor(id),
  ]);
  if (!profile) notFound();
  const heatmap = heatmapRes.ok ? heatmapRes.data : null;
  return <ProfileClient profile={profile} editable={profile.isMe} heatmap={heatmap} />;
}
