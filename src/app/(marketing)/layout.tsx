import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.netlify.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "COSPRONOS Media",
      url: SITE,
      logo: `${SITE}/icon-512.png`,
      description: "AI-powered internship operating system by COSPRONOS Media × Corespec Engineering.",
      sameAs: ["https://twitter.com/cospronos", "https://linkedin.com/company/cospronos"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      url: SITE,
      name: "CIOS — COSPRONOS Internship Operating System",
      publisher: { "@id": `${SITE}/#org` },
      potentialAction: { "@type": "SearchAction", target: `${SITE}/?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
    {
      "@type": "EducationalOrganization",
      name: "CIOS Internship Program",
      url: SITE,
      description: "6-month AI-powered internship: digital skills, real projects, performance scoring, and monetary rewards.",
      address: { "@type": "PostalAddress", addressCountry: "NG", addressLocality: "Lagos" },
    },
  ],
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 2, height: 2, background: "#fff", borderRadius: "50%",
            left: `${(i * 37 + 13) % 100}%`, top: `${(i * 53 + 7) % 100}%`,
            opacity: 0.08 + (i % 5) * 0.06,
            animation: `cios-pulse ${2 + (i % 4)}s ease-in-out infinite ${(i % 7) * 0.5}s`,
          }} />
        ))}
      </div>
      <MarketingHeader />
      <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
      <MarketingFooter />
      <style>{`
        @keyframes cios-pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.6; } }
        @keyframes cios-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes cios-reveal { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
