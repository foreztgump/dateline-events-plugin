# reference-site — Paid deploy validation spec delta

## MODIFIED Requirements

### Requirement: Real EmDash site
`examples/reference-site` SHALL run the `emdash()` Astro integration with all three Dateline plugins installed via `sandboxed: []` (default imports) and a configured `sandboxRunner` (workerd for dev, Cloudflare for deploy). Static fixtures (`src/lib/fixtures.js`) SHALL be deleted; all pages render live `getEmDashCollection`/`getEmDashEntry` data through `@dateline/views`.

#### Scenario: Dev mode end-to-end
- **WHEN** `astro dev` runs with SQLite + local storage + workerd sandbox
- **THEN** month/week/day/list calendars, event detail, RSVP submit → capacity decrement → confirmation email (mock transport), iCal feed, and importer round-trip all function against seeded data

#### Scenario: Deploy mode on Cloudflare Workers Paid
- **WHEN** the site is built with `DEPLOY_TARGET=cloudflare` and deployed with `wrangler deploy` to a Workers **Paid** account whose config includes the `worker_loaders` (`LOADER`) binding plus D1 (`DB`) and R2 (`MEDIA`)
- **THEN** the deploy succeeds (no Dynamic Workers paid-plan error `10195`), the generated bindings list `env.LOADER` as a Worker Loader, and the public SSR routes (`/`, `/events`) and the iCal feed (`/events.ics`) function end-to-end against the deployed `*.workers.dev` URL from the remote D1 binding
- **AND** the sandboxed-plugin flows (RSVP submit → capacity decrement, importer round-trip) are blocked on this deploy because the worker entrypoint does not export the `PluginBridge` Durable Object, so the sandbox runner reports unavailable and plugin routes return 404 — tracked as PRO-909 and recorded in `VERIFIED-DEPLOY-PAID.md`

## ADDED Requirements

### Requirement: Sandbox capability boundary enforced on the real Dynamic Worker Loader
The reference site's deployment SHALL provide evidence, captured in `VERIFIED-DEPLOY-PAID.md`, that on the real Cloudflare Dynamic Worker Loader each sandboxed plugin's runtime `ctx` reflects its declared capability manifest: capabilities the manifest declares are present, and capabilities the manifest does not declare are absent or non-functional. Because the sandbox does not load on the deployed worker until PRO-909 wires `PluginBridge`, this evidence SHALL be drawn from the deployed runner artifact (`examples/reference-site/dist/server/virtual_astro_middleware.mjs` — the exact bundle `wrangler deploy` uploaded), and the live probe `dump-ctx` capture SHALL be marked blocked-pending-PRO-909.

#### Scenario: Declared capabilities present, undeclared capability absent (by deployed source)
- **WHEN** the deployed runner's plugin-wrapper generation and host-bridge code are inspected in the uploaded bundle
- **THEN** the evidence shows undeclared optional capabilities (e.g. `users`, `email`) are omitted from `ctx` at wrapper-generation time (`ctx.users`/`ctx.email` are `undefined`), and the host-side `PluginBridge` re-checks every capability and throws `Missing capability: <cap>` before any DB/R2/network access
- **AND** the isolate receives only the `BRIDGE` binding with `globalOutbound: null` (no DB/R2/KV binding, no direct egress)
- **AND** the live probe `dump-ctx` capture is recorded as blocked-pending-PRO-909, to be exercised on the production website deploy

### Requirement: Documented resource limits characterized on the real loader
`VERIFIED-DEPLOY-PAID.md` SHALL characterize each of the four documented sandbox resource limits (50ms CPU, 10 subrequests, 30s wall clock, ~128MB memory) on the real Dynamic Worker Loader and SHALL compare each against the local `@emdash-cms/sandbox-workerd` results recorded in `VERIFIED-PLATFORM-0.18.md`. Because the sandbox does not load until PRO-909, the characterization SHALL be drawn from the deployed runner artifact (which limits are passed to `loader.get` vs. declared-only), with the live `limits`-route measurement marked blocked-pending-PRO-909.

#### Scenario: CPU / subrequest / memory limits characterized on Paid (by deployed source)
- **WHEN** the deployed runner's `DEFAULT_LIMITS` and `loader.get(... limits ...)` construction are inspected in the uploaded bundle
- **THEN** CPU (50ms) and subrequests (10) are shown passed to the Worker Loader and wall-time (30s) enforced by the runner, while memory (~128MB) is declared-only and never passed to `loader.get`
- **AND** the gaps section calls out that memory remains unenforced on the real loader (matching local workerd) while CPU + subrequests are enforced by the Paid loader (an improvement over the local runner), and the live limit-rejection measurement is marked blocked-pending-PRO-909

### Requirement: VERIFIED-DEPLOY-PAID.md evidence document
The repository SHALL contain a committed `VERIFIED-DEPLOY-PAID.md` documenting the Cloudflare account and plan tier, the wrangler version, the deployed URL, the `worker_loaders` binding, and per-claim evidence (captured command output, measured JSON, or screenshots) for the capability boundary, the resource limits, and the green application flows, with every gap vs. the local workerd findings stated explicitly.

#### Scenario: Evidence backs every claim
- **WHEN** a reviewer reads any verification claim in `VERIFIED-DEPLOY-PAID.md`
- **THEN** that claim is backed by a referenced captured artifact (log excerpt, JSON, or screenshot), or is explicitly marked as unverified, following the same evidence discipline as `VERIFIED-PLATFORM-0.18.md`
