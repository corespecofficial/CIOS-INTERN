import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getActiveMissions } from "@/lib/gamification";
import { MissionsClient } from "./missions-client";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const missions = await getActiveMissions(me.id).catch(() => []);
  return <MissionsClient missions={missions} />;
}
