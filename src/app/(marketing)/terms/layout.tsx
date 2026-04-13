import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios.cospronos.com";

export const metadata: Metadata = {
  title: "Terms & Policies · CIOS",
  description: "Terms of Service, Privacy Policy, and Fine Policy for the CIOS internship program.",
  alternates: { canonical: `${SITE}/terms` },
  robots: { index: true, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
