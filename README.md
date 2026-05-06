# Dateline — Events, Calendar & Ticketing for EmDash

[![CI](https://github.com/foreztgump/dateline-events-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/foreztgump/dateline-events-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monorepo via pnpm](https://img.shields.io/badge/monorepo-pnpm-blue.svg)](https://pnpm.io)

Dateline is a modular events, calendar, and ticketing system for [EmDash CMS](https://emdashcms.org). It powers everything from a single recurring meetup with free RSVPs to a 1,500-seat theater with assigned seating, dynamic pricing, and box-office check-in — all running on Cloudflare Workers with edge-cached rendering and AI-native workflows.

## Why Dateline?

Dateline solves four chronic WordPress events problems at the EmDash architecture level:

1. **Performance** — Single-digit-query calendar views (vs The Events Calendar's 85+ DB queries per list view).
2. **Modularity without compromise** — Each add-on runs in its own isolated V8 sandbox with declared capabilities (vs EventON's shared PHP process).
3. **AI-first operations** — Every Dateline action is reachable via MCP and a native chat interface (vs EventON's one-line AI assists).
4. **Unified versioning** — Ticketing, RSVP, import, and recurring events under one coherent version story (vs TEC's separate plugin family).

## What's in the box (v0.1.0)

| Package | Role | Sandboxed | Capabilities |
|---------|------|-----------|--------------|
| `@dateline/core` | Events, venues, organizers, Block Kit admin, iCal, schema.org, x402 metadata, GDPR helpers | ✅ | `content:read`, `content:write`, `media:read` |
| `@dateline/rsvp` | Free RSVP, capacity, waitlist, confirmation email | ✅ | `content:read`, `content:write`, `email:send` |
| `@dateline/recurring` | RRULE validation, lazy materialization, DST-aware occurrence caching | ❌ | Helper library (not a plugin) |
| `@dateline/importer` | iCal, CSV, JSON, and The Events Calendar import | ✅ | `content:read`, `content:write`, `network:request` |
| `@dateline/views` | Native Astro components: month/week/day/list calendars, event cards, RSVP forms | ❌ | Trusted Astro library (not sandboxed) |
| `@dateline/blocks` | Typed Block Kit builders and validators for safe admin UI construction | ❌ | Helper library (not a plugin) |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         EmDash CMS (Event Content Layer)            │
│  ┌────────────────────────────────────────────────┐ │
│  │       @dateline/core (Sandboxed Plugin)        │ │
│  │  - Events, venues, organizers, calendar feed  │ │
│  └────────────────────────────────────────────────┘ │
│     ↑                                 ↑  ↑  ↑       │
│   hooks                          routes (Block Kit) │
│     ↑                                   ↑  ↑  ↑     │
│  ┌──┴──────────────────────────────────┴──┴──┴───┐ │
│  │ @dateline/recurring                          │ │
│  │ (Helper: RRULE, lazy materialization)        │ │
│  └──────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐  │
│  │ @dateline/rsvp (Sandboxed Plugin)            │  │
│  │ - Attendee registration, email, capacity    │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ @dateline/importer (Sandboxed Plugin)        │  │
│  │ - Import from iCal, CSV, JSON, The Events   │  │
│  │   Calendar                                   │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                       ↑
         (EmDash capability gates)
                       ↑
┌─────────────────────────────────────────────────────┐
│         Operator's Astro Theme (Frontend)           │
│  ┌────────────────────────────────────────────────┐ │
│  │  @dateline/views (Trusted Library)             │ │
│  │  - Calendar components, event cards, RSVP UI  │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  @dateline/blocks (Helper)                     │ │
│  │  - Typed Block Kit construction               │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Plugins run in Cloudflare Workers' Dynamic Worker sandbox (Paid plan only; Free plan runs as trusted). Astro components run in the theme's static build and at the edge via `@astrojs/cloudflare`.

## Getting started

### 1. Install the core package

```bash
pnpm add @dateline/core emdash@^0.9.0
```

### 2. Register the plugin in your EmDash config

```ts
// emdash.config.ts
import createCorePlugin from "@dateline/core";

export default {
  plugins: [createCorePlugin()],
  // ... rest of config
};
```

### 3. Add capabilities to your `wrangler.jsonc`

Dateline plugins need explicit capability declarations. Add to your Cloudflare Workers bindings:

```jsonc
{
  "env": {
    "production": {
      "vars": {
        "EMDASH_PLUGIN_MANIFEST_CORE": "{\"id\": \"dateline-core\", \"capabilities\": [\"content:read\", \"content:write\", \"media:read\"]}"
      }
    }
  }
}
```

See `/docs/capabilities-and-security.md` for the full capability reference.

### 4. Deploy to Cloudflare Workers

```bash
pnpm run build
wrangler deploy
```

### 5. Try the reference site

Explore the full working example:

```bash
cd examples/reference-site
pnpm install
pnpm run dev
```

The reference site demonstrates calendar views, RSVP flows, recurring event display, and iCal feeds.

## Key concepts

### Capabilities and security

Dateline plugins run sandboxed on Cloudflare Workers (Paid plan) with declared, minimal capabilities. See `/docs/capabilities-and-security.md`.

### `ctx.waitUntil()` is mandatory

Any async work that continues past the response (emails, cache invalidation, webhook processing) **must** use `ctx.waitUntil(promise)` or EmDash's `after()` helper. Bare promises are silently cancelled on Workers. See `/docs/plugin-development.md` for patterns.

### Resource:verb capability names

Dateline uses the canonical EmDash capability model: `content:read`, `content:write`, `network:request`, `email:send` (resource:verb form, not action-first). See `/docs/capabilities-and-security.md` for the full list.

### Lazy recurring event materialization

RRULE occurrences are computed on-read with a 2-year forward cap and cached in KV (TTL 1 hr). Never eagerly materialized. See `/docs/plugin-development.md#recurring-events`.

### Plugin-scoped KV

`ctx.kv` is automatically scoped per plugin. Cross-plugin KV access is structurally impossible; no capability declaration needed.

## Documentation

- **[Installation guide](/docs/installation.md)** — detailed operator walkthrough
- **[Capabilities & security](/docs/capabilities-and-security.md)** — `resource:verb` model, sandbox budgets, data access patterns
- **[Plugin development](/docs/plugin-development.md)** — manifest skeleton, hooks, Block Kit patterns, sandbox profiler, ESLint rules
- **[Reference site](examples/reference-site)** — full working example with Astro theme

## Status

✅ **v0.1.0 shipped** (2026-05-05)  
First public release of the core family: `@dateline/core`, `@dateline/rsvp`, `@dateline/recurring`, `@dateline/importer`, `@dateline/views`. See [CHANGELOG.md](CHANGELOG.md) for details.

## License

All packages MIT. See the individual package `package.json` files for license details.

## Contributing

Open a pull request. All changes should pass `pnpm run build && pnpm run lint && pnpm run test`.
