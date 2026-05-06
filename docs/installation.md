# Installation Guide

Complete walkthrough to install Dateline into your EmDash project and deploy to Cloudflare Workers.

## Prerequisites

- **Node.js 22+** — EmDash 0.9.x and Wrangler 4.87+ require Node 22 (Node 20 is EOL)
- **pnpm 10.33.2+** — Dateline uses pnpm workspaces
- **Cloudflare account on a Paid plan** — Dynamic Workers (which provide sandbox isolation) require paid Cloudflare. Free plan runs plugins as trusted (in-process). See [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- **EmDash project** — existing EmDash 0.9.x site ready to extend

## Step 1: Install Dateline packages

Install the core and any add-ons you need:

```bash
pnpm add @dateline/core @dateline/rsvp @dateline/recurring @dateline/views
```

Optional add-ons (shipped in v0.2+, available as pre-release):

- `@dateline/importer` — TEC, iCal, CSV import
- `@dateline/tickets-backend` — Stripe ticketing (commercial)

## Step 2: Register plugins in EmDash config

Create or update `emdash.config.ts`:

```ts
import createCorePlugin from "@dateline/core";
import createRsvpPlugin from "@dateline/rsvp";

export default {
  plugins: [createCorePlugin(), createRsvpPlugin()],
  // ... rest of your EmDash config
};
```

`@dateline/recurring` and `@dateline/views` are helper libraries, not plugins, so they don't go in the `plugins` array.

## Step 3: Configure Cloudflare bindings

Update your `wrangler.jsonc` to declare plugin capabilities. Each sandboxed plugin needs explicit capability declarations for EmDash to enforce them:

```jsonc
{
  "name": "my-emdash-site",
  "main": "src/index.ts",
  "compatibility_date": "2026-05-05",
  "env": {
    "production": {
      "routes": [
        { "pattern": "example.com/*", "zone_name": "example.com" }
      ],
      "d1_databases": [
        { "binding": "DB", "database_name": "dateline-events" }
      ],
      "vars": {
        "ENVIRONMENT": "production",
        "EMDASH_PLUGIN_MANIFEST_CORE": "{\"id\": \"dateline-core\", \"version\": \"0.1.0\", \"capabilities\": [\"content:read\", \"content:write\", \"media:read\"]}",
        "EMDASH_PLUGIN_MANIFEST_RSVP": "{\"id\": \"dateline-rsvp\", \"version\": \"0.1.0\", \"capabilities\": [\"content:read\", \"content:write\", \"email:send\"]}"
      }
    }
  }
}
```

The `vars` with capability manifests tell EmDash what each plugin declares. See [capabilities-and-security.md](./capabilities-and-security.md) for the full reference.

## Step 4: Set up your Astro theme

If you're using `@dateline/views` for calendar/event rendering, update your Astro project:

### 4a. Install Astro Cloudflare adapter

```bash
pnpm add @astrojs/cloudflare
```

### 4b. Update `astro.config.mjs`

```mjs
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  adapter: cloudflare(),
});
```

### 4c. Use Dateline components

In any `.astro` page:

```astro
---
import { getEmDashCollection } from "emdash";
import { CalendarMonth, EventCard } from "@dateline/views";

const { entries: events } = await getEmDashCollection("dateline_events", {
  filter: { startsAt: { gte: new Date() } },
  sort: { startsAt: "asc" },
  limit: 50,
});
---

<CalendarMonth events={events} />

{events.map(e => <EventCard event={e} />)}
```

### 4d. Install Tailwind (optional)

The styled components use Tailwind. If you don't have it:

```bash
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.mjs` to include Dateline component styles:

```js
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./node_modules/@dateline/views/**/*.{js,ts}",
  ],
};
```

## Step 5: Build and test locally

```bash
pnpm run build
pnpm run dev
```

Visit `http://localhost:3000` and verify that:

- EmDash admin loads without errors
- Calendar views render
- RSVP forms appear (if RSVP plugin installed)

## Step 6: Deploy to Cloudflare

### 6a. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 6b. Deploy your site

```bash
pnpm run build
npx wrangler deploy
```

Wrangler will:

1. Create or update your Workers script
2. Bind D1 database (`DB` binding)
3. Set environment variables (including plugin capability manifests)
4. Deploy your Astro site to Cloudflare Workers

### 6c. Verify deployment

```bash
# Check deployment status
npx wrangler deployments list

# Tail logs in real-time
npx wrangler tail
```

## Free vs Paid plan notes

**Cloudflare Free plan:** Dynamic Workers are not available. Dateline plugins will run as trusted code (in-process) rather than sandboxed. This means:

- No isolation between plugins
- Plugins can access each other's KV stores
- No capability enforcement

Sandbox isolation and security benefits are available only on Paid plans.

**Recommendation:** Start on Free to prototype, upgrade to Paid before production.

## Stripe integration (if using tickets)

When you install `@dateline/tickets-backend` in v0.2+, you'll need Stripe credentials:

1. Get your Stripe API key from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. **Never commit secrets to git.** Use wrangler's secret management exclusively:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Your `wrangler.jsonc` should NOT contain plaintext secret values. If you need to reference them in code, access them via `ctx.env.STRIPE_SECRET_KEY` (in plugins) or the `env` binding parameter (in routes).

### Cloudflare WAF carve-out

If you enable Cloudflare's WAF or Bot Fight Mode, Stripe webhook deliveries may be blocked. Add a carve-out rule in the Cloudflare dashboard:

- Path: `/_emdash/api/plugins/dateline-tickets/webhook-stripe`
- Action: Allow

Or use the GraphQL API to debug:

```bash
curl -H "Authorization: Bearer <CF_API_TOKEN>" \
  -d '{"query": "{ viewer { zones(filter: {names: [\"example.com\"]}) { firewallEventsAdaptive(filter: {datetime_geq: \"2026-05-05T00:00:00Z\"}) { action timestamp clientIP } } } }"}' \
  https://api.cloudflare.com/client/v4/graphql
```

## Reference site example

For a complete working example, explore `examples/reference-site`:

```bash
cd examples/reference-site
pnpm install
pnpm run dev
```

This demonstrates:

- Full Astro 6 theme with Cloudflare Workers
- All Dateline components in use
- Calendar, RSVP, and recurring event flows
- iCal feed generation
- Playwright visual regression tests

## Troubleshooting

### "Plugins must declare capabilities"

**Error:** `Plugin dateline-core declares unknown capabilities: ["content:read"]`

**Solution:** Ensure your `wrangler.jsonc` has the `EMDASH_PLUGIN_MANIFEST_*` variables with correct JSON. Check that the capability names match exactly (e.g., `content:read`, not `read:content`).

### "ctx.waitUntil is undefined"

**Error:** `TypeError: ctx.waitUntil is not a function`

**Solution:** This happens when a sandboxed plugin tries to use `ctx.waitUntil` but it's not provided by EmDash. Ensure:

1. Your EmDash version is `^0.9.0`
2. The plugin is running in a sandboxed context (Cloudflare Paid plan)

### "Capacity counter out of sync"

**Error:** RSVP events showing negative capacity or wrong counts

**Solution:** This can happen if KV state is out of sync. Clear the `capacity:{eventId}` key in KV and let the plugin recompute. The RSVP plugin auto-corrects on the next write.

```bash
npx wrangler kv:key delete "capacity:event-123" --binding DATELINE_KV
```

### "iCal feed returns 404"

**Error:** `GET /_emdash/api/plugins/dateline-core/ical → 404`

**Solution:** Ensure `@dateline/core` is registered as a plugin in `emdash.config.ts` and your site is deployed.

## Next steps

- Explore [capabilities-and-security.md](./capabilities-and-security.md) for capability reference
- Read [plugin-development.md](./plugin-development.md) for custom plugin patterns
- Check out the [Reference site README](../examples/reference-site/README.md) for E2E examples
