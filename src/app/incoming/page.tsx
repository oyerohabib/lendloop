"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AutomationActivity from "@/components/AutomationActivity";
import { LOAN_STATUS_LABELS, loanStatusBadgeClass } from "@/lib/labels";

type LoanStatus = "approved" | "declined" | "returned";

const BUSY_LABEL: Record<LoanStatus, string> = {
  approved: "Approving…",
  declined: "Declining…",
  returned: "Marking returned…",
};

export default function IncomingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );
  const incoming = useQuery(api.loans.incomingRequests, me ? {} : "skip");
  const setStatus = useMutation(api.loans.setStatus);
  const [busy, setBusy] = useState<{
    loanId: Id<"loans">;
    status: LoanStatus;
  } | null>(null);
  const [error, setError] = useState<{
    loanId: Id<"loans">;
    message: string;
  } | null>(null);

  async function onSetStatus(loanId: Id<"loans">, status: LoanStatus) {
    if (busy) return;
    setError(null);
    setBusy({ loanId, status });
    try {
      await setStatus({ loanId, status });
    } catch (err) {
      setError({
        loanId,
        message: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <h1 className="section-title">Incoming requests</h1>
      <p className="lede">
        Approve or decline borrow requests on your tools, and mark loans returned.
      </p>

      {isLoading || !isAuthenticated || !me ? (
        <p className="muted">Connecting to your account…</p>
      ) : !incoming ? (
        <p className="muted">Loading…</p>
      ) : incoming.length === 0 ? (
        <p className="empty">No incoming requests yet.</p>
      ) : (
        <div className="panel">
          {incoming.map((loan) => (
            <div key={loan._id} className="loan-row">
              <div>
                <div className="card-heading">
                  <strong>{loan.toolName}</strong>
                  <span className={loanStatusBadgeClass(loan.status)}>
                    {LOAN_STATUS_LABELS[loan.status]}
                  </span>
                </div>
                <p className="muted small" style={{ margin: "0.35rem 0 0" }}>
                  {loan.borrowerName} · {loan.startDate} → {loan.endDate}
                </p>
              </div>

              <div className="row-actions">
                {loan.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={busy !== null}
                      onClick={() => void onSetStatus(loan._id, "approved")}
                    >
                      {busy?.loanId === loan._id && busy.status === "approved"
                        ? BUSY_LABEL.approved
                        : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      disabled={busy !== null}
                      onClick={() => void onSetStatus(loan._id, "declined")}
                    >
                      {busy?.loanId === loan._id && busy.status === "declined"
                        ? BUSY_LABEL.declined
                        : "Decline"}
                    </button>
                  </>
                ) : null}
                {loan.status === "approved" ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={busy !== null}
                    onClick={() => void onSetStatus(loan._id, "returned")}
                  >
                    {busy?.loanId === loan._id && busy.status === "returned"
                      ? BUSY_LABEL.returned
                      : "Mark returned"}
                  </button>
                ) : null}
              </div>
              {error?.loanId === loan._id ? (
                <p className="badge badge--warn">{error.message}</p>
              ) : null}

              <AutomationActivity events={loan.automationEvents} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
