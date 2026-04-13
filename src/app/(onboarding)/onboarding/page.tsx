"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/lib/use-current-user";
import { getRoleHomePath } from "@/lib/use-current-user";
import { updateMyProfile } from "@/app/actions/profile";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const GOALS = [
  { id: "skills", emoji: "🎯", label: "Learn digital skills" },
  { id: "career", emoji: "💼", label: "Build a career" },
  { id: "income", emoji: "💰", label: "Earn income online" },
  { id: "portfolio", emoji: "🏆", label: "Build portfolio" },
  { id: "network", emoji: "🤝", label: "Grow network" },
  { id: "promotion", emoji: "📈", label: "Get promoted" },
];

const SKILLS = [
  { id: "design", emoji: "🎨", label: "Design" },
  { id: "dev", emoji: "💻", label: "Development" },
  { id: "marketing", emoji: "📢", label: "Marketing" },
  { id: "content", emoji: "✍️", label: "Content" },
  { id: "ai", emoji: "🤖", label: "AI Tools" },
  { id: "video", emoji: "🎬", label: "Video" },
  { id: "data", emoji: "📊", label: "Data" },
  { id: "product", emoji: "🚀", label: "Product" },
];

const AVATARS = [
  { gradient: "linear-gradient(135deg, #1E88E5, #AB47BC)" },
  { gradient: "linear-gradient(135deg, #66BB6A, #1E88E5)" },
  { gradient: "linear-gradient(135deg, #FFC107, #FF7043)" },
  { gradient: "linear-gradient(135deg, #AB47BC, #EF5350)" },
  { gradient: "linear-gradient(135deg, #26C6DA, #1E88E5)" },
  { gradient: "linear-gradient(135deg, #FF7043, #FFC107)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [step, setStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [goals, setGoals] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const steps = [
    { title: "Welcome to CIOS", subtitle: "Your journey as a COSPRONOS intern starts here." },
    { title: "Rules & Agreement", subtitle: "Please review and accept before continuing." },
    { title: "Your Goals", subtitle: "What are you hoping to achieve?" },
    { title: "Your Skills", subtitle: "Which tracks interest you most?" },
    { title: "Pick an Avatar", subtitle: "Choose a default avatar for now." },
    { title: "You're all set!", subtitle: "Ready to start your internship journey." },
  ];

  const canContinue = () => {
    if (step === 1) return termsAccepted;
    if (step === 2) return goals.length > 0;
    if (step === 3) return skills.length > 0;
    return true;
  };

  const next = () => {
    if (!canContinue()) {
      if (step === 1) toast.error("Please accept the terms to continue");
      else if (step === 2) toast.error("Pick at least one goal");
      else if (step === 3) toast.error("Pick at least one skill");
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  const back = () => setStep(Math.max(0, step - 1));

  const finish = async () => {
    setFinishing(true);
    const goalLabels = GOALS.filter(g => goals.includes(g.id)).map(g => g.label);
    const skillLabels = SKILLS.filter(s => skills.includes(s.id)).map(s => s.label);
    const res = await updateMyProfile({
      skills: skillLabels,
      interests: goalLabels,
      goals: goalLabels.join(", "),
    });
    if (!res.ok) {
      toast.error(res.error || "Could not save profile");
      setFinishing(false);
      return;
    }
    try {
      localStorage.setItem("cios-onboarding", JSON.stringify({
        termsAcceptedAt: new Date().toISOString(),
        goals, skills, avatarIdx, completed: true,
      }));
    } catch {}
    toast.success("Welcome to CIOS! 🎉");
    setTimeout(() => router.push(getRoleHomePath(user.role)), 600);
  };

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };
  const toggleSkill = (id: string) => {
    setSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const current = steps[step];

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5",
      fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 28 : 8, height: 8, borderRadius: 4,
              background: i <= step ? "#1E88E5" : "rgba(255,255,255,0.1)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Mascot */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src={LOGO} alt="CIOS" width={80} height={80} style={{ borderRadius: "50%", display: "inline-block", animation: "float 3s ease-in-out infinite" }} />
        </div>

        {/* Header */}
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>
          {current.title}
        </h1>
        <p style={{ textAlign: "center", color: "#8892A4", marginBottom: 32 }}>
          {current.subtitle}
        </p>

        {/* Step content card */}
        <div style={{
          background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: 28, minHeight: 280,
        }}>
          {step === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: 15, color: "#B0BEC5", lineHeight: 1.7, marginBottom: 24 }}>
                Hello <span style={{ color: "#1E88E5", fontWeight: 700 }}>{user.firstName || "there"}</span>!
                You&apos;re about to begin the <strong style={{ color: "#FFC107" }}>CIOS AI Internship Program</strong> —
                a transformative 6-month experience designed to build real-world skills, accountability, and career-ready professionals.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {[
                  { icon: "📚", label: "Learn" },
                  { icon: "✅", label: "Perform" },
                  { icon: "🏆", label: "Earn" },
                ].map(x => (
                  <div key={x.label} style={{ padding: 16, background: "rgba(30,136,229,0.06)", border: "1px solid rgba(30,136,229,0.12)", borderRadius: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{x.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ maxHeight: 220, overflowY: "auto", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 16, fontSize: 13, color: "#B0BEC5", lineHeight: 1.7, marginBottom: 16 }}>
                <strong style={{ color: "#E8EDF5" }}>1. Program Rules:</strong> Attend live classes, submit tasks on time, participate in community, and follow the code of conduct. Performance affects your ranking and rewards.
                <br /><br />
                <strong style={{ color: "#E8EDF5" }}>2. Fine Policy:</strong> Missed classes incur ₦500 fine. Late task submissions may result in reduced XP. Payment is required to maintain active status.
                <br /><br />
                <strong style={{ color: "#E8EDF5" }}>3. Code of Conduct:</strong> Respect all members. No harassment, spam, or misuse of platform resources. Violations may lead to suspension or ban.
                <br /><br />
                <strong style={{ color: "#E8EDF5" }}>4. Privacy:</strong> Your data is protected. We collect only what&apos;s needed to run the program. Full policy at /terms.
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: 12, background: termsAccepted ? "rgba(30,136,229,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${termsAccepted ? "rgba(30,136,229,0.35)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, transition: "all 0.2s" }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: 3, accentColor: "#1E88E5" }} />
                <span style={{ fontSize: 13, color: "#E8EDF5" }}>
                  I agree to the Terms of Service, Privacy Policy, and Fine Policy of the CIOS Internship Program.
                </span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {GOALS.map(g => {
                const selected = goals.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    style={{
                      padding: "14px 16px",
                      background: selected ? "rgba(30,136,229,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selected ? "rgba(30,136,229,0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 12,
                      display: "flex", alignItems: "center", gap: 10,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{g.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selected ? "#1E88E5" : "#E8EDF5" }}>{g.label}</span>
                    {selected && <span style={{ marginLeft: "auto", color: "#1E88E5" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {SKILLS.map(s => {
                const selected = skills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    style={{
                      padding: "18px 10px",
                      background: selected ? "rgba(255,193,7,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selected ? "rgba(255,193,7,0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 12,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{s.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: selected ? "#FFC107" : "#E8EDF5" }}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{
                  width: 120, height: 120, borderRadius: "50%", display: "inline-flex",
                  alignItems: "center", justifyContent: "center",
                  background: AVATARS[avatarIdx].gradient,
                  color: "#fff", fontSize: 40, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: "0 12px 40px rgba(30,136,229,0.3)",
                }}>
                  {user.initials}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {AVATARS.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => setAvatarIdx(i)}
                    style={{
                      width: "100%", aspectRatio: "1", borderRadius: "50%",
                      background: a.gradient, border: avatarIdx === i ? "3px solid #1E88E5" : "3px solid transparent",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#5A6478", textAlign: "center", marginTop: 16 }}>
                You can upload a custom photo later in Settings.
              </p>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
              <p style={{ fontSize: 16, color: "#E8EDF5", lineHeight: 1.7, marginBottom: 20 }}>
                Welcome aboard, <strong style={{ color: "#1E88E5" }}>{user.firstName || "friend"}</strong>!
                Your CIOS account is ready. Let&apos;s head to your dashboard and get started.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 20 }}>
                <Stat label="Goals" value={goals.length} />
                <Stat label="Skills" value={skills.length} />
                <Stat label="Role" value="Intern" small />
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 0 && step < steps.length - 1 && (
            <button
              onClick={back}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: 12,
                background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                color: "#8892A4", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >Back</button>
          )}
          <button
            onClick={next}
            disabled={finishing}
            style={{
              flex: step === 0 || step === steps.length - 1 ? 1 : 2,
              padding: "12px 20px", borderRadius: 12,
              background: "linear-gradient(135deg, #1E88E5, #1565C0)",
              color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
              cursor: finishing ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(30,136,229,0.3)",
              opacity: finishing ? 0.6 : 1,
            }}
          >
            {finishing ? "Launching..." : step === steps.length - 1 ? "Enter CIOS →" : "Continue →"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: small ? 16 : 24, fontWeight: 800, color: "#1E88E5" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}
