import { listHackathons } from "@/app/actions/hackathons";
import { HackathonsClient } from "./hackathons-client";
// Revalidate every 5 minutes — hackathon list changes infrequently
export const revalidate = 300;
export default async function HackathonsPage() {
  const res = await listHackathons();
  return <HackathonsClient hackathons={res.ok ? res.data! : []} />;
}
