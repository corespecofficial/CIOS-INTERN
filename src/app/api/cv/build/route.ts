import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentDbUser } from "@/lib/db";
import { CvWizardPdf } from "@/components/cv/cv-wizard-pdf";
import type { CvFormPayload, CvPolished } from "@/app/actions/cv-builder";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const me = await getCurrentDbUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { payload: CvFormPayload; polished: CvPolished };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.payload?.fullName || !body.polished) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  try {
    const buffer = await renderToBuffer(
      React.createElement(CvWizardPdf, { payload: body.payload, polished: body.polished }),
    );

    const safeName = body.payload.fullName.replace(/[^a-z0-9]+/gi, "-") || "CV";
    const filename = `${safeName}-CV-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
