import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyOrg, listEmployees, listPrograms } from "@/app/actions/corporate";
import CorporateClient from "./corporate-client";

export const dynamic = "force-dynamic";

export default async function CorporatePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const orgRes = await getMyOrg();
  const org = orgRes.ok ? orgRes.data ?? null : null;
  let employees = [];
  let programs = [];
  if (org) {
    const [empRes, progRes] = await Promise.all([listEmployees(org.id), listPrograms(org.id)]);
    if (empRes.ok) employees = empRes.data ?? [];
    if (progRes.ok) programs = progRes.data ?? [];
  }

  return <CorporateClient org={org} initialEmployees={employees} initialPrograms={programs} />;
}
