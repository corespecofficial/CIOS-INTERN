import { NextResponse } from "next/server";
import { getRoomMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const url = new URL(req.url);
  const since = url.searchParams.get("since") || undefined;
  const messages = await getRoomMessages(roomId, 80, since);
  return NextResponse.json({ messages });
}
