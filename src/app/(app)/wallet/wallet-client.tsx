"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { initiateTopup, verifyPayment } from "@/app/actions/payments/initiate-topup";
import { requestWithdrawal } from "@/app/actions/payments/withdraw";
import { payFine } from "@/app/actions/compliance-fines";

export interface WalletTx {
  id: string; type: string; amount: number; description: string;
  status: string; currency: string; gateway: string; created_at: string;
}

export interface UnpaidFine {
  id: string; amount: number; description: string; issued_at: string;
}

const CREDIT_TYPES = new Set(["credit", "reward", "payment", "refund", "stipend", "bonus"]);
function isCredit(type: string) { return CREDIT_TYPES.has(type); }

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())
    return `Today, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  if (d.toDateString() === yest.toDateString())
    return `Yesterday, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const BANKS = [
  { code: "044", name: "Access Bank" }, { code: "023", name: "Citibank" },
  { code: "050", name: "Ecobank" }, { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank" }, { code: "214", name: "FCMB" },
  { code: "058", name: "GTBank" }, { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" }, { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Moniepoint" }, { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC" }, { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank" }, { code: "033", name: "UBA" },
  { code: "215", name: "Unity Bank" }, { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

// ─────────────────────────────────────────────────────────────────────────────
// Modal backdrop
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111827", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440,
          border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#E8EDF5" }}>{title}</h3>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-Up Modal
// ─────────────────────────────────────────────────────────────────────────────
function TopUpModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (amount: number) => void }) {
  const [amount, setAmount] = useState(0);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState<"pick" | "redirect" | "verify">("pick");
  const [ref, setRef] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = custom ? Number(custom) : amount;

  const handleContinue = () => {
    if (!selected || selected < 500) { toast.error("Minimum top-up is ₦500"); return; }
    startTransition(async () => {
      const res = await initiateTopup(selected);
      if (!res.ok) { toast.error(res.error); return; }
      const d = res.data!;
      setRef(d.reference);
      if (d.checkoutUrl) {
        // Redirect to Flutterwave checkout
        window.location.href = d.checkoutUrl;
      } else {
        // Gateway not yet configured — show manual bank transfer info
        setStep("redirect");
      }
    });
  };

  const handleVerify = () => {
    startTransition(async () => {
      const res = await verifyPayment(ref);
      if (!res.ok) { toast.error(res.error); return; }
      if (res.data?.status === "success") {
        toast.success(`₦${selected.toLocaleString()} added to wallet!`);
        onSuccess(selected);
        onClose();
      } else {
        toast(`Payment status: ${res.data?.status ?? "pending"}`, { icon: "⏳" });
      }
    });
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add Funds" onClose={onClose} />

      {step === "pick" && (
        <>
          <p style={{ color: "#8892A4", fontSize: 13, marginBottom: 18 }}>
            Choose an amount to add to your CIOS wallet.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            {PRESET_AMOUNTS.map((a) => (
              <button key={a} onClick={() => { setAmount(a); setCustom(""); }}
                style={{
                  padding: "12px 8px", borderRadius: 12, border: `2px solid ${amount === a && !custom ? "#1E88E5" : "rgba(255,255,255,0.08)"}`,
                  background: amount === a && !custom ? "rgba(30,136,229,0.15)" : "#0A0E1A",
                  color: amount === a && !custom ? "#1E88E5" : "#E8EDF5",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Custom amount</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#8892A4", fontSize: 14 }}>₦</span>
              <input
                type="number" min={500} placeholder="Enter amount"
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
                style={{
                  width: "100%", padding: "12px 14px 12px 28px", borderRadius: 12,
                  background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#E8EDF5", fontSize: 14, boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {selected > 0 && (
            <div style={{ background: "rgba(30,136,229,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(30,136,229,0.2)" }}>
              <span style={{ fontSize: 13, color: "#8892A4" }}>You&apos;ll add: </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1E88E5" }}>₦{selected.toLocaleString()}</span>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={isPending || !selected || selected < 500}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: selected >= 500 ? "linear-gradient(135deg,#1E88E5,#1565C0)" : "rgba(255,255,255,0.05)",
              color: selected >= 500 ? "#fff" : "#5A6478",
              fontSize: 15, fontWeight: 700, cursor: selected >= 500 ? "pointer" : "not-allowed",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Processing..." : `Continue → Pay ₦${selected > 0 ? selected.toLocaleString() : "0"}`}
          </button>
        </>
      )}

      {step === "redirect" && (
        <>
          <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
            <h4 style={{ color: "#FFC107", margin: "0 0 8px", fontSize: 15 }}>Gateway Setup Pending</h4>
            <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 18px" }}>
              Flutterwave is not configured yet. Once the server keys are added, you&apos;ll be redirected to complete payment instantly.
            </p>
            <div style={{ background: "rgba(255,193,7,0.08)", borderRadius: 12, padding: 16, textAlign: "left", marginBottom: 18, border: "1px solid rgba(255,193,7,0.2)" }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "#FFC107", fontWeight: 700 }}>Your Reference</p>
              <code style={{ fontSize: 13, color: "#E8EDF5", wordBreak: "break-all" }}>{ref}</code>
            </div>
            <p style={{ color: "#5A6478", fontSize: 12 }}>Contact support with this reference to manually credit your wallet.</p>
          </div>
          <button onClick={handleVerify} disabled={isPending} style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#E8EDF5", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {isPending ? "Checking..." : "Check Payment Status"}
          </button>
        </>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Withdraw Modal
// ─────────────────────────────────────────────────────────────────────────────
function WithdrawModal({ balance, onClose, onSuccess }: { balance: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ amount: "", bankCode: "", accountNumber: "", accountName: "" });
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const PLATFORM_FEE = 100;
  const amountNum = Number(form.amount);
  const total = amountNum + PLATFORM_FEE;
  const canSubmit = amountNum >= 500 && form.bankCode && /^\d{10}$/.test(form.accountNumber) && form.accountName.trim().length >= 3 && total <= balance;

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await requestWithdrawal({
        amount: amountNum,
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        accountName: form.accountName.trim(),
      });
      if (!res.ok) { toast.error(res.error); return; }
      setDone(true);
      onSuccess();
      toast.success("Withdrawal request submitted!");
    });
  };

  if (done) {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ color: "#66BB6A", margin: "0 0 8px" }}>Request Submitted</h3>
          <p style={{ color: "#8892A4", fontSize: 14, margin: "0 0 24px" }}>
            Your withdrawal of ₦{amountNum.toLocaleString()} is being reviewed. Funds are typically sent within 1–2 business days.
          </p>
          <button onClick={onClose} style={{ padding: "12px 32px", borderRadius: 12, background: "#1E88E5", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Withdraw Funds" onClose={onClose} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Amount (₦)</label>
          <input type="number" min={500} placeholder="Min ₦500"
            value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", fontSize: 14, boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Bank</label>
          <select value={form.bankCode} onChange={(e) => setForm(f => ({ ...f, bankCode: e.target.value }))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", color: form.bankCode ? "#E8EDF5" : "#5A6478", fontSize: 14, boxSizing: "border-box" }}>
            <option value="">Select bank</option>
            {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Account Number</label>
          <input type="text" maxLength={10} placeholder="10-digit account number"
            value={form.accountNumber} onChange={(e) => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "") }))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", fontSize: 14, boxSizing: "border-box", fontFamily: "monospace", letterSpacing: 2 }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Account Name</label>
          <input type="text" placeholder="As on your bank statement"
            value={form.accountName} onChange={(e) => setForm(f => ({ ...f, accountName: e.target.value }))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", fontSize: 14, boxSizing: "border-box" }} />
        </div>

        {amountNum > 0 && (
          <div style={{ background: "#0A0E1A", borderRadius: 12, padding: 14, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#8892A4" }}>Withdrawal amount</span>
              <span style={{ fontSize: 13, color: "#E8EDF5" }}>₦{amountNum.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#8892A4" }}>Platform fee</span>
              <span style={{ fontSize: 13, color: "#EF5350" }}>-₦{PLATFORM_FEE}</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>You receive</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#66BB6A" }}>₦{amountNum.toLocaleString()}</span>
            </div>
            {total > balance && (
              <p style={{ color: "#EF5350", fontSize: 12, margin: "8px 0 0" }}>Insufficient balance (need ₦{total.toLocaleString()}, have ₦{balance.toLocaleString()})</p>
            )}
          </div>
        )}

        <button onClick={handleSubmit} disabled={isPending || !canSubmit}
          style={{
            padding: 14, borderRadius: 12, border: "none",
            background: canSubmit ? "linear-gradient(135deg,#1E88E5,#1565C0)" : "rgba(255,255,255,0.05)",
            color: canSubmit ? "#fff" : "#5A6478",
            fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", opacity: isPending ? 0.7 : 1,
          }}>
          {isPending ? "Submitting..." : "Submit Withdrawal Request"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pay Fine Modal
// ─────────────────────────────────────────────────────────────────────────────
function PayFineModal({ balance, fines, onClose, onSuccess }: { balance: number; fines: UnpaidFine[]; onClose: () => void; onSuccess: () => void }) {
  const [paying, setPaying] = useState<string | null>(null);
  const [paid, setPaid] = useState<Set<string>>(new Set());

  const handlePay = (fine: UnpaidFine) => {
    if (fine.amount > balance) { toast.error(`Insufficient balance. Top up at least ₦${(fine.amount - balance).toLocaleString()} first.`); return; }
    setPaying(fine.id);
    payFine(fine.id).then((res) => {
      setPaying(null);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Fine of ₦${fine.amount.toLocaleString()} paid!`);
      setPaid(s => new Set([...s, fine.id]));
      onSuccess();
    });
  };

  const remaining = fines.filter(f => !paid.has(f.id));

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Pay Fines" onClose={onClose} />
      {remaining.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ color: "#66BB6A", fontWeight: 700 }}>All fines cleared!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 4px" }}>
            Wallet balance: <strong style={{ color: "#E8EDF5" }}>₦{balance.toLocaleString()}</strong>
          </p>
          {remaining.map(fine => (
            <div key={fine.id} style={{ background: "#0A0E1A", borderRadius: 14, padding: 16, border: "1px solid rgba(239,83,80,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fine.description}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#5A6478" }}>{new Date(fine.issued_at).toLocaleDateString()}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#EF5350" }}>₦{fine.amount.toLocaleString()}</span>
                <button onClick={() => handlePay(fine)}
                  disabled={paying === fine.id || fine.amount > balance}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "none",
                    background: fine.amount > balance ? "rgba(255,255,255,0.05)" : "rgba(239,83,80,0.15)",
                    color: fine.amount > balance ? "#5A6478" : "#EF5350",
                    fontSize: 12, fontWeight: 700, cursor: fine.amount > balance ? "not-allowed" : "pointer",
                  }}>
                  {paying === fine.id ? "Paying..." : "Pay Now"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Wallet Client
// ─────────────────────────────────────────────────────────────────────────────
export default function WalletClient({
  balance: initialBalance,
  txs,
  monthDelta,
  monthEarnings,
  monthFines,
  monthRewards,
  unpaidFines,
  paymentNotice,
}: {
  balance: number;
  txs: WalletTx[];
  monthDelta: number;
  monthEarnings: number;
  monthFines: number;
  monthRewards: number;
  unpaidFines: UnpaidFine[];
  paymentNotice?: "success" | "failed" | null;
}) {
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [modal, setModal] = useState<"topup" | "withdraw" | "fine" | null>(null);
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    if (paymentNotice === "success") toast.success("Payment verified and wallet updated");
    if (paymentNotice === "failed") toast.error("Payment was not completed or could not be verified");
  }, [paymentNotice]);

  const filtered = useMemo(() => {
    if (filter === "all") return txs;
    if (filter === "credit") return txs.filter((t) => isCredit(t.type));
    return txs.filter((t) => !isCredit(t.type));
  }, [filter, txs]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>💰 Wallet</h1>
        {unpaidFines.length > 0 && (
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(239,83,80,0.15)", color: "#EF5350", fontWeight: 700 }}>
            {unpaidFines.length} unpaid fine{unpaidFines.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Balance Card */}
      <div style={{ background: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)", borderRadius: 16, padding: 28, position: "relative", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ position: "absolute", top: -40, right: -20, width: 160, height: 160, background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -30, left: -20, width: 120, height: 120, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>💳</span>
            <span style={{ color: "rgba(200,220,255,0.8)", fontSize: 14 }}>Total Balance</span>
          </div>
          <p style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 6px 0" }}>₦{balance.toLocaleString()}</p>
          <p style={{ color: "rgba(200,220,255,0.85)", fontSize: 14, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            {monthDelta >= 0 ? "📈" : "📉"} {monthDelta >= 0 ? "+" : ""}₦{Math.abs(monthDelta).toLocaleString()} in the last 30 days
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Earnings (30d)", amount: monthEarnings, color: "#66BB6A", bg: "rgba(102,187,106,0.1)" },
          { label: "Fines (30d)", amount: monthFines, color: "#EF5350", bg: "rgba(239,83,80,0.1)" },
          { label: "Rewards (30d)", amount: monthRewards, color: "#FFC107", bg: "rgba(255,193,7,0.1)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111827", borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
            <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, marginBottom: 8 }}>{s.label}</span>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: 0 }}>₦{s.amount.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Top Up", emoji: "➕", bg: "#66BB6A", action: () => setModal("topup") },
          { label: "Withdraw", emoji: "📤", bg: "#1E88E5", action: () => setModal("withdraw") },
          { label: "Transfer", emoji: "📨", bg: "#AB47BC", action: () => toast("Peer transfers coming soon", { icon: "🔒" }) },
          { label: "Pay Fine", emoji: "💳", bg: "#EF5350", action: () => unpaidFines.length > 0 ? setModal("fine") : toast("No unpaid fines!", { icon: "✅" }) },
        ].map((a) => (
          <button key={a.label} onClick={a.action} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, position: "relative" }}>
              {a.emoji}
              {a.label === "Pay Fine" && unpaidFines.length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#EF5350", fontSize: 9, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0A0E1A" }}>{unpaidFines.length}</span>
              )}
            </div>
            <span style={{ fontSize: 12, color: "#8892A4" }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div style={{ background: "#111827", borderRadius: 16, padding: 22, border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Recent Transactions</h2>
          <div style={{ display: "flex", gap: 4, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 3 }}>
            {(["all", "credit", "debit"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", background: filter === f ? "rgba(30,136,229,0.18)" : "transparent", color: filter === f ? "#1E88E5" : "#8892A4", border: "none", textTransform: "capitalize" }}>{f}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "32px 10px", textAlign: "center", color: "#5A6478", fontSize: 13 }}>
            {txs.length === 0 ? "No transactions yet. Your activity will appear here." : "No transactions match this filter."}
          </div>
        )}

        {filtered.map((tx, i) => {
          const credit = isCredit(tx.type);
          return (
            <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: credit ? "rgba(102,187,106,0.12)" : "rgba(239,83,80,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {tx.gateway === "flutterwave" ? "🏦" : credit ? "↙" : "↗"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</p>
                <p style={{ fontSize: 11, color: "#8892A4", margin: "2px 0 0 0", textTransform: "capitalize", display: "flex", gap: 8, alignItems: "center" }}>
                  {tx.type}
                  {tx.gateway && tx.gateway !== "internal" && (
                    <span style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(30,136,229,0.1)", color: "#1E88E5", fontSize: 10, fontWeight: 700 }}>{tx.gateway}</span>
                  )}
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: credit ? "#66BB6A" : "#EF5350" }}>
                  {credit ? "+" : "-"}₦{tx.amount.toLocaleString()}
                </p>
                <p style={{ fontSize: 11, color: "#5A6478", margin: "2px 0 0 0" }}>{formatTime(tx.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {modal === "topup" && (
        <TopUpModal
          onClose={() => setModal(null)}
          onSuccess={(amt) => setBalance(b => b + amt)}
        />
      )}
      {modal === "withdraw" && (
        <WithdrawModal
          balance={balance}
          onClose={() => setModal(null)}
          onSuccess={() => setBalance(b => b)} // page will refresh for accurate balance
        />
      )}
      {modal === "fine" && (
        <PayFineModal
          balance={balance}
          fines={unpaidFines}
          onClose={() => setModal(null)}
          onSuccess={() => {
            // Reload to get updated balance
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
