import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getAnnouncement, getAnnouncementAnalytics } from "@/app/actions/announcements";
import { DetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const res = await getAnnouncement(id);
  if (!res.ok) notFound();
  const ann = res.data! as Record<string, unknown>;
  const isSender = (ann.sender_id as string) === me.id || me.role === "super_admin" || me.role === "admin";
  let analytics: Awaited<ReturnType<typeof getAnnouncementAnalytics>> = { ok: false, error: "" };
  if (isSender) analytics = await getAnnouncementAnalytics(id);
  return <DetailClient ann={ann} isSender={isSender} analytics={analytics.ok ? analytics.data! : null} />;
}
