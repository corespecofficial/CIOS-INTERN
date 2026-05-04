import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrgEntryStatus } from "@/lib/active-org";
import { StudentNav } from "./student-nav";
import { MobileDrawer } from "@/components/portal/mobile-drawer";

export const dynamic = "force-dynamic";

export default async function StudentOrgLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const status = await getOrgEntryStatus(orgSlug);

  if (!status.ok) {
    if (status.failure.kind === "not_found" || status.failure.kind === "signed_out") notFound();
    return <OrgUnavailable failure={status.failure} />;
  }

  const ctx = status.ctx;
  // /s/<slug> is open to anyone in the org — students, instructors, and
  // owners (so a host can preview what their students see). Super-admin
  // can preview too via the existing bypass.
  if (!ctx.isSuperAdmin && !ctx.memberRole) notFound();

  return (
    <>
      <StudentNav orgSlug={ctx.org.slug} orgName={ctx.org.name} />
      <MobileDrawer />
      <main data-portal-main style={{ marginLeft: 240, padding: "32px 40px", minHeight: "100dvh" }}>
        {children}
      </main>
    </>
  );
}

function OrgUnavailable({ failure }: { failure: { kind: "suspended" | "archived"; org: { name: string; slug: string } } }) {
  const isSuspended = failure.kind === "suspended";
  const tint = isSuspended ? "#FFA726" : "#5A6478";
  return (
    <div style={{ minHeight: "100dvh", background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 520, background: "#111827", border: `1px solid ${tint}55`, borderRadius: 16, padding: 32, textAlign: "center", color: "#E8EDF5" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{isSuspended ? "⏸" : "🗄"}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
          {isSuspended ? "This class is paused" : "This class has ended"}
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: "0 0 20px" }}>
          <strong style={{ color: "#E8EDF5" }}>{failure.org.name}</strong> is currently {failure.kind}.
          {isSuspended
            ? " Your instructor will let you know when class resumes."
            : " You can still view past content via your other classes."}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/s" style={{ padding: "10px 20px", background: "transparent", color: tint, border: `1px solid ${tint}55`, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            ← My classes
          </Link>
          <Link href="/visitor" style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            Back to CIOS
          </Link>
        </div>
      </div>
    </div>
  );
}
