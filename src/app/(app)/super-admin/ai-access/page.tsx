import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listAIAccessOverview } from "@/lib/ai-access";
import { AIAccessClient } from "./ai-access-client";

export const dynamic = "force-dynamic";

export default async function AIAccessPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "super_admin") redirect("/dashboard");
  const overview = await listAIAccessOverview();
  return <AIAccessClient initialOverview={overview} />;
}
