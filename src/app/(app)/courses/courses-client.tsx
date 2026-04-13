"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo } from "react";
import Link from "next/link";
import type { CourseFull } from "@/lib/db";

interface Enrolled extends CourseFull { progress: number; status_enrollment: string; completed_modules: string[]; }

export function CoursesClient({
  published, enrolled, mine, role,
}: {
  published: CourseFull[];
  enrolled: Enrolled[];
  mine: CourseFull[];
  role: string;
}) {
  const [tab, setTab] = useState<"browse" | "enrolled" | "mine">(enrolled.length > 0 ? "enrolled" : "browse");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");

  const canInstruct = role === "instructor" || role === "admin" || role === "super_admin";
  const categories = useMemo(() => Array.from(new Set(published.map((c) => c.category))), [published]);

  const filteredPublished = useMemo(() => {
    return published.filter((c) => {
      if (query && !c.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (category !== "all" && c.category !== category) return false;
      if (level !== "all" && c.difficulty !== level) return false;
      return true;
    });
  }, [published, query, category, level]);

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30,136,229,0.15), rgba(171,71,188,0.08))",
        border: "1px solid rgba(30,136,229,0.2)",
        borderRadius: 18, padding: "20px 24px", marginBottom: 18,
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 36 }}>🎓</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.18)", color: "#1E88E5", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>
            LEARNING HUB
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Courses</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>
            {enrolled.length} enrolled · {published.length} available{canInstruct ? ` · ${mine.length} of yours` : ""}
          </p>
        </div>
        {canInstruct && (
          <Link href="/instructor/create-course" style={btnPrimary}>+ Create course</Link>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <TabBtn active={tab === "enrolled"} onClick={() => setTab("enrolled")}>📖 Continue learning ({enrolled.length})</TabBtn>
        <TabBtn active={tab === "browse"} onClick={() => setTab("browse")}>🔍 Browse catalog ({published.length})</TabBtn>
        {canInstruct && <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>🎤 My courses ({mine.length})</TabBtn>}
      </div>

      {tab === "enrolled" && (
        <>
          {enrolled.length === 0 ? (
            <EmptyState icon="📚" text="You haven't enrolled in any course yet." action={<button onClick={() => setTab("browse")} style={btnPrimary}>Browse catalog</button>} />
          ) : (
            <div style={grid3}>
              {enrolled.map((c) => (
                <CourseCard key={c.id} course={c} progress={c.progress} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "browse" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 Search courses..." style={{ ...input, flex: 1, minWidth: 220 }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={level} onChange={(e) => setLevel(e.target.value)} style={input}>
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          {filteredPublished.length === 0 ? (
            <EmptyState icon="🔎" text="No courses match your filters." />
          ) : (
            <div style={grid3}>
              {filteredPublished.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          )}
        </>
      )}

      {tab === "mine" && canInstruct && (
        <>
          {mine.length === 0 ? (
            <EmptyState icon="🎤" text="You haven't created any courses yet." action={<Link href="/instructor/create-course" style={btnPrimary}>+ Create your first course</Link>} />
          ) : (
            <div style={grid3}>
              {mine.map((c) => <CourseCard key={c.id} course={c} asInstructor />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#1E88E5" : "#111827",
        color: active ? "#fff" : "#8892A4",
        border: active ? "none" : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10, padding: "9px 16px",
        fontSize: 12, fontWeight: 700, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, text, action }: { icon: string; text: string; action?: React.ReactNode }) {
  return (
    <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 14, color: "#8892A4", margin: "0 0 16px 0" }}>{text}</p>
      {action}
    </div>
  );
}

function CourseCard({ course, progress, asInstructor }: { course: CourseFull; progress?: number; asInstructor?: boolean }) {
  const href = asInstructor ? `/instructor/course-builder/${course.id}` : `/courses/${course.id}`;
  const priceLabel = course.price_naira === 0
    ? "Free"
    : course.discount_naira != null
    ? `₦${course.discount_naira.toLocaleString()}`
    : `₦${course.price_naira.toLocaleString()}`;
  const hasDiscount = course.price_naira > 0 && course.discount_naira != null && course.discount_naira < course.price_naira;

  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column", background: "#111827",
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden",
      textDecoration: "none", color: "inherit",
    }}>
      <div style={{ aspectRatio: "16/9", background: "#0A0E1A", position: "relative", overflow: "hidden" }}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, background: "linear-gradient(135deg, #1E88E5, #AB47BC)" }}>
            📚
          </div>
        )}
        {asInstructor && course.status !== "published" && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,193,7,0.9)", color: "#111827", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {course.status}
          </div>
        )}
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", letterSpacing: 0.5 }}>{course.category}</span>
          <span style={{ fontSize: 10, color: "#8892A4" }}>·</span>
          <span style={{ fontSize: 10, color: "#8892A4", textTransform: "capitalize" }}>{course.difficulty}</span>
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {course.title}
        </h3>
        {course.instructor_name && (
          <div style={{ fontSize: 11, color: "#8892A4" }}>by {course.instructor_name}</div>
        )}
        <div style={{ flex: 1 }} />
        {typeof progress === "number" && (
          <>
            <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #1E88E5, #66BB6A)" }} />
            </div>
            <div style={{ fontSize: 10, color: "#8892A4" }}>{progress}% complete</div>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <div style={{ fontSize: 11, color: "#8892A4" }}>
            {course.total_modules} lesson{course.total_modules === 1 ? "" : "s"} · {course.total_enrolled} student{course.total_enrolled === 1 ? "" : "s"}
          </div>
          <div style={{ textAlign: "right" }}>
            {hasDiscount && <span style={{ fontSize: 10, color: "#5A6478", textDecoration: "line-through", marginRight: 4 }}>₦{course.price_naira.toLocaleString()}</span>}
            <span style={{ fontSize: 13, fontWeight: 700, color: course.price_naira === 0 ? "#66BB6A" : "#FFC107" }}>{priceLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 };
const input: React.CSSProperties = {
  background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "10px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block",
};
