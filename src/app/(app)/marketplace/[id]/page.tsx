import { getProduct } from "@/app/actions/marketplace";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "./product-detail-client";
export const dynamic = "force-dynamic";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getProduct(id);
  if (!res.ok || !res.data) return notFound();
  return <ProductDetailClient product={res.data} />;
}
