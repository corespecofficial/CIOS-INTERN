import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getRecruiterDashboard } from "@/app/actions/opportunities";
import { RecruiterClient } from "./recruiter-client";

export const dynamic = "force-dynamic";

export default async function RecruiterPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") redirect("/opportunities");

  const res = await getRecruiterDashboard();
  const data = res.ok ? res.data! : { profile: null, listings: [], stats: { open: 0, applications: 0, shortlisted: 0, hires: 0 } };

  return <RecruiterClient profile={data.profile} listings={data.listings} stats={data.stats} />;
}
