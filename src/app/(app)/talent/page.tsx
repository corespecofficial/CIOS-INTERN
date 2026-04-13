import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listTalent } from "@/app/actions/talent";
import { TalentClient } from "./talent-client";

export const dynamic = "force-dynamic";

export default async function TalentPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") redirect("/opportunities");
  const res = await listTalent({ limit: 80 });
  return <TalentClient initial={res.ok ? res.data! : []} />;
}
