import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyCareerPath } from "@/app/actions/career-path";
import CareerPathClient from "./career-path-client";

export const dynamic = "force-dynamic";

export default async function CareerPathPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getMyCareerPath();
  return <CareerPathClient initialPath={res.ok ? res.data ?? null : null} />;
}
