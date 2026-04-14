import { BackBar } from "@/components/back-bar";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listAllTemplates } from "@/app/actions/note-templates";
import { AdminTemplatesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminNoteTemplatesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin"].includes(me.role)) redirect("/dashboard");
  const res = await listAllTemplates();
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/dashboard" label="Back" />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📑 Note templates</h1>
      <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 20px" }}>
        Upload custom HTML templates. Active ones appear in every intern&apos;s Template Picker. Premium templates are gated to premium subscribers.
      </p>
      <AdminTemplatesClient initial={res.ok ? res.data! : []} />
    </div>
  );
}
