# Proposal: EmDash 0.18 Modernization (v0.2.0)

**Mission:** mission-20260611-213645-pro-872-emdash-018-modernization
**Linear:** Epic PRO-872 + PRO-873–881
**Sources of truth:** `PRD-emdash-0.17-modernization.md` corrected by `research/emdash-0.18-research-2026-06-11.md`

## Why

Dateline v0.1.1 is pinned `emdash ^0.9.0` — nine minors behind 0.18.0. The three plugins use `definePlugin()` (native-only) while claiming "Sandboxed: ✅"; descriptors smuggle untyped fields via `as unknown`; the RSVP capacity path calls a nonexistent `ctx.kv.atomicIncrement/Decrement`; docs describe a fictional EmDash (`emdash.config.ts`, `EMDASH_PLUGIN_MANIFEST_*`); the reference site doesn't use EmDash at all.

## What Changes

- **M0 (new):** local probe plugin → `VERIFIED-PLATFORM-0.18.md` (replaces the missing Tender PRO-847 gate). Resolves: workerd-runner per-invocation limits, offline `init`/`build` behavior, hook/route/admin registration shapes against real types.
- **M1 / WS1 (PRO-873):** `emdash ^0.18`, `@emdash-cms/blocks@^0.18`, add `@emdash-cms/plugin-cli`; eliminate all `as unknown` casts; `emdash@latest` CI canary.
- **M2 / WS2+WS3 (PRO-874/875/876/877):** convert core/rsvp/importer to sandboxed format (`emdash-plugin.jsonc` + single `src/plugin.ts` with `const plugin: SandboxedPlugin = {...}; export default plugin;`); RSVP capacity → storage-backed D1 counters + oversell test; cron/lifecycle registration per verified 0.18 shapes; importer implements `ctx.http.fetch` remote feeds under `network:request:unrestricted` or drops the capability.
- **M3 / WS5 (PRO-878):** reference site rebuilt on real EmDash 0.18 (`emdash()` integration, seeded data, fixtures deleted, workerd dev + D1/R2 deploy); CI e2e harness.
- **M4 / WS4+WS6 (PRO-879/880):** docs truth pass (purge fictional surfaces, add MIGRATION.md); views adopt inline `entry.data.terms`; blocks rebased onto `@emdash-cms/blocks@0.18.0`.
- **M5 / WS7 (PRO-881):** v0.2.0 release — changesets, CHANGELOGs, CI green incl. e2e, `emdash-plugin bundle` publish dry-run.

## Impact

- Affected packages: core, rsvp, importer, views, blocks, recurring (type-bump only), examples/reference-site, tools/sandbox-profiler, docs/, CI workflows.
- Non-goals: ticketing/seating/dynamic pricing, new import sources, RRULE algorithm changes, Tender payment integration, live Atmosphere publish.
