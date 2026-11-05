"use client";

import { FormEvent, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import CategoryFilter from "@/components/CategoryFilter";

function openDatePicker(input: HTMLInputElement) {
  // Chrome and Safari open from the stretched calendar control. Calling
  // showPicker as well toggles that control closed.
  if (/AppleWebKit\//.test(navigator.userAgent)) return;
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    // The picker is already open, or this browser blocked it.
  }
}
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
} from "@/lib/labels";

export default function BoardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [category, setCategory] = useState("all");
  const [requestingId, setRequestingId] = useState<Id<"tools"> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );
  // Wait for the users row (EnsureUser) before queries that call requireUser.
  const boardArgs =
    me
      ? {
          category:
            category === "all"
              ? undefined
              : (category as
                  | "power_tools"
                  | "garden"
                  | "kitchen"
                  | "camping"
                  | "other"),
        }
      : "skip";

  const tools = useQuery(api.tools.listBoard, boardArgs);
  const createRequest = useMutation(api.loans.createRequest);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!requestingId) return;
    setError(null);
    setSubmitting(true);
    try {
      await createRequest({
        toolId: requestingId,
        startDate,
        endDate,
      });
      setRequestingId(null);
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1 className="section-title">Neighborhood board</h1>
      <p className="lede">
        Browse tools, filter by category, and request a borrow for a date range.
      </p>

      <CategoryFilter value={category} onChange={setCategory} />

      {isLoading || !isAuthenticated || me === undefined || me === null ? (
        <p className="muted">Connecting to your account…</p>
      ) : !tools ? (
        <p className="muted">Loading…</p>
      ) : tools.length === 0 ? (
        <p className="empty">No tools in this category yet.</p>
      ) : (
        <div className="card-grid">
          {tools.map((tool) => {
            const isMine = me?._id === tool.ownerId;
            const request = tool.myRequest;
            const showRequestForm =
              !isMine &&
              tool.availability === "available" &&
              request?.status !== "pending" &&
              request?.status !== "approved";
            return (
              <article key={tool._id} className="panel">
                <div className="card-heading">
                  <h2>{tool.name}</h2>
                  <span
                    className={
                      tool.availability === "available"
                        ? "badge badge--ok"
                        : "badge badge--busy"
                    }
                  >
                    {tool.availability === "available" ? "Available" : "On loan"}
                  </span>
                </div>
                <p className="muted small" style={{ margin: "0.35rem 0 0" }}>
                  {CATEGORY_LABELS[tool.category]} ·{" "}
                  {CONDITION_LABELS[tool.condition]} · {tool.ownerName}
                  {tool.trustedLender ? " · Trusted Lender" : ""}
                </p>
                <p className="card-copy">{tool.description}</p>
                <div className="card-foot">
                {!isMine && request?.status === "pending" ? (
                  <>
                    <button type="button" className="btn btn--primary" disabled>
                      Request pending
                    </button>
                    <p className="muted small" style={{ margin: 0 }}>
                      {request.startDate} → {request.endDate}
                    </p>
                  </>
                ) : null}
                {!isMine && request?.status === "approved" ? (
                  <p className="muted small" style={{ margin: 0 }}>
                    Approved · {request.startDate} → {request.endDate}
                  </p>
                ) : null}
                {showRequestForm ? (
                  requestingId === tool._id ? (
                    <form className="form-grid" onSubmit={onSubmit}>
                      <div className="date-row">
                        <label htmlFor={`start-${tool._id}`}>
                          Start date
                          <input
                            id={`start-${tool._id}`}
                            type="date"
                            required
                            value={startDate}
                            onClick={(e) => openDatePicker(e.currentTarget)}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </label>
                        <label htmlFor={`end-${tool._id}`}>
                          End date
                          <input
                            id={`end-${tool._id}`}
                            type="date"
                            required
                            value={endDate}
                            onClick={(e) => openDatePicker(e.currentTarget)}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </label>
                      </div>
                      {error ? <p className="badge badge--warn">{error}</p> : null}
                      <div className="row-actions">
                        <button
                          type="submit"
                          className="btn btn--primary"
                          disabled={submitting}
                        >
                          {submitting ? "Sending request…" : "Send request"}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setRequestingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => {
                        setError(null);
                        setRequestingId(tool._id);
                      }}
                    >
                      Request to borrow
                    </button>
                  )
                ) : null}
                {isMine ? (
                  <p className="muted small" style={{ margin: 0 }}>
                    This is your listing.
                  </p>
                ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
