import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { ApplySpaceClient } from "./apply-space-client";

export const dynamic = "force-dynamic";

export default async function ApplySpacePage() {
  // Applying to host a space requires an account. Anyone signed in can apply —
  // super admin approves the space (and implicitly the teaching role).
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/creative-space/apply");
  return <ApplySpaceClient />;
}
