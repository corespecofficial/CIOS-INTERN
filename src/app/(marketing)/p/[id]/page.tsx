import { notFound } from "next/navigation";
import { getPortfolio } from "@/app/actions/portfolio";
import PortfolioClient from "./portfolio-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const res = await getPortfolio(id);
  if (!res.ok) return { title: "Portfolio — CIOS Intern" };
  const p = res.data;
  return {
    title: `${p.name} — Portfolio | CIOS Intern`,
    description: p.headline || `${p.name} is a verified CIOS intern with ${p.projects_count} projects and ${p.certificates_count} certificates.`,
    openGraph: {
      title: `${p.name}'s Portfolio`,
      description: p.headline || `Verified CIOS intern · ${p.performance_score}/100 score · ${p.courses_completed} courses`,
      images: p.avatar_url ? [p.avatar_url] : [],
    },
  };
}

export default async function PortfolioPage({ params }: Props) {
  const { id } = await params;
  const res = await getPortfolio(id);
  if (!res.ok) notFound();
  return <PortfolioClient data={res.data} />;
}
