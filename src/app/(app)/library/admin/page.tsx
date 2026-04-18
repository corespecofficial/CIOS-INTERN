import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getAdminLibraryItems } from "@/app/actions/library";
import { LibraryAdminClient } from "./library-admin-client";

export const dynamic = "force-dynamic";

export default async function LibraryAdminPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "instructor"].includes(me.role)) redirect("/library");

  const res = await getAdminLibraryItems();

  return <LibraryAdminClient items={res.ok ? res.data : []} userRole={me.role} />;
}
