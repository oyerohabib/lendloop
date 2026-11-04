"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AutomationActivity from "@/components/AutomationActivity";
import { LOAN_STATUS_LABELS } from "@/lib/labels";

export default function IncomingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );
  const incoming = useQuery(api.loans.incomingRequests, me ? {} : "skip");
  const setStatus = useMutation(api.loans.setStatus);

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
              <div className="row-actions" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{loan.toolName}</strong>
                  <p className="muted small" style={{ margin: 0 }}>
                    {loan.borrowerName} · {loan.startDate} → {loan.endDate}
                  </p>
                </div>
                <span className="badge">{LOAN_STATUS_LABELS[loan.status]}</span>
              </div>

              <div className="row-actions">
                {loan.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() =>
                        void setStatus({ loanId: loan._id, status: "approved" })
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() =>
                        void setStatus({ loanId: loan._id, status: "declined" })
                      }
                    >
                      Decline
                    </button>
                  </>
                ) : null}
                {loan.status === "approved" ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() =>
                      void setStatus({ loanId: loan._id, status: "returned" })
                    }
                  >
                    Mark returned
                  </button>
                ) : null}
              </div>

              <AutomationActivity events={loan.automationEvents} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
