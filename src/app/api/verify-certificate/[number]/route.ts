import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const safe = (number || "").trim();
  if (!safe) return NextResponse.json({ valid: false, error: "no number" }, { status: 400 });

  const { data } = await supabase()
    .from("certificates")
    .select("id, certificate_number, issued_at, user:users!certificates_user_id_fkey(name), course:courses!certificates_course_id_fkey(title, instructor:users!courses_instructor_id_fkey(name))")
    .eq("certificate_number", safe)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ valid: false });
  }

  type D = { id: string; certificate_number: string; issued_at: string; user: { name: string } | { name: string }[] | null; course: { title: string; instructor: { name: string } | { name: string }[] | null } | { title: string; instructor: { name: string } | { name: string }[] | null }[] | null };
  const d = data as unknown as D;
  const u = Array.isArray(d.user) ? d.user[0] : d.user;
  const c = Array.isArray(d.course) ? d.course[0] : d.course;
  const instr = c?.instructor ? (Array.isArray(c.instructor) ? c.instructor[0] : c.instructor) : null;

  return NextResponse.json({
    valid: true,
    id: d.id,
    certificateNumber: d.certificate_number,
    studentName: u?.name || "Unknown",
    courseTitle: c?.title || "Unknown",
    instructorName: instr?.name || "CIOS Faculty",
    issuedAt: d.issued_at,
  });
}
