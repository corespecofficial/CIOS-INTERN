import { listRecruiterInterviews } from "@/app/actions/recruiter";
import { InterviewsClient } from "./interviews-client";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const res = await listRecruiterInterviews();
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🎯 Interviews</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Schedule, track, and record outcomes</p>
      </div>
      <InterviewsClient interviews={res.ok ? res.data! : []} />
    </div>
  );
}
