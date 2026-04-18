import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ServiceStatus = "operational" | "degraded" | "unknown";

interface ServiceResult {
  name: string;
  status: ServiceStatus;
  responseMs?: number;
}

async function pingSupabase(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin()
      .from("users")
      .select("count", { count: "exact", head: true })
      .limit(1);
    const responseMs = Date.now() - start;
    if (error) {
      return { name: "Database (Supabase)", status: "degraded", responseMs };
    }
    return {
      name: "Database (Supabase)",
      status: responseMs < 2000 ? "operational" : "degraded",
      responseMs,
    };
  } catch {
    return { name: "Database (Supabase)", status: "degraded", responseMs: Date.now() - start };
  }
}

export async function GET() {
  const [dbResult] = await Promise.all([pingSupabase()]);

  const services: ServiceResult[] = [
    dbResult,
    {
      name: "Authentication (Clerk)",
      status: !!process.env.CLERK_SECRET_KEY ? "operational" : "unknown",
    },
    {
      name: "Real-time (Ably)",
      status: !!process.env.ABLY_API_KEY ? "operational" : "unknown",
    },
    {
      name: "File Storage (Cloudinary)",
      status:
        !!process.env.CLOUDINARY_API_KEY || !!process.env.CLOUDINARY_URL
          ? "operational"
          : "unknown",
    },
    {
      name: "Payments (Paystack)",
      status: !!process.env.PAYSTACK_SECRET_KEY ? "operational" : "unknown",
    },
    {
      name: "AI Services",
      status: !!process.env.ANTHROPIC_API_KEY ? "operational" : "unknown",
    },
    {
      name: "Email",
      status:
        !!process.env.RESEND_API_KEY || !!process.env.SENDGRID_API_KEY
          ? "operational"
          : "unknown",
    },
  ];

  const allOperational = services.every((s) => s.status === "operational");

  return NextResponse.json(
    {
      services,
      checkedAt: new Date().toISOString(),
      allOperational,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
