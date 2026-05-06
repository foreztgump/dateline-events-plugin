# Capabilities & Security

Dateline plugins run sandboxed on Cloudflare Workers with explicit capability declarations. This document explains the capability model, data access boundaries, and security guarantees.

## The Resource:Verb Capability Model

EmDash uses the canonical capability naming scheme: `resource:[sub-resource]:verb[:qualifier]`.

Dateline plugins declare only the capabilities they need. EmDash's runtime enforces these at the boundary, so a plugin cannot exceed its declared permissions.

### Canonical capabilities

| Capability | Grants | `ctx` binding | Who uses |
|---|---|---|---|
| `content:read` | `ctx.content.get()`, `ctx.content.list()`, `ctx.content.query()` | `ctx.content` | `@dateline/core`, `@dateline/rsvp`, `@dateline/importer`, `@dateline/tickets-backend` |
| `content:write` | `ctx.content.create()`, `ctx.content.update()`, `ctx.content.delete()` | `ctx.content` | `@dateline/core`, `@dateline/rsvp`, `@dateline/importer` |
| `media:read` | `ctx.media.get()`, `ctx.media.list()`, `ctx.media.getDownloadUrl()` | `ctx.media` | `@dateline/core` |
| `media:write` | `ctx.media.getUploadUrl()`, `ctx.media.delete()` | `ctx.media` | (reserved for future add-ons) |
| `network:request` | `ctx.http.fetch()` to whitelisted hosts only (see `allowedHosts`) | `ctx.http` | `@dateline/importer`, `@dateline/tickets-backend`, `@dateline/virtual` |
| `network:request:unrestricted` | `ctx.http.fetch()` to any host (caution: security risk) | `ctx.http` | (not used in v0.1; available if needed) |
| `users:read` | `ctx.users.get()`, `ctx.users.list()`, `ctx.users.getByEmail()` | `ctx.users` | (reserved for future add-ons) |
| `email:send` | `ctx.email.send()` via EmDash's mail pipeline | `ctx.email` | `@dateline/rsvp` |
| `hooks.email-events:register` | Hook into `email:beforeSend`, `email:afterSend` | hooks | (reserved) |

### Always granted (no declaration needed)

- `ctx.kv.*` — plugin-scoped KV store (automatic per-plugin isolation; no capability declaration)
- `ctx.log.*` — structured logging
- Routes and hooks declared in the plugin manifest

### Not exposed to plugins (architecture boundary)

- Raw SQL or D1 access — use `ctx.content.*` instead
- `ctx.queue.*` — no Cloudflare Queue binding to plugins (yet; open question for v0.2)
- Arbitrary `ctx.env` variables — only explicit bindings like `ctx.kv`, `ctx.http`, etc.

## Plugin-Scoped KV

Each sandboxed plugin has automatic, exclusive access to its own KV namespace. No capability declaration needed.

**Key pattern:** `<namespace>:<id>` (e.g., `capacity:event-123`, `hold:cart-xyz`)

**Cross-plugin access:** Structurally impossible. Plugin A cannot read or write Plugin B's KV. This isolation is enforced at the EmDash runtime level.

**TTL and cleanup:** KV entries support TTL. Use this for holds (10-min TTL), caches (1-5 min TTL), and deduplication keys (7 days for Stripe webhook idempotency).

## Data Access Patterns

### Content queries

All content access goes through `ctx.content.*`. No raw SQL.

```ts
// ✅ Correct
const event = await ctx.content.get("dateline_events", eventId);

// ❌ Not allowed: raw SQL
const event = await sql`SELECT * FROM events WHERE id = ${eventId}`;
```

### Media access

Images and files go through `ctx.media.*`. No filesystem access.

```ts
// ✅ Correct
const image = await ctx.media.get(imageId);
const uploadUrl = await ctx.media.getUploadUrl({ filename: "event.jpg" });

// ❌ Not allowed: filesystem
import { readFile } from "node:fs/promises";
const image = await readFile("/uploads/event.jpg");
```

### Network access (whitelisted hosts)

`ctx.http.fetch()` is restricted to `allowedHosts` unless the plugin declares `network:request:unrestricted`.

**Example:** `@dateline/importer` whitelists user-configured iCal hosts:

```ts
// wrangler.jsonc plugin config
{
  "dateline-importer": {
    "allowedHosts": [
      "calendar.google.com",
      "ical.example.com"
    ]
  }
}

// In the plugin code:
const response = await ctx.http.fetch("https://calendar.google.com/calendar/ical/user%40gmail.com/public/basic.ics");
// ✅ Allowed

const response = await ctx.http.fetch("https://arbitrary-domain.com/data");
// ❌ Rejected: not in allowedHosts
```

## Sandbox Budget & Performance

Sandboxed plugins on Cloudflare Workers are capped at:

- **50ms CPU per invocation** — total execution time
- **10 subrequests per invocation** — calls to `ctx.http.fetch()`, `ctx.content.*`, etc.
- **30s wall time** — total duration before forced termination
- **~128MB memory** — heap limit

**Strategy:** Keep handlers fast by using `ctx.waitUntil(promise)` for deferred work.

```ts
// ✅ Fast: returns immediately, defers email
export async function afterRsvp(event, ctx) {
  await ctx.content.create("dateline_attendees", { ...attendee });
  // Response returns here; email sends in background
  ctx.waitUntil(sendConfirmation(ctx, attendee));
}

// ❌ Slow: blocks response for 5+ seconds
export async function afterRsvp(event, ctx) {
  await ctx.content.create("dateline_attendees", { ...attendee });
  await sendConfirmation(ctx, attendee); // Blocks!
  // User waits 5+ seconds before "Success!" appears
}
```

### Profiling budget usage

Every sandboxed package includes a profile harness. Gate every handler in CI:

```bash
pnpm sandbox:profile -- --pkg @dateline/core
```

This outputs:

```json
{
  "id": "dateline-core",
  "handlers": [
    { "name": "beforeSave", "cpu_ms": 15, "subrequests": 3, "ok": true },
    { "name": "afterSave", "cpu_ms": 8, "subrequests": 2, "ok": true }
  ]
}
```

If any handler exceeds budget, the profiler returns non-zero exit code; CI fails. Fix by:

1. Deferring work via `ctx.waitUntil()`
2. Batching network calls
3. Using KV caches instead of repeated `ctx.content` queries

## `ctx.waitUntil()` Is Mandatory

**Critical rule on Cloudflare Workers:** Any Promise not registered with `ctx.waitUntil()` is silently cancelled when the request context tears down.

This breaks fire-and-forget patterns:

```ts
// ❌ WRONG: Bare promise silently cancelled
export async function rsvpSubmit(req, ctx) {
  const attendee = await ctx.content.create("dateline_attendees", {...});
  sendEmail(ctx, attendee); // ← Silently cancelled; email never sent
  return Response.json({ ok: true });
}

// ✅ CORRECT: Deferred work
export async function rsvpSubmit(req, ctx) {
  const attendee = await ctx.content.create("dateline_attendees", {...});
  ctx.waitUntil(sendEmail(ctx, attendee)); // ← Guaranteed to run
  return Response.json({ ok: true });
}
```

The ESLint rule `@dateline/eslint-plugin-dateline:no-bare-promises-in-hooks` catches this at build time.

### Hooks that need `ctx.waitUntil()`

- `content:afterSave` — webhook processing, email confirmation, cache invalidation
- `content:afterDelete` — cleanup tasks, notifications
- `cron` — scheduled sweeps, status transitions

### What gets deferred

- Email via `ctx.email.send()`
- External API calls via `ctx.http.fetch()`
- Heavy `ctx.content.*` operations (create multiple records)
- KV cleanup (delete old holds, expired sessions)

## GDPR Compliance

Dateline plugins implement privacy operations under two routes (provided by `@dateline/core`):

### `/privacy/export`

Returns all personal data for a given user (email address):

- Events the user created
- RSVP records where the user is the attendee
- Order history (when tickets are installed)
- Chat history (when AI add-on is installed)

Formatted as JSON, downloadable by the user.

### `/privacy/erase`

Permanently deletes all personal data for a user:

- Anonymizes RSVP attendee records (removes name, email, phone)
- Deletes order records (refund not automatic; must be done separately)
- Deletes chat history

User ID is matched by email address. Called via admin action or user request.

## Cloudflare Plan Differences

### Paid plan (recommended)

- **Dynamic Workers enabled** — sandboxed plugins run in isolated V8 isolates per plugin
- **Capability enforcement** — `content:read` is enforced; plugin cannot escalate
- **Subrequest budget** — 10 subrequests per plugin per invocation
- **KV isolation** — each plugin's KV is invisible to others

### Free plan

- **Dynamic Workers disabled** — plugins run in-process as trusted code
- **No capability enforcement** — all plugins can access all data and Cloudflare APIs
- **No isolation** — plugins can read/write each other's KV
- **Performance** — no sandbox overhead, but no security boundaries

**Recommendation:** Prototype on Free; upgrade to Paid before production.

## Linting & Validation

### Block Kit validation

All admin UI responses are validated against the Block Kit schema at build time:

```bash
pnpm run lint
```

Invalid Block Kit (wrong field names, wrong value types) fails CI.

### Bare promise linting

All hook handlers are checked for bare promises:

```bash
pnpm run lint
```

Errors if you write `promise` instead of `await promise` or `ctx.waitUntil(promise)` in a hook.

## What plugins cannot do (by design)

- ❌ Access raw SQL or D1
- ❌ Reach arbitrary hosts (only whitelisted via `allowedHosts`)
- ❌ Read other plugins' KV
- ❌ Execute system commands or shell
- ❌ Access the filesystem
- ❌ Inject arbitrary HTML/JS into admin (Block Kit JSON only)
- ❌ Bypass auth checks on routes
- ❌ Call Cloudflare APIs directly

## See also

- [Installation guide](./installation.md) — setup walkthrough
- [Plugin development](./plugin-development.md) — manifest patterns, hooks, testing
- [Root README](../README.md) — architecture overview
