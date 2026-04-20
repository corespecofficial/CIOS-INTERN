import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyInvestorProfile } from "@/app/actions/investor";
import { InvestorOnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function InvestorOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-up?redirect_url=/investor/onboarding");

  const sp = await searchParams;
  const isEditing = sp.edit === "1";

  const res = await getMyInvestorProfile();
  const existing = res.ok && res.data ? res.data : null;

  // If they've already onboarded and aren't explicitly editing (?edit=1),
  // send them straight to the dashboard. Stops the "fill the form every
  // time I land here" loop.
  if (existing && !isEditing) redirect("/investor/dashboard");

  return <InvestorOnboardingClient existing={existing} userName={me.name} isEditing={isEditing} />;
}
