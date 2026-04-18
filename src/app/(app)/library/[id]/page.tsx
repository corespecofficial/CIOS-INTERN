import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getLibraryItem, getLibraryReviews } from "@/app/actions/library";
import { LibraryItemClient } from "./library-item-client";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function LibraryItemPage({ params }: Props) {
  const { id } = await params;
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [itemRes, reviewsRes] = await Promise.all([
    getLibraryItem(id),
    getLibraryReviews(id),
  ]);

  if (!itemRes.ok) redirect("/library");

  return (
    <LibraryItemClient
      item={itemRes.data}
      reviews={reviewsRes.ok ? reviewsRes.data : []}
      userRole={me.role}
    />
  );
}
