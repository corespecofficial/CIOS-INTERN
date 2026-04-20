import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyProducts, getMyPurchases } from "@/app/actions/marketplace";
import { SellerDashboardClient } from "./seller-dashboard-client";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  // /marketplace/sell is the one sub-route that requires auth — middleware
  // already enforces this, but the server component guards defensively.
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/marketplace/sell");

  const [myProducts, myPurchases] = await Promise.all([getMyProducts(), getMyPurchases()]);
  return (
    <SellerDashboardClient
      products={myProducts.ok ? myProducts.data! : []}
      purchases={myPurchases.ok ? myPurchases.data! : []}
    />
  );
}
