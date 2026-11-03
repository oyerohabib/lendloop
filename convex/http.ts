import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  assertTimestampFresh,
  normalizeSignatureHeader,
  verifyHmacSha256,
} from "./lib/hmac";

const http = httpRouter();

async function requireAutomationAuth(request: Request, body: string) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Server misconfigured", { status: 500 });
  }

  try {
    assertTimestampFresh(request.headers.get("X-LendLoop-Timestamp"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad timestamp";
    return new Response(message, { status: 401 });
  }

  const signature = normalizeSignatureHeader(
    request.headers.get("X-LendLoop-Signature"),
  );
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const timestamp = request.headers.get("X-LendLoop-Timestamp")!;
  const signedPayload = `${timestamp}.${body}`;
  const ok = await verifyHmacSha256(secret, signedPayload, signature);
  if (!ok) {
    return new Response("Invalid signature", { status: 401 });
  }
  return null;
}

http.route({
  path: "/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authError = await requireAutomationAuth(request, "");
    if (authError) return authError;

    const today = new Date().toISOString().slice(0, 10);
    const rows = await ctx.runQuery(
      internal.loanInternals.listOverdueForAutomation,
      { today },
    );

    return new Response(JSON.stringify({ today, loans: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/reminders/ack",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const authError = await requireAutomationAuth(request, body);
    if (authError) return authError;

    let parsed: {
      loanId?: string;
      idempotencyKey?: string;
      sentAt?: number;
      summary?: string;
      status?: "sent" | "failed";
    };
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      !parsed.loanId ||
      !parsed.idempotencyKey ||
      typeof parsed.sentAt !== "number"
    ) {
      return new Response("Missing required fields", { status: 400 });
    }

    const result = await ctx.runMutation(internal.automation.recordReminder, {
      loanId: parsed.loanId as Id<"loans">,
      idempotencyKey: parsed.idempotencyKey,
      sentAt: parsed.sentAt,
      summary:
        parsed.summary ??
        `Overdue reminder recorded (${parsed.idempotencyKey})`,
      status: parsed.status ?? "sent",
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
