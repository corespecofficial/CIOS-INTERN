"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const SECTIONS = [
  {
    title: "1. Program Rules",
    content: `By enrolling in the COSPRONOS Media AI Internship Program ("the Program"), you agree to:
- Attend all scheduled sessions and meetings unless prior notice is given.
- Complete assigned tasks, projects, and coursework within the stated deadlines.
- Maintain professional conduct at all times in the community and during sessions.
- Actively participate in group projects, peer reviews, and mentorship sessions.
- Submit weekly progress reports through the CIOS platform.
- Dedicate a minimum of 20 hours per week to program activities.
- The internship runs for a 6-month duration with monthly performance reviews.`,
  },
  {
    title: "2. Fine Policy",
    content: `The Program enforces a transparent accountability system:
- Late submission of assignments: ₦500 per day, up to ₦2,500 maximum.
- Unexcused absence from scheduled sessions: ₦1,000 per occurrence.
- Failure to submit weekly reports: ₦750 per missed report.
- Repeated violations (3+ in one month): Review by the disciplinary committee.
- All fines are tracked transparently in your CIOS Finance Dashboard.
- Fines may be appealed within 48 hours of issuance through the platform.
- Accumulated unpaid fines exceeding ₦10,000 may result in program suspension.`,
  },
  {
    title: "3. Code of Conduct",
    content: `All participants must uphold the following standards:
- Treat all interns, mentors, and staff with respect and professionalism.
- Zero tolerance for harassment, discrimination, or bullying of any kind.
- No sharing of confidential project information outside the program.
- Plagiarism or academic dishonesty will result in immediate review and potential dismissal.
- Constructive criticism is encouraged; destructive behavior is not tolerated.
- All communications should be professional, including messages in community channels.
- Violations of the code of conduct may result in fines, suspension, or termination.`,
  },
  {
    title: "4. Privacy Policy",
    content: `Your privacy matters to us:
- Personal information is collected solely for program administration purposes.
- Your data is stored securely and is not shared with third parties without consent.
- Performance data, including grades and project scores, is visible to mentors and admins.
- You may request a copy of your data or request deletion after program completion.
- By using the platform, you consent to the collection of usage analytics for improvement purposes.
- Profile information you provide may be visible to other program participants.
- We comply with applicable Nigerian data protection regulations (NDPR).`,
  },
  {
    title: "5. Intellectual Property",
    content: `Regarding work created during the program:
- Projects completed during the internship may be used by COSPRONOS Media for portfolio and marketing purposes.
- Interns retain the right to showcase their work in personal portfolios.
- Any proprietary tools, frameworks, or materials provided by COSPRONOS Media remain the property of COSPRONOS Media.
- Open-source contributions made during the program follow the respective project licenses.
- Client project work is subject to client NDAs and cannot be shared publicly without written permission.
- Course materials and learning resources provided are for personal use only and may not be redistributed.`,
  },
  {
    title: "6. Termination",
    content: `The following applies to program exit:
- Interns may withdraw from the program at any time by submitting a formal withdrawal request.
- Early withdrawal forfeits any pending certificates or rewards.
- COSPRONOS Media reserves the right to terminate participation for:
  - Repeated violations of the code of conduct.
  - Accumulated fines exceeding ₦10,000 without payment or arrangement.
  - Failure to meet minimum participation requirements for 2 consecutive weeks.
  - Any behavior deemed harmful to the program or its participants.
- Terminated interns may appeal within 7 days of receiving the termination notice.
- Refunds for any paid plans are subject to the refund policy and are prorated.`,
  },
];

export default function TermsPage() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  const handleContinue = () => {
    if (!agreed) return;
    try {
      localStorage.setItem("cios_terms_accepted", new Date().toISOString());
    } catch {
      // localStorage may be unavailable
    }
    router.push("/sign-up");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0E1A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 600,
          width: "100%",
          background: "#111827",
          borderRadius: 20,
          padding: 32,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src={LOGO_URL}
            alt="CIOS Mascot"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            margin: 0,
          }}
        >
          Terms of Service
        </h1>

        {/* Subtitle */}
        <p
          style={{
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: 14,
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          COSPRONOS Media AI Internship Program
        </p>

        {/* Scrollable Terms */}
        <div
          style={{
            maxHeight: 300,
            overflowY: "auto" as const,
            background: "#0A0E1A",
            borderRadius: 12,
            padding: 20,
            border: "1px solid rgba(255,255,255,0.1)",
            marginBottom: 24,
          }}
        >
          {SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 20 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#E5E7EB",
                  marginBottom: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#9CA3AF",
                  whiteSpace: "pre-line",
                  margin: 0,
                }}
              >
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Checkbox */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            marginBottom: 24,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              marginTop: 3,
              width: 18,
              height: 18,
              accentColor: "#1E88E5",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 1.5 }}>
            I agree to the Terms and Conditions, Privacy Policy, and Fine Policy
          </span>
        </label>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!agreed}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            border: "none",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: agreed ? "pointer" : "not-allowed",
            background: agreed
              ? "linear-gradient(135deg, #1E88E5, #1565C0)"
              : "#374151",
            color: agreed ? "#FFFFFF" : "#6B7280",
            transition: "all 0.2s ease",
            opacity: agreed ? 1 : 0.7,
          }}
        >
          Continue to Sign Up
        </button>
      </div>
    </div>
  );
}
