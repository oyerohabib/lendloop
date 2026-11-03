import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  ensureAdmin,
  ensureCurrentUser,
  getCurrentUser,
  requireAdmin,
  requireUser,
} from "./lib/auth";

export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ensureCurrentUser(ctx);
    return user._id;
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").take(200);
  },
});

export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    trusted: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    await ctx.db.patch(args.userId, { trustedLender: args.trusted });
  },
});

export const requireSignedIn = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return { userId: user._id, role: user.role };
  },
});
