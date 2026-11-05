"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(
    api.users.me,
    !isLoading && isAuthenticated ? {} : "skip",
  );

  const items = [
    ...links,
    ...(me?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 720px)");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onChange() {
      setDesktop(desktopQuery.matches);
      if (desktopQuery.matches) setOpen(false);
    }
    onChange();
    window.addEventListener("keydown", onKey);
    desktopQuery.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktopQuery.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          LendLoop
        </Link>
        <Show when="signed-in">
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="nav-toggle__icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <nav
            id={menuId}
            className={open ? "nav nav--open" : "nav"}
            aria-label="Main"
            inert={!desktop && !open}
          >
            <div className="nav__panel">
              {items.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
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
