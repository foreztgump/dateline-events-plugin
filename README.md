# Dateline — Events, Calendar & Ticketing for EmDash

[![CI](https://github.com/foreztgump/dateline-events-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/foreztgump/dateline-events-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monorepo via pnpm](https://img.shields.io/badge/monorepo-pnpm-blue.svg)](https://pnpm.io)

Dateline is a modular events, calendar, and ticketing system for [EmDash CMS](https://emdashcms.org). It powers everything from a single recurring meetup with free RSVPs to a 1,500-seat theater with assigned seating, dynamic pricing, and box-office check-in — all running on Cloudflare Workers with edge-cached rendering and AI-native workflows.

## Why Dateline?

Dateline solves four chronic WordPress events problems at the EmDash architecture level:

1. **Performance** — Single-digit-query calendar views (vs The Events Calendar's 85+ DB queries per list view).
2. **Modularity without compromise** — Each plugin runs in its own isolated V8 sandbox with declared capabilities on a Cloudflare Workers Paid plan (vs EventON's shared PHP process).
3. **AI-first operations** — Dateline actions are reachable via REST routes today, with an MCP wrapper planned (vs EventON's one-line AI assists).
4. **Unified versioning** — Ticketing, RSVP, import, and recurring events under one coherent version story (vs TEC's separate plugin family).

## What's in the box (v0.2.0)

Dateline ships three sandboxed EmDash 0.18 plugins plus three helper libraries. The plugins use the single-file sandboxed format (`emdash-plugin.jsonc` + `src/plugin.ts`) and declare their capabilities in their manifest, which EmDash enforces at the sandbox boundary on a Cloudflare Workers Paid plan.

| Package | Role | Format | Manifest capabilities |
|---------|------|--------|-----------------------|
| `@dateline/core` | Events, venues, organizers, Block Kit admin, iCal, schema.org, GDPR helpers | Sandboxed plugin | `content:read`, `content:write` |
| `@dateline/rsvp` | Free RSVP, storage-backed capacity, waitlist, confirmation email | Sandboxed plugin | `content:read`, `content:write`, `email:send` |
| `@dateline/importer` | iCal, CSV, JSON, and The Events Calendar import | Sandboxed plugin | `content:read`, `content:write`, `network:request:unrestricted` |
| `@dateline/recurring` | RRULE validation, lazy materialization, DST-aware occurrence caching | Helper library | — (not a plugin) |
| `@dateline/views` | Native Astro components: month/week/day/agenda calendars, event cards, RSVP forms | Astro component library | — (runs in the host theme, not sandboxed) |
| `@dateline/blocks` | Typed Block Kit builders/validators (rebased on `@emdash-cms/blocks@0.18`) | Helper library | — (not a plugin) |

The exact capability lists live in each package's `emdash-plugin.jsonc`: [core](packages/core/emdash-plugin.jsonc), [rsvp](packages/rsvp/emdash-plugin.jsonc), [importer](packages/importer/emdash-plugin.jsonc).

## Architecture

```
┌──────────────────────────────────────────────────────┐
│            EmDash CMS (host runtime + ctx)           │
│   wired via astro.config.mjs:                        │
│   sandboxed: [core, rsvp, importer] + sandboxRunner  │
│  ┌─────────────────────────────────────────────────┐ │
│  │      @dateline/core (Sandboxed Plugin)          │ │
│  │  Events, venues, organizers, iCal, schema.org   │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │      @dateline/rsvp (Sandboxed Plugin)          │ │
│  │  RSVP, storage-backed capacity, waitlist, email │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │      @dateline/importer (Sandboxed Plugin)      │ │
│  │  iCal / CSV / JSON / TEC import via ctx.http     │ │
│  └─────────────────────────────────────────────────┘ │
│  each plugin sees only its declared `ctx` surface;   │
│  capabilities enforced at the sandbox boundary       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  @dateline/recurring · @dateline/blocks         │ │
│  │  helper libraries bundled into plugin builds    │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                        ↑
            getEmDashCollection / getEmDashEntry
                        ↑
┌──────────────────────────────────────────────────────┐
│          Operator's Astro Theme (Frontend)           │
│  ┌─────────────────────────────────────────────────┐ │
│  │  @dateline/views (Astro component library)      │ │
│  │  Month/week/day/agenda calendars, cards, RSVP UI│ │
│  └─────────────────────────────────────────────────┘ │
│  renders in the host theme build + at the edge via   │
│  @astrojs/cloudflare (not sandboxed)                 │
└──────────────────────────────────────────────────────┘
```

Sandbox isolation is provided by Cloudflare's Dynamic Worker Loader, which requires a **Workers Paid plan**. On the Free plan Dynamic Workers are unavailable, so EmDash runs plugins in-process and the per-plugin capability boundary is not enforced — treat the isolation pitch as Paid-only and disclose this at install time. `@dateline/views` is a native Astro component library: it renders in the operator's theme build and at the edge via `@astrojs/cloudflare`, outside the sandbox.

## Getting started

Dateline's sandboxed plugins are not registered through a config-file factory call. EmDash loads them as **default imports** in your Astro config's `sandboxed: [...]` array, and a `sandboxRunner` executes them in isolation. The fastest way to a running site is the reference site in this repo; the steps below mirror what it does.

### 1. Install the packages

The three plugins are distributed as EmDash plugins (marketplace install or a built tarball from `emdash-plugin bundle`); the helper libraries install from the workspace/npm:

```bash
pnpm add @dateline/core @dateline/rsvp @dateline/importer \
         @dateline/views @dateline/recurring @dateline/blocks \
         emdash@^0.18 @emdash-cms/sandbox-workerd@^0.1.6
```

### 2. Wire the plugins in `astro.config.mjs`

Pass the plugins as **default imports** to `sandboxed` (not factory calls) and provide a `sandboxRunner`. For local dev use sqlite + local storage + the `@emdash-cms/sandbox-workerd` runner:

```mjs
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Sandboxed plugins are DEFAULT IMPORTS (descriptors produced by
// `emdash-plugin build`), NOT factory calls.
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

Capabilities are declared inside each plugin's `emdash-plugin.jsonc` and travel with the plugin build — there is no separate per-binding capability variable to set in `wrangler.jsonc`.

### 3. Render events in your theme

In any `.astro` page, read content through `getEmDashCollection` and render with `@dateline/views`:

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

### 4. Run it

```bash
pnpm run build   # builds plugin dist/ (the sandbox runner embeds dist/plugin.mjs)
pnpm run dev     # astro dev
```

For the Cloudflare deploy path (D1 + R2 + the Dynamic Worker Loader sandbox) and a verified local `wrangler dev` preview, see the [installation guide](docs/installation.md#step-6-deploy-to-cloudflare-workers).

### 5. Try the reference site

The reference site is the canonical, working example (calendar views, RSVP, recurring events, iCal feed, importer round-trip):

```bash
pnpm --filter @dateline/reference-site seed   # apply seed/seed.json to ./data.db
pnpm --filter @dateline/reference-site dev    # astro dev on 127.0.0.1:4321
```

Then open `http://127.0.0.1:4321/events`. See [examples/reference-site/README.md](examples/reference-site/README.md) for the full set of flows and the Cloudflare deploy validation steps.

## Key concepts

### Capabilities and security

Sandboxed plugins declare minimal capabilities (resource:verb form, e.g. `content:read`, `content:write`, `email:send`, `network:request:unrestricted`) in their `emdash-plugin.jsonc`. EmDash enforces them at the sandbox boundary on Workers Paid. See [docs/capabilities-and-security.md](docs/capabilities-and-security.md).

### The plugin `ctx` surface

Inside a sandboxed handler, `ctx` exposes (verified on `@emdash-cms/sandbox-workerd@0.1.6`): `content`, `email`, `http`, `kv`, `log`, `media`, `plugin`, `site`, `storage`, `url`, `users`. Capability-gated members (`content`, `media`, `http`, `users`, `email`) are present only when the manifest declares the matching capability. `ctx.kv` has exactly `get`/`set`/`delete`/`list` (no atomic ops). There is **no** `ctx.waitUntil` in the sandboxed plugin `ctx` — deferring work past the response is a host-level concern. See [docs/plugin-development.md](docs/plugin-development.md).

### Storage-backed RSVP capacity

RSVP capacity lives in the plugin `storage` collection (counter rows + application-level conflict checks), guarded by a concurrent-oversell test — not an atomic KV counter (KV has no atomic ops). See [docs/plugin-development.md](docs/plugin-development.md#rsvp-with-capacity).

### Lazy recurring event materialization

RRULE occurrences are computed on-read with a 2-year forward cap and cached in KV (TTL 1 hr), never eagerly materialized. RRULE recurrences must set `tzid` for correct DST handling. See [docs/plugin-development.md](docs/plugin-development.md#recurring-events).

### Plugin-scoped KV

`ctx.kv` is automatically scoped per plugin. Cross-plugin KV access is structurally impossible; no capability declaration needed.

## Documentation

- **[Installation guide](docs/installation.md)** — detailed operator walkthrough (dev + Cloudflare deploy)
- **[Capabilities & security](docs/capabilities-and-security.md)** — resource:verb model, `ctx` surface, measured sandbox budgets, data access patterns
- **[Plugin development](docs/plugin-development.md)** — single-file sandboxed format, hooks, Block Kit patterns, sandbox profiler, ESLint rules
- **[Migration guide](MIGRATION.md)** — v0.1 → v0.2 first real installation guide
- **[Reference site](examples/reference-site)** — full working example with Astro theme

## Status

🚧 **v0.2.0 — EmDash 0.18 modernization.** Core family rebuilt on EmDash 0.18: `@dateline/core`, `@dateline/rsvp`, `@dateline/importer` converted to the single-file sandboxed format; `@dateline/recurring`, `@dateline/views`, `@dateline/blocks` (rebased on `@emdash-cms/blocks@0.18`). See [CHANGELOG.md](CHANGELOG.md) and [MIGRATION.md](MIGRATION.md) for details.

## License

All packages MIT. See the individual package `package.json` files for license details.

## Contributing

Open a pull request. All changes should pass `pnpm run build && pnpm run lint && pnpm run test`.
