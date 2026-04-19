"use server";

import { getCurrentDbUser, getMyCoursesAsInstructor, supabaseAdmin } from "@/lib/db";
import type { CourseFull } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

const PLATFORM_FEE = 0.15;

export interface CourseEarningRow {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: string;
  price_naira: number;
  enrollments: number;
  gross_revenue: number;
  platform_fee: number;
  net_earnings: number;
}

export interface WithdrawalRow {
  id: string;
  amount_ngn: number;
  status: string;
  requested_at: string;
  admin_note: string | null;
}

export interface InstructorEarningsSummary {
  wallet_balance: number;
  month_earnings: number;
  month_fines: number;
  total_course_revenue: number;
  pending_withdrawals: number;
  courses: CourseEarningRow[];
  withdrawals: WithdrawalRow[];
}

export async function getInstructorEarnings(): Promise<R<InstructorEarningsSummary>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    const sb = supabaseAdmin();
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const [courses, txRes, wdRes] = await Promise.all([
      getMyCoursesAsInstructor(),
      sb
        .from("transactions")
        .select("type, amount")
        .eq("user_id", me.id)
        .gte("created_at", since),
      sb
        .from("withdrawal_requests")
        .select("id, amount_ngn, status, requested_at, admin_note")
        .eq("user_id", me.id)
        .order("requested_at", { ascending: false })
        .limit(20),
    ]);

    const CREDIT_TYPES = new Set(["credit", "stipend", "bonus", "refund", "reward"]);
    let month_earnings = 0, month_fines = 0;
    for (const t of (txRes.data ?? []) as Array<{ type: string; amount: string | number }>) {
      const amt = Number(t.amount);
      if (t.type === "fine") month_fines += amt;
      else if (CREDIT_TYPES.has(t.type)) month_earnings += amt;
    }

    const pending_withdrawals = ((wdRes.data ?? []) as Array<{ status: string; amount_ngn: string | number }>)
      .filter((w) => ["pending", "approved", "processing"].includes(w.status))
      .reduce((s, w) => s + Number(w.amount_ngn), 0);

    const courseRows: CourseEarningRow[] = (courses as CourseFull[]).map((c) => {
      const gross = (c.price_naira ?? 0) * (c.total_enrolled ?? 0);
      const fee = Math.round(gross * PLATFORM_FEE);
      return {
        id: c.id,
        title: c.title,
        thumbnail_url: c.thumbnail_url,
        status: c.status,
        price_naira: c.price_naira ?? 0,
        enrollments: c.total_enrolled ?? 0,
        gross_revenue: gross,
        platform_fee: fee,
        net_earnings: gross - fee,
      };
    });

    const total_course_revenue = courseRows.reduce((s, r) => s + r.net_earnings, 0);

    return {
      ok: true,
      data: {
        wallet_balance: Number(me.wallet_balance ?? 0),
        month_earnings,
        month_fines,
        total_course_revenue,
        pending_withdrawals,
        courses: courseRows,
        withdrawals: (wdRes.data ?? []) as WithdrawalRow[],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
