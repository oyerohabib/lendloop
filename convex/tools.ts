import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { categoryValidator, conditionValidator } from "./schema";
import {
  assertOwnTool,
  ensureCurrentUser,
  requireAdmin,
  requireUser,
} from "./lib/auth";
import { Id } from "./_generated/dataModel";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function toolAvailability(
  ctx: QueryCtx,
  toolId: Id<"tools">,
): Promise<"available" | "on_loan"> {
  const today = todayIsoDate();
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .take(50);
  const active = loans.find(
    (loan) =>
      loan.status === "approved" &&
      loan.startDate <= today &&
      loan.endDate >= today,
  );
  return active ? "on_loan" : "available";
}

/** Public: name + category only for tools that are currently available. */
export const listPublicAvailable = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").take(200);
    const result: { name: string; category: string }[] = [];
    for (const tool of tools) {
      const status = await toolAvailability(ctx, tool._id);
      if (status === "available") {
        result.push({ name: tool.name, category: tool.category });
      }
    }
    return result;
  },
});

/** Authenticated board: full tool info + availability, optional category filter. */
export const listBoard = query({
  args: {
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const tools = args.category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .take(200)
      : await ctx.db.query("tools").take(200);

    const rows = [];
    for (const tool of tools) {
      const owner = await ctx.db.get(tool.ownerId);
      const availability = await toolAvailability(ctx, tool._id);
      rows.push({
        _id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        availability,
        ownerName: owner?.name ?? "Neighbor",
        trustedLender: owner?.trustedLender ?? false,
        ownerId: tool.ownerId,
      });
    }
    return rows;
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(100);
    const rows = [];
    for (const tool of tools) {
      rows.push({
        ...tool,
        availability: await toolAvailability(ctx, tool._id),
      });
    }
    return rows;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const name = args.name.trim();
    const description = args.description.trim();
    if (!name || name.length > 80) throw new Error("Invalid name");
    if (!description || description.length > 500) {
      throw new Error("Invalid description");
    }
    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name,
      category: args.category,
      condition: args.condition,
      description,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    assertOwnTool(user, tool);
    const name = args.name.trim();
    const description = args.description.trim();
    if (!name || name.length > 80) throw new Error("Invalid name");
    if (!description || description.length > 500) {
      throw new Error("Invalid description");
    }
    await ctx.db.patch(args.toolId, {
      name,
      category: args.category,
      condition: args.condition,
      description,
    });
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    assertOwnTool(user, tool);
    await ctx.db.delete(args.toolId);
  },
});

/** Admin can remove any listing. */
export const adminRemove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    await ctx.db.delete(args.toolId);
  },
});
