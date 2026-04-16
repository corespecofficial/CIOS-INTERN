import { listMyPlacements, getPlacementStats } from "@/app/actions/placements";
import { PlacementsClient } from "./placements-client";
export const dynamic = "force-dynamic";
export default async function PlacementsPage() {
  const [placementsRes, statsRes] = await Promise.all([listMyPlacements(), getPlacementStats()]);
  return (
    <PlacementsClient
      placements={placementsRes.ok ? placementsRes.data! : []}
      stats={statsRes.ok ? statsRes.data! : { total_placements: 0, total_fees_pending: 0, total_fees_paid: 0, avg_salary: 0 }}
    />
  );
}
