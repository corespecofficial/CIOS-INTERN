import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listStoreItems, getMyRedemptions } from "@/app/actions/reward-store";
import RewardStoreClient from "./reward-store-client";

export const dynamic = "force-dynamic";

export default async function RewardStorePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [itemsRes, redemptionsRes] = await Promise.all([listStoreItems(), getMyRedemptions()]);
  return (
    <RewardStoreClient
      items={itemsRes.ok ? itemsRes.data ?? [] : []}
      redemptions={redemptionsRes.ok ? redemptionsRes.data ?? [] : []}
      myPoints={Number(me.xp ?? 0)}
    />
  );
}
