import { NextResponse } from "next/server";
import { getMyModuleSubmission } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await params;
  const submission = await getMyModuleSubmission(moduleId);
  return NextResponse.json({ submission });
}
