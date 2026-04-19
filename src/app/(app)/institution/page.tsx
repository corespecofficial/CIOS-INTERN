import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyInstitution, listInstitutionStudents, getInstitutionStats } from "@/app/actions/institutions";
import InstitutionClient from "./institution-client";

export const dynamic = "force-dynamic";

export default async function InstitutionPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const instRes = await getMyInstitution();
  const inst = instRes.ok ? instRes.data ?? null : null;
  let students = [];
  let stats = null;
  if (inst) {
    const [sRes, stRes] = await Promise.all([listInstitutionStudents(inst.id), getInstitutionStats(inst.id)]);
    if (sRes.ok) students = sRes.data ?? [];
    if (stRes.ok) stats = stRes.data;
  }

  return <InstitutionClient institution={inst} initialStudents={students} stats={stats} />;
}
