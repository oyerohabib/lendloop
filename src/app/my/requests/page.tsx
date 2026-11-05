"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import AutomationActivity from "@/components/AutomationActivity";
import { LOAN_STATUS_LABELS, loanStatusBadgeClass } from "@/lib/labels";

export default function MyRequestsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );
  const requests = useQuery(api.loans.myRequests, me ? {} : "skip");

  return (
    <div className="page">
      <h1 className="section-title">My requests</h1>
      <p className="lede">Borrow requests you’ve sent to neighbors.</p>

      {isLoading || !isAuthenticated || !me ? (
        <p className="muted">Connecting to your account…</p>
      ) : !requests ? (
        <p className="muted">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="empty">No requests yet. Browse the board to ask.</p>
      ) : (
        <div className="panel">
          {requests.map((loan) => (
            <div key={loan._id} className="loan-row">
              <div>
                <div className="card-heading">
                  <strong>{loan.toolName}</strong>
                  <span className={loanStatusBadgeClass(loan.status)}>
                    {LOAN_STATUS_LABELS[loan.status]}
                  </span>
                </div>
                <p className="muted small" style={{ margin: "0.35rem 0 0" }}>
                  From {loan.lenderName}
                  {loan.lenderTrusted ? " (Trusted Lender)" : ""} ·{" "}
                  {loan.startDate} → {loan.endDate}
                </p>
              </div>
              <AutomationActivity events={loan.automationEvents} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
