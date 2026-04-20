import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOpportunity } from "@/app/actions/opportunities";
import { getCurrentDbUser } from "@/lib/db";
import { OpportunityDetailClient } from "./opportunity-detail-client";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await getOpportunity(id);
  if (!res.ok || !res.data) return { title: "Opportunity not found · CIOS" };
  const o = res.data as Record<string, unknown>;
  const rp = (o.recruiter_profile as { company_name?: string } | null);
  const company = rp?.company_name || "CIOS Recruiter";
  const title = `${o.title as string} at ${company} · CIOS Opportunities`;
  const description = String(o.description || "").slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/opportunities/${o.id}` },
    openGraph: {
      title: `${o.title} at ${company}`,
      description,
      type: "website",
      url: `${SITE}/opportunities/${o.id}`,
      images: o.cover_image_url ? [{ url: String(o.cover_image_url) }] : undefined,
    },
  };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, me] = await Promise.all([getOpportunity(id), getCurrentDbUser()]);
  if (!res.ok || !res.data) return notFound();
  const o = res.data as Record<string, unknown>;

  // schema.org JobPosting for rich Google results
  const jsonLd = buildJobPostingLd(o, SITE);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <OpportunityDetailClient opp={o as never} userRole={me?.role ?? null} />
    </>
  );
}

function buildJobPostingLd(o: Record<string, unknown>, site: string): Record<string, unknown> {
  const rp = (o.recruiter_profile as { company_name?: string; company_website?: string; company_logo_url?: string } | null);
  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: o.title,
    description: o.description,
    datePosted: o.created_at,
    ...(o.deadline ? { validThrough: o.deadline } : {}),
    employmentType: mapEmployment(String(o.kind || "job")),
    hiringOrganization: {
      "@type": "Organization",
      name: rp?.company_name || "CIOS Recruiter",
      ...(rp?.company_website ? { sameAs: rp.company_website } : {}),
      ...(rp?.company_logo_url ? { logo: rp.company_logo_url } : {}),
    },
    jobLocation: o.remote
      ? { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "Remote" } }
      : o.location
        ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: String(o.location) } }
        : undefined,
    ...(o.remote ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(o.salary_min || o.salary_max
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: String(o.salary_currency || "NGN"),
            value: {
              "@type": "QuantitativeValue",
              ...(o.salary_min ? { minValue: o.salary_min } : {}),
              ...(o.salary_max ? { maxValue: o.salary_max } : {}),
              unitText: String(o.salary_period || "MONTH").toUpperCase(),
            },
          },
        }
      : {}),
    url: `${site}/opportunities/${o.id}`,
    ...(Array.isArray(o.skills) && (o.skills as string[]).length > 0 ? { skills: (o.skills as string[]).join(", ") } : {}),
  };
}

function mapEmployment(kind: string): string {
  switch (kind) {
    case "internship": return "INTERN";
    case "gig": return "CONTRACTOR";
    case "volunteer": return "VOLUNTEER";
    case "project": return "CONTRACTOR";
    default: return "FULL_TIME";
  }
}
