# Plugin Development Guide

Guide to developing Dateline's sandboxed EmDash 0.18 plugins and extending them. Dateline's three plugins (`@dateline/core`, `@dateline/rsvp`, `@dateline/importer`) use the **single-file sandboxed format**: one `emdash-plugin.jsonc` manifest plus one `src/plugin.ts` whose default export is typed `SandboxedPlugin`.

## The sandboxed plugin shape

A sandboxed plugin is two files:

1. **`emdash-plugin.jsonc`** — the manifest: `slug`, `publisher`, `license`, `author`, `security`, `capabilities`, `allowedHosts`, `storage` (with `indexes`), and optional `admin` pages. Validated by `@emdash-cms/plugin-cli`.
2. **`src/plugin.ts`** — the runtime: hooks + routes, default-exported as `SandboxedPlugin`.

### `src/plugin.ts` skeleton

```ts
import type { SandboxedPlugin } from "emdash/plugin";

const plugin: SandboxedPlugin = {
  hooks: {
    // Hook handlers MUST NOT annotate their params — TS infers them from the
    // hook name. Annotating breaks inference.
    "content:beforeSave": (event) => {
      // validate / normalize event.content
      return Promise.resolve(event.content);
    },
    "content:afterSave": async (event, ctx) => {
      // side effects via ctx
    },
  },
  routes: {
    "my-route": async (routeCtx, ctx) => {
      return { status: 200, body: { ok: true } };
    },
  },
};

export default plugin;
```

> **`emdash/plugin` is types-only.** Import `SandboxedPlugin` with `import type` — a runtime import throws.
>
> **TS2742/TS2883 workaround (verified):** do **not** write `export default { ... } satisfies SandboxedPlugin`; the CLI's d.ts generator fails with a portability error (`The inferred type of 'default' cannot be named without a reference to '…'`). Always use the named-const form above: `const plugin: SandboxedPlugin = { ... }; export default plugin;`.

### Building a plugin

Run the CLI from the package's **own** `node_modules/.bin` (a hoisted CLI can miss `typescript`), and set a package-local `TMPDIR` so the CLI's probe imports resolve workspace dependencies. Each plugin's `build` script does this plus a self-contained bundling pass:

```jsonc
// package.json "scripts"
"build": "mkdir -p node_modules/.cache/emdash-build && TMPDIR=./node_modules/.cache/emdash-build emdash-plugin build && node ../../tools/bundle-sandbox-plugin.mjs && tsc -b"
```

> **Why the extra bundling pass:** `emdash-plugin build` (tsdown) auto-externalizes `package.json` deps, leaving bare imports (e.g. `@dateline/blocks`, `zod`) in `dist/plugin.mjs`. The workerd sandbox runner embeds **only** that file plus an `emdash` shim, so those bare imports fail to resolve at runtime (`No such module "@dateline/blocks"`). The `tools/bundle-sandbox-plugin.mjs` esbuild pass inlines them (external: `emdash` + `node:*`) into a self-contained `dist/plugin.mjs`.

Validate and build:

```bash
cd packages/core
./node_modules/.bin/emdash-plugin validate
pnpm run build
```

`validate`/`build` refuse placeholder publisher/security values — fill real-looking ones (this repo uses the user-approved placeholder publisher `dateline.example.com`; swap before any live publish).

## Capabilities

Declare the minimum capabilities your plugin needs in `emdash-plugin.jsonc` (resource:verb form):

```jsonc
{
  "capabilities": ["content:read", "content:write", "email:send"],
  "allowedHosts": []
}
```

For network access, declare `network:request` (restricted to `allowedHosts`) or `network:request:unrestricted` (any public host). See [capabilities-and-security.md](./capabilities-and-security.md) for the full reference and the importer's unrestricted-network consent trade-off.

## The `ctx` surface

Inside a handler, `ctx` exposes (verified on `@emdash-cms/sandbox-workerd@0.1.6`): `content`, `email`, `http`, `kv`, `log`, `media`, `plugin`, `site`, `storage`, `url`, `users`. Capability-gated members appear only when the manifest declares the matching capability.

- `ctx.content.*` — content CRUD (no raw SQL/D1).
- `ctx.storage` — the plugin's own declared storage collections (`get`/`put`/indexed `query`/`count`).
- `ctx.kv` — plugin-scoped KV: `get`/`set`/`delete`/`list` only, **no atomic ops**.
- `ctx.http.fetch` — the only network exit (capability-gated).
- `ctx.email.send` — only routes when an `email:deliver` transport plugin is registered.
- `ctx.cron.schedule` — register schedules from lifecycle hooks (see below).
- `ctx.log` — structured logging.

> **No `ctx.waitUntil` in the sandboxed `ctx`.** Deferring work past the response is a host-level Workers concern in 0.18; the sandboxed plugin `ctx` does not expose it. Do your work inside the invocation, staying within the [sandbox budgets](./capabilities-and-security.md#sandbox-budget--performance).

## Hooks

Hook handlers receive an `event` and a `ctx`. **Do not annotate handler params** — TS infers them from the hook name.

### `content:beforeSave`

Fires before a content entry is saved. Validate, normalize, or block. Return the (possibly modified) content.

```ts
"content:beforeSave": (event) => {
  if (event.collection !== "dateline_events") return Promise.resolve(event.content);
  // normalize times to UTC, validate RRULE, etc.
  return Promise.resolve(event.content);
}
```

**Limitation:** must complete synchronously within the 50 ms CPU budget; no deferral.

### `content:afterSave`

Fires after a successful save. Side effects, cache invalidation, email.

```ts
"content:afterSave": async (event, ctx) => {
  if (event.collection !== "dateline_attendees") return;
  // send confirmation, update derived state, etc.
}
```

### `content:beforeDelete` / `content:afterDelete`

Validation/referential-integrity before delete; cleanup after.

```ts
"content:beforeDelete": async (event, ctx) => {
  if (event.collection !== "dateline_events") return;
  const { items } = await ctx.content.query("dateline_attendees", { filter: { event: event.id } });
  if (items.length > 0) throw new Error(`Cannot delete: ${items.length} attendees registered`);
}
```

### Lifecycle hooks: `plugin:install` / `plugin:activate`

Fire on install/activation. Use them for one-time setup — including **registering cron schedules** (cron is registered here, consumed in the `cron` hook):

```ts
"plugin:install": async (event, ctx) => {
  // ctx.cron may be absent in some runners — guard it.
  await ctx.cron?.schedule("rsvp-hold-sweep", { schedule: "*/5 * * * *" });
}
```

> **Runner caveat (verified):** on `@emdash-cms/sandbox-workerd@0.1.6`, `ctx.cron` was **not** present inside the route/hook `ctx` even though the d.ts marks it optional — lifecycle hooks still invoked successfully, but `ctx.cron?.schedule(...)` did not persist tasks in that local harness. Guard `ctx.cron?` and validate schedule persistence against a real Workers deployment before relying on it.

### `cron`

Consumes scheduled work. Discriminate on `event.name`.

```ts
cron: async (event, ctx) => {
  if (event.name === "rsvp-hold-sweep") {
    const page = await ctx.storage /* rsvps */.query({ where: { kind: "hold", status: "active" } });
    for (const entry of page.items ?? []) {
      // expire holds, release capacity, etc.
    }
  }
}
```

The `cron` event carries `name`, `data`, and `scheduledAt`.

## Routes

Routes are HTTP endpoints, mounted at `/_emdash/api/plugins/<slug>/<route>`. A route entry is either a handler `(routeCtx, ctx) => ...` or `{ handler, public?, input? }`. Declare a zod schema in `input` to parse the request body.

### API routes (return a plain object)

Sandboxed routes return a serializable value (e.g. `{ status, body }`), **not** a raw `Response`. The plugin maps internal results to status codes:

```ts
routes: {
  "rsvp-submit": {
    public: true,
    handler: async (routeCtx, ctx) => {
      // routeCtx.input is the parsed body; do the work, return a serializable result
      return { status: 200, body: { ok: true } };
    },
  },
}
```

> **Error-status convention:** RSVP/core routes map plugin errors to 4xx — `422` validation, `409` capacity-full, `400` other; a `500` branch covers unexpected boundary errors. The site's `/api/rsvp` proxy mirrors these.

### Admin UI routes (return Block Kit)

Admin routes return **only** `{ blocks, toast? }` — no HTML, no redirects, no raw `Response`. Use `@dateline/blocks` to build and validate the envelope:

```ts
import { assertResponse, blocks, elements } from "@dateline/blocks";

function settingsPage() {
  return assertResponse({
    blocks: [
      blocks.header("Event settings"),
      blocks.section("Publish this event?", {
        accessory: elements.button("publish", "Publish", { style: "primary" }),
      }),
    ],
    toast: { message: "Loaded settings", type: "info" },
  });
}
```

## Block Kit shapes (`@emdash-cms/blocks@0.18`)

Upstream 0.18 is the source of truth for Block Kit field names. Use the upstream shapes (the pre-0.18 Dateline copy used names 0.18 now rejects):

- **Stats blocks use `items`** (not `stats`): `blocks.stats([{ label: "RSVPs", value: 42 }])`.
- **Buttons/inputs/columns use `label`** (not `text`): `elements.button("save", "Save")`, `{ key, label }` table columns, `submit: { label, actionId }`.
- **Toasts use `message`** (not `text`): `{ message: "Saved", type: "success" }`.
- Section text has no markdown parser — use `children` with marks for rich content.
- Plugin routes return only `{ blocks, toast? }`. `assertResponse()` rejects transport keys (`redirect`, `body`, `headers`, `status`) and runs `validateBlocks` over the array.

See the [`@dateline/blocks` README](../packages/blocks/README.md) for the full catalog.

## RSVP with capacity

> **Never roll your own KV counter.** `ctx.kv` has no atomic ops, so a `get` → parse → `set` sequence is a read-modify-write race that silently miscounts. And `storage.uniqueIndexes` does **not** enforce a duplicate-insert conflict on the local workerd runner (verified). Dateline's RSVP capacity is therefore **storage-backed**: per-event capacity + per-(event,email) claim records, admitted in deterministic order up to the capacity limit, with conflict checks and a release/rollback path. The canonical implementation lives in [`packages/rsvp/src/capacity.ts`](../packages/rsvp/src/capacity.ts).

The shape (simplified):

```ts
// Reserve a seat: insert a pending claim, recompute admitted claims up to
// capacity, confirm if admitted else release and reject CAPACITY_FULL.
async function reserveCapacity(ctx, eventId, email) {
  const collection = ctx.storage; // the declared `rsvps` collection
  const claimId = `claim:${eventId}:${email.toLowerCase()}`;
  await collection.put(claimId, { kind: "claim", eventId, email, status: "pending" });

  const capacity = await collection.get(`capacity:${eventId}`);
  const claims = (await collection.query({ where: { kind: "claim", eventId } })).items ?? [];
  const admitted = sortByCreatedAt(claims).slice(0, capacity.remaining);

  if (!admitted.some((c) => c.id === claimId)) {
    await collection.put(claimId, { kind: "claim", eventId, email, status: "released" });
    throw new Error("CAPACITY_FULL");
  }
  await collection.put(claimId, { kind: "claim", eventId, email, status: "confirmed" });
}
```

A concurrent-oversell test in `@dateline/rsvp` proves that N capacity with >N concurrent claims admits exactly N.

### Confirmation email

```ts
async function sendConfirmation(ctx, attendee) {
  await ctx.email.send({
    to: attendee.email,
    subject: "RSVP Confirmed",
    body: `Hi ${attendee.name}, your RSVP is confirmed!`,
  });
}
```

`ctx.email.send` only delivers when an `email:deliver` transport plugin is registered (the reference site ships a dev-only mock transport; production needs a Workers-compatible transport — see [installation.md](./installation.md#cloudflare-deploy-path-limitations)).

## Recurring events

Use `@dateline/recurring` for RRULE:

```ts
import { materializeOccurrences, validateRRule } from "@dateline/recurring";

const validation = validateRRule(event.recurrenceRule);
if (!validation.ok) throw new Error(`Invalid RRULE: ${validation.error}`);

const occurrences = await materializeOccurrences({
  rrule: event.recurrenceRule,
  dtstart: event.startsAt,
  tzid: event.timezone, // REQUIRED for correct DST handling (rrule.js #501)
  range: { start: new Date(), end: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) }, // 2-year cap
});
```

**Critical:** always include `tzid` — without it, occurrences drift across DST. Materialization is lazy (on read), capped 2 years forward, with the per-range hash cached in KV (TTL 1 hr).

## Importing feeds via `ctx.http.fetch`

`@dateline/importer` fetches feeds with `ctx.http.fetch` under `network:request:unrestricted` (operators paste arbitrary feed URLs). It dedupes drafts by `sourceId`. Note the reference-site adapter's dedup nuance documented in [installation.md](./installation.md) / the [reference site README](../examples/reference-site/README.md): the site's `importer-content.ts` adapter dedupes by the importer-derived **slug**, not `sourceId`, so distinct `sourceId`s that slugify identically collapse. Sites needing exact-`sourceId` dedup should register a `source_id` field on `dateline_events` (or store a hash).

## Testing

### Unit tests (Vitest)

```ts
import { describe, it, expect } from "vitest";
import { validateRRule } from "@dateline/recurring";

describe("@dateline/recurring", () => {
  it("validates RRULE syntax", () => {
    expect(validateRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR").ok).toBe(true);
  });
});
```

```bash
pnpm run test
```

### Sandbox profiling

Profile every sandboxed handler against the Cloudflare budgets (50 ms CPU / 10 subrequests / 30 s / 128 MB):

```bash
pnpm sandbox:profile
```

A handler over budget is reported (advisory); harness failure exits non-zero and blocks CI. Keep budgets pinned to Cloudflare limits — the local workerd runner only enforces wall time, so it will not catch a CPU/subrequest/memory overrun.

## ESLint rules

`tools/eslint-plugin-dateline` ships custom rules enforced via `pnpm run lint`. Run the full gate before committing:

```bash
pnpm run lint
```

## See also

- [Capabilities & security](./capabilities-and-security.md) — capability reference, `ctx` surface, sandbox budgets
- [Installation guide](./installation.md) — setup walkthrough and deploy limitations
- [@dateline/blocks](../packages/blocks/README.md) — Block Kit builders
- [@dateline/recurring](../packages/recurring/README.md) — RRULE patterns
- [VERIFIED-PLATFORM-0.18.md](../VERIFIED-PLATFORM-0.18.md) — measured platform facts
- [Reference site](../examples/reference-site) — full working example
