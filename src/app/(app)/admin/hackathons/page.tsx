import { listHackathons } from "@/app/actions/hackathons";
import { AdminHackathonsClient } from "./admin-hackathons-client";
export const dynamic = "force-dynamic";
export default async function AdminHackathonsPage() {
  const res = await listHackathons();
  return <AdminHackathonsClient hackathons={res.ok ? res.data! : []} />;
}
