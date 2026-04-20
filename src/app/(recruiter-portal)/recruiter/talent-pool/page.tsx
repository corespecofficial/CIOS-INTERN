import { listTalent } from "@/app/actions/talent";
import { TalentClient } from "@/app/(recruiter-portal)/talent/talent-client";
import { TalentAlertsPanel } from "@/components/recruiter/talent-alerts-panel";

export const dynamic = "force-dynamic";

export default async function RecruiterTalentPoolPage() {
  const res = await listTalent({ limit: 80 });
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🌟 Talent Pool</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Search verified CIOS interns ranked by real performance</p>
      </div>
      <TalentAlertsPanel />
      <div style={{ marginTop: 20 }}>
        <TalentClient initial={res.ok ? res.data! : []} />
      </div>
    </div>
  );
}
