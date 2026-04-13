import { getPendingSubmissionsForInstructor } from "@/lib/db";
import { SubmissionsClient } from "./submissions-client";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const rows = await getPendingSubmissionsForInstructor();
  return <SubmissionsClient initial={rows} />;
}
