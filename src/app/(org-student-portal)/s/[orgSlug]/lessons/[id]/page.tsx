import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { CompleteToggle } from "./complete-toggle";

export const dynamic = "force-dynamic";

interface Lesson { id: string; title: string; body: string | null; video_url: string | null; position: number; }

export default async function StudentLessonView({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const me = await getCurrentDbUser();

  const [lessonRes, completionRes] = await Promise.all([
    sb.from("org_lessons")
      .select("id, title, body, video_url, position")
      .eq("id", id)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    me
      ? sb.from("org_lesson_completions")
          .select("id")
          .eq("user_id", me.id)
          .eq("lesson_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const lesson = lessonRes.data as Lesson | null;
  if (!lesson) notFound();
  const isDone = !!completionRes.data;

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href={`/s/${orgSlug}/lessons`} style={{ fontSize: 12, color: "#5A6478", textDecoration: "none" }}>← All lessons</Link>
      <article style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Lesson {lesson.position || "—"}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 18px 0" }}>{lesson.title}</h1>
        {lesson.video_url && (
          <div style={{ marginBottom: 18 }}>
            <a href={lesson.video_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "8px 14px", background: "#26A69A", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              🎬 Watch video
            </a>
          </div>
        )}
        {lesson.body ? (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#C7CFD8", fontSize: 14 }}>{lesson.body}</div>
        ) : (
          <div style={{ color: "#5A6478", fontSize: 13, fontStyle: "italic" }}>(No notes provided.)</div>
        )}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <CompleteToggle orgId={ctx.org.id} lessonId={lesson.id} initialDone={isDone} />
        </div>
      </article>
    </div>
  );
}
