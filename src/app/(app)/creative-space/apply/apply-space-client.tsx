"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { applyForSpace } from "@/app/actions/creative-spaces";
import { SPACE_CATEGORIES } from "@/app/actions/creative-spaces-types";

const ACCENT = "#26C6DA";
const ACCENT_DIM = "rgba(38,198,218,0.15)";
const ACCENT_BORDER = "rgba(38,198,218,0.25)";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "#0A0E1A",
  color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#8892A4",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

export function ApplySpaceClient() {
  const [pending, start] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(SPACE_CATEGORIES[0]);
  const [format, setFormat] = useState<"live" | "recorded" | "hybrid">("live");
  const [price, setPrice] = useState(0);
  const [capacity, setCapacity] = useState(20);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [schedule, setSchedule] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5) { toast.error("Title must be at least 5 characters"); return; }
    if (description.trim().length < 30) { toast.error("Description must be at least 30 characters"); return; }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    start(async () => {
      const res = await applyForSpace({
        title: title.trim(),
        description: description.trim(),
        category,
        format,
        price_per_student: price,
        capacity,
        tags,
        schedule: schedule.trim() || undefined,
        duration_weeks: durationWeeks,
      });
      if (res.ok) {
        setNewId(res.data?.id || null);
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
            background: "#111827",
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
              color: "#E8EDF5",
              margin: "0 0 10px",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Application Submitted!
          </h2>
          <p style={{ fontSize: 14, color: "#8892A4", marginBottom: 24, lineHeight: 1.6 }}>
            Your application has been submitted! We&apos;ll review it within 48 hours. You&apos;ll be notified once your space is approved and live.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
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
              Browse Spaces
            </Link>
            <Link
              href="/creative-space/manage"
              style={{
                padding: "10px 24px",
                background: "rgba(255,255,255,0.04)",
                color: "#8892A4",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              My Spaces
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
      {/* Back link */}
      <Link
        href="/creative-space"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#8892A4",
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
          BECOME AN INSTRUCTOR
        </span>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#E8EDF5",
            margin: "4px 0 6px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          🏫 Host a Creative Space
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Share your expertise with the community by hosting a learning space.
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
          Your space will be reviewed by admins before going live. Approval usually takes 24–48 hours.
        </span>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#111827",
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
          <label style={labelStyle}>Space Title *</label>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced React & Next.js Bootcamp"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description * <span style={{ color: "#5A6478", fontWeight: 400 }}>(min 30 chars)</span></label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what students will learn, prerequisites, outcomes…"
            required
          />
          <div style={{ fontSize: 11, color: description.length < 30 ? "#EF5350" : "#8892A4", marginTop: 4 }}>
            {description.length} chars {description.length < 30 ? `(need ${30 - description.length} more)` : "✓"}
          </div>
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
                <option key={c} value={c} style={{ background: "#111827" }}>{c}</option>
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
              <option value="live" style={{ background: "#111827" }}>Live</option>
              <option value="recorded" style={{ background: "#111827" }}>Recorded</option>
              <option value="hybrid" style={{ background: "#111827" }}>Hybrid</option>
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
            <label style={labelStyle}>Max Capacity</label>
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
          {pending ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
