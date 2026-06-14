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

> **Status (2026-06-14, PRO-884):** validated with a real remote `wrangler deploy`
> to a **Workers Paid** account. Live resources currently provisioned: D1
> `dateline-refsite-db` (id `0a405080-14bd-4ad1-b386-523e8a3585fb`), R2
> `dateline-refsite-media`, KV `SESSION` (`853a0572831d42eab3326536155afff6`), and
> Worker `dateline-reference-site`
> (`https://dateline-reference-site.networkreef-dev.workers.dev`). These are left
> running for the PRO-909 follow-up; teardown commands are in `VERIFIED-DEPLOY-PAID.md`.
> To deploy fresh elsewhere, recreate the resources (`wrangler d1 create …`,
> `wrangler r2 bucket create …`) and update the new D1 `database_id` in
> `wrangler.jsonc`.

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
  EmDash seed against a libsql/HTTP D1 endpoint. The remote D1 was seeded this way
  for the PRO-884 Paid deploy (44 tables, 800 rows).

### Paid deploy validation (PRO-884)

A real remote deploy to Workers Paid confirmed the Dynamic Worker Loader is active
(`env.LOADER` present, no error 10195) and that `/`, `/events`, and `/events.ics`
serve seeded content from the remote D1 binding. The full evidence — including the
per-plugin capability boundary and resource limits proven from the deployed runner
bundle — is in `VERIFIED-DEPLOY-PAID.md` at the repo root.

> **Known gap (PRO-909):** sandboxed plugins do **not** load on this Cloudflare deploy
> because the worker entrypoint does not export the `PluginBridge` Durable Object. The
> Cloudflare sandbox runner requires `exports.PluginBridge` (plus a `durable_objects`
> binding and a `new_sqlite_classes` migration) to be wired into the worker; the EmDash
> Astro integration does not auto-wire this. Until PRO-909 lands, all
> `/_emdash/api/plugins/<id>/<route>` requests return 404 and sandboxed-plugin flows
> (RSVP submit, importer) are unavailable on the deployed site. Public SSR routes are
> unaffected.
