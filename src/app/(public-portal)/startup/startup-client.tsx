"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { upsertPitch } from "@/app/actions/startup";
import type { StartupPitch } from "@/app/actions/startup-types";
import { STARTUP_CATEGORIES, STARTUP_STAGES, LOOKING_FOR_OPTIONS } from "@/app/actions/startup-types";

const ACCENT = "#7C4DFF";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      padding: "12px 20px", borderRadius: 10,
      background: ok ? "rgba(102,187,106,0.15)" : "rgba(239,83,80,0.15)",
      border: `1px solid ${ok ? "#66BB6A" : "#EF5350"}`,
      color: ok ? "#66BB6A" : "#EF5350",
      fontSize: 14, fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      maxWidth: 360,
    }}>
      {msg}
    </div>
  );
}

export function StartupClient({ existing }: { existing: StartupPitch | null }) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [startupName, setStartupName] = useState(existing?.startup_name || "");
  const [tagline, setTagline] = useState(existing?.tagline || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [category, setCategory] = useState(existing?.category || STARTUP_CATEGORIES[0]);
  const [stage, setStage] = useState(existing?.stage || "idea");
  const [lookingFor, setLookingFor] = useState<string[]>(existing?.looking_for || []);
  const [websiteUrl, setWebsiteUrl] = useState(existing?.website_url || "");
  const [pitchDeckUrl, setPitchDeckUrl] = useState(existing?.pitch_deck_url || "");
  const [isPublic, setIsPublic] = useState(existing?.is_public ?? true);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function toggleLookingFor(item: string) {
    setLookingFor((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await upsertPitch({
        startup_name: startupName,
        tagline,
        description,
        category,
        stage,
        looking_for: lookingFor,
        website_url: websiteUrl || undefined,
        pitch_deck_url: pitchDeckUrl || undefined,
        is_public: isPublic,
      });
      if (res.ok) {
        showToast(existing ? "Pitch updated successfully!" : "Pitch created! It is now live on the investor portal.", true);
      } else {
        showToast(res.error, false);
      }
    });
  }

  const inputStyle = {
    padding: "10px 14px", borderRadius: 8, boxSizing: "border-box" as const,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#E8EDF5", fontSize: 14, width: "100%",
    outline: "none",
  };

  const canSubmit = startupName.trim().length >= 2
    && tagline.trim().length >= 10
    && description.trim().length >= 50;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        input:focus,textarea:focus,select:focus{border-color:#7C4DFF!important}
        @media (max-width: 600px) {
          .su-form-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,77,255,0.1) 0%, rgba(10,14,26,0) 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "40px 32px 32px",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>🚀 My Startup Pitch</h1>
            <div style={{ fontSize: 14, color: "#8892A4" }}>
              {existing ? "Update your pitch visible on the investor portal." : "Create your startup pitch and get discovered by investors."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {existing && (
              <Link
                href="/investors"
                style={{
                  padding: "9px 18px", borderRadius: 9,
                  background: `rgba(124,77,255,0.15)`, border: `1px solid rgba(124,77,255,0.3)`,
                  color: ACCENT, fontSize: 13, fontWeight: 700, textDecoration: "none",
                }}
              >
                View on investors page →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px" }}>
        {/* Onboarding banner (no existing pitch) */}
        {!existing && (
          <div style={{
            background: `rgba(124,77,255,0.08)`, border: `1px solid rgba(124,77,255,0.2)`,
            borderRadius: 14, padding: "20px 24px", marginBottom: 28,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>
              Welcome to the Startup Portal!
            </div>
            <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: 0 }}>
              This page lets you create a startup pitch that will be visible on the{" "}
              <Link href="/investors" style={{ color: ACCENT }}>investor portal</Link>.
              Investors, mentors, and partners browse these pitches to find intern-led startups to support.
              Fill out the form below to get started — you can update it anytime.
            </p>
          </div>
        )}

        {/* Form */}
        <div style={{
          background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: 28,
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          {/* Startup Name */}
          <div>
            <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>
              Startup Name * <span style={{ color: startupName.trim().length < 2 ? "#EF5350" : "#66BB6A" }}>({startupName.trim().length}/2 min)</span>
            </label>
            <input
              value={startupName}
              onChange={(e) => setStartupName(e.target.value)}
              placeholder="e.g. AgriVision AI"
              style={inputStyle}
            />
          </div>

          {/* Tagline */}
          <div>
            <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>
              Tagline * <span style={{ color: tagline.trim().length < 10 ? "#EF5350" : "#66BB6A" }}>({tagline.trim().length}/10 min)</span>
            </label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One line that captures what you do and who it's for"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>
              Description *{" "}
              <span style={{ color: description.trim().length < 50 ? "#EF5350" : "#66BB6A" }}>
                ({description.trim().length}/50 min chars)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your startup: the problem you're solving, your solution, target market, and traction so far..."
              rows={6}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Category + Stage */}
          <div className="su-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {STARTUP_CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: "#111827" }}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Stage *</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {STARTUP_STAGES.map((s) => (
                  <option key={s.value} value={s.value} style={{ background: "#111827" }}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Looking for */}
          <div>
            <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 10 }}>
              Looking For (select all that apply)
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LOOKING_FOR_OPTIONS.map((item) => {
                const selected = lookingFor.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleLookingFor(item)}
                    style={{
                      padding: "6px 14px", borderRadius: 99, cursor: "pointer",
                      border: `1px solid ${selected ? ACCENT : "rgba(255,255,255,0.1)"}`,
                      background: selected ? `rgba(124,77,255,0.2)` : "transparent",
                      color: selected ? ACCENT : "#8892A4",
                      fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                    }}
                  >
                    {selected ? "✓ " : ""}{item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* URLs */}
          <div className="su-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Website URL (optional)</label>
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourstartup.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Pitch Deck URL (optional)</label>
              <input
                value={pitchDeckUrl}
                onChange={(e) => setPitchDeckUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                style={inputStyle}
              />
            </div>
          </div>

          {/* Public toggle */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div
                onClick={() => setIsPublic((v) => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: isPublic ? ACCENT : "rgba(255,255,255,0.1)",
                  position: "relative", transition: "background 0.2s", cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, left: isPublic ? 23 : 3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#fff", transition: "left 0.2s",
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>
                  Make my pitch visible on the /investors page
                </div>
                <div style={{ fontSize: 12, color: "#8892A4" }}>
                  {isPublic ? "Your pitch is publicly visible to investors." : "Your pitch is private and not visible to investors."}
                </div>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            style={{
              padding: "13px 0", borderRadius: 10,
              background: `linear-gradient(135deg, ${ACCENT}, #1E88E5)`,
              border: "none", color: "#fff",
              fontSize: 14, fontWeight: 800,
              cursor: isPending || !canSubmit ? "not-allowed" : "pointer",
              opacity: isPending || !canSubmit ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isPending ? "Saving..." : existing ? "Update Pitch" : "Create Pitch"}
          </button>

          {existing && (
            <div style={{ textAlign: "center" }}>
              <Link
                href="/investors"
                style={{ color: ACCENT, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                View on investors page →
              </Link>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}
