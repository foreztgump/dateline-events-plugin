# @dateline/rsvp

Sandboxed EmDash plugin that adds free RSVP functionality to Dateline events. Handles attendee registration with capacity enforcement and waitlists, sends confirmation emails, and manages attendee status (confirmed, waitlisted, cancelled). No payment provider required.

## Install

```bash
pnpm add @dateline/rsvp @dateline/core emdash@^0.9.0
```

## Peer dependencies

- `emdash@^0.9.0` — EmDash CMS runtime
- `@dateline/core` — events and collection schemas

## Capabilities required

This sandboxed plugin declares these capabilities:

- `content:read` — fetch events and attendee records
- `content:write` — create and update attendee entries
- `email:send` — dispatch RSVP confirmations via EmDash's mail pipeline

## Sandboxed?

✅ Yes. Runs in Cloudflare Workers Dynamic Worker sandbox (Paid plan required).

**Budget:** 50ms CPU + 10 subrequests per invocation. Email work is deferred via `ctx.waitUntil()` so responses return fast.

## Usage

```ts
import createRsvpPlugin from "@dateline/rsvp";

export default {
  plugins: [createRsvpPlugin()],
};

// Access exported utilities for custom handlers
import { reserveCapacity, releaseCapacity, readWaitlist } from "@dateline/rsvp";
```

### Routes

RSVP exposes these routes at `/_emdash/api/plugins/dateline-rsvp/{route}`:

- `rsvp-submit` — POST endpoint for public RSVP form submission (rate-limited per IP via KV)
- `waitlist` — POST endpoint to join waitlist when event is at capacity
- `admin/attendees` — Block Kit UI listing attendees with status and custom fields
- `admin/waitlist` — Block Kit UI for waitlist management (promote manually if needed)

### Collections

RSVP extends the collections defined by core:

- `dateline_attendees` — attendee records with status, contact info, custom fields, check-in token

## Key gotchas

**`ctx.waitUntil()` is mandatory:** Confirmation emails must be deferred via `ctx.waitUntil()` so the response (showing "Success!") returns before the email is sent. Otherwise, you'll wait 5+ seconds blocking the user. This is enforced by the ESLint rule `no-bare-promises-in-hooks`. See `/docs/plugin-development.md#ctx-waituntil-pattern`.

**Capacity as an atomic counter:** Capacity is tracked in KV (`capacity:{eventId}`) as an atomic counter. When an attendee RSVPs, we atomically increment; on cancellation, decrement. This is race-safe even under concurrent requests.

**Waitlist is a sorted JSON list:** When capacity is full, new RSVPs go to a waitlist stored in KV. The waitlist is sorted by join time. When capacity opens (e.g., another attendee cancels), the oldest entry is promoted. Promotion happens automatically on the next RSVP, or manually via the admin UI.

**Custom fields:** Events can define custom RSVP fields (dietary restrictions, shirt size, etc.) via the event's `rsvpFields` metadata. Attendee records store these in the `customFields` object.

**Rate-limit storage hygiene (PRO-879):** Per-IP RSVP rate limits are stored as `rate-limit:{eventId}:{ip}` records in `ctx.storage.rsvps` with an `expiresAt` timestamp. Expired records are ignored at read time, and the `dateline-rsvp-hold-expiry` cron sweep purges a budget-capped batch (`MAX_CRON_RATE_LIMIT_PURGES`, currently 3) of expired records per tick via `collection.delete(id)` to keep storage growth bounded within the 10-subrequest sandbox budget. **Residual growth:** if expired records accrue faster than the per-tick purge budget drains them (a sustained flood of distinct event+IP pairs), the backlog clears over subsequent ticks rather than instantly — steady-state size is bounded by `distinct active (eventId, IP) pairs + purge-backlog`. Raise `MAX_CRON_RATE_LIMIT_PURGES` (and/or the sweep frequency) only after confirming the sandbox subrequest budget headroom.

## See also

- [Root README](../../README.md) — architecture overview
- [Capabilities & security](/docs/capabilities-and-security.md) — EmDash capability model
- [Plugin development](/docs/plugin-development.md) — async patterns, email patterns, testing
