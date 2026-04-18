import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getEagleSubmissionsForGrading } from "@/app/actions/eagle";
import { EagleGradingClient } from "./eagle-grading-client";

export const dynamic = "force-dynamic";

export default async function EagleGradingPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "moderator"].includes(me.role)) redirect("/dashboard");

  const res = await getEagleSubmissionsForGrading();
  const submissions = res.ok ? res.data : [];

  return <EagleGradingClient submissions={submissions} />;
}
