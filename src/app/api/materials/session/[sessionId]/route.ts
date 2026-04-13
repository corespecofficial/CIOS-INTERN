import { NextResponse } from "next/server";
import { listMaterialsForSession } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const materials = await listMaterialsForSession(sessionId);
  return NextResponse.json({ materials });
}
