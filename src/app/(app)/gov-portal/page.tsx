import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyOfficerProfile, listAgencies, getNationalStats } from "@/app/actions/gov-portal";
import GovPortalClient from "./gov-portal-client";

export const dynamic = "force-dynamic";

export default async function GovPortalPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [officerRes, agenciesRes, statsRes] = await Promise.all([
    getMyOfficerProfile(),
    listAgencies(),
    getNationalStats(),
  ]);
  return (
    <GovPortalClient
      officer={officerRes.ok ? officerRes.data : null}
      agencies={agenciesRes.ok ? agenciesRes.data : []}
      stats={statsRes.ok ? statsRes.data : null}
    />
  );
}
