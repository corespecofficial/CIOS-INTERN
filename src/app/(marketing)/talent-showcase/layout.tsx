import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios.cospronos.com";

export const metadata: Metadata = {
  title: "Talent Showcase · CIOS",
  description: "Browse verified AI-native interns across design, development, marketing, content, and AI tracks — evidence-based hires for forward-leaning teams.",
  alternates: { canonical: `${SITE}/talent-showcase` },
  openGraph: {
    title: "CIOS Talent Showcase",
    description: "Verified AI-native interns, searchable by track and skill.",
    url: `${SITE}/talent-showcase`,
    type: "website",
    images: [{ url: `${SITE}/icon-512.png`, width: 512, height: 512 }],
  },
  twitter: { card: "summary_large_image", title: "CIOS Talent Showcase", description: "Verified AI-native interns." },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
