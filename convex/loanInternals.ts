import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getLoanNotifyContext = internalQuery({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan) return null;
    const tool = await ctx.db.get(loan.toolId);
    const borrower = await ctx.db.get(loan.borrowerId);
    const lender = await ctx.db.get(loan.lenderId);
    return {
      loan,
      toolName: tool?.name ?? "Unknown tool",
      borrowerEmail: borrower?.email ?? "",
      lenderEmail: lender?.email ?? "",
    };
  },
});

/** Minimal overdue loan rows for n8n (no owner PII beyond borrower email). */
export const listOverdueForAutomation = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    const approved = await ctx.db
      .query("loans")
      .withIndex("by_status_endDate", (q) =>
        q.eq("status", "approved").lt("endDate", args.today),
      )
      .take(100);

    const rows = [];
    for (const loan of approved) {
      const tool = await ctx.db.get(loan.toolId);
      const borrower = await ctx.db.get(loan.borrowerId);
      rows.push({
        loanId: loan._id,
        toolName: tool?.name ?? "Unknown tool",
        borrowerEmail: borrower?.email ?? "",
        endDate: loan.endDate,
        lastReminderAt: loan.lastReminderAt ?? null,
      });
    }
    return rows;
  },
});
