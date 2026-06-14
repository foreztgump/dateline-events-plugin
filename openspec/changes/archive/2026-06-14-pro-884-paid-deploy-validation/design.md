# Design — PRO-884 Cloudflare Paid deploy validation

## Context

The deliverable is empirical evidence, so the design is a **validation
procedure** plus the instrument that produces the evidence. Two facts from
research shape it:

1. **Dynamic Workers are Paid-only, open beta.** Deploying with a
   `worker_loaders` binding on a Free plan fails with API error `10195`
   ("In order to use Dynamic Workers, you must switch to a paid plan").
   The account is confirmed Paid, so the deploy is expected to succeed; the
   per-Worker creation fee is waived during beta.
2. **`wrangler deploy` auto-provisions bindings.** On the EmDash-on-Cloudflare
   path, `wrangler deploy` will create D1/R2/KV resources referenced in the
   config if they don't exist (workers-sdk#13264). We still pre-create D1 + R2
   explicitly so we control names and capture ids deterministically.

## The instrument: platform-probe plugin

`tools/platform-probe/plugin` is an already-built sandboxed plugin whose whole
purpose is to introspect the runtime `ctx`. Two routes do the work:

- **`dump-ctx`** returns `describeContext(ctx)` — the sorted ctx keys,
  `capabilityPresence` booleans (`content`, `http`, `media`, `users`, `email`,
  `cron`), `kvMethods`, `storageCollections`. This is the direct readout of which
  capabilities are present in the isolate.
- **`limits`** drives `cpu | subrequests | wall | memory` probes up to a safety
  cap and returns measured outcomes (or the loader's rejection).

Its manifest declares exactly `["content:read", "content:write",
"network:request:unrestricted"]`. The capability-boundary proof is therefore:

- **Positive:** declared capabilities (`content`, `http`) are present in `ctx`.
- **Negative:** a capability the manifest does **not** declare is absent. The
  manifest declares no `email:send` and no `users:read`, so on a correctly
  enforced boundary `dump-ctx` must report `email:false` / `users:false` in
  `capabilityPresence`. This is the cross-isolate enforcement the local bridge
  could only approximate.

> Design note: the local workerd `dump-ctx` (VERIFIED-PLATFORM-0.18.md) reported
> ctx keys `["content","email","http","kv","log","media","plugin","site",
> "storage","url","users"]` — i.e. `email` and `users` keys were *present* in the
> local bridge surface even though not declared. A central question for the Paid
> run is whether the real loader exposes the same superset or a capability-scoped
> subset. Either way the finding is recorded; a divergence is exactly the "gap vs.
> local workerd" the acceptance criteria demand we surface.

## Why reuse the probe instead of a new test harness

YAGNI + rule-of-three: the probe already exists, is CLI-buildable, has the exact
two routes needed, and was the instrument for the local M0 findings — reusing it
makes the Paid results **directly comparable** to `VERIFIED-PLATFORM-0.18.md`
table-for-table. Building a new harness would invent an incomparable baseline.

## Deploy procedure (the validated path)

1. `wrangler d1 create dateline-refsite-db` → capture `database_id`.
2. `wrangler r2 bucket create dateline-refsite-media`.
3. Update `wrangler.jsonc` `d1_databases[0].database_id` with the new id.
4. `pnpm -r build` (workspace deps + plugin descriptors).
5. `DEPLOY_TARGET=cloudflare pnpm --filter @dateline/reference-site build`
   (swaps `@astrojs/cloudflare` adapter + `d1()`/`r2()`/`sandbox()` backends;
   emits the worker + generated `wrangler.json` under `dist/server`).
6. Seed remote D1 (export EmDash seed → SQL → `wrangler d1 execute --remote`, or
   the documented libsql/HTTP seed path) so `/`, `/events`, `/events.ics` serve
   content instead of redirecting to `/_emdash/admin/setup`.
7. `wrangler deploy` from `dist/server` against the Paid account; capture the
   `*.workers.dev` URL and the bindings table (must list `env.LOADER Worker
   Loader`).

## Validation procedure (the evidence)

Against the deployed `*.workers.dev` URL:

- **Capability boundary:** `POST /_emdash/api/plugins/<probe>/dump-ctx` →
  capture full JSON; assert declared present / undeclared absent.
- **Resource limits:** drive `limits` for cpu (e.g. 100ms target vs 50ms budget),
  subrequests (>10), wall (handled by the 30s ceiling; do not bill 30s
  needlessly — a single representative call), memory (>128MB), capturing each
  measured outcome or rejection. Compare against the local workerd table.
- **App flows:** RSVP submit → confirm capacity decrement; fetch `/events.ics`
  and validate VEVENT content; run one importer round-trip. Playwright or curl —
  whichever produces the cleanest captured artifact. Screenshots for UI.

## Evidence document shape

`VERIFIED-DEPLOY-PAID.md` mirrors `VERIFIED-PLATFORM-0.18.md`:

- Header: account email + id, plan tier, wrangler version, deploy URL, date.
- Evidence-commands section (each claim → captured output path/excerpt).
- Capability-boundary section (the `dump-ctx` JSON + present/absent verdict).
- Resource-limits table: **Cloudflare documented | local workerd measured | Paid
  loader measured | evidence** — extending the existing 0.18 table with the new
  column.
- App-flows section (RSVP / iCal / importer green evidence).
- **Gaps vs. local workerd** section — explicit, the acceptance-critical part.
- Teardown section: live resource names/ids + the commands to remove them.

## Risks & mitigations

- **Billable infra.** Mitigate by pre-creating only D1+R2, keeping probe calls
  minimal (don't loop the 30s wall probe), and documenting teardown.
- **Remote seed friction.** EmDash auto-runs migrations on first DB init; the
  seed is the unknown. Fallback documented: `wrangler d1 execute --remote --file`
  with exported SQL.
- **Probe vs. real bug ambiguity.** If a flow fails, first confirm it's not a
  deploy/seed misconfig before recording it as a product gap; product gaps become
  follow-up Linear issues, not fixes in this change.
- **Loader exposes full ctx superset (like local).** Not a failure — recorded as
  the headline gap-vs-local finding with Cloudflare-doc cross-reference.
