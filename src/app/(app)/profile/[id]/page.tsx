import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/db";
import { ProfileClient } from "../profile-client";

export const dynamic = "force-dynamic";

export default async function ViewProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) notFound();
  return <ProfileClient profile={profile} editable={profile.isMe} />;
}
