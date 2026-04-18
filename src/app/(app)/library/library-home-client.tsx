"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LibraryItem, LibraryCategory } from "@/app/actions/library";

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  video: "🎬", document: "📄", audio: "🎧",
  link: "🔗", image_gallery: "🖼️", course_notes: "📝",
};

const ACCESS_COLORS: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  free:           { color: "#66BB6A", bg: "rgba(102,187,106,0.15)", label: "Free",         icon: "🆓" },
  paid:           { color: "#FFC107", bg: "rgba(255,193,7,0.15)",   label: "Paid",         icon: "💰" },
  subscription:   { color: "#AB47BC", bg: "rgba(171,71,188,0.15)",  label: "Subscription", icon: "⭐" },
  role_restricted:{ color: "#1E88E5", bg: "rgba(30,136,229,0.15)",  label: "Restricted",   icon: "🔒" },
  reward_unlocked:{ color: "#FF7043", bg: "rgba(255,112,67,0.15)",  label: "Earn & Unlock",icon: "🏆" },
};

interface Props {
  items: LibraryItem[];
  categories: LibraryCategory[];
  userRole: string;
}

export function LibraryHomeClient({ items, categories, userRole }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [filterAccess, setFilterAccess] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rating">("newest");
  const isAdmin = ["admin", "super_admin", "instructor"].includes(userRole);

  const featured = items.filter((i) => i.featured);

  const filtered = useMemo(() => {
    let list = [...items];
    if (activeCategory !== "all") list = list.filter((i) => i.category_slug === activeCategory);
    if (filterAccess !== "all") list = list.filter((i) => i.access_type === filterAccess);
    if (filterType !== "all") list = list.filter((i) => i.resource_type === filterType);
    if (search) list = list.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()) || (i.description ?? "").toLowerCase().includes(search.toLowerCase()));
    if (sortBy === "popular") list.sort((a, b) => b.view_count - a.view_count);
    else if (sortBy === "rating") list.sort((a, b) => b.avg_rating - a.avg_rating);
    return list;
  }, [items, activeCategory, filterAccess, filterType, search, sortBy]);

  const freeCount = items.filter((i) => i.access_type === "free").length;
  const paidCount = items.filter((i) => i.access_type === "paid").length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        /* ── Library ── */
        .lib-hero { background: linear-gradient(135deg, #0D1117 0%, rgba(30,136,229,0.08) 50%, rgba(171,71,188,0.06) 100%); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 36px 32px 28px; margin-bottom: 24px; position: relative; overflow: hidden; }
        .lib-hero::before { content: ''; position: absolute; top: -60px; right: -60px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(30,136,229,0.12), transparent 70%); pointer-events: none; }
        .lib-hero::after  { content: ''; position: absolute; bottom: -40px; left: 20%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(171,71,188,0.08), transparent 70%); pointer-events: none; }
        .lib-hero-title { font-size: 32px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; margin: 0 0 6px; }
        .lib-hero-sub { font-size: 14px; color: #8892A4; margin: 0 0 24px; }

        .lib-search-wrap { position: relative; max-width: 560px; }
        .lib-search { width: 100%; padding: 14px 20px 14px 46px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; color: #E8EDF5; font-size: 14px; font-family: 'Nunito', sans-serif; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .lib-search:focus { border-color: rgba(30,136,229,0.5); }
        .lib-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #5A6478; font-size: 16px; pointer-events: none; }
        .lib-search::placeholder { color: #5A6478; }

        .lib-stats-row { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
        .lib-stat { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 10px 18px; font-size: 12px; color: #8892A4; display: flex; align-items: center; gap: 6px; }
        .lib-stat strong { color: #E8EDF5; font-size: 15px; font-weight: 800; }

        /* Category pills */
        .lib-cats { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 16px; scrollbar-width: none; }
        .lib-cats::-webkit-scrollbar { display: none; }
        .lib-cat { padding: 8px 16px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #8892A4; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: 'Nunito', sans-serif; transition: all 0.2s; display: flex; align-items: center; gap: 5px; }
        .lib-cat-active { background: #1E88E5 !important; border-color: #1E88E5 !important; color: #fff !important; }
        .lib-cat:hover:not(.lib-cat-active) { border-color: rgba(255,255,255,0.2); color: #E8EDF5; }

        /* Filters row */
        .lib-filters { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
        .lib-filter-select { padding: 8px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #E8EDF5; font-size: 12px; font-family: 'Nunito', sans-serif; cursor: pointer; outline: none; }
        .lib-filter-select option { background: #1a2035; }
        .lib-result-count { font-size: 12px; color: #5A6478; margin-left: auto; }

        /* Featured strip */
        .lib-featured-strip { margin-bottom: 28px; }
        .lib-section-label { font-size: 11px; font-weight: 700; color: #5A6478; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .lib-section-label::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .lib-featured-scroll { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .lib-featured-scroll::-webkit-scrollbar { display: none; }

        /* Cards */
        .lib-card { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; cursor: pointer; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; flex-shrink: 0; }
        .lib-card:hover { transform: translateY(-3px); border-color: rgba(30,136,229,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .lib-card-featured { width: 240px; }
        .lib-card-thumb { width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #1a2035, #0d1117); display: flex; align-items: center; justify-content: center; font-size: 40px; position: relative; overflow: hidden; }
        .lib-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .lib-card-access { position: absolute; top: 8px; right: 8px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
        .lib-card-type  { position: absolute; bottom: 8px; left: 8px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,0.6); color: #E8EDF5; }
        .lib-card-body { padding: 14px; }
        .lib-card-cat { font-size: 10px; color: #5A6478; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 5px; }
        .lib-card-title { font-size: 13px; font-weight: 700; color: #E8EDF5; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .lib-card-instructor { font-size: 11px; color: #5A6478; margin-top: 6px; }
        .lib-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .lib-card-rating { font-size: 11px; color: #FFC107; font-weight: 700; }
        .lib-card-price { font-size: 12px; font-weight: 800; color: #FFC107; }
        .lib-card-free  { font-size: 12px; font-weight: 800; color: #66BB6A; }
        .lib-card-lock  { font-size: 12px; color: #5A6478; }

        /* Grid */
        .lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .lib-grid-card { width: 100%; }

        /* Empty */
        .lib-empty { background: #111827; border: 1px dashed rgba(255,255,255,0.08); border-radius: 20px; padding: 60px 24px; text-align: center; color: #5A6478; }

        /* Admin bar */
        .lib-admin-bar { background: linear-gradient(135deg, rgba(30,136,229,0.1), rgba(171,71,188,0.07)); border: 1px solid rgba(30,136,229,0.2); border-radius: 14px; padding: 14px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

        @media (max-width: 640px) {
          .lib-hero { padding: 22px 18px 20px; border-radius: 18px; }
          .lib-hero-title { font-size: 24px; }
          .lib-hero::before, .lib-hero::after { display: none; }
          .lib-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
          .lib-filters { gap: 8px; }
          .lib-stats-row { gap: 8px; }
        }
      `}</style>

      {/* Admin bar */}
      {isAdmin && (
        <div className="lib-admin-bar">
          <span style={{ fontSize: 13, color: "#1E88E5", fontWeight: 700 }}>🛠️ Instructor Mode</span>
          <button onClick={() => router.push("/library/upload")} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            + Upload Resource
          </button>
          <button onClick={() => router.push("/library/admin")} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#E8EDF5", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            Manage Library
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="lib-hero">
        <h1 className="lib-hero-title">📚 Resource Library</h1>
        <p className="lib-hero-sub">Your digital vault for courses, notes, videos, and premium learning content</p>

        <div className="lib-search-wrap">
          <span className="lib-search-icon">🔍</span>
          <input className="lib-search" placeholder="Search resources, topics, instructors…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="lib-stats-row">
          <div className="lib-stat"><strong>{items.length}</strong> Resources</div>
          <div className="lib-stat"><strong>{freeCount}</strong> Free</div>
          <div className="lib-stat"><strong>{paidCount}</strong> Premium</div>
          <div className="lib-stat"><strong>{categories.length}</strong> Categories</div>
          <button onClick={() => router.push("/library/my-purchases")} style={{ padding: "10px 18px", background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 10, color: "#FFC107", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            🛒 My Purchases
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="lib-cats">
        <button className={`lib-cat${activeCategory === "all" ? " lib-cat-active" : ""}`} onClick={() => setActiveCategory("all")}>
          🌐 All
        </button>
        {categories.map((cat) => (
          <button key={cat.slug} className={`lib-cat${activeCategory === cat.slug ? " lib-cat-active" : ""}`} onClick={() => setActiveCategory(cat.slug)}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="lib-filters">
        <select className="lib-filter-select" value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)}>
          <option value="all">All Access</option>
          <option value="free">Free Only</option>
          <option value="paid">Paid</option>
          <option value="subscription">Subscription</option>
        </select>
        <select className="lib-filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="video">🎬 Video</option>
          <option value="document">📄 Document</option>
          <option value="audio">🎧 Audio</option>
          <option value="link">🔗 Link</option>
          <option value="course_notes">📝 Notes</option>
        </select>
        <select className="lib-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="newest">Newest First</option>
          <option value="popular">Most Popular</option>
          <option value="rating">Top Rated</option>
        </select>
        <span className="lib-result-count">{filtered.length} results</span>
      </div>

      {/* Featured strip */}
      {featured.length > 0 && !search && activeCategory === "all" && (
        <div className="lib-featured-strip">
          <div className="lib-section-label">⭐ Featured Resources</div>
          <div className="lib-featured-scroll">
            {featured.map((item) => (
              <ResourceCard key={item.id} item={item} featured onClick={() => router.push(`/library/${item.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      {filtered.length > 0 ? (
        <>
          <div className="lib-section-label">
            {activeCategory === "all" ? "📖 All Resources" : `${categories.find((c) => c.slug === activeCategory)?.icon ?? "📚"} ${categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory}`}
          </div>
          <div className="lib-grid">
            {filtered.map((item) => (
              <ResourceCard key={item.id} item={item} onClick={() => router.push(`/library/${item.id}`)} />
            ))}
          </div>
        </>
      ) : (
        <div className="lib-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#E8EDF5" }}>No resources found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search or category</div>
        </div>
      )}
    </div>
  );
}

function ResourceCard({ item, featured, onClick }: { item: LibraryItem; featured?: boolean; onClick: () => void }) {
  const access = ACCESS_COLORS[item.access_type] ?? ACCESS_COLORS.free;
  const stars = item.avg_rating > 0 ? "★".repeat(Math.round(item.avg_rating)) + "☆".repeat(5 - Math.round(item.avg_rating)) : null;

  return (
    <div className={`lib-card${featured ? " lib-card-featured" : " lib-grid-card"}`} onClick={onClick}>
      <div className="lib-card-thumb">
        {item.thumbnail_url
          ? <img src={item.thumbnail_url} alt={item.title} />
          : <span style={{ fontSize: featured ? 44 : 36 }}>{RESOURCE_TYPE_ICONS[item.resource_type] ?? "📚"}</span>
        }
        <span className="lib-card-access" style={{ background: access.bg, color: access.color }}>{access.icon} {access.label}</span>
        <span className="lib-card-type">{RESOURCE_TYPE_ICONS[item.resource_type]} {item.resource_type.replace("_", " ")}</span>
      </div>
      <div className="lib-card-body">
        <div className="lib-card-cat">{item.category_icon} {item.category_name}</div>
        <div className="lib-card-title">{item.title}</div>
        <div className="lib-card-instructor">by {item.uploader_name}</div>
        <div className="lib-card-footer">
          <span className="lib-card-rating">{stars ?? "No ratings"} {item.review_count > 0 && `(${item.review_count})`}</span>
          {item.access_type === "free"
            ? <span className="lib-card-free">Free</span>
            : item.has_access
            ? <span style={{ fontSize: 12, color: "#66BB6A", fontWeight: 700 }}>✓ Owned</span>
            : item.access_type === "paid"
            ? <span className="lib-card-price">{item.currency === "NGN" ? "₦" : "$"}{Number(item.price).toLocaleString()}</span>
            : <span className="lib-card-lock">🔒</span>
          }
        </div>
      </div>
    </div>
  );
}
