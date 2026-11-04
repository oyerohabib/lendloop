# n8n workflows for LendLoop

Import these JSON files into your local n8n instance (see root README).

| File | Purpose |
|------|---------|
| `workflows/error-handler.json` | Error Trigger → append to `logs/errors.log` |
| `workflows/request-notification.json` | Webhook from Convex → verify HMAC → mock notify log |
| `workflows/overdue-reminders.json` | Daily cron → fetch overdue → mock remind → ack Convex |

Secrets (`N8N_WEBHOOK_SECRET`, `CONVEX_SITE_URL`) come from the container environment via `docker-compose.yml` — they are **not** stored in these exports.
