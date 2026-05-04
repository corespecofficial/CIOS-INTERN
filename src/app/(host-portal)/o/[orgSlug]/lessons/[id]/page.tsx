import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { LessonEditor } from "./lesson-editor";

export const dynamic = "force-dynamic";

interface Lesson {
  id: string;
  org_id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  position: number;
}

export default async function LessonPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const isHost = ctx.isSuperAdmin || (ctx.memberRole && ["owner", "org_admin", "instructor"].includes(ctx.memberRole));

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_lessons")
    .select("id, org_id, title, body, video_url, position")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  const lesson = data as Lesson | null;
  if (!lesson) notFound();

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href={`/o/${orgSlug}/lessons`} style={{ fontSize: 12, color: "#5A6478", textDecoration: "none" }}>
        ← All lessons
      </Link>
      {isHost ? (
        <LessonEditor orgId={ctx.org.id} lesson={lesson} />
      ) : (
        <article style={{ marginTop: 16 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px 0" }}>{lesson.title}</h1>
          {lesson.video_url && (
            <div style={{ marginBottom: 16, fontSize: 13 }}>
              <a href={lesson.video_url} target="_blank" rel="noreferrer" style={{ color: "#26A69A" }}>🎬 Watch video</a>
            </div>
          )}
          {lesson.body && (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#C7CFD8", fontSize: 14 }}>{lesson.body}</div>
          )}
        </article>
      )}
    </div>
  );
}
