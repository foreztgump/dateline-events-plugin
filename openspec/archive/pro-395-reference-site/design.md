# Design

## Fixture-first architecture

The reference site reads `seed/events.json` and adapts it through `src/lib/fixtures.ts`. The source event records remain canonical, while generated weekly occurrences are only added to `displayEvents` for frontend calendar views.

## Dateline package integration

Astro pages import components from `@dateline/views`. The `/events.ics` endpoint invokes `@dateline/core`'s `iCalFeed` handler with a fixture-backed `ctx.content.list`, preserving the same route behavior used by the plugin.

## Cloudflare deployment

`astro.config.mjs` uses `@astrojs/cloudflare` and `wrangler.jsonc` declares `nodejs_compat` plus a current compatibility date for Workers deployment.
