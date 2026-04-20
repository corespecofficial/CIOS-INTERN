import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyInvestorProfile } from "@/app/actions/investor";
import { InvestorOnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function InvestorOnboardingPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-up?redirect_url=/investor/onboarding");

  const res = await getMyInvestorProfile();
  const existing = res.ok && res.data ? res.data : null;
  return <InvestorOnboardingClient existing={existing} userName={me.name} />;
}
