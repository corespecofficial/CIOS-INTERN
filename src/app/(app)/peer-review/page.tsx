import { BackBar } from "@/components/back-bar";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { PeerReviewClient } from "./peer-review-client";

export const dynamic = "force-dynamic";

export default async function PeerReviewPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/dashboard" label="Back" />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📝 Peer review</h1>
      <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 20px" }}>
        Review submissions from your peers and see feedback on your own work. Thoughtful reviews earn XP.
      </p>
      <PeerReviewClient />
    </div>
  );
}
