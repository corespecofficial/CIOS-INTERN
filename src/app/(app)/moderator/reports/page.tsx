import { ReportsQueue } from "./reports-client";
import { listReports } from "@/app/actions/community";

export const dynamic = "force-dynamic";

export default async function ModeratorReportsPage() {
  const r = await listReports("open");
  return <ReportsQueue initial={r.ok ? r.data || [] : []} />;
}
