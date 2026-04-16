import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · CIOS",
  description: "How CIOS Platform collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      body: `We collect information you provide directly:
• Account registration: name, email address, phone number, country of residence
• Profile data: skills, education, work experience, portfolio links, profile photo
• Program activity: task submissions, attendance records, assessment scores, XP points
• Financial data: wallet transactions, payment history (processed via secure third-party providers)
• Communications: messages sent within the platform, support requests

We automatically collect:
• Device information: browser type, operating system, device identifiers
• Usage data: pages visited, features used, time spent, click patterns
• Log data: IP addresses, access times, error reports`,
    },
    {
      title: "2. How We Use Your Information",
      body: `We use your information to:
• Operate and improve the CIOS Platform and internship program
• Match interns with recruiters and employment opportunities
• Process payments, fines, and reward distributions
• Generate performance analytics and progress reports
• Send program updates, compliance notifications, and alerts
• Provide AI-powered features (resume generation, interview prep, plagiarism detection)
• Comply with legal obligations in Nigeria and applicable jurisdictions
• Prevent fraud, abuse, and violations of our terms`,
    },
    {
      title: "3. Data Sharing",
      body: `We share your data with:
• Verified recruiters: public profile data when you apply for opportunities or opt into talent search
• Program administrators: all performance data for program management
• Service providers: Supabase (database), Clerk (authentication), Cloudinary (file storage), OpenAI (AI features) — all under data processing agreements
• Legal authorities: when required by law, court order, or government request

We do NOT sell your personal data to third parties.`,
    },
    {
      title: "4. Talent Profiles & Public Data",
      body: `Your public talent profile (visible at /talent/[id]) includes: name, skills, track, achievement badges, portfolio links, and testimonials you choose to display. You can control profile visibility in your account settings.

Recruiters on the platform can search and view public profiles. Applying for opportunities shares your full profile with that specific recruiter.`,
    },
    {
      title: "5. Data Retention",
      body: `• Active accounts: data retained for the duration of your account
• After program completion: alumni profiles retained indefinitely unless deletion is requested
• After account deletion: most data deleted within 30 days; financial records retained 7 years for legal compliance
• Anonymized analytics may be retained indefinitely`,
    },
    {
      title: "6. Your Rights",
      body: `Depending on your jurisdiction, you may have rights to:
• Access: request a copy of your personal data
• Correction: update inaccurate or incomplete data (via profile settings)
• Deletion: request erasure of your account and data
• Portability: receive your data in a machine-readable format
• Restriction: limit how we process your data
• Objection: object to certain types of processing

To exercise these rights, email: privacy@cospronos.com or use the contact form at /contact.`,
    },
    {
      title: "7. Security",
      body: `We implement industry-standard security measures:
• All data transmitted via HTTPS/TLS encryption
• Database access controlled via row-level security (Supabase RLS)
• Authentication managed by Clerk with multi-factor authentication support
• Regular security audits and penetration testing
• Staff access to personal data limited by role-based permissions

No system is 100% secure. Please use a strong password and enable 2FA on your account.`,
    },
    {
      title: "8. Cookies",
      body: `We use cookies and similar technologies for:
• Authentication: keeping you signed in across sessions
• Preferences: remembering your language and UI settings
• Analytics: understanding how the platform is used (aggregated, not individual tracking)

You can control cookies through your browser settings. Disabling essential cookies may impair platform functionality.`,
    },
    {
      title: "9. International Transfers",
      body: `CIOS is operated from Nigeria. Your data may be processed in countries where our service providers operate (including the USA and EU). We ensure appropriate safeguards are in place for such transfers through data processing agreements with our providers.`,
    },
    {
      title: "10. Changes to This Policy",
      body: `We may update this Privacy Policy periodically. When we make significant changes, we will notify you via email and in-platform notification at least 14 days before changes take effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy.`,
    },
    {
      title: "11. Contact",
      body: `For privacy-related questions or to exercise your rights:
• Email: privacy@cospronos.com
• Contact form: cios-intern.vercel.app/contact
• Postal: COSPRONOS Media, Lagos, Nigeria

Data Controller: COSPRONOS Media
Last updated: April 2026`,
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 80px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ display: "inline-block", padding: "4px 14px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 16 }}>LEGAL</span>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px", lineHeight: 1.1 }}>Privacy Policy</h1>
        <p style={{ fontSize: 15, color: "#8892A4", margin: 0 }}>Effective date: April 1, 2026 · Last updated: April 16, 2026</p>
      </div>

      {/* Intro */}
      <div style={{ padding: "20px 24px", borderRadius: 12, background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.2)", marginBottom: 40 }}>
        <p style={{ color: "#B0BEC5", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          This Privacy Policy describes how COSPRONOS Media (&quot;we&quot;, &quot;our&quot;, &quot;CIOS Platform&quot;) collects, uses, and protects information about you when you use the CIOS internship platform and related services. Please read this policy carefully.
        </p>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {sections.map((s, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 0" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#E8EDF5", margin: "0 0 12px" }}>{s.title}</h2>
            <div style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.8, whiteSpace: "pre-line" }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
