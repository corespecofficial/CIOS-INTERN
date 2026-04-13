import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { ProfileEditorClient } from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function RecruiterProfilePage() {
  const me = await getCurrentDbUser();
  const { data: profile } = await supabaseAdmin().from("recruiter_profiles").select("*").eq("user_id", me!.id).maybeSingle();

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🏢 Company & recruiter profile</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>This is what candidates see on every opportunity you post.</p>
      </div>
      <ProfileEditorClient initial={(profile as Record<string, unknown> | null) || null} />
    </div>
  );
}
