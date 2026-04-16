import { auth } from "@clerk/nextjs/server";
import { listPublicPitches, getPlatformStats } from "@/app/actions/startup";
import { InvestorsClient } from "./investors-client";

// Revalidate every hour — pitch list doesn't change second-by-second
export const revalidate = 3600;

export default async function InvestorsPage() {
  const { userId } = await auth();
  const [pitchesRes, statsRes] = await Promise.all([
    listPublicPitches({ limit: 30 }),
    getPlatformStats(),
  ]);
  return (
    <InvestorsClient
      isLoggedIn={!!userId}
      pitches={pitchesRes.ok ? pitchesRes.data! : []}
      stats={statsRes.ok ? statsRes.data! : { interns: 0, alumni: 0, placements: 0, countries: 0, hackathons: 0 }}
    />
  );
}
