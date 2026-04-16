"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type TxRow = {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  currency: string;
  gateway: string;
  gateway_ref: string | null;
  balance_after: number;
  created_at: string;
};

export type TxPage = {
  rows: TxRow[];
  total: number;
  hasMore: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// getTransactions — paginated, filterable transaction history for the current user
// ─────────────────────────────────────────────────────────────────────────────
export async function getTransactions(opts?: {
  page?: number;
  pageSize?: number;
  type?: string;  // credit | debit | fine | reward | all
}): Promise<R<TxPage>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    const page = Math.max(1, opts?.page ?? 1);
    const size = Math.min(50, opts?.pageSize ?? 20);
    const from = (page - 1) * size;

    const sb = supabaseAdmin();
    let q = sb
      .from("transactions")
      .select("id, type, amount, description, status, currency, gateway, gateway_ref, balance_after, created_at", { count: "exact" })
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);

    if (opts?.type && opts.type !== "all") {
      const CREDIT_TYPES = ["credit", "reward", "stipend", "bonus", "refund"];
      const DEBIT_TYPES = ["debit", "fine", "payment"];
      if (opts.type === "credit") q = q.in("type", CREDIT_TYPES);
      else if (opts.type === "debit") q = q.in("type", DEBIT_TYPES);
      else q = q.eq("type", opts.type);
    }

    const { data, count, error } = await q;
    if (error) throw error;

    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      type: r.type as string,
      amount: Number(r.amount),
      description: r.description as string,
      status: (r.status as string) ?? "completed",
      currency: (r.currency as string) ?? "NGN",
      gateway: (r.gateway as string) ?? "internal",
      gateway_ref: r.gateway_ref as string | null,
      balance_after: Number(r.balance_after),
      created_at: r.created_at as string,
    }));

    return {
      ok: true,
      data: {
        rows,
        total: count ?? 0,
        hasMore: from + size < (count ?? 0),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getWalletSummary — balance + 30-day stats (used by wallet page server component)
// ─────────────────────────────────────────────────────────────────────────────
export type WalletSummary = {
  balance: number;
  monthDelta: number;
  monthEarnings: number;
  monthFines: number;
  monthRewards: number;
  pendingWithdrawals: number;
};

export async function getWalletSummary(): Promise<R<WalletSummary>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    const sb = supabaseAdmin();
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const [txRes, wdRes] = await Promise.all([
      sb.from("transactions")
        .select("type, amount")
        .eq("user_id", me.id)
        .gte("created_at", since),
      sb.from("withdrawal_requests")
        .select("amount_ngn")
        .eq("user_id", me.id)
        .in("status", ["pending", "approved", "processing"]),
    ]);

    const txs = (txRes.data ?? []) as Array<{ type: string; amount: string | number }>;
    let monthEarnings = 0, monthFines = 0, monthRewards = 0;
    const CREDIT_TYPES = new Set(["credit", "stipend", "bonus", "refund"]);

    for (const t of txs) {
      const amt = Number(t.amount);
      if (t.type === "fine") monthFines += amt;
      else if (t.type === "reward") monthRewards += amt;
      else if (CREDIT_TYPES.has(t.type)) monthEarnings += amt;
    }

    const monthDelta = monthEarnings + monthRewards - monthFines;
    const pendingWithdrawals = (wdRes.data ?? []).reduce((s, r) => s + Number(r.amount_ngn), 0);

    return {
      ok: true,
      data: {
        balance: Number(me.wallet_balance ?? 0),
        monthDelta,
        monthEarnings,
        monthFines,
        monthRewards,
        pendingWithdrawals,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
