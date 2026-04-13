import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listAllAnnouncements, listAllPermissions } from "@/app/actions/announcements";
import { ControlClient } from "./control-client";

export const dynamic = "force-dynamic";

export default async function AnnouncementControlPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "super_admin") redirect("/announcements");
  const [annRes, permRes] = await Promise.all([listAllAnnouncements(), listAllPermissions()]);
  return <ControlClient announcements={annRes.ok ? annRes.data! : []} permissions={permRes.ok ? permRes.data! : []} />;
}
