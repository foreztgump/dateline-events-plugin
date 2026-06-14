# PRO-884 WS-A2 — Cloudflare Paid deploy validation (VERIFIED-DEPLOY-PAID.md)

## Why

Dateline's sandbox isolation pitch — each plugin gets only the capabilities its
manifest declares, enforced by a separate V8 isolate — has **never been
exercised on real infrastructure**. The v0.2.0 / M0 work validated it only
locally with `@emdash-cms/sandbox-workerd@0.1.6` + `wrangler dev` (see
`VERIFIED-PLATFORM-0.18.md`), and that runner self-reports a critical gap:

> `[emdash:workerd] cpuMs, memoryMb, and subrequests limits are not enforced by
> standalone workerd. Only wallTimeMs is enforced on the Node path.`

So three of the four documented sandbox limits (50ms CPU, 10 subrequests, ~128MB
memory) have **zero empirical evidence** on a real Dynamic Worker Loader, and the
capability boundary itself was only proven against an in-process bridge, not a
real cross-isolate boundary. PRD-production-release.md §3 WS-A2 makes a verified
Workers **Paid** deployment a release gate for v0.3.0 (milestone prod-M1).

The Cloudflare account is confirmed Workers **Paid** and live deploy is
authorized. The prior mission-scoped D1 (`dateline-refsite-db`) and R2
(`dateline-refsite-media`) were torn down and must be re-provisioned.

## What changes

This change is **infrastructure validation + an evidence document**, not a code
feature. It deploys the existing `examples/reference-site` to Cloudflare Workers
Paid and captures proof.

- **Re-provision live resources.** Create a fresh D1 database and R2 bucket;
  update the D1 `database_id` in `examples/reference-site/wrangler.jsonc`.
- **Deploy to Workers Paid** via `DEPLOY_TARGET=cloudflare` Astro build →
  `wrangler deploy`, with the `worker_loaders` (`LOADER`) binding active so
  plugins run in real Dynamic Worker isolates.
- **Seed remote D1** so the public routes serve content (events, RSVP, iCal).
- **Prove the capability boundary on the real loader.** Use the existing
  `tools/platform-probe` plugin (`dump-ctx` + `limits` routes) deployed alongside
  the Dateline plugins to demonstrate: (a) an **undeclared** capability is
  genuinely absent from `ctx` at runtime on real infra (not just locally), and
  (b) the documented resource limits (50ms CPU / 10 subrequests / 30s wall /
  ~128MB) behave as Cloudflare documents them on the real loader.
- **Prove the application flows green** against the deployed site: RSVP submit →
  capacity decrement → confirmation, the iCal feed, and an importer round-trip.
- **Commit `VERIFIED-DEPLOY-PAID.md`** documenting the account/plan, the loader
  binding, and the evidence (logs / screenshots / measured JSON), and **calling
  out every gap vs. the local workerd findings** in `VERIFIED-PLATFORM-0.18.md`.

## Scope decisions (recorded)

- **No application code change is in scope.** If the deploy surfaces a real bug
  in a plugin or the reference site, it is recorded as a follow-up Linear issue,
  not fixed here — this WS validates, it does not build.
- **The probe plugin is a validation instrument, not a shipped artifact.** It is
  registered into the reference site's `sandboxed: []` only for the duration of
  this validation; whether it stays wired is a documented decision in the
  evidence file, not a product requirement.
- **Evidence over assertion.** Every claim in `VERIFIED-DEPLOY-PAID.md` is backed
  by a captured command output, measured JSON, or screenshot. Unverifiable
  claims are marked as such, exactly as `VERIFIED-PLATFORM-0.18.md` does.
- **Teardown is documented, not necessarily executed.** The evidence file records
  the live resource names/ids and a teardown procedure so the account does not
  accrue silent cost; whether resources are left running for the docs site is a
  recorded decision.

## Impact

- Affected (committed): `examples/reference-site/wrangler.jsonc` (new D1
  `database_id`), `VERIFIED-DEPLOY-PAID.md` (new evidence doc),
  `examples/reference-site/README.md` (deploy section refreshed with real
  resource names + seed-remote steps), the `reference-site` spec
  (deploy-mode scenario upgraded from local `wrangler dev` to real Paid deploy).
- Affected (live infra, not committed): a new D1 database, a new R2 bucket, and a
  deployed Worker on the `bb.goodbom@gmail.com` Cloudflare account.
- Acceptance: `VERIFIED-DEPLOY-PAID.md` committed with evidence that the
  capability boundary is enforced on Paid, the four resource limits are
  characterized on the real loader, the RSVP + iCal + importer flows are green
  against the deployed site, and every gap vs. local workerd is called out
  explicitly.

## Outcome (Path B, recorded)

The deploy landed on Workers Paid with the Dynamic Worker Loader active
(`env.LOADER` confirmed, no error 10195) and public SSR + iCal routes green from
remote D1. However, the deployed worker does **not** export the `PluginBridge`
Durable Object that the Cloudflare sandbox runner requires, so the sandbox never
loads and all plugin HTTP routes return 404 — blocking the live probe
`dump-ctx`/`limits` calls and the sandboxed RSVP/importer flows. Per the recorded
scope decision (validate, don't build), this deployment-config gap is filed as
**PRO-909** and deferred to the upcoming production website deploy rather than
fixed here. The capability boundary and resource limits are therefore proven from
the **deployed runner bundle source** (the exact artifact `wrangler deploy`
uploaded), with the live runtime observations explicitly marked
blocked-pending-PRO-909. User chose Path B (2026-06-14).
