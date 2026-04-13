import { getStudentAnalytics, getCurrentDbUser } from "@/lib/db";
import { MyAnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function MyAnalyticsPage() {
  const [me, analytics] = await Promise.all([getCurrentDbUser(), getStudentAnalytics()]);
  return <MyAnalyticsClient analytics={analytics} userName={me?.name || "Student"} />;
}
