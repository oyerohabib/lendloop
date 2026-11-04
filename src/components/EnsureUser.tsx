"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/** Syncs the signed-in Clerk user into the Convex users table. */
export default function EnsureUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureCurrent = useMutation(api.users.ensureCurrent);

  useEffect(() => {
    // Wait until Convex has validated the Clerk JWT — Clerk's isSignedIn
    // alone is too early and causes Unauthenticated errors.
    if (isLoading || !isAuthenticated) return;
    void ensureCurrent().catch((err) => {
      console.error("Failed to sync user", err);
    });
  }, [isLoading, isAuthenticated, ensureCurrent]);

  return null;
}
