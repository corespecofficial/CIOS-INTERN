"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { applyForSpace } from "@/app/actions/creative-spaces";
import { SPACE_CATEGORIES } from "@/app/actions/creative-spaces-types";

const ACCENT = "#26C6DA";
const ACCENT_DIM = "rgba(38,198,218,0.15)";
const ACCENT_BORDER = "rgba(38,198,218,0.25)";
const LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const CREATION_MESSAGES = [
  "Relax, your organization space is being created.",
  "Preparing the staff portal and intern workspace.",
  "Opening lessons, assignments, chat, and files.",
  "Setting up your private tenant boundary.",
  "Almost there, CIOS is wiring the workspace.",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--bg-primary, #0A0E1A)",
  color: "var(--text-primary, #E8EDF5)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-tertiary, #8892A4)",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

export function ApplySpaceClient() {
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(SPACE_CATEGORIES[0]);
  const [orgType, setOrgType] = useState(searchParams.get("type") || "company");
  const [ownerRole, setOwnerRole] = useState("Founder / program owner");
  const [format, setFormat] = useState<"live" | "recorded" | "hybrid">("live");
  const [price, setPrice] = useState(0);
  const [capacity, setCapacity] = useState(20);
  const [internLimit, setInternLimit] = useState(50);
  const [brandColor, setBrandColor] = useState("#26C6DA");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [schedule, setSchedule] = useState("");
  const [useCase, setUseCase] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  useEffect(() => {
    if (!pending) return;
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % CREATION_MESSAGES.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [pending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5) { toast.error("Title must be at least 5 characters"); return; }
    if (description.trim().length < 30) { toast.error("Description must be at least 30 characters"); return; }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setMessageIndex(0);
    start(async () => {
      const res = await applyForSpace({
        title: title.trim(),
        description: description.trim(),
        category,
        org_type: orgType,
        owner_role: ownerRole,
        format,
        price_per_student: price,
        capacity,
        intern_limit: internLimit,
        brand_color: brandColor,
        use_case: useCase.trim() || undefined,
        tags,
        schedule: schedule.trim() || undefined,
        duration_weeks: durationWeeks,
      });
      if (res.ok) {
        setNewId(res.data?.id || null);
        setOrgSlug(res.data?.orgSlug || null);
        setSubmitted(true);
      } else {
        toast.error(res.error);
      }
    });
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
        <div
          style={{
            background: "var(--bg-secondary, #111827)",
            border: `1px solid ${ACCENT_BORDER}`,
            borderRadius: 16,
            padding: 40,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary, #E8EDF5)",
              margin: "0 0 10px",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Organization Space Created!
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-tertiary, #8892A4)", marginBottom: 8, lineHeight: 1.6 }}>
            Your private organization portal is already live. Start setting up interns, staff, lessons,
            channels, files, and announcements while super-admin reviews public visibility.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted, #5A6478)", marginBottom: 24, lineHeight: 1.6 }}>
            You&apos;ll be notified when the public listing is approved.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href={orgSlug ? `/o/${orgSlug}` : "/o"}
              style={{
                padding: "10px 24px",
                background: "linear-gradient(135deg, #1E88E5, #1565C0)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Go to my organization portal &rarr;
            </Link>
            <Link
              href="/creative-space"
              style={{
                padding: "10px 24px",
                background: ACCENT_DIM,
                color: ACCENT,
                border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Browse organization spaces
            </Link>
          </div>
          {newId && (
            <p style={{ fontSize: 11, color: "#5A6478", marginTop: 16 }}>Space ID: {newId}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {pending && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(10,14,26,0.86)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(460px, 100%)",
              background: "linear-gradient(135deg, rgba(17,24,39,0.98), rgba(15,22,38,0.98))",
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: 18,
              padding: 32,
              textAlign: "center",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            }}
          >
            <img
              src={LOGO_URL}
              alt="CIOS"
              style={{
                width: 74,
                height: 74,
                borderRadius: "50%",
                objectFit: "cover",
                margin: "0 auto 20px",
                display: "block",
                boxShadow: "0 0 0 8px rgba(38,198,218,0.08)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 22 }}>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: ACCENT,
                    animation: "cios-org-dot 0.72s ease-in-out infinite",
                    animationDelay: `${dot * 0.14}s`,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: ACCENT,
                marginBottom: 10,
              }}
            >
              Creating organization space
            </div>
            <p
              key={messageIndex}
              style={{
                margin: 0,
                color: "var(--text-primary, #E8EDF5)",
                fontSize: 18,
                lineHeight: 1.45,
                fontWeight: 800,
                fontFamily: "'Space Grotesk', sans-serif",
                animation: "cios-org-message 0.35s ease",
              }}
            >
              {CREATION_MESSAGES[messageIndex]}
            </p>
            <p style={{ margin: "14px 0 0", color: "var(--text-tertiary, #8892A4)", fontSize: 13, lineHeight: 1.6 }}>
              Keep this tab open while CIOS provisions the portal, default channels, member access, and limits.
            </p>
          </div>
          <style>{`
            @keyframes cios-org-dot {
              0%, 100% { transform: translateY(0); opacity: 0.55; }
              50% { transform: translateY(-10px); opacity: 1; }
            }
            @keyframes cios-org-message {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/creative-space"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--text-tertiary, #8892A4)",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        ← Back to Creative Spaces
      </Link>

      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${ACCENT_DIM}, rgba(38,198,218,0.05))`,
          border: `1px solid ${ACCENT_BORDER}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>
          CREATE AN ORGANIZATION SPACE
        </span>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--text-primary, #E8EDF5)",
            margin: "4px 0 6px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Organization Space Gateway
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary, #8892A4)", margin: 0 }}>
          Create a private tenant portal for your organization, team, cohort, or partner program.
        </p>
      </div>

      {/* Info banner */}
      <div
        style={{
          background: "rgba(255,193,7,0.08)",
          border: "1px solid rgba(255,193,7,0.2)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          fontSize: 13,
          color: "#FFC107",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <span style={{ flexShrink: 0 }}>⏳</span>
        <span>
          Your private portal is provisioned immediately when safe. Super-admin approval controls public visibility and final activation.
        </span>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--bg-secondary, #111827)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Title */}
        <div>
          <label style={labelStyle}>Organization / Space Name *</label>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Corespec Design Lab"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Organization purpose * <span style={{ color: "#5A6478", fontWeight: 400 }}>(min 30 chars)</span></label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the organization, interns you will host, programs you will run, and support you need..."
            required
          />
          <div style={{ fontSize: 11, color: description.length < 30 ? "#EF5350" : "#8892A4", marginTop: 4 }}>
            {description.length} chars {description.length < 30 ? `(need ${30 - description.length} more)` : "✓"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Organization type *</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
            >
              <option value="company" style={{ background: "var(--bg-secondary, #111827)" }}>Company</option>
              <option value="institution" style={{ background: "var(--bg-secondary, #111827)" }}>Institution</option>
              <option value="government" style={{ background: "var(--bg-secondary, #111827)" }}>Government / civic</option>
              <option value="partner" style={{ background: "var(--bg-secondary, #111827)" }}>Partner organization</option>
              <option value="startup" style={{ background: "var(--bg-secondary, #111827)" }}>Startup</option>
              <option value="creator" style={{ background: "var(--bg-secondary, #111827)" }}>Creator / instructor</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Your role *</label>
            <input
              style={inputStyle}
              value={ownerRole}
              onChange={(e) => setOwnerRole(e.target.value)}
              placeholder="e.g. Founder, training lead, program manager"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Use case <span style={{ color: "#5A6478", fontWeight: 400 }}>(optional)</span></label>
          <textarea
            style={{ ...inputStyle, minHeight: 76, resize: "vertical" }}
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Tell us how this organization space will use interns, lessons, assignments, finance, moderation, support, or hiring."
          />
        </div>

        {/* Category + Format row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Category *</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              {SPACE_CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ background: "var(--bg-secondary, #111827)" }}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Format *</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={format}
              onChange={(e) => setFormat(e.target.value as "live" | "recorded" | "hybrid")}
            >
              <option value="live" style={{ background: "var(--bg-secondary, #111827)" }}>Live</option>
              <option value="recorded" style={{ background: "var(--bg-secondary, #111827)" }}>Recorded</option>
              <option value="hybrid" style={{ background: "var(--bg-secondary, #111827)" }}>Hybrid</option>
            </select>
          </div>
        </div>

        {/* Price + Capacity + Duration row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Price per student ₦</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="0 = Free"
            />
          </div>
          <div>
            <label style={labelStyle}>First program capacity</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Duration (weeks)</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={52}
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Requested intern limit</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={1000}
              value={internLimit}
              onChange={(e) => setInternLimit(Number(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Brand accent</label>
            <input
              style={{ ...inputStyle, height: 42, padding: "6px 10px" }}
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
            />
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label style={labelStyle}>Schedule <span style={{ color: "#5A6478", fontWeight: 400 }}>(optional)</span></label>
          <input
            style={inputStyle}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="e.g. Tuesdays & Thursdays 7pm WAT"
          />
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Tags <span style={{ color: "#5A6478", fontWeight: 400 }}>(comma-separated, optional)</span></label>
          <input
            style={inputStyle}
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="e.g. react, javascript, frontend"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "12px 0",
            background: pending ? "rgba(38,198,218,0.3)" : ACCENT_DIM,
            color: ACCENT,
            border: `1px solid ${ACCENT_BORDER}`,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {pending ? "Creating..." : "Create Organization Space"}
        </button>
      </form>
    </div>
  );
}
