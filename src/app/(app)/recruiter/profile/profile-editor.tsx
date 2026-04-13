"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { upsertRecruiterProfile } from "@/app/actions/opportunities";
import { getRecruiterBadges } from "@/lib/talent-match";

interface Profile { user_id?: string; company_name: string; company_website: string | null; industry: string | null; company_size: string | null; about: string | null; verified: boolean; company_logo_url: string | null; hires_count?: number; rating?: number }

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export function ProfileEditorClient({ initial }: { initial: Record<string, unknown> | null }) {
  const [p, setP] = useState<Profile>((initial as unknown as Profile) || { company_name: "", company_website: null, industry: null, company_size: null, about: null, verified: false, company_logo_url: null });
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const badges = getRecruiterBadges({ hires_count: p.hires_count, rating: p.rating, verified: p.verified });

  const save = () => start(async () => {
    const res = await upsertRecruiterProfile({
      companyName: p.company_name, companyWebsite: p.company_website || undefined,
      industry: p.industry || undefined, companySize: p.company_size || undefined,
      about: p.about || undefined, companyLogoUrl: p.company_logo_url || undefined,
    });
    if (!res.ok) return toast.error(res.error);
    toast.success("Profile saved");
  });

  const onLogoUpload = async (file: File) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) return toast.error("Cloudinary not configured");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed");
      setP({ ...p, company_logo_url: data.secure_url });
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
      {/* Main editor */}
      <section style={panel}>
        <h3 style={sectionH}>Company identity</h3>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, background: "#0A0E1A", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
            {p.company_logo_url ? <img src={p.company_logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28 }}>🏢</span>}
          </div>
          <div>
            <label style={btnGhost}>{uploading ? "Uploading…" : "⬆ Upload logo"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoUpload(f); e.currentTarget.value = ""; }} />
            </label>
            {p.company_logo_url && <button onClick={() => setP({ ...p, company_logo_url: null })} style={{ ...btnGhost, marginLeft: 6 }}>Remove</button>}
          </div>
        </div>

        <label style={lbl}>Company name *</label>
        <input value={p.company_name} onChange={(e) => setP({ ...p, company_name: e.target.value })} style={{ ...input, width: "100%", marginBottom: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div><label style={lbl}>Website</label><input value={p.company_website || ""} onChange={(e) => setP({ ...p, company_website: e.target.value })} placeholder="https://…" style={{ ...input, width: "100%" }} /></div>
          <div><label style={lbl}>Industry</label><input value={p.industry || ""} onChange={(e) => setP({ ...p, industry: e.target.value })} placeholder="SaaS, finance, media…" style={{ ...input, width: "100%" }} /></div>
        </div>
        <label style={lbl}>Company size</label>
        <select value={p.company_size || ""} onChange={(e) => setP({ ...p, company_size: e.target.value })} style={{ ...input, width: "100%", marginBottom: 10 }}>
          <option value="">—</option><option value="1-10">1–10</option><option value="11-50">11–50</option>
          <option value="51-200">51–200</option><option value="201-1000">201–1,000</option><option value="1000+">1,000+</option>
        </select>
        <label style={lbl}>About your company</label>
        <textarea value={p.about || ""} onChange={(e) => setP({ ...p, about: e.target.value })} rows={5} placeholder="Who you are, what you build, the kind of work your team does…" style={{ ...input, width: "100%", fontFamily: "inherit", resize: "vertical", marginBottom: 14 }} />

        <button onClick={save} disabled={pending || !p.company_name.trim()} style={btnPrimary}>{pending ? "Saving…" : "💾 Save profile"}</button>
      </section>

      {/* Side rail: status + reputation */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={panel}>
          <h3 style={sectionH}>Verification</h3>
          {p.verified ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: "rgba(30,136,229,0.1)", borderRadius: 10, border: "1px solid rgba(30,136,229,0.25)" }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E88E5" }}>Verified business</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>You can post featured opportunities</div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5, margin: "0 0 10px 0" }}>Verification is granted by a Super Admin after reviewing your company details. Verified recruiters can post featured opportunities.</p>
              <button disabled style={{ ...btnGhost, opacity: 0.7 }}>Pending review</button>
            </div>
          )}
        </div>

        <div style={panel}>
          <h3 style={sectionH}>Reputation</h3>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
            <span style={{ color: "#8892A4" }}>Hires made</span><span style={{ color: "#E8EDF5", fontWeight: 700 }}>{p.hires_count || 0}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
            <span style={{ color: "#8892A4" }}>Rating</span><span style={{ color: "#FFC107", fontWeight: 700 }}>{p.rating ? `${p.rating.toFixed(1)} ⭐` : "—"}</span>
          </div>
          <div style={{ fontSize: 11, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginTop: 10, marginBottom: 6 }}>Earned badges</div>
          {badges.length === 0 && <div style={{ fontSize: 12, color: "#5A6478" }}>No badges yet. Post your first opportunity to start earning.</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {badges.map((b) => (
              <span key={b.id} title={b.description} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 99, background: `${b.color}22`, color: b.color, fontWeight: 700, border: `1px solid ${b.color}44` }}>{b.emoji} {b.label}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 };
const sectionH: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px 0" };
const input: React.CSSProperties = { padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 6 };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-block" };
