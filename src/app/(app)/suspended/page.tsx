import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getActiveSuspension } from "@/app/actions/compliance-suspensions";

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const { userId } = await auth();
  const suspensionRes = userId ? await getActiveSuspension() : null;
  const suspension = suspensionRes?.ok ? suspensionRes.data : null;

  const suspendedSince = suspension?.suspended_at
    ? new Date(suspension.suspended_at).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const unpaidFines = suspension?.unpaid_fine_total ?? 0;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0E1A !important; }
        .susp-root {
          min-height: 100vh;
          background: #0A0E1A;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Nunito', 'Inter', sans-serif;
        }
        .susp-card {
          background: #111827;
          border: 1px solid rgba(239,83,80,0.25);
          border-radius: 20px;
          padding: 48px 40px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(239,83,80,0.06);
        }
        .susp-icon {
          font-size: 80px;
          line-height: 1;
          margin-bottom: 20px;
          display: block;
        }
        .susp-title {
          font-size: 28px;
          font-weight: 800;
          color: #EF5350;
          margin-bottom: 12px;
          letter-spacing: -0.3px;
        }
        .susp-desc {
          font-size: 14px;
          color: #8892A4;
          line-height: 1.7;
          margin-bottom: 28px;
        }
        .susp-detail-box {
          background: rgba(239,83,80,0.06);
          border: 1px solid rgba(239,83,80,0.18);
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 28px;
          text-align: left;
        }
        .susp-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          gap: 16px;
        }
        .susp-detail-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .susp-detail-label {
          font-size: 12px;
          color: #8892A4;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          padding-top: 1px;
        }
        .susp-detail-value {
          font-size: 13px;
          color: #E8EDF5;
          font-weight: 600;
          text-align: right;
          word-break: break-word;
        }
        .susp-detail-value.danger {
          color: #EF5350;
        }
        .susp-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }
        .susp-btn {
          display: block;
          width: 100%;
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          text-align: center;
          transition: opacity 0.15s, transform 0.15s;
          cursor: pointer;
          border: none;
        }
        .susp-btn:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }
        .susp-btn-primary {
          background: #7C4DFF;
          color: #fff;
        }
        .susp-btn-danger {
          background: rgba(239,83,80,0.15);
          color: #EF5350;
          border: 1px solid rgba(239,83,80,0.3) !important;
        }
        .susp-btn-ghost {
          background: rgba(136,146,164,0.1);
          color: #8892A4;
          border: 1px solid rgba(136,146,164,0.2) !important;
        }
        .susp-footer {
          font-size: 12px;
          color: #8892A4;
          line-height: 1.6;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 520px) {
          .susp-card {
            padding: 32px 20px !important;
          }
          .susp-title {
            font-size: 22px !important;
          }
          .susp-icon {
            font-size: 64px !important;
          }
        }
      `}</style>

      <div className="susp-root">
        <div className="susp-card">
          <span className="susp-icon">🔒</span>
          <h1 className="susp-title">Account Suspended</h1>
          <p className="susp-desc">
            Your account has been temporarily suspended due to a compliance violation.
            During this period, your access to the CIOS platform is restricted.
            Please review the details below and take the appropriate action.
          </p>

          {suspension && (
            <div className="susp-detail-box">
              <div className="susp-detail-row">
                <span className="susp-detail-label">Reason</span>
                <span className="susp-detail-value">{suspension.reason}</span>
              </div>
              {suspendedSince && (
                <div className="susp-detail-row">
                  <span className="susp-detail-label">Suspended Since</span>
                  <span className="susp-detail-value">{suspendedSince}</span>
                </div>
              )}
              {unpaidFines > 0 && (
                <div className="susp-detail-row">
                  <span className="susp-detail-label">Outstanding Fines</span>
                  <span className="susp-detail-value danger">
                    ₦{unpaidFines.toLocaleString("en-NG")}
                  </span>
                </div>
              )}
              {suspension.suspended_until && (
                <div className="susp-detail-row">
                  <span className="susp-detail-label">Suspended Until</span>
                  <span className="susp-detail-value">
                    {new Date(suspension.suspended_until).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {!suspension && (
            <div className="susp-detail-box" style={{ textAlign: "center" }}>
              <p style={{ color: "#8892A4", fontSize: 13 }}>
                Your account has been flagged. Please contact support for details.
              </p>
            </div>
          )}

          <div className="susp-actions">
            <Link href="/appeals" className="susp-btn susp-btn-primary">
              📋 Submit an Appeal
            </Link>
            {unpaidFines > 0 && (
              <Link href="/compliance" className="susp-btn susp-btn-danger">
                💳 Pay Outstanding Fine
              </Link>
            )}
            {unpaidFines === 0 && (
              <Link href="/compliance" className="susp-btn susp-btn-ghost">
                💳 View Compliance Status
              </Link>
            )}
            <Link href="/messages" className="susp-btn susp-btn-ghost">
              💬 Contact Support
            </Link>
          </div>

          <p className="susp-footer">
            If you believe this is in error, please contact support or submit an appeal.
            Our team reviews all appeals within 48 hours.
          </p>
        </div>
      </div>
    </>
  );
}
