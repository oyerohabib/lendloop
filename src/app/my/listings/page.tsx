"use client";

import { FormEvent, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
} from "@/lib/labels";

type Category = "power_tools" | "garden" | "kitchen" | "camping" | "other";
type Condition = "excellent" | "good" | "fair";

const emptyForm = {
  name: "",
  category: "garden" as Category,
  condition: "good" as Condition,
  description: "",
};

export default function MyListingsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );
  const tools = useQuery(api.tools.listMine, me ? {} : "skip");
  const createTool = useMutation(api.tools.create);
  const updateTool = useMutation(api.tools.update);
  const removeTool = useMutation(api.tools.remove);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<Id<"tools"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await updateTool({ toolId: editingId, ...form });
      } else {
        await createTool(form);
      }
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="page">
      <h1 className="section-title">My listings</h1>
      <p className="lede">
        List tools you’re willing to lend. You can edit or delete only your own.
      </p>

      <div className="split">
        <form className="panel form-grid" onSubmit={onSubmit}>
          <h2 className="panel-heading">
            {editingId ? "Edit tool" : "List a tool"}
          </h2>
          <label htmlFor="tool-name">
            Name
            <input
              id="tool-name"
              required
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label htmlFor="tool-category">
            Category
            <select
              id="tool-category"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as Category })
              }
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="tool-condition">
            Condition
            <select
              id="tool-condition"
              value={form.condition}
              onChange={(e) =>
                setForm({ ...form, condition: e.target.value as Condition })
              }
            >
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="tool-description">
            Short description
            <textarea
              id="tool-description"
              required
              maxLength={500}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          {error ? <p className="badge badge--warn">{error}</p> : null}
          <div className="row-actions">
            <button type="submit" className="btn btn--primary">
              {editingId ? "Save changes" : "List tool"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <section className="stack" aria-labelledby="your-listings">
          <h2 id="your-listings" className="panel-heading">
            Your listings
          </h2>
          {isLoading || !isAuthenticated || !me ? (
            <p className="muted">Connecting to your account…</p>
          ) : !tools ? (
            <p className="muted">Loading…</p>
          ) : tools.length === 0 ? (
            <p className="empty">You haven’t listed any tools yet.</p>
          ) : (
            tools.map((tool) => (
              <article key={tool._id} className="panel">
                <h3 style={{ margin: "0 0 0.25rem" }}>{tool.name}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {CATEGORY_LABELS[tool.category]} ·{" "}
                  {CONDITION_LABELS[tool.condition]} · {tool.availability}
                </p>
                <p>{tool.description}</p>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setEditingId(tool._id);
                      setForm({
                        name: tool.name,
                        category: tool.category,
                        condition: tool.condition,
                        description: tool.description,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => {
                      void removeTool({ toolId: tool._id });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
