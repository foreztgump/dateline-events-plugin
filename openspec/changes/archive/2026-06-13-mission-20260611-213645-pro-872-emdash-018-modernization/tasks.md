# Tasks: EmDash 0.18 Modernization

One milestone = one PR. Every PR routes through `pr-agent-runner` with `mission_dir` set; merge gated on `milestone-pass-pr-<PR>`.

## M0 — Platform verification probe (local replacement for Tender gate)
- [x] 0.1 Scaffold minimal EmDash 0.18 site shell (can live in `examples/reference-site` as the WS5 starting point) with `@emdash-cms/sandbox-workerd`
- [x] 0.2 Build throwaway probe plugin: dump `ctx` surface, exercise hooks (`content:*`, `cron`, `plugin:install/activate`), routes, storage query/uniqueIndexes, kv ops
- [x] 0.3 Measure workerd-runner per-invocation limits (CPU/subrequests/wall/memory); confirm offline `emdash-plugin init/build`
- [x] 0.4 Write `VERIFIED-PLATFORM-0.18.md`; update AGENTS.md gotchas superseded by findings
- [x] 0.5 Linear: comment findings on PRO-872; mark gate resolved on PRO-873

## M1 — WS1 dependency bump + cast elimination (PRO-873)
- [x] 1.1 Bump `emdash ^0.9.0 → ^0.18`, `@emdash-cms/blocks → ^0.18.0` across root + packages; add `@emdash-cms/plugin-cli@^0.5.1`
- [x] 1.2 Typecheck against real 0.18 types; remove every `as unknown` cast; triage each failure → verified-API rewrite or M2 item
- [x] 1.3 CI canary job vs `emdash@latest` (non-blocking)
- [x] 1.4 Grep gates wired in CI (per design D7)

## M2 — WS2 sandboxed conversion + WS3 remediation (PRO-874, PRO-875, PRO-876, PRO-877)
- [x] 2.1 `emdash-plugin.jsonc` ×3 (slug, publisher handle, license, security, capabilities, storage incl. uniqueIndexes as defense in depth)
- [x] 2.2 Collapse each plugin to `src/plugin.ts` with `const plugin: SandboxedPlugin = {...}; export default plugin;`; delete factories; fix package exports (`./sandbox`)
- [x] 2.3 Rename profiler `sandboxed.json` → `profiler.config.json`; recalibrate budgets to M0 measured limits
- [x] 2.4 `emdash-plugin validate` + `build` ×3 in CI; tarballs as artifacts
- [x] 2.5 RSVP capacity → storage-backed counters (D2); delete atomic-KV paths; concurrent oversell test green
- [x] 2.6 Cron/lifecycle remediation (D3): schedule in `plugin:install`, consume via `cron` hook; verified hook ids, no casts
- [x] 2.7 Importer: implement `ctx.http.fetch` remote-feed import under `network:request:unrestricted` (D4) + tests
- [x] 2.8 Email surfaces: keep `email:send` (+ `hooks.email-events:register` only if actually used)

## M3 — WS5 reference site rebuild (PRO-878)
- [x] 3.1 Real `emdash()` config: dev (sqlite/local/workerd) + deploy (d1/r2/cloudflare sandbox); `sandboxed: [core, rsvp, importer]`
- [x] 3.2 Seed events/venues/organizers (`seed/seed.json`); mock `email:deliver` transport plugin
- [x] 3.3 Delete `src/lib/fixtures.js`; pages render live data via `@dateline/views`
- [x] 3.4 Playwright e2e: calendars, event detail, RSVP flow incl. capacity + email, iCal feed, importer round-trip
- [x] 3.5 CI e2e job blocking from this milestone

## M4 — WS4 docs truth + WS6 views/blocks (PRO-879, PRO-880)
- [x] 4.1 README rewrite: real install flow; delete fictional sections; fix architecture diagram + Sandboxed column
- [x] 4.2 `docs/installation.md`, `docs/capabilities-and-security.md`, `docs/plugin-development.md`: purge + real `ctx` surface + measured budgets; grep gate broadened to docs/ + README.md (A-M4-3)
- [x] 4.3 `MIGRATION.md` (v0.1→v0.2)
- [x] 4.4 Views: inline `entry.data.terms` accessor (`entryTerms`/`entryTermSlugs`; no legacy lookup symbol pre-existed); re-verified `getEmDashCollection`/`getEmDashEntry`/`ContentEntry` shapes vs 0.18; blocks rebased onto upstream `@emdash-cms/blocks@^0.18` (re-export builders/validator/types via `/server`, kept `assertResponse`)
- [x] 4.5 Verified README install + deploy verbatim in a scratch git worktree: install → seed → dev serves seeded events (agent-browser confirmed `/events` renders Friday Meetup + Closing Social); deploy path through local `wrangler dev --port 8789` serves `/` (200) + `/events.ics` (BEGIN:VCALENDAR, 10 VEVENT) after miniflare D1 seed (stopped before any production `wrangler deploy`). Sanity-checked vs fresh `npm create emdash@latest --template blog --platform cloudflare --pm pnpm --yes --no-install`: scaffold now pins `emdash@^0.18.0` (NOT 0.16 — prior premise stale), so no bump instruction is warranted. No README gaps found requiring a fix.
- [x] 4.6 Storage/KV hygiene (PRO-879): core range-cache lazy 1h expiry (no `expirationTtl` in 0.18); rsvp rate-limit purge in cron (budget-capped); rsvp/proxy 500 branch for server faults; reference-site omit `rsvpRemaining` on storage read failure
- [x] 4.7 README Step 5 self-contained (A-M4-6 fix, PRO-879): added explicit ordered `pnpm install` + `pnpm -r build` before `seed`/`dev` so a fresh checkout following Step 5 verbatim succeeds (was failing — seed `ERR_MODULE_NOT_FOUND: better-sqlite3` needs install; dev "Failed to resolve entry for @dateline/core" needs build). Re-verified in a scratch `git worktree` (no pre-install/build): install → build → seed → dev → `/events` 200. Docs-only; grep gate (now covering README.md) green.

## M5 — WS7 release v0.2.0 (PRO-881)
- [x] 5.1 Changesets minor bump; per-package CHANGELOGs (six packages → 0.2.0; root CHANGELOG updated)
- [x] 5.2 CI fully green incl. e2e + grep gates + validate ×3 (build/typecheck/lint/test + sandbox:profile 20/20 + 8/8 Playwright e2e; A-M4-3/A-M4-4 grep gates exit 1)
- [x] 5.3 `emdash-plugin bundle` ×3; publish dry-run (no live publish) (dist/dateline-{core,rsvp,importer}-0.2.0.tar.gz; `pnpm -r publish --dry-run` clean, zero registry writes)
- [x] 5.4 Tag v0.2.0 (annotated, on release commit, NOT pushed) — OpenSpec change ready to archive post-merge; Linear: PRO-881 In Progress, done-pending-merge on PRO-872 (close PRO-872 family at ship)
