# LendLoop

Neighborhood tool-lending board: neighbors list tools, request borrows, and get automated notifications/reminders via **n8n**.

**Stack:** Next.js (App Router) · Clerk · Convex · n8n (Docker) · TypeScript

> Borrow what you need. Lend what you don’t.

## Architecture

```
Browser ──► Next.js ──► Clerk (auth)
               │
               └──► Convex (data + RBAC + scheduled actions)
                        │
                        ├─ HMAC POST ──► n8n “Request Notification” ──► mock log
                        │
n8n “Overdue Reminders” (cron)
   ├─ HMAC GET  /overdue-loans   ◄── Convex HTTP
   └─ HMAC POST /reminders/ack  ──► Convex (idempotent)
```

- **Convex** owns data, role checks, and outbound webhook triggers.
- **n8n** owns delivery (mock notification log) and the daily overdue sweep.
- **Public homepage** shows only tool `name` + `category` (no owner details).

## Local setup

### 1. App dependencies

```bash
npm install
cp .env.example .env.local
```

### 2. Clerk

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy **Publishable** and **Secret** keys into `.env.local`.
3. **Required for Convex auth:** create a JWT template named exactly **`convex`** (Clerk → **Configure** → **JWT Templates** → New template → choose **Convex** if listed, otherwise create one named `convex` with `aud` claim `"convex"`). Without this, Convex stays `Unauthenticated` even when Clerk shows you signed in.
4. Note your Frontend API URL (e.g. `https://YOUR_INSTANCE.clerk.accounts.dev`) — set that as Convex env `CLERK_JWT_ISSUER_DOMAIN`.

### 3. Convex

```bash
npx convex dev
```

Follow the prompts to create/link a project. Then in the [Convex dashboard](https://dashboard.convex.dev) → Settings → Environment Variables set:

| Variable | Purpose |
|----------|---------|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk Frontend API URL |
| `ADMIN_CLERK_IDS` | Comma-separated Clerk user IDs promoted to `admin` on sync |
| `N8N_WEBHOOK_SECRET` | Shared HMAC secret (same as local `.env`) |
| `N8N_REQUEST_WEBHOOK_URL` | e.g. `http://host.docker.internal:5678/webhook/lendloop-request` (see note below) |

Also copy `NEXT_PUBLIC_CONVEX_URL` (and optionally `CONVEX_SITE_URL` from the deployment’s HTTP actions URL, typically `https://<deployment>.convex.site`) into `.env.local`.

**Cloud Convex → local n8n:** Convex actions run in the cloud, so `localhost` inside an action is not your laptop. Use a tunnel ([ngrok](https://ngrok.com), cloudflared, etc.) to your n8n webhook, or temporarily point `N8N_REQUEST_WEBHOOK_URL` at that public URL.

### 4. n8n (Docker)

```bash
# Ensure N8N_WEBHOOK_SECRET and CONVEX_SITE_URL are in a root `.env`
# (docker-compose reads them). You can symlink or copy from .env.local.
docker compose up -d
```

The Code nodes use Node’s `crypto` and `fs` modules. n8n blocks those unless `NODE_FUNCTION_ALLOW_BUILTIN=crypto,fs` is set (already in `docker-compose.yml`). Recreate the container after changing that file: `docker compose up -d --force-recreate`.

Open [http://localhost:5678](http://localhost:5678), complete first-time setup, then **Import** the workflows from:

- [`n8n/workflows/error-handler.json`](n8n/workflows/error-handler.json)
- [`n8n/workflows/request-notification.json`](n8n/workflows/request-notification.json)
- [`n8n/workflows/overdue-reminders.json`](n8n/workflows/overdue-reminders.json)

Activate all three. In each business workflow’s settings, link **Error Workflow** to **LendLoop Error Handler** if the import did not resolve the name automatically.

Mock notifications append JSON lines to [`n8n/logs/notifications.log`](n8n/logs/notifications.log). Failures go to `n8n/logs/errors.log`.

### 5. Run the app

```bash
npm run dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- Convex: continues via `convex dev`
- n8n: [http://localhost:5678](http://localhost:5678)

Sign in once, copy your Clerk user id into Convex `ADMIN_CLERK_IDS`, call any authenticated page (triggers `users.ensureCurrent`), and you will be promoted to admin.

## Roles & RBAC

| Role | Capabilities |
|------|----------------|
| **user** | CRUD own tools; create borrow requests; approve/decline/return only as lender on own tools |
| **admin** | Everything above + remove any listing, view all loans, set Trusted Lender |

Enforcement lives in Convex mutations/queries (`convex/lib/auth.ts`), not only in the UI.

## Automation security

**Bidirectional HMAC-SHA256**

1. **Convex → n8n (request webhook):** body signed with `X-LendLoop-Signature: sha256=<hex>`. n8n verifies before logging.
2. **n8n → Convex HTTP:** `X-LendLoop-Timestamp` + signature over `timestamp + "." + body` (empty body for GET). Convex rejects missing/invalid signatures and timestamps outside ±5 minutes.

**Secrets** stay in environment variables / Convex dashboard / n8n env — never in source or exported workflow JSON.

**Data minimization:** webhooks and overdue payloads include only what delivery needs (`loanId`, `status`, `toolName`, recipient email, dates). No tool descriptions, addresses, or unrelated Clerk IDs.

**Idempotency:** reminder write-backs use `idempotencyKey` = `overdue:{loanId}:{YYYY-MM-DD}` with a unique index lookup; retries return the existing event instead of duplicating. Request notifications use `request:{loanId}:{status}:{previous}`.

**Reliability:** HTTP nodes retry on failure; the Error Trigger workflow records failed runs to `errors.log` so nothing fails silently.

## Bonus: automation activity

Each loan’s Incoming / My requests views show recent `automationEvents` (e.g. “Reminder sent 2 days ago”).

## Production notes

What I’d change to run this for real:

1. **Email/Slack provider** instead of the mock log; keep the same minimal payload and HMAC contract.
2. **n8n** on managed cloud or hardened K8s with persistent volume, SSO, and alerting on the error workflow.
3. **Secret rotation** for `N8N_WEBHOOK_SECRET`; short-lived tunnel URLs replaced by a stable private network or allowlisted egress.
4. **Clerk + Convex production** instances; lock down CORS and Clerk redirect URLs.
5. **Rate limits / queueing** on webhook fan-out; dead-letter handling for permanent delivery failures.
6. **Observability:** structured logs, metrics on overdue batch size, dashboard for failed automations.
7. **Legal/privacy:** retention policy for notification logs; DPA with any email vendor.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js + Convex in parallel |
| `npm run build` | Production Next.js build |
| `docker compose up -d` | Start n8n |

Route protection uses Next.js 16 `src/proxy.ts` with Clerk (`clerkMiddleware` + `auth.protect` on authenticated paths).

## License

MIT (take-home assessment — fictional product, unrelated to Fluence healthcare).
