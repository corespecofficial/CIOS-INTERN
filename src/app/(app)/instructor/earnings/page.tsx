import { getInstructorEarnings } from "@/app/actions/instructor-earnings";
import EarningsClient from "./earnings-client";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const res = await getInstructorEarnings();

  if (!res.ok) {
    return (
      <div style={{ padding: 32, color: "#EF5350", fontFamily: "sans-serif" }}>
        Failed to load earnings: {res.error}
      </div>
    );
  }

  return <EarningsClient data={res.data} />;
}
