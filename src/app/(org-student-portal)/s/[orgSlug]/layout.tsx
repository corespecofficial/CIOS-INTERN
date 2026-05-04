import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { StudentNav } from "./student-nav";

export const dynamic = "force-dynamic";

export default async function StudentOrgLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  // /s/<slug> is open to anyone in the org — students, instructors, and
  // owners (so a host can preview what their students see). Super-admin
  // can preview too via the existing bypass.
  if (!ctx.isSuperAdmin && !ctx.memberRole) notFound();

  return (
    <>
      <StudentNav orgSlug={ctx.org.slug} orgName={ctx.org.name} />
      <main style={{ marginLeft: 240, padding: "32px 40px", minHeight: "100dvh" }}>
        {children}
      </main>
    </>
  );
}
