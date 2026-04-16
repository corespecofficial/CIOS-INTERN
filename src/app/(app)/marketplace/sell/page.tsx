import { getMyProducts, getMyPurchases } from "@/app/actions/marketplace";
import { SellerDashboardClient } from "./seller-dashboard-client";
export const dynamic = "force-dynamic";
export default async function SellerDashboardPage() {
  const [myProducts, myPurchases] = await Promise.all([getMyProducts(), getMyPurchases()]);
  return (
    <SellerDashboardClient
      products={myProducts.ok ? myProducts.data! : []}
      purchases={myPurchases.ok ? myPurchases.data! : []}
    />
  );
}
