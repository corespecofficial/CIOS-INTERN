import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { CvWizard } from "./cv-wizard";

export const dynamic = "force-dynamic";

export default async function CvWizardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/documents/app/cv");

  let me = await getCurrentDbUser();
  if (!me) {
    const repair = await ensureCurrentDbUser();
    if (repair.ok) me = await getCurrentDbUser();
  }
  if (!me) redirect("/sign-in?redirect_url=/documents/app/cv");

  const firstName = (me.name || "there").split(" ")[0];
  return <CvWizard firstName={firstName} seedEmail={me.email} />;
}
