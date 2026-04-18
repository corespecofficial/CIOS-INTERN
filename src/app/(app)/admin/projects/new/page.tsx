import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { ProjectBuilderClient } from "./project-builder-client";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "moderator"].includes(me.role)) redirect("/dashboard");

  return <ProjectBuilderClient mode="create" />;
}
