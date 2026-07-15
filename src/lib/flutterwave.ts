import "server-only";

const API_BASE = "https://api.flutterwave.com/v3";

function secretKey(): string {
  const key = process.env.FLW_SECRET_KEY?.trim();
  if (!key) throw new Error("Flutterwave is not configured");
  if (/\s/.test(key) || !/^FLWSECK_(?:TEST-)?[A-Za-z0-9]+-X$/.test(key)) {
    throw new Error("Flutterwave secret key has an invalid format");
  }
  return key;
}

async function flwRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as { status?: string; message?: string; data?: T } | null;
  if (!response.ok || body?.status !== "success" || body.data == null) {
    throw new Error(body?.message || `Flutterwave request failed (${response.status})`);
  }
  return body.data;
}

export type FlutterwaveCheckoutInput = {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  customer: { email: string; name?: string; phoneNumber?: string };
  description: string;
  meta: Record<string, string | number | boolean | null>;
  paymentPlanId?: string | null;
};

export async function createFlutterwaveCheckout(input: FlutterwaveCheckoutInput): Promise<string> {
  const data = await flwRequest<{ link: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: {
        email: input.customer.email,
        name: input.customer.name,
        phonenumber: input.customer.phoneNumber,
      },
      customizations: {
        title: "CIOS",
        description: input.description,
        logo: process.env.NEXT_PUBLIC_CIOS_LOGO_URL,
      },
      meta: input.meta,
      ...(input.paymentPlanId ? { payment_plan: input.paymentPlanId } : {}),
    }),
  });
  const checkoutUrl = data.link?.trim();
  let parsed: URL;
  try { parsed = new URL(checkoutUrl); } catch { throw new Error("Flutterwave returned an invalid checkout URL"); }
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "checkout.flutterwave.com") {
    throw new Error("Flutterwave returned an invalid checkout URL");
  }
  return parsed.toString();
}

export type VerifiedFlutterwaveTransaction = {
  id: number;
  tx_ref: string;
  flw_ref: string;
  status: string;
  amount: number;
  charged_amount: number;
  currency: string;
  payment_type?: string;
  customer?: { email?: string };
};

export function verifyFlutterwaveTransaction(transactionId: string | number) {
  const id = String(transactionId);
  if (!/^\d+$/.test(id)) throw new Error("Invalid Flutterwave transaction ID");
  return flwRequest<VerifiedFlutterwaveTransaction>(`/transactions/${id}/verify`);
}

export function flutterwaveConfigured(): boolean {
  const key = process.env.FLW_SECRET_KEY?.trim() || "";
  const hash = process.env.FLW_SECRET_HASH?.trim() || "";
  return /^FLWSECK_(?:TEST-)?[A-Za-z0-9]+-X$/.test(key) && hash.length >= 12 && !/\s/.test(hash);
}
