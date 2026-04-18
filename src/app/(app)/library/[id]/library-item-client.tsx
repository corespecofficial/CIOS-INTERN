"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { LibraryItem, LibraryReview } from "@/app/actions/library";
import { submitLibraryReview, logLibraryDownload } from "@/app/actions/library";

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  video: "🎬", document: "📄", audio: "🎧",
  link: "🔗", image_gallery: "🖼️", course_notes: "📝",
};

interface Props {
  item: LibraryItem;
  reviews: LibraryReview[];
  userRole: string;
}

export function LibraryItemClient({ item, reviews, userRole }: Props) {
  const router = useRouter();
  const [showPaywall, setShowPaywall] = useState(!item.has_access && item.access_type !== "free");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [pending, start] = useTransition();
  const isAdmin = ["admin", "super_admin"].includes(userRole);

  const stars = item.avg_rating > 0 ? item.avg_rating.toFixed(1) : null;

  function handleAccess() {
    if (item.has_access) {
      if (item.file_url) {
        logLibraryDownload(item.id).catch(() => {});
        window.open(item.file_url, "_blank");
      } else if (item.external_link) {
        window.open(item.external_link, "_blank");
      }
    } else {
      setShowPaywall(true);
    }
  }

  function handleReviewSubmit() {
    start(async () => {
      const res = await submitLibraryReview(item.id, reviewRating, reviewBody);
      if (res.ok) { toast.success("Review submitted!"); setShowReviewForm(false); setReviewBody(""); }
      else toast.error(res.error);
    });
  }

  const accessBtnLabel = item.has_access
    ? item.resource_type === "video" ? "▶️ Watch Now"
    : item.resource_type === "audio" ? "🎧 Listen Now"
    : item.download_allowed ? "⬇️ Download"
    : "🔗 Open Resource"
    : `🔒 Unlock — ${item.currency === "NGN" ? "₦" : "$"}${Number(item.price).toLocaleString()}`;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        .li-back { background: none; border: none; color: #5A6478; cursor: pointer; font-size: 13px; font-family: 'Nunito', sans-serif; display: flex; align-items: center; gap: 6px; padding: 0; margin-bottom: 20px; }
        .li-back:hover { color: #E8EDF5; }

        .li-hero { display: grid; grid-template-columns: 1fr 320px; gap: 24px; margin-bottom: 24px; }
        .li-thumb { border-radius: 18px; overflow: hidden; background: linear-gradient(135deg, #1a2035, #0d1117); aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; font-size: 72px; }
        .li-thumb img { width: 100%; height: 100%; object-fit: cover; }

        .li-info { display: flex; flex-direction: column; gap: 12px; }
        .li-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .li-title { font-size: 22px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; line-height: 1.3; }
        .li-instructor { font-size: 13px; color: #8892A4; }
        .li-rating-row { display: flex; align-items: center; gap: 8px; }
        .li-stars { color: #FFC107; font-size: 14px; font-weight: 700; }
        .li-stat { font-size: 12px; color: #5A6478; }

        .li-price-block { background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; }
        .li-price-num { font-size: 28px; font-weight: 800; color: #FFC107; font-family: 'Space Grotesk', sans-serif; }
        .li-price-free { font-size: 28px; font-weight: 800; color: #66BB6A; font-family: 'Space Grotesk', sans-serif; }
        .li-access-btn { width: 100%; padding: 15px; border: none; border-radius: 12px; background: linear-gradient(135deg, #1E88E5, #AB47BC); color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'Space Grotesk', sans-serif; margin-top: 12px; transition: opacity 0.2s; }
        .li-access-btn:hover { opacity: 0.9; }
        .li-access-btn-free { background: linear-gradient(135deg, #43A047, #1B5E20) !important; }
        .li-features { list-style: none; padding: 0; margin: 14px 0 0; font-size: 13px; color: #8892A4; display: flex; flex-direction: column; gap: 7px; }
        .li-features li { display: flex; align-items: center; gap: 8px; }

        .li-card { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; }
        .li-card-head { font-size: 11px; font-weight: 700; color: #5A6478; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }
        .li-desc { font-size: 14px; color: #9CA3AF; line-height: 1.8; white-space: pre-wrap; }
        .li-tags { display: flex; flex-wrap: wrap; gap: 7px; }
        .li-tag { padding: 4px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; font-size: 11px; color: #8892A4; }

        /* Reviews */
        .li-review { padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .li-review:last-child { border-bottom: none; }
        .li-review-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .li-reviewer { font-size: 13px; font-weight: 700; color: #E8EDF5; }
        .li-review-stars { color: #FFC107; font-size: 13px; }
        .li-review-body { font-size: 13px; color: #8892A4; line-height: 1.6; }

        /* Paywall modal */
        .li-paywall-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .li-paywall { background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; padding: 32px; max-width: 460px; width: 100%; }
        .li-paywall-title { font-size: 20px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; margin-bottom: 6px; }
        .li-paywall-sub { font-size: 13px; color: #8892A4; margin-bottom: 20px; }
        .li-paywall-price { font-size: 36px; font-weight: 800; color: #FFC107; font-family: 'Space Grotesk', sans-serif; margin-bottom: 20px; }

        @media (max-width: 700px) {
          .li-hero { grid-template-columns: 1fr; }
          .li-title { font-size: 18px; }
          .li-card { padding: 16px; }
        }
      `}</style>

      <button className="li-back" onClick={() => router.push("/library")}>← Back to Library</button>

      <div className="li-hero">
        {/* Left: thumbnail */}
        <div className="li-thumb">
          {item.thumbnail_url
            ? <img src={item.thumbnail_url} alt={item.title} />
            : <span>{RESOURCE_TYPE_ICONS[item.resource_type] ?? "📚"}</span>
          }
        </div>

        {/* Right: info + action */}
        <div className="li-info">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="li-badge" style={{ background: "rgba(30,136,229,0.15)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.2)" }}>
              {RESOURCE_TYPE_ICONS[item.resource_type]} {item.resource_type.replace("_", " ")}
            </span>
            <span className="li-badge" style={{ background: "rgba(102,187,106,0.12)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.2)" }}>
              {item.category_icon} {item.category_name}
            </span>
          </div>

          <h1 className="li-title">{item.title}</h1>
          <div className="li-instructor">by {item.uploader_name}</div>

          <div className="li-rating-row">
            <span className="li-stars">{stars ? `★ ${stars}` : "No ratings yet"}</span>
            {item.review_count > 0 && <span className="li-stat">({item.review_count} reviews)</span>}
            <span className="li-stat">·</span>
            <span className="li-stat">{item.view_count.toLocaleString()} views</span>
            {item.download_allowed && <span className="li-stat">· {item.download_count.toLocaleString()} downloads</span>}
          </div>

          <div className="li-price-block">
            {item.access_type === "free"
              ? <div className="li-price-free">Free</div>
              : item.has_access
              ? <div className="li-price-free">✓ You own this</div>
              : <div className="li-price-num">{item.currency === "NGN" ? "₦" : "$"}{Number(item.price).toLocaleString()}</div>
            }

            <button
              className={`li-access-btn${item.access_type === "free" || item.has_access ? " li-access-btn-free" : ""}`}
              onClick={handleAccess}
            >
              {accessBtnLabel}
            </button>

            <ul className="li-features">
              {item.download_allowed && <li>⬇️ Downloadable</li>}
              {item.duration_minutes && <li>⏱️ {item.duration_minutes} min</li>}
              <li>♾️ Lifetime access</li>
              <li>📱 Mobile + Desktop</li>
              {isAdmin && <li>👁️ {item.view_count} views</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div className="li-card">
          <div className="li-card-head">📋 About this Resource</div>
          <p className="li-desc">{item.description}</p>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="li-card">
          <div className="li-card-head">🏷️ Tags</div>
          <div className="li-tags">
            {item.tags.map((tag) => <span key={tag} className="li-tag">{tag}</span>)}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="li-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="li-card-head" style={{ margin: 0 }}>⭐ Reviews ({reviews.length})</div>
          {item.has_access && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)} style={{ padding: "6px 14px", background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 8, color: "#FFC107", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              + Write Review
            </button>
          )}
        </div>

        {showReviewForm && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setReviewRating(n)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: n <= reviewRating ? "#FFC107" : "#5A6478" }}>★</button>
              ))}
            </div>
            <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="Share your thoughts…" style={{ width: "100%", minHeight: 80, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8EDF5", fontSize: 13, padding: "10px 12px", fontFamily: "'Nunito', sans-serif", resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={handleReviewSubmit} disabled={pending} style={{ padding: "8px 18px", background: "#1E88E5", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                {pending ? "Submitting…" : "Submit Review"}
              </button>
              <button onClick={() => setShowReviewForm(false)} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8892A4", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div style={{ textAlign: "center", color: "#5A6478", padding: "20px 0", fontSize: 13 }}>No reviews yet. Be the first!</div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="li-review">
              <div className="li-review-header">
                <span className="li-reviewer">{rev.reviewer_name}</span>
                <span className="li-review-stars">{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
              </div>
              {rev.body && <p className="li-review-body">{rev.body}</p>}
            </div>
          ))
        )}
      </div>

      {/* Paywall modal */}
      {showPaywall && !item.has_access && (
        <div className="li-paywall-overlay" onClick={() => setShowPaywall(false)}>
          <div className="li-paywall" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
            <div className="li-paywall-title">Premium Resource</div>
            <div className="li-paywall-sub">{item.title} — one-time purchase, lifetime access</div>
            <div className="li-paywall-price">{item.currency === "NGN" ? "₦" : "$"}{Number(item.price).toLocaleString()}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", fontSize: 13, color: "#8892A4", display: "flex", flexDirection: "column", gap: 7 }}>
              <li>⬇️ {item.download_allowed ? "Downloadable file" : "Stream / view online"}</li>
              <li>♾️ Lifetime access after purchase</li>
              <li>📱 Access on any device</li>
              <li>🔒 Secure payment via Paystack</li>
            </ul>
            <button
              style={{ width: "100%", padding: 15, background: "linear-gradient(135deg,#FFC107,#FF7043)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
              onClick={() => toast("Payment integration coming soon — contact admin.", { icon: "💳" })}
            >
              Pay {item.currency === "NGN" ? "₦" : "$"}{Number(item.price).toLocaleString()} Now
            </button>
            <button onClick={() => setShowPaywall(false)} style={{ width: "100%", padding: 12, marginTop: 10, background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#5A6478", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
