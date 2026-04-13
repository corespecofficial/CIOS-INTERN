import { getRecruiterKPIs } from "@/app/actions/recruiter";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const res = await getRecruiterKPIs();
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📈 Reports</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Hiring performance, time-to-hire, and exports</p>
      </div>
      <ReportsClient kpis={res.ok ? res.data! : null} />
    </div>
  );
}
