import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listBroadcasts } from "@/app/actions/broadcasts";
import BroadcastsClient from "./broadcasts-client";

export const dynamic = "force-dynamic";

export default async function BroadcastsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listBroadcasts();
  const canBroadcast = ["admin", "super_admin", "mentor", "instructor"].includes(me.role);
  return <BroadcastsClient initialBroadcasts={res.ok ? res.data ?? [] : []} canBroadcast={canBroadcast} />;
}
