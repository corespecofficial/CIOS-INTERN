"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const ACCENT = "#FB923C";
const INK = "#F8FAFC";
const DIM = "#94A3B8";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]/i;

const PAGE_LABELS: Record<string, { title: string; sub: string }> = {
  recruiter:        { title: "Hub",             sub: "Your hiring command centre" },
  dashboard:        { title: "Dashboard",       sub: "Live KPIs across all your listings" },
  opportunities:    { title: "Opportunities",   sub: "Listings + applicant funnel" },
  "talent-pool":    { title: "Talent Pool",     sub: "Discover vetted CIOS candidates" },
  talent:           { title: "Candidate",       sub: "Verified CIOS performance profile" },
  interviews:       { title: "Interviews",      sub: "Schedule, run, and rate" },
  placements:       { title: "Placements",      sub: "Confirmed hires + placement fees" },
  messages:         { title: "Messages",        sub: "Threads with applicants and team" },
  notifications:    { title: "Notifications",   sub: "Activity across your portal" },
  reports:          { title: "Reports",         sub: "Hiring funnel + team analytics" },
  billing:          { title: "Billing",         sub: "Plan, usage and invoices" },
  profile:          { title: "Company Profile", sub: "How candidates see you" },
  settings:         { title: "Settings",        sub: "Account + privacy + integrations" },
  onboarding:       { title: "Welcome",         sub: "Set up your company profile" },
};

function getPage(pathname: string | null): { title: string; sub: string } {
  if (!pathname) return PAGE_LABELS.recruiter;
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0 || segs[0] !== "recruiter") return PAGE_LABELS.recruiter;
  if (segs.length === 1) return PAGE_LABELS.recruiter;
  let key = segs[segs.length - 1];
  if (UUID_RE.test(key)) key = segs[segs.length - 2] ?? "recruiter";
  return PAGE_LABELS[key] ?? { title: prettify(key), sub: "" };
}

function prettify(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * RecruiterHeader — sticky in-area top bar.
 *
 * Visually consistent with the PublicPortalHeader used across Marketplace,
 * Creative Spaces and Opportunities: same blurred translucent background,
 * same border treatment, same height rhythm. Content differs (page title
 * + actions instead of centered nav) because the recruiter portal already
 * has a sidebar handling navigation.
 */
export function RecruiterHeader() {
  const pathname = usePathname();
  const page = getPage(pathname);
  const onOpps = pathname?.startsWith("/recruiter/opportunities") ?? false;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        marginLeft: -24,
        marginRight: -24,
        marginTop: -24,
        marginBottom: 22,
        background: "rgba(10,14,26,0.88)",
        backdropFilter: "saturate(140%) blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: ACCENT,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Recruiter portal
          </div>
          <h1
            style={{
              margin: "2px 0 0",
              fontSize: 18,
              fontWeight: 800,
              color: INK,
              letterSpacing: -0.3,
              fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {page.title}
            {page.sub && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 12,
                  color: DIM,
                  fontWeight: 500,
                }}
              >
                {page.sub}
              </span>
            )}
          </h1>
        </div>

        <div className="rh-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!onOpps && (
            <Link
              href="/recruiter/opportunities"
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: `linear-gradient(135deg, ${ACCENT}, #F97316)`,
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 8px 22px -8px rgba(251,146,60,0.55)",
                whiteSpace: "nowrap",
              }}
            >
              + New listing
            </Link>
          )}
          <Link
            href="/opportunities"
            className="rh-public"
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              color: DIM,
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Public board ↗
          </Link>
          <Link
            href="/recruiter/notifications"
            aria-label="Notifications"
            className="rh-bell"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: DIM,
              textDecoration: "none",
              fontSize: 16,
            }}
          >
            🔔
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingLeft: 6,
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              marginLeft: 4,
              height: 28,
            }}
          >
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .rh-public { display: none; }
        }
        @media (max-width: 480px) {
          .rh-bell { display: none; }
        }
      `}</style>
    </header>
  );
}
