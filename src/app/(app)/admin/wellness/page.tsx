import { adminGetWellnessAggregates } from "@/app/actions/wellness";
import { AdminWellnessClient } from "./admin-wellness-client";
export const dynamic = "force-dynamic";
export default async function AdminWellnessPage() {
  const res = await adminGetWellnessAggregates(12);
  return <AdminWellnessClient aggregates={res.ok ? res.data! : []} />;
}
