"use client";

import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORY_LABELS } from "@/lib/labels";

export default function HomePage() {
  const tools = useQuery(api.tools.listPublicAvailable);

  return (
    <>
      <section className="hero">
        <h1>LendLoop</h1>
        <p className="tagline">
          Borrow what you need. Lend what you don’t.
        </p>
        <div className="cta-row">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="btn btn--primary">
                Sign in to lend or borrow
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link href="/board" className="btn btn--primary">
              Open the board
            </Link>
          </Show>
        </div>
      </section>

      <section className="page" style={{ paddingTop: 0 }}>
        <h2 className="section-title">Available nearby</h2>
        <p className="lede">
          A read-only peek at tools neighbors are willing to lend. Sign in to
          request a borrow or list your own.
        </p>
        {!tools ? (
          <p className="muted">Loading tools…</p>
        ) : tools.length === 0 ? (
          <p className="empty">No tools listed yet.</p>
        ) : (
          <div className="tool-grid">
            {tools.map((tool, i) => (
              <div key={`${tool.name}-${i}`} className="tool-item">
                <h3>{tool.name}</h3>
                <p className="muted small">
                  {CATEGORY_LABELS[tool.category] ?? tool.category}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
