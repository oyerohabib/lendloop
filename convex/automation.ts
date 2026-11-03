import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertLoanParticipant, requireUser } from "./lib/auth";

/** Idempotent write-back from n8n overdue workflow. */
export const recordReminder = internalMutation({
  args: {
    loanId: v.id("loans"),
    idempotencyKey: v.string(),
    sentAt: v.number(),
    summary: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();

    if (existing) {
      return { created: false, eventId: existing._id };
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new Error("Loan not found");
    }

    const eventId = await ctx.db.insert("automationEvents", {
      loanId: args.loanId,
      type: "overdue_reminder",
      status: args.status,
      idempotencyKey: args.idempotencyKey,
      summary: args.summary,
      createdAt: args.sentAt,
    });

    if (args.status === "sent") {
      await ctx.db.patch(args.loanId, { lastReminderAt: args.sentAt });
    }

    return { created: true, eventId };
  },
});

export const recordRequestNotification = internalMutation({
  args: {
    loanId: v.id("loans"),
    idempotencyKey: v.string(),
    summary: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (existing) {
      return { created: false, eventId: existing._id };
    }

    const eventId = await ctx.db.insert("automationEvents", {
      loanId: args.loanId,
      type: "request_notification",
      status: args.status,
      idempotencyKey: args.idempotencyKey,
      summary: args.summary,
      createdAt: Date.now(),
    });
    return { created: true, eventId };
  },
});

export const forLoan = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");
    assertLoanParticipant(user, loan, "either");
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", args.loanId))
      .take(30);
    return events.sort((a, b) => b.createdAt - a.createdAt);
  },
});
