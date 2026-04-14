import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export const metadata: Metadata = {
  title: "Verify Certificate · CIOS",
  description: "Instantly verify the authenticity of a CIOS intern certificate by ID.",
  alternates: { canonical: `${SITE}/verify` },
  openGraph: { title: "Verify a CIOS certificate", description: "Paste a certificate ID to confirm authenticity.", url: `${SITE}/verify`, type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
