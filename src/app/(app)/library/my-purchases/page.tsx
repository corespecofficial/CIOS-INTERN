import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyLibraryPurchases } from "@/app/actions/library";
import { MyPurchasesClient } from "./my-purchases-client";

export const dynamic = "force-dynamic";

export default async function MyPurchasesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const res = await getMyLibraryPurchases();

  return <MyPurchasesClient items={res.ok ? res.data : []} />;
}
