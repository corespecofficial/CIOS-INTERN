import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicRecruiterProfile } from "@/app/actions/opportunities";
import { RecruiterPublicClient } from "./recruiter-public-client";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await getPublicRecruiterProfile(id);
  if (!res.ok || !res.data) return { title: "Recruiter not found · CIOS" };
  const p = res.data.profile as { company_name?: string; about?: string; company_logo_url?: string };
  const title = `${p.company_name || "CIOS Recruiter"} — Open roles on CIOS`;
  const description = (p.about || "Hiring through CIOS.").slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/opportunities/recruiter/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE}/opportunities/recruiter/${id}`,
      images: p.company_logo_url ? [{ url: p.company_logo_url }] : undefined,
    },
  };
}

export default async function RecruiterPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getPublicRecruiterProfile(id);
  if (!res.ok || !res.data) return notFound();
  return <RecruiterPublicClient profile={res.data.profile as never} listings={res.data.listings as never} />;
}
