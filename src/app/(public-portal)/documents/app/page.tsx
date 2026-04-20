import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { HubClient } from "./hub-client";

export const dynamic = "force-dynamic";

export default async function DocumentsHubPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/documents/app");

  let me = await getCurrentDbUser();
  if (!me) {
    const repair = await ensureCurrentDbUser();
    if (repair.ok) me = await getCurrentDbUser();
  }
  if (!me) redirect("/sign-in?redirect_url=/documents/app");

  const firstName = (me.name || "there").split(" ")[0];
  return <HubClient firstName={firstName} />;
}
