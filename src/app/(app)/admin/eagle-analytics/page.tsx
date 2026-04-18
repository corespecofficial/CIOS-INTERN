import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getEagleAnalytics, getEagleSubmissionsForGrading } from "@/app/actions/eagle";
import { EagleAnalyticsClient } from "./eagle-analytics-client";

export const dynamic = "force-dynamic";

export default async function EagleAnalyticsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "moderator"].includes(me.role)) redirect("/dashboard");

  const [analyticsRes, subsRes] = await Promise.all([
    getEagleAnalytics(),
    getEagleSubmissionsForGrading(),
  ]);

  const analytics = analyticsRes.ok ? analyticsRes.data : null;
  const submissions = subsRes.ok ? subsRes.data : [];

  return <EagleAnalyticsClient analytics={analytics} submissions={submissions} />;
}
