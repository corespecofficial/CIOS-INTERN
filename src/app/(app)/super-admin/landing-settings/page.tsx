"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getPlatformSettings, updatePlatformSettings,
  getAllLandingTestimonials, saveLandingTestimonial, deleteLandingTestimonial, toggleTestimonialActive,
  type PlatformSettings, type LandingTestimonial,
} from "@/app/actions/landing-content";

const GRADIENTS = [
  "linear-gradient(135deg, #1E88E5, #AB47BC)",
  "linear-gradient(135deg, #FFC107, #FF7043)",
  "linear-gradient(135deg, #66BB6A, #1E88E5)",
  "linear-gradient(135deg, #26C6DA, #1E88E5)",
  "linear-gradient(135deg, #AB47BC, #EF5350)",
  "linear-gradient(135deg, #FF7043, #FFC107)",
  "linear-gradient(135deg, #EF5350, #AB47BC)",
  "linear-gradient(135deg, #66BB6A, #FFC107)",
];

const card: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 };
const input: React.CSSProperties = { background: "#0D1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8EDF5", padding: "10px 14px", fontSize: 13, width: "100%", outline: "none", fontFamily: "inherit" };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 };
const btn = (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" });

export default function LandingSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    homepage_video_url: "", homepage_stats_interns: "500+", homepage_stats_courses: "48",
    homepage_stats_mentors: "15", homepage_stats_countries: "12", homepage_stats_partners: "80+",
  });
  const [testimonials, setTestimonials] = useState<LandingTestimonial[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingT, setEditingT] = useState<Partial<LandingTestimonial> | null>(null);
  const [savingT, setSavingT] = useState(false);

  useEffect(() => {
    getPlatformSettings().then(setSettings);
    getAllLandingTestimonials().then(setTestimonials);
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    const r = await updatePlatformSettings(settings);
    setSavingSettings(false);
    if (r.ok) toast.success("Settings saved — homepage will update on next deploy/revalidate");
    else toast.error(r.error);
  };

  const saveTestimonial = async () => {
    if (!editingT) return;
    if (!editingT.name?.trim() || !editingT.role?.trim() || !editingT.quote?.trim()) {
      toast.error("Name, role, and quote are required");
      return;
    }
    setSavingT(true);
    const r = await saveLandingTestimonial({
      name: editingT.name!, role: editingT.role!, quote: editingT.quote!,
      avatar_url: editingT.avatar_url || null,
      initials: editingT.initials || editingT.name!.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      gradient: editingT.gradient || GRADIENTS[0],
      stars: editingT.stars ?? 5,
      is_active: editingT.is_active ?? true,
      sort_order: editingT.sort_order ?? testimonials.length + 1,
      ...(editingT.id ? { id: editingT.id } : {}),
    });
    setSavingT(false);
    if (r.ok) {
      toast.success(editingT.id ? "Testimonial updated" : "Testimonial added");
      setEditingT(null);
      getAllLandingTestimonials().then(setTestimonials);
    } else {
      toast.error(r.error);
    }
  };

  const deleteT = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    const r = await deleteLandingTestimonial(id);
    if (r.ok) { toast.success("Deleted"); getAllLandingTestimonials().then(setTestimonials); }
    else toast.error(r.error);
  };

  const toggleT = async (t: LandingTestimonial) => {
    const r = await toggleTestimonialActive(t.id, !t.is_active);
    if (r.ok) getAllLandingTestimonials().then(setTestimonials);
    else toast.error(r.error);
  };

  const youtubeId = (() => {
    try {
      const url = settings.homepage_video_url;
      if (!url) return null;
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
      return m?.[1] ?? null;
    } catch { return null; }
  })();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🌐 Landing Page Settings</h1>
        <p style={{ fontSize: 13, color: "#8892A4", marginTop: 4 }}>Control the homepage video, stats, and testimonials shown to visitors.</p>
      </div>

      {/* VIDEO SETTINGS */}
      <div style={card}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: "#E8EDF5", margin: "0 0 16px" }}>🎬 Platform Demo Video</h2>
        <p style={{ fontSize: 12, color: "#8892A4", marginBottom: 16, lineHeight: 1.6 }}>
          Paste a YouTube URL or video ID. This appears on the homepage as an embedded demo video showing how the platform works.
          Leave blank to hide the video section.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <span style={label}>YouTube URL or Video ID</span>
            <input
              style={input}
              placeholder="https://youtube.com/watch?v=... or just the video ID"
              value={settings.homepage_video_url}
              onChange={e => setSettings(s => ({ ...s, homepage_video_url: e.target.value }))}
            />
          </div>
        </div>
        {youtubeId && (
          <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", aspectRatio: "16/9", maxWidth: 480 }}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              style={{ width: "100%", height: "100%", border: "none" }}
              allowFullScreen
              title="Demo video preview"
            />
          </div>
        )}
        {!youtubeId && settings.homepage_video_url && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#EF5350" }}>⚠ Could not extract a YouTube video ID from that URL. Check the format.</div>
        )}
      </div>

      {/* STATS SETTINGS */}
      <div style={card}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: "#E8EDF5", margin: "0 0 16px" }}>📊 Homepage Stats</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          {[
            { key: "homepage_stats_interns",   label: "Interns Trained" },
            { key: "homepage_stats_courses",   label: "Courses Available" },
            { key: "homepage_stats_mentors",   label: "Mentors" },
            { key: "homepage_stats_countries", label: "Countries" },
            { key: "homepage_stats_partners",  label: "Hiring Partners" },
          ].map(f => (
            <div key={f.key}>
              <span style={label}>{f.label}</span>
              <input
                style={input}
                value={(settings as unknown as Record<string, string>)[f.key] ?? ""}
                onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* PLATFORM SCREENSHOTS */}
      <div style={card}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: "#E8EDF5", margin: "0 0 8px" }}>🖼️ Platform Screenshots</h2>
        <p style={{ fontSize: 12, color: "#8892A4", marginBottom: 16, lineHeight: 1.6 }}>
          Upload screenshots to Cloudinary and paste the image URLs below. These appear on the homepage in the &quot;Inside the Platform&quot; section.
          Leave all blank to show the default icon cards instead.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
          {[
            { urlKey: "homepage_screenshot_1_url", labelKey: "homepage_screenshot_1_label", num: 1 },
            { urlKey: "homepage_screenshot_2_url", labelKey: "homepage_screenshot_2_label", num: 2 },
            { urlKey: "homepage_screenshot_3_url", labelKey: "homepage_screenshot_3_label", num: 3 },
            { urlKey: "homepage_screenshot_4_url", labelKey: "homepage_screenshot_4_label", num: 4 },
          ].map(f => {
            const urlVal = (settings as unknown as Record<string, string>)[f.urlKey] ?? "";
            const lblVal = (settings as unknown as Record<string, string>)[f.labelKey] ?? "";
            return (
              <div key={f.num} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 12 }}>Screenshot {f.num}</div>
                <div style={{ marginBottom: 10 }}>
                  <span style={label}>Caption / Label</span>
                  <input
                    style={input}
                    placeholder={`e.g. Intern Dashboard`}
                    value={lblVal}
                    onChange={e => setSettings(s => ({ ...s, [f.labelKey]: e.target.value }))}
                  />
                </div>
                <div>
                  <span style={label}>Cloudinary Image URL</span>
                  <input
                    style={input}
                    placeholder="https://res.cloudinary.com/..."
                    value={urlVal}
                    onChange={e => setSettings(s => ({ ...s, [f.urlKey]: e.target.value }))}
                  />
                </div>
                {urlVal && (
                  <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", aspectRatio: "16/9" }}>
                    <img src={urlVal} alt={lblVal} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SAVE SETTINGS */}
      <button onClick={saveSettings} disabled={savingSettings} style={btn("linear-gradient(135deg,#1E88E5,#1565C0)")}>
        {savingSettings ? "Saving…" : "💾 Save Video, Stats & Screenshots"}
      </button>

      {/* TESTIMONIALS */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>💬 Testimonials ({testimonials.length})</h2>
          <button onClick={() => setEditingT({ stars: 5, is_active: true, sort_order: testimonials.length + 1, gradient: GRADIENTS[0] })} style={btn("#66BB6A")}>
            + Add Testimonial
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {testimonials.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#0D1220", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: t.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {t.avatar_url ? <img src={t.avatar_url} alt={t.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : t.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{t.name} <span style={{ color: "#8892A4", fontWeight: 400 }}>· {t.role}</span></div>
                <div style={{ fontSize: 11, color: "#5A6478", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{t.quote}"</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, background: t.is_active ? "rgba(76,175,80,0.15)" : "rgba(239,83,80,0.15)", color: t.is_active ? "#66BB6A" : "#EF5350" }}>
                  {t.is_active ? "Active" : "Hidden"}
                </div>
                <button onClick={() => toggleT(t)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8892A4", padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                  {t.is_active ? "Hide" : "Show"}
                </button>
                <button onClick={() => setEditingT({ ...t })} style={{ background: "rgba(30,136,229,0.15)", border: "none", borderRadius: 8, color: "#42A5F5", padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Edit</button>
                <button onClick={() => deleteT(t.id)} style={{ background: "rgba(239,83,80,0.15)", border: "none", borderRadius: 8, color: "#EF5350", padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Del</button>
              </div>
            </div>
          ))}
          {testimonials.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#5A6478", fontSize: 13 }}>No testimonials yet. Add one above.</div>
          )}
        </div>
      </div>

      {/* EDIT / ADD TESTIMONIAL MODAL */}
      {editingT && (
        <div onClick={() => setEditingT(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: "#E8EDF5", margin: "0 0 20px" }}>
              {editingT.id ? "Edit Testimonial" : "Add Testimonial"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={label}>Full Name *</span>
                  <input style={input} value={editingT.name ?? ""} onChange={e => setEditingT(t => ({ ...t!, name: e.target.value }))} placeholder="e.g. Adaeze Okonkwo" />
                </div>
                <div>
                  <span style={label}>Role / Title *</span>
                  <input style={input} value={editingT.role ?? ""} onChange={e => setEditingT(t => ({ ...t!, role: e.target.value }))} placeholder="e.g. Senior Intern · Lagos" />
                </div>
              </div>

              <div>
                <span style={label}>Quote *</span>
                <textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={editingT.quote ?? ""} onChange={e => setEditingT(t => ({ ...t!, quote: e.target.value }))} placeholder="What they said about the program…" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={label}>Initials (2 letters)</span>
                  <input style={input} value={editingT.initials ?? ""} maxLength={2} onChange={e => setEditingT(t => ({ ...t!, initials: e.target.value.toUpperCase() }))} placeholder="AO" />
                </div>
                <div>
                  <span style={label}>Stars (1–5)</span>
                  <input style={input} type="number" min={1} max={5} value={editingT.stars ?? 5} onChange={e => setEditingT(t => ({ ...t!, stars: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <span style={label}>Avatar Photo URL (optional)</span>
                <input style={input} value={editingT.avatar_url ?? ""} onChange={e => setEditingT(t => ({ ...t!, avatar_url: e.target.value }))} placeholder="https://cloudinary.com/..." />
              </div>

              <div>
                <span style={label}>Avatar Gradient (used if no photo)</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {GRADIENTS.map(g => (
                    <button key={g} onClick={() => setEditingT(t => ({ ...t!, gradient: g }))} style={{
                      width: 32, height: 32, borderRadius: "50%", background: g, border: editingT.gradient === g ? "3px solid #E8EDF5" : "2px solid transparent", cursor: "pointer",
                    }} />
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={label}>Sort Order</span>
                  <input style={input} type="number" value={editingT.sort_order ?? 0} onChange={e => setEditingT(t => ({ ...t!, sort_order: Number(e.target.value) }))} />
                </div>
                <div>
                  <span style={label}>Status</span>
                  <select style={{ ...input }} value={editingT.is_active ? "true" : "false"} onChange={e => setEditingT(t => ({ ...t!, is_active: e.target.value === "true" }))}>
                    <option value="true">Active (shown)</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={saveTestimonial} disabled={savingT} style={{ ...btn("linear-gradient(135deg,#1E88E5,#1565C0)"), flex: 1 }}>
                {savingT ? "Saving…" : editingT.id ? "Update Testimonial" : "Add Testimonial"}
              </button>
              <button onClick={() => setEditingT(null)} style={{ ...btn("#374151"), flex: "0 0 auto" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
