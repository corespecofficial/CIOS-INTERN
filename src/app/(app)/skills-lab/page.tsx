import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listAssessments, getMyAttempts } from "@/app/actions/skills-lab";
import SkillsLabClient from "./skills-lab-client";

export const dynamic = "force-dynamic";

export default async function SkillsLabPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [listRes, attemptsRes] = await Promise.all([listAssessments(), getMyAttempts()]);
  const list = listRes.ok ? (listRes.data ?? []) : [];
  const attempts = attemptsRes.ok ? (attemptsRes.data ?? []) : [];
  return <SkillsLabClient assessments={list} attempts={attempts} />;
}
