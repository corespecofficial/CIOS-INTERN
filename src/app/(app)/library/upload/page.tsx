import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getLibraryCategories } from "@/app/actions/library";
import { LibraryUploadClient } from "./library-upload-client";

export const dynamic = "force-dynamic";

export default async function LibraryUploadPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "instructor"].includes(me.role)) redirect("/library");

  const catsRes = await getLibraryCategories();

  return <LibraryUploadClient categories={catsRes.ok ? catsRes.data : []} />;
}
