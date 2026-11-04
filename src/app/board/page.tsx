"use client";

import { FormEvent, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import CategoryFilter from "@/components/CategoryFilter";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
} from "@/lib/labels";

export default function BoardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [category, setCategory] = useState("all");
  const [requestingId, setRequestingId] = useState<Id<"tools"> | null>(null);
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
        <div className="stack">
          {tools.map((tool) => {
            const isMine = me?._id === tool.ownerId;
            return (
              <article key={tool._id} className="panel">
                <div className="row-actions" style={{ justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem" }}>
                      {tool.name}
                    </h2>
                    <p className="muted small" style={{ margin: 0 }}>
                      {CATEGORY_LABELS[tool.category]} ·{" "}
                      {CONDITION_LABELS[tool.condition]} ·{" "}
                      {tool.ownerName}
                      {tool.trustedLender ? " · Trusted Lender" : ""}
                    </p>
                  </div>
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
                <p style={{ margin: "0.75rem 0" }}>{tool.description}</p>
                {!isMine && tool.availability === "available" ? (
                  requestingId === tool._id ? (
                    <form className="form-grid" onSubmit={onSubmit}>
                      <label>
                        Start date
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </label>
                      <label>
                        End date
                        <input
                          type="date"
                          required
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </label>
                      {error ? <p className="badge badge--warn">{error}</p> : null}
                      <div className="row-actions">
                        <button type="submit" className="btn btn--primary">
                          Send request
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
                      className="btn btn--ghost"
                      onClick={() => setRequestingId(tool._id)}
                    >
                      Request to borrow
                    </button>
                  )
                ) : null}
                {isMine ? (
                  <p className="muted small">This is your listing.</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
