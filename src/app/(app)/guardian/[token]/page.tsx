import { getInternSummaryByToken } from "@/app/actions/guardian";
import { GuardianViewClient } from "./guardian-view-client";
export const dynamic = "force-dynamic";
export default async function GuardianViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await getInternSummaryByToken(token);
  if (!res.ok) {
    return (
      <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 8 }}>Link Invalid or Revoked</div>
        <div style={{ fontSize: 14, color: "#8892A4" }}>{res.error}</div>
      </div>
    );
  }
  return <GuardianViewClient intern={res.data!.intern} />;
}
