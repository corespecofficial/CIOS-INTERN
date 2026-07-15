import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { listPublicEnrollmentCodes } from "@/app/actions/enrollment-codes";
import { ClassCodesPanel } from "./class-codes-panel";
import { settleFlutterwaveReturn } from "@/app/actions/payments/initiate-topup";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ subscription_ref?: string; tx_ref?: string; transaction_id?: string; status?: string }>;
}

export default async function SettingsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const query = await searchParams;
  const reference = query.subscription_ref || query.tx_ref;
  if (query.status === "successful" && reference && query.transaction_id) {
    await settleFlutterwaveReturn(reference, query.transaction_id);
  }
  const codesRes = await listPublicEnrollmentCodes(ctx.org.id);
  const codes = codesRes.ok ? codesRes.data! : [];

  const fields: { label: string; value: string }[] = [
    { label: "Org name", value: ctx.org.name },
    { label: "Slug", value: ctx.org.slug },
    { label: "Status", value: ctx.org.status },
    { label: "Plan", value: ctx.org.plan },
    { label: "Members", value: String(ctx.org.member_count) },
    { label: "Storage prefix", value: ctx.org.storage_prefix },
    { label: "Created", value: new Date(ctx.org.created_at).toLocaleString() },
  ];

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Settings</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 28px 0" }}>
        Editable settings ship in Phase 5. For now this is a read-only summary.
      </p>

      <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, overflow: "hidden" }}>
        {fields.map((f, i) => (
          <div
            key={f.label}
            style={{
              display: "flex",
              padding: "14px 18px",
              borderTop: i === 0 ? "none" : "1px solid #1F2937",
              fontSize: 13,
            }}
          >
            <div style={{ width: 160, color: "#5A6478", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {f.label}
            </div>
            <div style={{ flex: 1, color: "#E8EDF5", fontFamily: f.label === "Slug" || f.label === "Storage prefix" ? "ui-monospace, monospace" : "inherit" }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>

      {/* Public enrollment codes — admins generate these and share them
          on social posts; anyone with the code joins as a student. */}
      <ClassCodesPanel orgId={ctx.org.id} orgSlug={ctx.org.slug} initialCodes={codes} />
    </div>
  );
}
