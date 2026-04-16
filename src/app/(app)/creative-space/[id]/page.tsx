import { getSpace } from "@/app/actions/creative-spaces";
import { notFound } from "next/navigation";
import { SpaceDetailClient } from "./space-detail-client";
export const dynamic = "force-dynamic";
export default async function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getSpace(id);
  if (!res.ok || !res.data) return notFound();
  return <SpaceDetailClient space={res.data} />;
}
