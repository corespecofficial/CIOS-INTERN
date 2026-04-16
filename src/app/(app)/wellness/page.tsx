import { getMyCheckins, hasCheckedInThisWeek } from "@/app/actions/wellness";
import { WellnessClient } from "./wellness-client";
export const dynamic = "force-dynamic";
export default async function WellnessPage() {
  const [checkinsRes, doneThisWeek] = await Promise.all([
    getMyCheckins(12),
    hasCheckedInThisWeek(),
  ]);
  return <WellnessClient checkins={checkinsRes.ok ? checkinsRes.data! : []} doneThisWeek={doneThisWeek} />;
}
