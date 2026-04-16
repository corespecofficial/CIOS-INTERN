import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { CreateTaskClient } from "./create-task-client";

export const dynamic = "force-dynamic";

export default async function CreateComplianceTaskPage() {
  const me = await getCurrentDbUser();
  if (!me || !["admin", "super_admin"].includes(me.role)) redirect("/dashboard");

  return <CreateTaskClient />;
}
