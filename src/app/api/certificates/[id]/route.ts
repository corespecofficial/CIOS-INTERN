import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/db";
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { r2IsConfigured, r2Exists, r2Put, r2Url } from "@/lib/r2";
import React from "react";

export const runtime = "nodejs";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const styles = StyleSheet.create({
  page: { backgroundColor: "#0A0E1A", padding: 36, color: "#E8EDF5", fontFamily: "Helvetica" },
  border: { flex: 1, border: "3 solid #1E88E5", borderRadius: 14, padding: 32, alignItems: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 4 },
  logo: { width: 54, height: 54, borderRadius: 27 },
  brand: { fontSize: 10, color: "#8892A4", textAlign: "right", letterSpacing: 1.5 },
  brandStrong: { fontSize: 11, color: "#1E88E5", fontWeight: 700, textAlign: "right", letterSpacing: 1.5 },
  badge: { fontSize: 9, fontWeight: 700, color: "#1E88E5", letterSpacing: 2, marginTop: 18, marginBottom: 6 },
  certTitle: { fontSize: 40, fontWeight: 700, color: "#FFC107", marginBottom: 16, textAlign: "center" },
  phrase: { fontSize: 12, color: "#E8EDF5", textAlign: "center", marginBottom: 4, lineHeight: 1.5 },
  name: { fontSize: 30, fontWeight: 700, color: "#E8EDF5", marginTop: 8, marginBottom: 18, textAlign: "center", borderBottom: "1 solid rgba(255,255,255,0.25)", paddingBottom: 10, width: "72%" },
  courseTitle: { fontSize: 20, fontWeight: 700, color: "#1E88E5", textAlign: "center", marginTop: 8, marginBottom: 4 },
  line: { fontSize: 11, color: "#8892A4", textAlign: "center", marginBottom: 18 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", width: "90%", marginTop: 22 },
  sigCol: { alignItems: "center", flex: 1 },
  sigScript: { fontSize: 22, color: "#FFC107", fontFamily: "Helvetica-Oblique", marginBottom: 4 },
  sigLine: { borderBottom: "1 solid rgba(255,255,255,0.3)", width: 170, marginBottom: 4 },
  sigLabel: { fontSize: 9, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 },
  sigVal: { fontSize: 11, color: "#E8EDF5", fontWeight: 700, marginTop: 2 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", width: "90%", marginTop: 22, paddingTop: 14, borderTop: "1 solid rgba(255,255,255,0.1)" },
  footerColRight: { alignItems: "flex-end" },
  footerLabel: { fontSize: 8, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  footerVal: { fontSize: 10, color: "#E8EDF5", fontWeight: 700 },
  stamp: { position: "absolute", bottom: 26, right: 48, fontSize: 8, color: "#5A6478", fontFamily: "Courier" },
});

interface CertProps {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedDate: string;
  certificateNumber: string;
}

function CertificateDoc(p: CertProps) {
  const h = React.createElement;
  return h(Document, {},
    h(Page, { size: "A4", orientation: "landscape", style: styles.page },
      h(View, { style: styles.border },
        // Top row: logo + brand
        h(View, { style: styles.topRow },
          h(Image, { src: LOGO, style: styles.logo }),
          h(View, {},
            h(Text, { style: styles.brandStrong }, "CIOS · COSPRONOS MEDIA"),
            h(Text, { style: styles.brand }, "× CORESPEC ENGINEERING")
          )
        ),
        h(Text, { style: styles.badge }, "CERTIFICATE OF COMPLETION"),
        h(Text, { style: styles.certTitle }, "Certificate"),
        h(Text, { style: styles.phrase }, "This is to certify that"),
        h(Text, { style: styles.name }, p.studentName),
        h(Text, { style: styles.phrase }, "has successfully completed the course"),
        h(Text, { style: styles.courseTitle }, p.courseTitle),
        h(Text, { style: styles.line }, `on the CIOS AI Internship Operating System · ${p.issuedDate}`),

        // Signatures row
        h(View, { style: styles.sigRow },
          h(View, { style: styles.sigCol },
            h(Text, { style: styles.sigScript }, p.instructorName),
            h(View, { style: styles.sigLine }),
            h(Text, { style: styles.sigLabel }, "Instructor"),
            h(Text, { style: styles.sigVal }, p.instructorName)
          ),
          h(View, { style: styles.sigCol },
            h(Text, { style: styles.sigScript }, "Joshua Agbo"),
            h(View, { style: styles.sigLine }),
            h(Text, { style: styles.sigLabel }, "CEO, COSPRONOS Media"),
            h(Text, { style: styles.sigVal }, "CIOS Platform")
          )
        ),

        h(View, { style: styles.footerRow },
          h(View, {},
            h(Text, { style: styles.footerLabel }, "Issued"),
            h(Text, { style: styles.footerVal }, p.issuedDate)
          ),
          h(View, { style: styles.footerColRight },
            h(Text, { style: styles.footerLabel }, "Certificate ID"),
            h(Text, { style: styles.footerVal }, p.certificateNumber)
          )
        ),
        h(Text, { style: styles.stamp }, `Verify at /verify — ID: ${p.certificateNumber}`)
      )
    )
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("certificates")
    .select("id, certificate_number, issued_at, user:users!certificates_user_id_fkey(id, clerk_id, name), course:courses!certificates_course_id_fkey(id, title, instructor:users!courses_instructor_id_fkey(name))")
    .eq("id", id)
    .single();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  type C = { id: string; certificate_number: string; issued_at: string; user: { id: string; clerk_id: string; name: string } | { id: string; clerk_id: string; name: string }[] | null; course: { id: string; title: string; instructor: { name: string } | { name: string }[] | null } | { id: string; title: string; instructor: { name: string } | { name: string }[] | null }[] | null };
  const d = data as unknown as C;
  const u = Array.isArray(d.user) ? d.user[0] : d.user;
  const c = Array.isArray(d.course) ? d.course[0] : d.course;
  const instr = c?.instructor ? (Array.isArray(c.instructor) ? c.instructor[0] : c.instructor) : null;

  // Auth: only the owner can download their cert
  if (!u || u.clerk_id !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const safeCert = d.certificate_number.replace(/[^A-Za-z0-9-]/g, "");
  const r2Key = `certificates/${safeCert}.pdf`;

  // R2 fast-path: if we've already rendered this cert and stored it, redirect
  // straight to R2 (no Vercel CPU, no bandwidth). Egress on R2 is free.
  if (r2IsConfigured()) {
    try {
      if (await r2Exists(r2Key)) {
        const url = await r2Url(r2Key, 600);
        return NextResponse.redirect(url, { status: 302 });
      }
    } catch (e) { console.warn("[cert] R2 lookup failed, falling back to render:", e); }
  }

  const issued = new Date(d.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const doc = CertificateDoc({
    studentName: u.name || "Student",
    courseTitle: c?.title || "Course",
    instructorName: instr?.name || "CIOS Faculty",
    issuedDate: issued,
    certificateNumber: d.certificate_number,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = await renderToBuffer(doc as any);

  // Persist to R2 in the background so subsequent downloads skip rendering.
  if (r2IsConfigured()) {
    r2Put(r2Key, buf as Buffer, "application/pdf").catch((e) => console.warn("[cert] R2 put failed:", e));
  }

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="CIOS-Certificate-${safeCert}.pdf"`,
    },
  });
}
