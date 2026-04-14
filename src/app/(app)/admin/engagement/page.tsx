import { BackBar } from "@/components/back-bar";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getEngagementFeatures } from "@/app/actions/engagement-v2";
import { EngagementSettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function AdminEngagementPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "moderator"].includes(me.role)) redirect("/dashboard");
  const features = await getEngagementFeatures();
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/dashboard" label="Back" />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🎛 Engagement controls</h1>
      <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 20px" }}>
        Toggle features on or off for every intern. Changes go live immediately.
      </p>
      <EngagementSettingsClient initial={features} />
    </div>
  );
}
