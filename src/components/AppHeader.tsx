"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const links = [
  { href: "/board", label: "Board" },
  { href: "/my/listings", label: "My listings" },
  { href: "/my/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
];

export default function AppHeader() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          LendLoop
        </Link>
        <Show when="signed-in">
          <nav className="nav" aria-label="Main">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            {me?.role === "admin" ? (
              <Link href="/admin">Admin</Link>
            ) : null}
          </nav>
        </Show>
        <div className="site-header__actions">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="btn btn--ghost">
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
