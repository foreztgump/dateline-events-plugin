# PRO-397 RSVP

## Why

Dateline needs free RSVP registration on the unified attendee model so events can accept zero-price registrations without introducing a separate RSVP data path.

## What changes

- Add the `@dateline/rsvp` sandboxed plugin manifest, route handlers, hooks, admin Block Kit responses, and attendee schema.
- Implement capacity counters, per-IP route limiting, waitlist joins, cancellation promotion, and deferred confirmation emails.
- Add tests for manifest shape, capacity contention, waitlist promotion, waitUntil email behavior, and cron registration.

## Rollback

Revert the package implementation and remove the `packages/rsvp/sandboxed.json` profiler manifest.
