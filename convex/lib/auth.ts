import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity;
}

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** For queries: user row must already exist (created by ensureCurrent / a mutation). */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  await requireIdentity(ctx);
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User profile not found. Call users.ensureCurrent first.");
  }
  return user;
}

/**
 * For mutations: create/patch the users row if needed, then return it.
 * Avoids races where Convex auth is ready before the client sync mutation finishes.
 */
export async function ensureCurrentUser(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  const email = identity.email ?? `${identity.subject}@users.clerk.local`;
  const name =
    identity.name ??
    identity.nickname ??
    identity.givenName ??
    email.split("@")[0] ??
    "Neighbor";
  const role = isAdminClerkId(identity.subject) ? "admin" : "user";

  if (existing) {
    await ctx.db.patch(existing._id, {
      email: String(email),
      name: String(name),
      role: role === "admin" ? "admin" : existing.role,
    });
    const updated = await ctx.db.get(existing._id);
    if (!updated) throw new Error("User disappeared");
    return updated;
  }

  const id = await ctx.db.insert("users", {
    clerkId: identity.subject,
    email: String(email),
    name: String(name),
    role,
    trustedLender: false,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create user");
  return created;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return user;
}

export async function ensureAdmin(ctx: MutationCtx): Promise<Doc<"users">> {
  const user = await ensureCurrentUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return user;
}

export function assertOwnTool(user: Doc<"users">, tool: Doc<"tools">) {
  if (user.role === "admin") return;
  if (tool.ownerId !== user._id) {
    throw new Error("Forbidden: not the tool owner");
  }
}

export function assertLoanParticipant(
  user: Doc<"users">,
  loan: Doc<"loans">,
  as: "lender" | "borrower" | "either",
) {
  if (user.role === "admin") return;
  if (as === "lender" && loan.lenderId !== user._id) {
    throw new Error("Forbidden: not the lender");
  }
  if (as === "borrower" && loan.borrowerId !== user._id) {
    throw new Error("Forbidden: not the borrower");
  }
  if (
    as === "either" &&
    loan.lenderId !== user._id &&
    loan.borrowerId !== user._id
  ) {
    throw new Error("Forbidden: not a participant on this loan");
  }
}

export function isAdminClerkId(clerkId: string): boolean {
  const raw = process.env.ADMIN_CLERK_IDS ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(clerkId);
}

export type UserId = Id<"users">;
