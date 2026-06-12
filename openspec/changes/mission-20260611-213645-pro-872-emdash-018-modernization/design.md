# Design: EmDash 0.18 Modernization

## Key decisions (from research/emdash-0.18-research-2026-06-11.md)

### D1. Plugin shape: single-file sandboxed format
Each of core/rsvp/importer becomes one `src/plugin.ts` with a bare default export `satisfies SandboxedPlugin` (type from `emdash/plugin`) plus a hand-edited `emdash-plugin.jsonc`. `definePlugin()` and the `index.ts`/`sandbox-entry.ts` split are dropped. `createCorePlugin()`-style factories deleted (or kept as test-only named re-exports). Hook handlers MUST NOT annotate params — TS infers from hook name.

Package exports: `"./sandbox": "./dist/plugin.mjs"`, `"."` → `dist/index.mjs`; `files: ["dist", "emdash-plugin.jsonc"]`.

### D2. RSVP capacity: D1 storage, not KV
`ctx.kv` has no atomic ops (get/set/delete/list only). Capacity moves to the RSVP `storage` collection: unique constraint per event+attendee (`uniqueIndexes`), count-via-query or counter row with conflict retry. KV stays only as the 1-hr occurrence cache. The feature-detect fallback path in `rsvp/src/capacity.ts` is deleted. Oversell guarded by a concurrent-submission test (AAA, vitest-pool-workers if real bindings needed).

### D3. Cron + lifecycle: real APIs, used correctly
`ctx.cron.schedule(name, croner-string, data?)` and `plugin:install`/`plugin:activate`/`plugin:uninstall` hooks are REAL in 0.18 (PRD was wrong). Waitlist-promotion sweep: register the schedule in `plugin:install` (idempotent re-register in `plugin:activate`), consume via the `cron` hook discriminating on `event.name`. No invented static-manifest cron unless M0 probe contradicts docs.

### D4. Importer network capability
`network:request:unrestricted` with empty `allowedHosts` — operator-typed feed URLs aren't enumerable at install time (`network:request` requires a non-empty allowlist). Trade-off documented in README + consent-dialog note. Remote iCal fetch implemented via `ctx.http.fetch` (10-subrequest budget respected; batch fetches deferred across cron invocations if needed).

### D5. Reference site
`astro.config.mjs`: `emdash({ database, storage, sandboxed: [core, rsvp, importer], sandboxRunner })` — default imports, NOT factory calls. Dev: `sqlite()` + `local()` + `@emdash-cms/sandbox-workerd`. Deploy: `d1()` + `r2()` + `sandbox()` from `@emdash-cms/cloudflare`. Seed via `seed/seed.json`. `src/lib/fixtures.js` deleted. E2E (Playwright): calendar views, event detail, RSVP submit → capacity decrement → confirmation email (mock `email:deliver` transport plugin), iCal feed, importer round-trip.

### D6. Email
`email:send` is gated on a registered `email:deliver` transport. The reference site ships a tiny mock-transport plugin (declares `hooks.email-transport:register`) for dev/e2e. `hooks.email-events:register` is real — keep it only if rsvp actually registers `email:beforeSend`/`afterSend`.

### D7. Grep-gate adjustment
PRD's gate list included `plugin:activate` — removed from gates (it's a real hook we now intentionally use). All other gates stand: `emdash.config.ts`, `EMDASH_PLUGIN_MANIFEST`, `atomicIncrement`, `atomicDecrement`, `as unknown` on plugin definitions, "trusted" (plugin sense), `createCorePlugin` in docs.

### D8. M0 probe (replaces Tender gate)
A throwaway probe plugin installed in the reference-site scaffold dumps `ctx` surface, exercises hooks/routes/cron/storage/kv, and measures workerd-runner limits. Output: `VERIFIED-PLATFORM-0.18.md` (repo root). UNRESOLVED items it must answer: workerd per-invocation CPU/subrequest budgets; offline `emdash-plugin init`/`build`; exact registration shapes vs real types.

### D9. CI
- `emdash-plugin validate` ×3 (offline) — blocking.
- `emdash-plugin build` ×3 — blocking artifact step.
- Grep gates (D7) — blocking.
- `emdash@latest` canary job — non-blocking alert.
- Reference-site e2e — blocking from M3 on.
- `pnpm sandbox:profile -- --pkg @dateline/<pkg>` recalibrated to measured limits (advisory until M0 numbers land).

## Dependency direction
`@dateline/core` ← rsvp, importer, views. blocks/recurring are leaf helpers. Reference site consumes all. Per-milestone PRs keep the workspace buildable at every merge.
