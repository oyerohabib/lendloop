"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { LOAN_STATUS_LABELS, CATEGORY_LABELS } from "@/lib/labels";

export default function AdminPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );
  const users = useQuery(
    api.users.listForAdmin,
    me?.role === "admin" ? {} : "skip",
  );
  const loans = useQuery(
    api.loans.listAllAdmin,
    me?.role === "admin" ? {} : "skip",
  );
  const tools = useQuery(
    api.tools.listBoard,
    me?.role === "admin" ? {} : "skip",
  );
  const setTrusted = useMutation(api.users.setTrustedLender);
  const adminRemove = useMutation(api.tools.adminRemove);
  const [busy, setBusy] = useState<
    | { kind: "trusted"; userId: Id<"users"> }
    | { kind: "remove"; toolId: Id<"tools"> }
    | null
  >(null);
  const [error, setError] = useState<
    | { kind: "trusted"; userId: Id<"users">; message: string }
    | { kind: "remove"; toolId: Id<"tools">; message: string }
    | null
  >(null);

  async function onToggleTrusted(userId: Id<"users">, trusted: boolean) {
    if (busy) return;
    setError(null);
    setBusy({ kind: "trusted", userId });
    try {
      await setTrusted({ userId, trusted });
    } catch (err) {
      setError({
        kind: "trusted",
        userId,
        message: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(toolId: Id<"tools">) {
    if (busy) return;
    setError(null);
    setBusy({ kind: "remove", toolId });
    try {
      await adminRemove({ toolId });
    } catch (err) {
      setError({
        kind: "remove",
        toolId,
        message: err instanceof Error ? err.message : "Remove failed",
      });
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !isAuthenticated || me === undefined || me === null) {
    return (
      <div className="page">
        <p className="muted">Connecting to your account…</p>
      </div>
    );
  }

  if (me === null || me.role !== "admin") {
    return (
      <div className="page">
        <h1 className="section-title">Admin</h1>
        <p className="lede">You need the admin role to view this page.</p>
      </div>
    );
  }

  return (
    <div className="page stack">
      <div>
        <h1 className="section-title">Admin</h1>
        <p className="lede">
          Remove any listing, view all loans, and mark Trusted Lenders.
        </p>
      </div>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Users</h2>
        {!users ? (
          <p className="muted">Loading…</p>
        ) : (
          users.map((user) => (
            <div key={user._id} className="loan-row">
              <div className="row-actions" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{user.name}</strong>
                  <p className="muted small" style={{ margin: 0 }}>
                    {user.email} · {user.role}
                    {user.trustedLender ? " · Trusted Lender" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busy !== null}
                  onClick={() =>
                    void onToggleTrusted(user._id, !user.trustedLender)
                  }
                >
                  {busy?.kind === "trusted" && busy.userId === user._id
                    ? "Updating…"
                    : user.trustedLender
                      ? "Remove trusted"
                      : "Mark trusted"}
                </button>
              </div>
              {error?.kind === "trusted" && error.userId === user._id ? (
                <p className="badge badge--warn">{error.message}</p>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>All listings</h2>
        {!tools ? (
          <p className="muted">Loading…</p>
        ) : tools.length === 0 ? (
          <p className="empty">No listings.</p>
        ) : (
          tools.map((tool) => (
            <div key={tool._id} className="loan-row">
              <div className="row-actions" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{tool.name}</strong>
                  <p className="muted small" style={{ margin: 0 }}>
                    {CATEGORY_LABELS[tool.category]} · {tool.ownerName}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={busy !== null}
                  onClick={() => void onRemove(tool._id)}
                >
                  {busy?.kind === "remove" && busy.toolId === tool._id
                    ? "Removing…"
                    : "Remove"}
                </button>
              </div>
              {error?.kind === "remove" && error.toolId === tool._id ? (
                <p className="badge badge--warn">{error.message}</p>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>All loans</h2>
        {!loans ? (
          <p className="muted">Loading…</p>
        ) : loans.length === 0 ? (
          <p className="empty">No loans.</p>
        ) : (
          loans.map((loan) => (
            <div key={loan._id} className="loan-row">
              <strong>{loan.toolName}</strong>
              <p className="muted small" style={{ margin: 0 }}>
                {loan.borrowerName} ← {loan.lenderName} · {loan.startDate} →{" "}
                {loan.endDate} · {LOAN_STATUS_LABELS[loan.status]}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
