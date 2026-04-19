import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyCompany, listCompanyPlacements } from "@/app/actions/company-portal";
import CompanyPortalClient from "./company-portal-client";

export const dynamic = "force-dynamic";

export default async function CompanyPortalPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const coRes = await getMyCompany();
  const co = coRes.ok ? coRes.data ?? null : null;
  let placements = [];
  if (co) {
    const pRes = await listCompanyPlacements(co.id);
    if (pRes.ok) placements = pRes.data ?? [];
  }
  return <CompanyPortalClient company={co} initialPlacements={placements} />;
}
