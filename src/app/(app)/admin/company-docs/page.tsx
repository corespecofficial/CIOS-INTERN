import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getAllCompanyDocs } from "@/app/actions/company-library";
import CompanyDocsClient from "./company-docs-client";

export const dynamic = "force-dynamic";

export default async function AdminCompanyDocsPage() {
  const me = await getCurrentDbUser();
  if (!me || !["admin", "super_admin"].includes(me.role)) {
    redirect("/dashboard");
  }

  const res = await getAllCompanyDocs();
  const docs = res.ok ? (res.data ?? []) : [];

  return <CompanyDocsClient initialDocs={docs} />;
}
