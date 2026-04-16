import { listProducts } from "@/app/actions/marketplace";
import { MarketplaceClient } from "./marketplace-client";
// Revalidate every 60 seconds — product listings update moderately
export const revalidate = 60;
export default async function MarketplacePage() {
  const res = await listProducts({ limit: 60 });
  return <MarketplaceClient products={res.ok ? res.data! : []} />;
}
