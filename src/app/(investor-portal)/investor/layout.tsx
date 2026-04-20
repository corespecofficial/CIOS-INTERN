import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyInvestorProfile } from "@/app/actions/investor";
import { InvestorShell } from "./investor-shell";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/investor/dashboard");

  // Onboarding gate: if the user doesn't have an investor profile yet,
  // bounce them to onboarding. Admin/super_admin bypass for portal preview.
  const bypass = me.role === "admin" || me.role === "super_admin";
  if (!bypass) {
    const res = await getMyInvestorProfile();
    if (!res.ok || !res.data) redirect("/investor/onboarding");
  }

  return <InvestorShell>{children}</InvestorShell>;
}
