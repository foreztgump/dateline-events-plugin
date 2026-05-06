# Plugin Development Guide

Guide to developing custom Dateline plugins and extending existing ones.

## Plugin manifest skeleton

Every Dateline plugin is an EmDash plugin. Use `definePlugin()` to create one:

```ts
import { definePlugin } from "emdash";

export default function createMyPlugin() {
  return definePlugin({
    id: "dateline-my-plugin",
    version: "0.1.0",
    capabilities: ["content:read", "content:write"],
    collections: [
      // Define new content types here if needed
    ],
    routes: ["admin/settings", "api/myendpoint"],
    routeHandlers: {
      "admin/settings": handleAdminSettings,
      "api/myendpoint": handleMyEndpoint,
    },
    hooks: {
      "content:afterSave": afterEventSaved,
    },
    admin: {
      pages: [
        { path: "/dateline-my", label: "My Plugin", icon: "sparkles" },
      ],
    },
  });
}

async function handleAdminSettings(req, ctx) {
  return { blocks: [...] };
}

async function handleMyEndpoint(req, ctx) {
  return Response.json({ data: "..." });
}

async function afterEventSaved(event, ctx) {
  if (event.collection !== "dateline_events") return;
  // Your logic here
}
```

## Capabilities

Declare the minimum capabilities your plugin needs:

```ts
capabilities: [
  "content:read",        // Read events, attendees, etc.
  "content:write",       // Create and update entries
  "email:send",          // Send emails via EmDash
  "network:request",     // Fetch from whitelisted hosts
  "media:read",          // Access images
],

// For network:request, also declare allowedHosts:
allowedHosts: ["api.example.com", "webhook.example.com"],
```

See [capabilities-and-security.md](./capabilities-and-security.md) for the full reference.

## Hooks

Dateline plugins subscribe to EmDash's canonical hooks. Each hook receives an event object and a context (`ctx`) with capabilities.

### `content:beforeSave`

Fires before a content entry is saved. Use for validation, normalization, or blocking saves.

```ts
hooks: {
  "content:beforeSave": async (event, ctx) => {
    if (event.collection !== "dateline_events") return;
    
    // Validate RRULE if present
    const { validateRRule } = await import("@dateline/recurring");
    if (event.content.recurrenceRule) {
      const validation = validateRRule(event.content.recurrenceRule);
      if (!validation.ok) {
        throw new Error(`Invalid RRULE: ${validation.error}`);
      }
    }
    
    // Normalize times to UTC
    event.content.startsAt = new Date(event.content.startsAt).toISOString();
    event.content.endsAt = new Date(event.content.endsAt).toISOString();
  },
}
```

**When to use:** Validation, normalization, computed fields.

**Limitations:** Cannot use `ctx.waitUntil()`; must complete synchronously within 50ms budget.

### `content:afterSave`

Fires after an entry is successfully saved. Use for side effects, cache invalidation, email confirmation.

```ts
hooks: {
  "content:afterSave": async (event, ctx) => {
    if (event.collection !== "dateline_attendees") return;
    
    // Defer email until after response
    ctx.waitUntil(sendRsvpConfirmation(ctx, event.content));
    
    // Invalidate event cache
    const eventId = event.content.event;
    ctx.waitUntil(ctx.kv.delete(`event-cache:${eventId}`));
  },
}
```

**When to use:** Side effects, cache invalidation, email, webhooks.

**`ctx.waitUntil()` mandatory:** Any async work that continues past the response **must** use `ctx.waitUntil()`. See [capabilities-and-security.md#ctxwaituntil-is-mandatory](./capabilities-and-security.md#ctxwaituntil-is-mandatory).

### `content:beforeDelete`

Fires before an entry is deleted. Use for validation (e.g., "can't delete events with attendees").

```ts
hooks: {
  "content:beforeDelete": async (event, ctx) => {
    if (event.collection !== "dateline_events") return;
    
    // Block deletion if attendees exist
    const { entries } = await ctx.content.query("dateline_attendees", {
      filter: { event: event.id },
    });
    
    if (entries.length > 0) {
      throw new Error(`Cannot delete: ${entries.length} attendees registered`);
    }
  },
}
```

**When to use:** Validation, referential integrity checks.

### `content:afterDelete`

Fires after an entry is deleted. Use for cleanup.

```ts
hooks: {
  "content:afterDelete": async (event, ctx) => {
    if (event.collection !== "dateline_events") return;
    
    // Clean up KV caches
    ctx.waitUntil(ctx.kv.delete(`event-cache:${event.id}`));
    ctx.waitUntil(ctx.kv.delete(`capacity:${event.id}`));
  },
}
```

**When to use:** Cleanup, cascading deletes, audit logs.

### `cron`

Scheduled/recurring work. Use for:
- Time-based status transitions (scheduled → live → past)
- Hold expiration sweeps
- Recurring batch operations

```ts
hooks: {
  cron: async (trigger, ctx) => {
    // Sweep expired holds
    const holds = await ctx.kv.list({ prefix: "hold:" });
    for (const { name } of holds.keys) {
      const hold = await ctx.kv.get(name, "json");
      if (hold.expiresAt < Date.now()) {
        // Restore inventory
        const cartId = name.split(":")[1];
        await releaseCart(ctx, cartId);
        ctx.waitUntil(ctx.kv.delete(name));
      }
    }
  },
}
```

**When to use:** Scheduled cleanup, status transitions, batch operations.

### `plugin:activate`

Fires once when the plugin is first activated. Use for one-time setup.

```ts
hooks: {
  "plugin:activate": async (event, ctx) => {
    // Create initial collections, seed data, etc.
    console.log("Dateline plugin activated");
  },
}
```

## Routes

Routes are HTTP endpoints your plugin exposes. They mount at `/_emdash/api/plugins/{plugin-id}/{route}`.

### Admin UI routes (return Block Kit)

```ts
async function handleAdminSettings(req, ctx) {
  const { blocks, assertResponse } = await import("@dateline/blocks");
  
  const response = {
    blocks: [
      blocks.header("Event settings"),
      blocks.section("Timezone", {
        accessory: elements.select("timezone", [
          { label: "UTC", value: "UTC" },
          { label: "America/Los_Angeles", value: "America/Los_Angeles" },
        ]),
      }),
    ],
  };
  
  // Validate before returning
  return assertResponse(response);
}
```

**Key constraint:** Admin routes return only `{ blocks, toast? }`. No HTML, no redirects, no `Response.json()`. Block Kit is the admin UI language.

### API routes (return JSON)

```ts
async function handleRsvpSubmit(req, ctx) {
  const body = await req.json();
  
  const attendee = await ctx.content.create("dateline_attendees", {
    event: body.eventId,
    name: body.name,
    email: body.email,
    status: "confirmed",
  });
  
  // Defer email
  ctx.waitUntil(sendRsvpConfirmation(ctx, attendee));
  
  return Response.json({ ok: true, attendeeId: attendee.id });
}
```

### Webhook routes

```ts
async function handleStripeWebhook(req, ctx) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  
  // Verify signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response("Invalid signature", { status: 403 });
  }
  
  // Idempotency: check if we've already processed this event
  const idempotencyKey = `idempotency:${event.id}`;
  const cached = await ctx.kv.get(idempotencyKey);
  if (cached) {
    return new Response("Duplicate", { status: 200 });
  }
  
  // Mark processed
  ctx.waitUntil(ctx.kv.put(idempotencyKey, "1", { expirationTtl: 604800 })); // 7 days
  
  // Process webhook (deferred)
  ctx.waitUntil(processStripeEvent(ctx, event));
  
  return new Response("OK", { status: 200 });
}
```

**Critical pattern:** Always verify signatures + dedupe by event ID in KV. Webhooks are at-least-once delivery.

## Block Kit patterns

Use `@dateline/blocks` to safely construct admin UIs:

```ts
import { blocks, elements, assertResponse } from "@dateline/blocks";

export function eventDetail(event) {
  return assertResponse({
    blocks: [
      blocks.header(event.title),
      blocks.divider(),
      blocks.section(`📅 ${event.startsAt} – ${event.endsAt}`, {
        accessory: elements.button("edit", "Edit", { style: "primary" }),
      }),
      blocks.section(`📍 ${event.venue || "Virtual"}`, {
        accessory: elements.button("map", "Map", { style: "default" }),
      }),
      blocks.actions([
        elements.button("publish", "Publish", { style: "primary" }),
        elements.button("delete", "Delete", { style: "danger" }),
      ]),
    ],
  });
}
```

**Gotchas:**

- `blocks.stats([...])` uses `stats` key (not `items`)
- Button elements use `text` (not `label`)
- Section text is plain string; use `children` with marks for rich content
- Route responses return only `{ blocks, toast? }`; no redirects

See `@dateline/blocks` [README](../packages/blocks/README.md) for full catalog.

## Recurring events

Use `@dateline/recurring` to handle RRULE:

```ts
import { materializeOccurrences, validateRRule } from "@dateline/recurring";

// In a hook or route:
async function expandRecurringSeries(event, ctx) {
  if (!event.recurrenceRule) return;
  
  const validation = validateRRule(event.recurrenceRule);
  if (!validation.ok) {
    throw new Error(`Invalid RRULE: ${validation.error}`);
  }
  
  const occurrences = await materializeOccurrences({
    rrule: event.recurrenceRule,
    dtstart: event.startsAt,
    tzid: event.timezone,
    exdates: event.recurrenceExceptions,
    range: {
      start: new Date(),
      end: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
    },
    ctx,
  });
  
  return occurrences.map(occ => ({
    ...event,
    id: `${event.id}#${occ.recurrenceId}`,
    startsAt: occ.startsAt,
    endsAt: occ.endsAt,
  }));
}
```

**Critical gotcha:** Always include `tzid` in RRULE to handle DST correctly. Without it, occurrences drift across daylight saving transitions (rrule.js Issue #501).

## Testing

### Unit tests (Vitest)

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { validateRRule } from "@dateline/recurring";

describe("@dateline/recurring", () => {
  it("validates RRULE syntax", () => {
    const result = validateRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(result.ok).toBe(true);
  });
  
  it("rejects invalid FREQ", () => {
    const result = validateRRule("FREQ=INVALID");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("INVALID_FREQ");
  });
});
```

Run via:

```bash
pnpm run test
```

### Sandbox profiling (required for sandboxed handlers)

Profile every sandboxed handler to ensure it stays under 50ms CPU + 10 subrequests:

```bash
pnpm sandbox:profile -- --pkg @dateline/core
```

Output:

```json
{
  "id": "dateline-core",
  "handlers": [
    { "name": "beforeSave", "cpu_ms": 15, "subrequests": 3, "ok": true }
  ]
}
```

**Required in CI:** If any handler exceeds budget, fail the build. Fix by:

1. Deferring work via `ctx.waitUntil()`
2. Batching network calls
3. Using KV caches

## ESLint rules

### `no-bare-promises-in-hooks`

Enforces that all async work in hooks uses `ctx.waitUntil()` or is awaited:

```ts
// ✅ Correct
ctx.waitUntil(sendEmail(ctx, user));

// ✅ Correct (awaited)
await sendEmail(ctx, user);

// ❌ Error: bare promise in hook
sendEmail(ctx, user);
```

Run via:

```bash
pnpm run lint
```

## Performance tips

### 1. Use KV caching

Cache frequently-accessed data:

```ts
const cacheKey = `event-${eventId}-detail`;
let event = await ctx.kv.get(cacheKey, "json");
if (!event) {
  event = await ctx.content.get("dateline_events", eventId);
  ctx.waitUntil(ctx.kv.put(cacheKey, JSON.stringify(event), { expirationTtl: 300 }));
}
```

### 2. Batch network calls

Instead of looping `ctx.http.fetch()`:

```ts
// ❌ Slow: 10+ subrequests
for (const url of urls) {
  await ctx.http.fetch(url);
}

// ✅ Fast: 1 subrequest per batch
const responses = await Promise.all(
  urls.map(url => ctx.http.fetch(url))
);
```

### 3. Defer heavy work

Use `ctx.waitUntil()` for anything that takes >20ms:

```ts
// Response returns immediately; work continues in background
ctx.waitUntil(ctx.content.create("dateline_attendees", {...}));
```

### 4. Profile before shipping

Always run the sandbox profiler:

```bash
pnpm sandbox:profile -- --pkg @your/plugin
```

## Common patterns

### RSVP with capacity

```ts
// In afterSave hook for dateline_attendees:
async function updateCapacity(event, ctx) {
  const eventId = event.content.event;
  
  // Atomically increment capacity counter
  const current = parseInt(await ctx.kv.get(`capacity:${eventId}`) || "0", 10);
  await ctx.kv.put(`capacity:${eventId}`, String(current + 1));
}
```

### Deferred email confirmation

```ts
async function sendConfirmation(ctx, attendee) {
  await ctx.email.send({
    to: attendee.email,
    subject: "RSVP Confirmed",
    body: `Hi ${attendee.name}, your RSVP is confirmed!`,
  });
}

// In afterSave hook:
ctx.waitUntil(sendConfirmation(ctx, event.content));
```

### Webhook idempotency

```ts
async function webhookHandler(req, ctx) {
  const eventId = req.headers.get("x-webhook-id");
  
  // Dedup by event ID
  const seen = await ctx.kv.get(`webhook:${eventId}`);
  if (seen) return new Response("OK", { status: 200 }); // Already processed
  
  // Process...
  ctx.waitUntil(ctx.kv.put(`webhook:${eventId}`, "1", { expirationTtl: 604800 }));
  
  return new Response("OK", { status: 200 });
}
```

## See also

- [Capabilities & security](./capabilities-and-security.md) — capability reference and sandbox budgets
- [Installation guide](./installation.md) — setup walkthrough
- [Root README](../README.md) — architecture overview
- [@dateline/blocks](../packages/blocks/README.md) — Block Kit builders
- [@dateline/recurring](../packages/recurring/README.md) — RRULE patterns
- [Reference site](../examples/reference-site) — full working example
