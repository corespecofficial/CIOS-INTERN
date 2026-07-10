"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createCourse } from "@/app/actions/courses-lms";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";

const CATEGORIES = ["Design", "Development", "AI", "Marketing", "Business", "Finance", "Writing", "Data", "General"];
const DIFFICULTIES: Array<"beginner" | "intermediate" | "advanced"> = ["beginner", "intermediate", "advanced"];
const LANGUAGES = ["English", "French", "Yoruba", "Igbo", "Hausa", "Swahili"];

export default function CreateCoursePage({
  orgSlug,
  basePath = "/instructor",
}: {
  orgSlug?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const thumbInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    category: "AI",
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    language: "English",
    durationHours: 4,
    priceNaira: 0,
    discountNaira: "" as number | "",
    thumbnailUrl: "",
    promoVideoUrl: "",
    tags: "" as string,
  });

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleThumb(files: FileList | null) {
    if (!files || !files[0]) return;
    setUploading(true);
    const t = toast.loading("Uploading thumbnail…");
    try {
      const compressed = await compressImage(files[0], { maxBytes: 1.5 * 1024 * 1024, maxDim: 1280 });
      const up = await uploadToCloudinary(compressed, { folder: "cios-courses/thumbnails", resourceType: "image" });
      update("thumbnailUrl", up.secureUrl);
      toast.success("Thumbnail uploaded", { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally { setUploading(false); }
  }

  async function submit() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    setBusy(true);
    const r = await createCourse({
      title: form.title,
      subtitle: form.subtitle || undefined,
      description: form.description,
      category: form.category,
      difficulty: form.difficulty,
      language: form.language,
      durationHours: Number(form.durationHours) || 0,
      priceNaira: Number(form.priceNaira) || 0,
      discountNaira: form.discountNaira === "" ? null : Number(form.discountNaira),
      thumbnailUrl: form.thumbnailUrl || null,
      promoVideoUrl: form.promoVideoUrl || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      orgSlug,
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Course created — now add lessons");
    router.push(`${basePath}/course-builder/${r.data!.id}`);
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
          {orgSlug ? "ORG INSTRUCTOR · NEW COURSE" : "INSTRUCTOR · NEW COURSE"}
        </span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>Create a new course</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Fill in the basics — you&apos;ll add modules and lessons on the next screen.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Basic info">
          <Field label="Title (required)">
            <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. AI Prompt Engineering Essentials" style={input} />
          </Field>
          <Field label="Subtitle">
            <input value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} placeholder="A short hook (max 120 chars)" maxLength={120} style={input} />
          </Field>
          <Field label="Description (required)">
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={5} placeholder="What will students learn? What skills will they gain?" style={{ ...input, minHeight: 120, resize: "vertical" }} />
          </Field>
          <div style={grid3}>
            <Field label="Category">
              <select value={form.category} onChange={(e) => update("category", e.target.value)} style={input}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Skill level">
              <select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value as "beginner" | "intermediate" | "advanced")} style={input}>
                {DIFFICULTIES.map((d) => <option key={d} value={d} style={{ textTransform: "capitalize" }}>{d}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select value={form.language} onChange={(e) => update("language", e.target.value)} style={input}>
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tags (comma-separated)">
            <input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="ai, prompt, chatgpt, productivity" style={input} />
          </Field>
        </Card>

        <Card title="Media">
          <Field label="Thumbnail">
            {form.thumbnailUrl ? (
              <div style={{ position: "relative", maxWidth: 320 }}>
                <img src={form.thumbnailUrl} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 10 }} />
                <button onClick={() => update("thumbnailUrl", "")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <>
                <input ref={thumbInput} type="file" accept="image/*" hidden onChange={(e) => handleThumb(e.target.files)} />
                <button onClick={() => thumbInput.current?.click()} disabled={uploading} style={{ ...btnGhost, width: "100%", padding: "24px", border: "2px dashed rgba(255,255,255,0.15)" }}>
                  {uploading ? "Uploading…" : "🖼 Upload thumbnail (max 2 MB, 16:9 recommended)"}
                </button>
              </>
            )}
          </Field>
          <Field label="Promo video URL (YouTube/Vimeo, optional)">
            <input value={form.promoVideoUrl} onChange={(e) => update("promoVideoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." style={input} />
          </Field>
        </Card>

        <Card title="Pricing">
          <div style={grid3}>
            <Field label="Duration (hours)">
              <input type="number" min={0} value={form.durationHours} onChange={(e) => update("durationHours", parseInt(e.target.value) || 0)} style={input} />
            </Field>
            <Field label="Price (₦)">
              <input type="number" min={0} value={form.priceNaira} onChange={(e) => update("priceNaira", parseInt(e.target.value) || 0)} style={input} />
            </Field>
            <Field label="Discount price (₦, optional)">
              <input type="number" min={0} value={form.discountNaira} onChange={(e) => update("discountNaira", e.target.value === "" ? "" : parseInt(e.target.value))} style={input} />
            </Field>
          </div>
          {form.priceNaira === 0 && <p style={{ fontSize: 12, color: "#66BB6A", margin: 0 }}>✓ This course will be free</p>}
        </Card>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={() => router.back()} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy || uploading} style={btnPrimary}>
            {busy ? "Creating…" : "Create & continue to builder →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: "0 0 14px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};
const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "10px 20px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
