import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyWrapped } from "@/app/actions/wrapped";
import WrappedClient from "./wrapped-client";

export const dynamic = "force-dynamic";

export default async function WrappedPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getMyWrapped();
  if (!res.ok) {
    return (
      <div style={{ padding: 32, color: "#EF5350" }}>
        Failed to load wrapped: {res.error}
      </div>
    );
  }
  return <WrappedClient data={res.data} />;
}
