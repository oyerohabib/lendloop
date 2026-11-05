"use client";

import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORY_LABELS } from "@/lib/labels";

export default function HomePage() {
  const tools = useQuery(api.tools.listPublicAvailable);
  const preview = tools?.slice(0, 3) ?? [];

  return (
    <section className="home">
      <div className="landing">
        <div className="landing-copy">
          <p className="eyebrow">On your street</p>
          <h1>The tool you need is already next door.</h1>
          <p className="landing-support">
            Neighbors list drills, ladders, and tent kits. You ask for the
            days you need them.
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
        </div>

        <aside className="landing-board" aria-label="Tools available nearby">
          <div className="landing-board__head">
            <p className="eyebrow">Available nearby</p>
            {tools && tools.length > 0 ? (
              <p className="muted small">
                {tools.length} on the board
              </p>
            ) : null}
          </div>
          {!tools ? (
            <p className="muted">Loading tools…</p>
          ) : preview.length === 0 ? (
            <p className="empty">
              Nothing listed yet. Be the first to put a tool up.
            </p>
          ) : (
            <ul className="landing-list">
              {preview.map((tool, i) => (
                <li key={`${tool.name}-${i}`}>
                  <span>{tool.name}</span>
                  <span className="muted">
                    {CATEGORY_LABELS[tool.category] ?? tool.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
