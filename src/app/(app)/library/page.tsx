import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getLibraryItems, getLibraryCategories } from "@/app/actions/library";
import { LibraryHomeClient } from "./library-home-client";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [itemsRes, catsRes] = await Promise.all([
    getLibraryItems({ limit: 60 }),
    getLibraryCategories(),
  ]);

  return (
    <LibraryHomeClient
      items={itemsRes.ok ? itemsRes.data : []}
      categories={catsRes.ok ? catsRes.data : []}
      userRole={me.role}
    />
  );
}
