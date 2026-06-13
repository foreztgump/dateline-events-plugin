# @dateline/reference-site

Astro reference theme that integrates the full Dateline plugin family into a working EmDash site. Demonstrates calendar views, RSVP flows, and recurring event display using `@dateline/views` components. Serves as the E2E test target for Playwright tests and as the canonical example for operators building Dateline-powered sites.

## Local development

```bash
pnpm --filter @dateline/reference-site seed   # apply seed/seed.json to ./data.db
pnpm --filter @dateline/reference-site dev     # astro dev on 127.0.0.1:4321 (workerd sandbox runner)
```

The dev path uses the Node adapter with `sqlite` storage and the local
`@emdash-cms/sandbox-workerd` runner. A trusted mock `email:deliver` transport
(`plugins/mock-email/`) captures RSVP confirmation emails to
`.emdash-dev/mock-email.log`.

## End-to-end tests (Playwright)

```bash
pnpm --filter @dateline/reference-site exec playwright install chromium   # one-time
pnpm --filter @dateline/reference-site test:e2e
```

The Playwright config (`playwright.config.ts`) boots its own dev server via the
`webServer` option — it reseeds `data.db` and then runs `astro dev` on port
4399, so no manual orchestration is needed. Specs cover calendar render, event
detail, the RSVP submit → confirmation → capacity-decrement flow, full-event
rejection, the iCal feed, and the importer round-trip. This suite runs as a
**blocking** CI job (`.github/workflows/ci.yml` → `reference-site e2e`).

## Cloudflare deploy validation

The Cloudflare path swaps the host adapter to `@astrojs/cloudflare` and the
EmDash backends to D1 / R2 / the Dynamic Worker Loader sandbox via the
`DEPLOY_TARGET=cloudflare` env flag (see `astro.config.mjs`). Bindings live in
`wrangler.jsonc`:

- `d1_databases` → binding `DB` (`dateline-refsite-db`)
- `r2_buckets` → binding `MEDIA` (`dateline-refsite-media`)
- `worker_loaders` → binding `LOADER` (Dynamic Worker Loader; Workers Paid plan)

Build and preview on the Workers runtime:

```bash
pnpm -r build                                   # build workspace deps + plugins
DEPLOY_TARGET=cloudflare pnpm --filter @dateline/reference-site build
cd examples/reference-site/dist/server
npx wrangler dev -c wrangler.json --port 8789   # 8789 only — 8787/8788 are off-limits
```

### D1 schema + seed

EmDash runs its schema migrations automatically when the runtime initialises a
database. For a freshly created D1 database (or a fresh local `wrangler dev`
state), apply the seed against the database so `/`, `/events`, and `/events.ics`
serve content instead of redirecting to `/_emdash/admin/setup`:

- **Local `wrangler dev` (miniflare D1):** seed the local SQLite file backing
  the D1 binding (runs the 41 EmDash migrations, then applies `seed/seed.json`):

  ```bash
  D1FILE="dist/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite"
  node node_modules/emdash/dist/cli/index.mjs seed seed/seed.json \
    --database "$D1FILE" --uploads-dir ./uploads --on-conflict update
  ```

  Restart `wrangler dev` afterwards so miniflare reloads the seeded database.

- **Remote D1:** export the seed as SQL and apply it with
  `wrangler d1 execute dateline-refsite-db --file <seed.sql> --remote`, or run the
  EmDash seed against a libsql/HTTP D1 endpoint. (No remote `wrangler deploy` is
  performed in this mission.)
