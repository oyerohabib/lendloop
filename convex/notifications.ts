"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createHmac } from "crypto";

function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Posts a minimal signed payload to the n8n request-notification webhook.
 * Failures are recorded as automationEvents; they do not throw to the user path.
 */
export const notifyLoanEvent = internalAction({
  args: {
    loanId: v.id("loans"),
    previousStatus: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const webhookUrl = process.env.N8N_REQUEST_WEBHOOK_URL;
    const secret = process.env.N8N_WEBHOOK_SECRET;

    const data = await ctx.runQuery(internal.loanInternals.getLoanNotifyContext, {
      loanId: args.loanId,
    });
    if (!data) return;

    const { loan, toolName, borrowerEmail, lenderEmail } = data;

    // Notify the other party: new request → lender; status change → borrower
    const recipientRole =
      args.previousStatus === null ? "lender" : "borrower";
    const recipientEmail =
      recipientRole === "lender" ? lenderEmail : borrowerEmail;

    const eventId = `${loan._id}:${loan.status}:${Date.now()}`;
    const idempotencyKey = `request:${loan._id}:${loan.status}:${args.previousStatus ?? "new"}`;

    const payload = {
      eventId,
      loanId: loan._id,
      status: loan.status,
      previousStatus: args.previousStatus,
      toolName,
      recipientEmail,
      role: recipientRole,
      occurredAt: new Date().toISOString(),
    };

    if (!webhookUrl || !secret) {
      await ctx.runMutation(internal.automation.recordRequestNotification, {
        loanId: args.loanId,
        idempotencyKey,
        summary: `Skipped webhook (env not configured): ${loan.status} for ${toolName}`,
        status: "failed",
      });
      return;
    }

    const body = JSON.stringify(payload);
    const signature = signBody(secret, body);

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LendLoop-Signature": `sha256=${signature}`,
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Webhook HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      await ctx.runMutation(internal.automation.recordRequestNotification, {
        loanId: args.loanId,
        idempotencyKey,
        summary: `Notified ${recipientRole} of status “${loan.status}” for ${toolName}`,
        status: "sent",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await ctx.runMutation(internal.automation.recordRequestNotification, {
        loanId: args.loanId,
        idempotencyKey,
        summary: `Notification failed: ${message}`,
        status: "failed",
      });
    }
  },
});
