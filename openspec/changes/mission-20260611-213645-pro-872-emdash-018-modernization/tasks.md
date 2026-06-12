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
- [ ] 1.3 CI canary job vs `emdash@latest` (non-blocking)
- [ ] 1.4 Grep gates wired in CI (per design D7)

## M2 — WS2 sandboxed conversion + WS3 remediation (PRO-874, PRO-875, PRO-876, PRO-877)
- [ ] 2.1 `emdash-plugin.jsonc` ×3 (slug, publisher handle, license, security, capabilities, storage incl. uniqueIndexes as defense in depth)
- [ ] 2.2 Collapse each plugin to `src/plugin.ts` with `const plugin: SandboxedPlugin = {...}; export default plugin;`; delete factories; fix package exports (`./sandbox`)
- [ ] 2.3 Rename profiler `sandboxed.json` → `profiler.config.json`; recalibrate budgets to M0 measured limits
- [ ] 2.4 `emdash-plugin validate` + `build` ×3 in CI; tarballs as artifacts
- [ ] 2.5 RSVP capacity → storage-backed counters (D2); delete atomic-KV paths; concurrent oversell test green
- [ ] 2.6 Cron/lifecycle remediation (D3): schedule in `plugin:install`, consume via `cron` hook; verified hook ids, no casts
- [ ] 2.7 Importer: implement `ctx.http.fetch` remote-feed import under `network:request:unrestricted` (D4) + tests
- [ ] 2.8 Email surfaces: keep `email:send` (+ `hooks.email-events:register` only if actually used)

## M3 — WS5 reference site rebuild (PRO-878)
- [ ] 3.1 Real `emdash()` config: dev (sqlite/local/workerd) + deploy (d1/r2/cloudflare sandbox); `sandboxed: [core, rsvp, importer]`
- [ ] 3.2 Seed events/venues/organizers (`seed/seed.json`); mock `email:deliver` transport plugin
- [ ] 3.3 Delete `src/lib/fixtures.js`; pages render live data via `@dateline/views`
- [ ] 3.4 Playwright e2e: calendars, event detail, RSVP flow incl. capacity + email, iCal feed, importer round-trip
- [ ] 3.5 CI e2e job blocking from this milestone

## M4 — WS4 docs truth + WS6 views/blocks (PRO-879, PRO-880)
- [ ] 4.1 README rewrite: real install flow; delete fictional sections; fix architecture diagram + Sandboxed column
- [ ] 4.2 `docs/installation.md`, `docs/capabilities-and-security.md`, `docs/plugin-development.md`: purge + real `ctx` surface + measured budgets
- [ ] 4.3 `MIGRATION.md` (v0.1→v0.2)
- [ ] 4.4 Views: inline `entry.data.terms`; re-verify option shapes; blocks rebased onto upstream 0.18 typings
- [ ] 4.5 Verify README install verbatim against fresh `npm create emdash@latest`

## M5 — WS7 release v0.2.0 (PRO-881)
- [ ] 5.1 Changesets minor bump; per-package CHANGELOGs
- [ ] 5.2 CI fully green incl. e2e + grep gates + validate ×3
- [ ] 5.3 `emdash-plugin bundle` ×3; publish dry-run (no live publish)
- [ ] 5.4 Tag v0.2.0; archive OpenSpec change; Linear: close PRO-872 family
