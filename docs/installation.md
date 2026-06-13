# Installation Guide

Complete walkthrough to install Dateline into your EmDash project, run it locally, and validate a Cloudflare Workers preview.

## Prerequisites

- **Node.js 22+** — EmDash 0.18 and Wrangler 4.87+ require Node 22 (Node 20 is EOL).
- **pnpm 10+** — Dateline uses pnpm workspaces.
- **An EmDash 0.18 project** — a site built on `emdash@^0.18` (Astro-integrated).
- **Cloudflare account on a Workers Paid plan** *(for sandbox isolation in production)* — the Dynamic Worker Loader that isolates plugins is a Paid-plan feature. On the Free plan Dynamic Workers are unavailable and EmDash runs plugins in-process with no capability boundary. See [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Step 1: Install Dateline packages

Install the plugins you need plus the helper libraries. The three plugins are distributed as EmDash plugins (marketplace install, or a built tarball produced by `emdash-plugin bundle`); the helper libraries install from npm/the workspace:

```bash
pnpm add @dateline/core @dateline/rsvp @dateline/importer \
         @dateline/views @dateline/recurring @dateline/blocks \
         emdash@^0.18 @emdash-cms/sandbox-workerd@^0.1.6
```

`@dateline/recurring`, `@dateline/views`, and `@dateline/blocks` are helper libraries, not plugins — they are not registered in `sandboxed: [...]`.

## Step 2: Register plugins in `astro.config.mjs`

EmDash 0.18 loads sandboxed plugins through the `emdash()` Astro integration, **not** a standalone config file. Pass each plugin as a **default import** to the `sandboxed` array (these are descriptors emitted by `emdash-plugin build`, not factory calls) and provide a `sandboxRunner`.

```mjs
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// DEFAULT IMPORTS — NOT factory calls.
import core from "@dateline/core";
import rsvp from "@dateline/rsvp";
import importer from "@dateline/importer";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [
    emdash({
      database: sqlite({ url: "file:./data.db" }),
      storage: local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" }),
      sandboxed: [core, rsvp, importer],
      sandboxRunner: "@emdash-cms/sandbox-workerd",
    }),
  ],
});
```

There is **no** separate per-plugin capability variable to set. Each plugin's capabilities are declared in its own `emdash-plugin.jsonc` and travel with the plugin build; EmDash reads them from there and enforces them at the sandbox boundary.

## Step 3: Build the plugins, then run

The `@emdash-cms/sandbox-workerd` runner loads each plugin's bundled `dist/plugin.mjs`, so the plugins must be built before the dev server can load them:

```bash
pnpm run build   # builds each plugin's dist/ (emdash-plugin build + self-contained bundle)
pnpm run dev     # astro dev
```

Open the site and verify that the EmDash admin loads, calendar views render, and RSVP forms appear on RSVP-enabled events.

## Step 4: Render events in your Astro theme

`@dateline/views` is a native Astro component library — it renders in your theme build, not in the sandbox.

### 4a. Use Dateline components

```astro
---
import { getEmDashCollection } from "emdash";
import { CalendarMonth, EventCard } from "@dateline/views";

const { entries: events } = await getEmDashCollection("dateline_events", {
  sort: { starts_at: "asc" },
  limit: 50,
});
---

<CalendarMonth events={events} />
{events.map((e) => <EventCard event={e} />)}
```

### 4b. Tailwind (optional)

The styled components use Tailwind. If your theme uses it, include the Dateline component source in your content globs:

```js
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./node_modules/@dateline/views/**/*.{js,ts}",
  ],
};
```

## Step 5: RSVP confirmation email transport

The RSVP plugin sends a confirmation through EmDash's email pipeline (`ctx.email.send` under `email:send`). EmDash only routes that mail when a separate plugin registers an `email:deliver` transport. The reference site ships a **dev-only mock transport** (`examples/reference-site/plugins/mock-email/`) that captures messages to a log file using `node:fs`.

> ⚠️ The mock transport is Node-filesystem based and runs only on the Node dev/e2e path. It cannot run on Cloudflare Workers. Before production RSVP confirmations work on the Cloudflare deploy path you must wire a Workers-compatible `email:deliver` transport (a provider HTTP API such as Cloudflare Email Service). See [Cloudflare deploy limitations](#cloudflare-deploy-path-limitations).

## Step 6: Deploy to Cloudflare Workers

The reference site swaps backends to the Cloudflare path with the `DEPLOY_TARGET=cloudflare` env flag (Workers host adapter + D1 + R2 + the Dynamic Worker Loader sandbox). Mirror its `astro.config.mjs` branch and `wrangler.jsonc`:

```jsonc
{
  "name": "my-emdash-site",
  "compatibility_date": "2026-05-06",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    { "binding": "DB", "database_name": "my-events-db", "database_id": "<id>" }
  ],
  "r2_buckets": [
    { "binding": "MEDIA", "bucket_name": "my-events-media" }
  ],
  // Dynamic Worker Loader binding for the sandbox runner — requires Workers Paid.
  "worker_loaders": [{ "binding": "LOADER" }]
}
```

The Cloudflare `astro.config.mjs` branch uses `d1()`, `r2()`, and `sandbox()` from `@emdash-cms/cloudflare`:

```mjs
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
// ...
emdash({
  database: d1({ binding: "DB" }),
  storage: r2({ binding: "MEDIA" }),
  sandboxed: [core, rsvp, importer],
  sandboxRunner: sandbox(),
});
```

### 6a. Authenticate

```bash
npx wrangler login
```

### 6b. Build and preview locally

```bash
pnpm -r build
DEPLOY_TARGET=cloudflare pnpm --filter @dateline/reference-site build
cd examples/reference-site/dist/server
npx wrangler dev -c wrangler.json --port 8789   # 8789 only
```

EmDash applies its schema migrations automatically when the runtime initialises a database. For a fresh local `wrangler dev` (miniflare) D1 state, seed the local SQLite file backing the D1 binding so pages serve content instead of redirecting to setup — see the [reference site README](../examples/reference-site/README.md#d1-schema--seed).

### 6c. Cloudflare deploy-path limitations

Two limitations apply to the Cloudflare path and must be addressed before production:

1. **No email transport on the Cloudflare build.** The dev/e2e mock `email:deliver` transport is a Node-fs plugin and is intentionally omitted from the Cloudflare build (it cannot run on Workers). RSVP confirmation emails will not be delivered until you wire a Workers-compatible transport plugin (a provider HTTP API, e.g. Cloudflare Email Service).
2. **Local `wrangler dev` does not exercise real sandbox isolation.** `wrangler dev` (miniflare) does not satisfy EmDash's Dynamic Worker Loader probe even though the `worker_loaders` `LOADER` binding binds, so plugins run **in-process** locally. The local preview validates routes and data only — true sandbox isolation must be validated against a real Workers **Paid** deployment.

## Free vs Paid plan notes

**Cloudflare Free plan:** Dynamic Workers are unavailable, so EmDash runs plugins **in-process** rather than isolated. This means no per-plugin isolation and no enforced capability boundary. Sandbox isolation and the capability-enforcement security benefits are available only on Paid plans.

**Recommendation:** Prototype on Free; move to Paid before relying on sandbox isolation in production.

## Stripe integration (if using tickets)

When ticketing add-ons are installed, you'll need Stripe credentials. The Stripe API version is pinned at `2026-04-22.dahlia`.

1. Get your Stripe API key from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys).
2. **Never commit secrets to git.** Use wrangler secret management:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Access secrets via the host `env` binding, never plaintext in `wrangler.jsonc`. Stripe webhooks are at-least-once delivery: always verify with `stripe.webhooks.constructEvent(rawBody, signature, secret)` and dedupe by Stripe event id in KV (TTL 7 days).

### Cloudflare WAF carve-out

If you enable Cloudflare's WAF or Bot Fight Mode, Stripe webhook deliveries may be blocked. Add a carve-out rule in the Cloudflare dashboard:

- Path: `/_emdash/api/plugins/dateline-tickets/webhook-stripe`
- Action: Allow

Debug blocked deliveries via the Cloudflare GraphQL `firewallEventsAdaptive` dataset:

```bash
curl -H "Authorization: Bearer <CF_API_TOKEN>" \
  -d '{"query": "{ viewer { zones(filter: {names: [\"example.com\"]}) { firewallEventsAdaptive(filter: {datetime_geq: \"2026-05-06T00:00:00Z\"}) { action datetime clientIP } } } }"}' \
  https://api.cloudflare.com/client/v4/graphql
```

## Reference site example

For a complete working example, explore `examples/reference-site`:

```bash
pnpm --filter @dateline/reference-site seed
pnpm --filter @dateline/reference-site dev
```

This demonstrates a full Astro 6 theme, all Dateline components, calendar/RSVP/recurring flows, iCal feed generation, the importer round-trip, and a Playwright e2e suite.

## Troubleshooting

### Plugin fails to load: "Cannot find module @dateline/blocks"

The `emdash-plugin build` step auto-externalizes workspace deps, leaving bare imports in `dist/plugin.mjs`; the workerd runner embeds only that file plus an `emdash` shim. Each plugin's build script runs a self-contained esbuild pass (`tools/bundle-sandbox-plugin.mjs`) after `emdash-plugin build` to inline those deps. If you see this error, run `pnpm run build` so the bundling step executes.

### RSVP confirmation email never arrives

EmDash only routes RSVP mail when an `email:deliver` transport plugin is registered. On the Node dev path the mock transport handles this; on Cloudflare you must wire a Workers-compatible transport (see [Cloudflare deploy-path limitations](#cloudflare-deploy-path-limitations)).

### Capacity counts look wrong

RSVP capacity is storage-backed (counter rows + conflict checks), not a KV counter. Capacity recomputes on the next write; a concurrent-oversell test in `@dateline/rsvp` guards against double-admission.

### "iCal feed returns 404"

Ensure `@dateline/core` is in your `sandboxed: [...]` array and the plugin build ran. The feed is served from live content; the reference site exposes it at `/events.ics`.

## Next steps

- Read [capabilities-and-security.md](./capabilities-and-security.md) for the capability model, `ctx` surface, and measured sandbox budgets.
- Read [plugin-development.md](./plugin-development.md) for the single-file sandboxed plugin format and patterns.
- See [MIGRATION.md](../MIGRATION.md) if you are coming from a v0.1 install.
- Explore the [reference site README](../examples/reference-site/README.md) for E2E flows.
