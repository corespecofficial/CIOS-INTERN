"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { adminApproveWithdrawal, adminRejectWithdrawal, type AdminWithdrawal } from "@/app/actions/payments/withdraw";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "rgba(255,193,7,0.12)",  color: "#FFC107" },
  approved:   { bg: "rgba(30,136,229,0.12)", color: "#1E88E5" },
  processing: { bg: "rgba(171,71,188,0.12)", color: "#AB47BC" },
  paid:       { bg: "rgba(102,187,106,0.12)",color: "#66BB6A" },
  rejected:   { bg: "rgba(239,83,80,0.12)",  color: "#EF5350" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "rgba(255,255,255,0.07)", color: "#8892A4" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function RejectModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleReject = () => {
    if (!reason.trim()) { toast.error("Please provide a reason"); return; }
    startTransition(async () => {
      const res = await adminRejectWithdrawal(id, reason.trim());
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Withdrawal rejected and refunded");
      onDone();
      onClose();
    });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111827", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, border: "1px solid rgba(255,255,255,0.1)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800, color: "#EF5350" }}>Reject Withdrawal</h3>
        <p style={{ color: "#8892A4", fontSize: 13, marginBottom: 14 }}>The full amount (including the ₦100 fee) will be refunded to the user&apos;s wallet.</p>
        <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Reason for rejection *</label>
        <textarea
          rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Account details could not be verified"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5", fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#E8EDF5", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleReject} disabled={isPending || !reason.trim()} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#EF5350", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: isPending ? 0.7 : 1 }}>
            {isPending ? "Rejecting..." : "Reject & Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminWithdrawalsClient({ withdrawals: initial }: { withdrawals: AdminWithdrawal[] }) {
  const [withdrawals, setWithdrawals] = useState(initial);
  const [filter, setFilter] = useState<string>("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const filtered = filter === "all" ? withdrawals : withdrawals.filter(w => w.status === filter);

  const total = {
    pending: withdrawals.filter(w => w.status === "pending").length,
    pendingNgn: withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + Number(w.amount_ngn), 0),
  };

  const handleApprove = (id: string) => {
    setApprovingId(id);
    startTransition(async () => {
      const res = await adminApproveWithdrawal(id);
      setApprovingId(null);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Withdrawal approved");
      setWithdrawals(ws => ws.map(w => w.id === id ? { ...w, status: "approved" } : w));
    });
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 0 40px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Withdrawal Requests</h1>
      <p style={{ color: "#8892A4", fontSize: 14, margin: "0 0 24px" }}>Review and approve withdrawal requests. Payout release remains under superadmin and finance control.</p>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Pending Requests", value: total.pending, color: "#FFC107" },
          { label: "Pending Amount", value: `₦${total.pendingNgn.toLocaleString()}`, color: "#1E88E5" },
          { label: "Total Requests", value: withdrawals.length, color: "#8892A4" },
        ].map(s => (
          <div key={s.label} style={{ background: "#111827", borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 6px" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {["all", "pending", "approved", "paid", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", textTransform: "capitalize", fontSize: 13, fontWeight: 700, background: filter === f ? "rgba(30,136,229,0.18)" : "transparent", color: filter === f ? "#1E88E5" : "#8892A4" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Payout control note */}
      {filter === "pending" && total.pending > 0 && (
        <div style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 13, color: "#FFC107" }}>
            <strong>Approval does not automatically send funds.</strong> Finance must complete the payout through the approved platform account and retain the transaction reference.
          </p>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#111827", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#5A6478", fontSize: 14 }}>
            No {filter !== "all" ? filter : ""} withdrawal requests.
          </div>
        ) : (
          filtered.map((w, i) => (
            <div key={w.id} style={{ padding: "18px 20px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* User */}
              <div style={{ minWidth: 160, flex: "1 1 160px" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{w.user_name ?? "Unknown"}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5A6478" }}>{w.user_email ?? ""}</p>
              </div>

              {/* Bank details */}
              <div style={{ minWidth: 180, flex: "1 1 180px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#E8EDF5" }}>{w.account_name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8892A4", fontFamily: "monospace" }}>
                  {w.bank_code} · {w.account_number}
                </p>
              </div>

              {/* Amount */}
              <div style={{ minWidth: 100 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#E8EDF5" }}>₦{Number(w.amount_ngn).toLocaleString()}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5A6478" }}>{new Date(w.requested_at).toLocaleDateString()}</p>
              </div>

              {/* Status */}
              <div style={{ minWidth: 90 }}>
                <StatusBadge status={w.status} />
                {w.admin_note && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#5A6478", maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.admin_note}</p>}
              </div>

              {/* Actions */}
              {w.status === "pending" && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleApprove(w.id)}
                    disabled={isPending && approvingId === w.id}
                    style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {approvingId === w.id ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => setRejectId(w.id)}
                    style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "rgba(239,83,80,0.12)", color: "#EF5350", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {rejectId && (
        <RejectModal
          id={rejectId}
          onClose={() => setRejectId(null)}
          onDone={() => {
            setWithdrawals(ws => ws.map(w => w.id === rejectId ? { ...w, status: "rejected" } : w));
          }}
        />
      )}
    </div>
  );
}
