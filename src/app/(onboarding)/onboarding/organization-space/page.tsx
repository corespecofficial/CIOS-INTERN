/* eslint-disable @next/next/no-img-element */

import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { ApplySpaceClient } from "@/app/(public-portal)/creative-space/apply/apply-space-client";

export const dynamic = "force-dynamic";

const LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

export default async function OrganizationSpaceOnboardingPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/onboarding/organization-space");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0A0E1A",
        color: "#E8EDF5",
        fontFamily: "'Nunito', system-ui, sans-serif",
        padding: "44px 20px 72px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto 28px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.10)" }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.10)" }} />
          <div style={{ width: 28, height: 8, borderRadius: 4, background: "#26C6DA" }} />
        </div>

        <img
          src={LOGO}
          alt="CIOS"
          width={78}
          height={78}
          style={{
            width: 78,
            height: 78,
            borderRadius: "50%",
            objectFit: "cover",
            display: "inline-block",
            boxShadow: "0 0 0 8px rgba(38,198,218,0.08)",
          }}
        />
        <h1
          style={{
            margin: "18px 0 8px",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 30,
            fontWeight: 900,
          }}
        >
          Create your organization space
        </h1>
        <p style={{ margin: "0 auto", maxWidth: 620, color: "#8892A4", fontSize: 14, lineHeight: 1.6 }}>
          Hey {me.name.split(" ")[0] || "there"}, tell us what you are building.
          CIOS will provision the private staff portal and intern portal after submission.
        </p>
      </div>

      <ApplySpaceClient />
    </div>
  );
}
