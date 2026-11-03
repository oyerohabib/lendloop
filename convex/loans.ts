import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  assertLoanParticipant,
  ensureCurrentUser,
  requireAdmin,
  requireUser,
} from "./lib/auth";
import { Doc } from "./_generated/dataModel";

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function enrichLoan(ctx: QueryCtx, loan: Doc<"loans">) {
  const tool = await ctx.db.get(loan.toolId);
  const borrower = await ctx.db.get(loan.borrowerId);
  const lender = await ctx.db.get(loan.lenderId);
  const events = await ctx.db
    .query("automationEvents")
    .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
    .take(20);
  events.sort((a, b) => b.createdAt - a.createdAt);
  return {
    ...loan,
    toolName: tool?.name ?? "Unknown tool",
    toolCategory: tool?.category,
    borrowerName: borrower?.name ?? "Borrower",
    borrowerEmail: borrower?.email,
    lenderName: lender?.name ?? "Lender",
    lenderTrusted: lender?.trustedLender ?? false,
    automationEvents: events.slice(0, 10),
  };
}

export const createRequest = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    if (!isIsoDate(args.startDate) || !isIsoDate(args.endDate)) {
      throw new Error("Dates must be YYYY-MM-DD");
    }
    if (args.endDate < args.startDate) {
      throw new Error("endDate must be on or after startDate");
    }
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.ownerId === user._id) {
      throw new Error("Cannot borrow your own tool");
    }

    const loanId = await ctx.db.insert("loans", {
      toolId: tool._id,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.notifications.notifyLoanEvent, {
      loanId,
      previousStatus: null,
    });

    return loanId;
  },
});

export const setStatus = mutation({
  args: {
    loanId: v.id("loans"),
    status: v.union(
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");

    if (args.status === "approved" || args.status === "declined") {
      assertLoanParticipant(user, loan, "lender");
      if (loan.status !== "pending") {
        throw new Error("Only pending requests can be approved or declined");
      }
    } else if (args.status === "returned") {
      assertLoanParticipant(user, loan, "lender");
      if (loan.status !== "approved") {
        throw new Error("Only approved loans can be marked returned");
      }
    }

    const previousStatus = loan.status;
    await ctx.db.patch(args.loanId, { status: args.status });

    await ctx.scheduler.runAfter(0, internal.notifications.notifyLoanEvent, {
      loanId: args.loanId,
      previousStatus,
    });
  },
});

export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .take(100);
    const rows = [];
    for (const loan of loans) {
      rows.push(await enrichLoan(ctx, loan));
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const incomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .take(100);
    const rows = [];
    for (const loan of loans) {
      rows.push(await enrichLoan(ctx, loan));
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listAllAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").take(200);
    const rows = [];
    for (const loan of loans) {
      rows.push(await enrichLoan(ctx, loan));
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});
