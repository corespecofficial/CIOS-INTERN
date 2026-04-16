"use server";

/**
 * Withdrawal system — users request a withdrawal, admin approves,
 * Monnify disburses funds to the user's bank account.
 *
 * Minimum withdrawal: ₦500
 * Platform fee: ₦100 flat (deducted from withdrawal amount)
 *
 * Flow:
 *  1. User submits bank details + amount
 *  2. Wallet is debited immediately (funds held in escrow)
 *  3. withdrawal_requests record created (status=pending)
 *  4. Admin reviews + approves from /admin/finance/withdrawals
 *  5. On approval: Monnify disbursal API called (or manual bank transfer)
 *
 * ⚠️  MONNIFY DISBURSAL KEYS: same env vars as initiate-topup.ts
 */

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { atomicWalletDebit } from "./wallet-debit";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type WithdrawalInput = {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

export type WithdrawalRequest = {
  id: string;
  amount_ngn: number;
  bank_code: string;
  account_number: string;
  account_name: string;
  status: string;
  requested_at: string;
  admin_note: string | null;
};

const MIN_WITHDRAWAL = 500;
const PLATFORM_FEE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// requestWithdrawal — user initiates
// ─────────────────────────────────────────────────────────────────────────────
export async function requestWithdrawal(input: WithdrawalInput): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };

    if (input.amount < MIN_WITHDRAWAL) {
      return { ok: false, error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` };
    }
    if (!/^\d{10}$/.test(input.accountNumber)) {
      return { ok: false, error: "Account number must be exactly 10 digits" };
    }
    if (!input.accountName || input.accountName.trim().length < 3) {
      return { ok: false, error: "Account name is required" };
    }
    if (!input.bankCode) {
      return { ok: false, error: "Please select a bank" };
    }

    const totalDebit = input.amount + PLATFORM_FEE;

    // Debit wallet atomically (holds funds until disbursed)
    const debit = await atomicWalletDebit({
      userId: me.id,
      amount: totalDebit,
      type: "debit",
      description: `Withdrawal request — ₦${input.amount.toLocaleString()} to ${input.accountName} (${input.bankCode} •••• ${input.accountNumber.slice(-4)}) + ₦${PLATFORM_FEE} fee`,
      gateway: "internal",
    });

    if (!debit.ok) return { ok: false, error: debit.error };

    // Create withdrawal request
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("withdrawal_requests").insert({
      user_id: me.id,
      amount_ngn: input.amount,
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      account_name: input.accountName.trim(),
      status: "pending",
    }).select("id").single();

    if (error) throw error;

    revalidatePath("/wallet");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMyWithdrawals — user sees their withdrawal history
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyWithdrawals(): Promise<R<WithdrawalRequest[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("withdrawal_requests")
      .select("id, amount_ngn, bank_code, account_number, account_name, status, requested_at, admin_note")
      .eq("user_id", me.id)
      .order("requested_at", { ascending: false })
      .limit(20);
    return { ok: true, data: (data ?? []) as WithdrawalRequest[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminGetWithdrawals — admin sees all pending/recent withdrawals
// ─────────────────────────────────────────────────────────────────────────────
export type AdminWithdrawal = WithdrawalRequest & {
  user_name: string | null;
  user_email: string | null;
};

export async function adminGetWithdrawals(status?: string): Promise<R<AdminWithdrawal[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin", "finance"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }
    const sb = supabaseAdmin();
    let q = sb
      .from("withdrawal_requests")
      .select("*, user:users!withdrawal_requests_user_id_fkey(name, email)")
      .order("requested_at", { ascending: false })
      .limit(100);
    if (status) q = q.eq("status", status);
    const { data } = await q;
    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user as Record<string, unknown> | null;
      return {
        ...r,
        user_name: u?.name ?? null,
        user_email: u?.email ?? null,
      } as AdminWithdrawal;
    });
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminApproveWithdrawal — mark as approved + trigger Monnify disbursal
// ─────────────────────────────────────────────────────────────────────────────
export async function adminApproveWithdrawal(id: string, note?: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin", "finance"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }
    const sb = supabaseAdmin();

    // Fetch the request
    const { data: req } = await sb
      .from("withdrawal_requests")
      .select("*")
      .eq("id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (!req) return { ok: false, error: "Withdrawal not found or already processed" };

    // TODO: Call Monnify Disbursal API here when API keys are available
    // POST /api/v2/disbursements/single
    // body: { amount, reference, narration, destinationBankCode, destinationAccountNumber, currency: "NGN", destinationAccountName, sourceAccountNumber: MONNIFY_SOURCE_ACCT }

    await sb.from("withdrawal_requests").update({
      status: "approved",
      admin_note: note ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: me.id,
    }).eq("id", id);

    revalidatePath("/admin/finance/withdrawals");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminRejectWithdrawal — reject + refund wallet
// ─────────────────────────────────────────────────────────────────────────────
export async function adminRejectWithdrawal(id: string, reason: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin", "finance"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }
    const sb = supabaseAdmin();

    const { data: req } = await sb
      .from("withdrawal_requests")
      .select("*")
      .eq("id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (!req) return { ok: false, error: "Withdrawal not found or already processed" };

    // Refund the deducted amount (including fee) back to wallet
    const refundAmount = Number(req.amount_ngn) + PLATFORM_FEE;
    const { data: user } = await sb.from("users").select("wallet_balance").eq("id", req.user_id).maybeSingle();
    if (user) {
      const newBalance = Number(user.wallet_balance) + refundAmount;
      await sb.from("users").update({ wallet_balance: newBalance }).eq("id", req.user_id);
      await sb.from("transactions").insert({
        user_id: req.user_id,
        type: "refund",
        amount: refundAmount,
        description: `Withdrawal refund — request rejected: ${reason}`,
        balance_after: newBalance,
        status: "completed",
        currency: "NGN",
        gateway: "internal",
      });
    }

    await sb.from("withdrawal_requests").update({
      status: "rejected",
      admin_note: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: me.id,
    }).eq("id", id);

    revalidatePath("/admin/finance/withdrawals");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
