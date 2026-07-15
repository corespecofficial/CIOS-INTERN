# Launch assurance runbook

The automated suite never creates real charges. Use dedicated Clerk identities and organizations whose names begin with `ASSURANCE`.

## Authenticated tenant checks

Set `ASSURANCE_BASE_URL` and `ASSURANCE_ACCOUNTS` as a JSON array. Each object contains `name`, the complete Clerk `cookie` header from a dedicated test browser, `ownSlug`, `deniedSlug`, and `host`.

Run `npm run assurance:tenants`. It must return 200 for each identity's own classroom and 404 for the other organization.

## Capacity test

Run `npm run assurance:load`. Defaults: 500 requests, concurrency 20, maximum 1% failures, maximum p95 1800 ms. Override with `ASSURANCE_ITERATIONS`, `ASSURANCE_CONCURRENCY`, `ASSURANCE_MAX_ERROR_RATE`, and `ASSURANCE_MAX_P95_MS`.

For the 1,000-user pilot, run stages of concurrency 10, 25, then 50. Stop if failures exceed 1%, database connections saturate, or p95 exceeds 1.8 seconds.

## Authenticated lifecycle checklist

Use only dedicated assurance identities. Record evidence for: signup and Clerk webhook sync; code join into the correct organization; cross-tenant denial; member removal and immediate 404; global ban and immediate `/suspended`; wallet test top-up; fine settlement; global and organization subscriptions; unique receipt generation; withdrawal rejection refund; duplicated Flutterwave webhook delivery. Replaying the same signed webhook must leave one receipt and one wallet credit.

## Monitoring

Configure `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`. Optionally set `OPERATIONS_ALERT_WEBHOOK_URL` to an HTTPS Slack/Teams-compatible receiver. Configure `CRON_SECRET`. The daily payment reconciler inspects up to 100 stale intents, safely resumes verified settlements, and alerts on unresolved or failed records.
