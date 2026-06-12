# Dateline — EmDash 0.17 Modernization PRD

**Date:** 2026-06-11
**Status:** Draft for review
**Repo:** github.com/foreztgump/dateline-events-plugin
**Current state:** v0.1.0/v0.1.1 (shipped 2026-05-05), pinned `emdash ^0.9.0` peer + `@emdash-cms/blocks@0.9.0` — nine minors behind `0.18.0` (npm `latest`, released 2026-06-11; was `0.17.2` when this PRD was drafted). 0.18.0 is patch-level for plugin authors (cold-start fixes, fewer DB round trips, `getEmDashCollection`/`getEmDashEntry` entries now include taxonomy terms via `entry.data.terms`); no plugin-API breaking changes. "0.17" remains the modernization label to stay in sync with Tender/Carte epics and `VERIFIED-PLATFORM-0.17.md`.
**Depends on:** Tender modernization M0 deliverable `VERIFIED-PLATFORM-0.17.md` (shared platform-facts document) — see `/home/cownose/projects/tender/PRD-emdash-0.17-modernization.md`

---

## 1. Background & Problem

Dateline is internally consistent v0.9-era code, but it has the worst **documentation-reality gap** of the three plugin families: the README and docs describe an EmDash that never existed in any version.

**Code problems:**
1. All three plugins (`core`, `rsvp`, `importer`) use `definePlugin()` from `emdash` (`packages/core/src/index.ts:1`, `rsvp/src/index.ts:1,22`, `importer/src/index.ts:1,28`) — native-only in 0.17 — while the README claims "Sandboxed: ✅" for each. There is no `emdash-plugin.jsonc`, no `src/plugin.ts` bare default export, no `@emdash-cms/plugin-cli`.
2. The descriptors smuggle untyped fields past 0.9 types via `as unknown` casts (`core/src/index.ts:22`) — `routes`, `routeHandlers`, `admin.pages`, hook names. These casts hide every API the code is guessing about.
3. **Invented runtime APIs:** `ctx.kv.atomicIncrement`/`atomicDecrement` (`rsvp/src/capacity.ts:26-43` — feature-detected with fallback, but the primary path will never exist), `ctx.cron.schedule()` dynamic registration + `"plugin:activate"` hook (`rsvp/src/hooks.ts:9-11`, `rsvp/src/index.ts:31-33`), `hooks.email-events:register` as documented capability, `ctx.http.fetch` documented but never used (importer declares `network:request` with zero fetch calls).
4. Per-package `sandboxed.json` files are inputs to the in-repo sandbox-profiler tool, not EmDash manifests — easily mistaken for the real thing.

**Docs problems (worse than the code):**
5. README "Getting started" + `docs/installation.md:27-37` instruct operators to register plugins in **`emdash.config.ts`** — a file that exists in no EmDash version and not even in this repo. Real registration is `emdash({ plugins, sandboxed, sandboxRunner })` in `astro.config.mjs`.
6. README §3 + `installation.md:60-61,242` document **`EMDASH_PLUGIN_MANIFEST_<ID>` wrangler vars** — pure invention; nothing reads them, in EmDash or in this repo.
7. "Free plan runs as trusted" + the format×mode framing throughout README/`docs/capabilities-and-security.md` — obsolete pre-v0.13 model.
8. **The reference site doesn't use EmDash at all.** `examples/reference-site/astro.config.mjs` has no `emdash()` integration; pages render `@dateline/views` from static fixtures (`src/lib/fixtures.js`); the RSVP endpoint is a plain Astro route. The README presents it as a demonstration of plugin registration — it demonstrates nothing of the sort.

**What already conforms (keep):** package decomposition is exemplary — `@dateline/recurring` and `@dateline/blocks` correctly framed as helper libraries, `@dateline/views` as a trusted Astro component library consuming `getEmDashCollection` (`views/src/lib/emdash-loader.ts:1`); capability sets are minimal and correctly `resource:verb`; plugin-scoped KV usage; lazy RRULE materialization with KV caching is a sound design; the iCal/schema.org/GDPR feature surface; importer architecture (iCal/CSV/JSON/TEC).

## 2. Goals

- **G1** — `@dateline/core`, `@dateline/rsvp`, `@dateline/importer` become true **sandboxed-format** plugins (manifest + single runtime file via `@emdash-cms/plugin-cli`), making the README's "Sandboxed: ✅" claims true.
- **G2** — All invented APIs removed; every `as unknown` cast eliminated; every hook/route/admin surface verified against `VERIFIED-PLATFORM-0.17.md`.
- **G3** — Documentation describes real EmDash: real registration, real install flow, no fictional config files or env vars.
- **G4** — The reference site becomes a **real EmDash 0.17 site** with all three plugins installed and `@dateline/views` rendering live `getEmDashCollection` data — the install docs' executable proof.
- **G5** — RSVP capacity race-safe without atomic KV.
- **G6** — `@dateline/blocks` rebased from `@emdash-cms/blocks@0.9.0` to the 0.17-era package (or absorbed, if upstream Block Kit typings now cover it).

**Non-goals:** ticketing/seating/dynamic-pricing roadmap features; new import sources; changes to `@dateline/recurring`'s RRULE algorithm beyond type-bump compatibility; Tender payment integration (future, post-Tender-M4).

## 3. Workstreams

### WS1 — Dependency bump & cast elimination
- `emdash ^0.9.0 → ^0.18` (peer) across packages (latest minor at execution time — `0.18.0` as of 2026-06-11; 0.17→0.18 carries no plugin-API breaks); `@emdash-cms/blocks` → current (`0.18.0`); add `@emdash-cms/plugin-cli`.
- Remove the `as unknown` descriptor casts; let 0.17 types fail loudly. Each failure becomes a tracked item: verified-API rewrite (most `routes`/`admin.pages` shapes), or WS3 invented-API rework.
- CI canary against `emdash@latest`.

### WS2 — Sandboxed conversion (core, rsvp, importer)
- Author `emdash-plugin.jsonc` per plugin: slug, publisher DID (align with the Tender/Carte DID decision), license, security contact, capabilities as already declared (`content:read/write`, `media:read`, `email:send`, `network:request`), `allowedHosts` for importer (operator-supplied feed hosts — likely `network:request:unrestricted` with empty allowedHosts since import URLs are operator-typed; verify policy against 0.17 docs), `storage` (events/venues/organizers/RSVP collections from current inline declarations).
- Collapse each to `src/plugin.ts` bare default export `satisfies SandboxedPlugin`; drop the `createCorePlugin()`-style factories (`core/src/index.ts:25`) or keep them as thin named re-exports for tests only.
- Rename/segregate profiler `sandboxed.json` inputs (e.g. `profiler.config.json`) so they can't be mistaken for manifests; keep the sandbox-profiler tool but recalibrate budgets to measured 0.17 limits.
- `emdash-plugin build/validate/bundle` in CI; tarballs as artifacts.

### WS3 — Invented-API remediation

| Invented usage | Location | Replacement |
|---|---|---|
| `ctx.kv.atomicIncrement/Decrement` | `rsvp/src/capacity.ts:26-43` | Capacity counters move to the RSVP `storage` collection (D1 single-writer; unique constraint per event+attendee; count via query or maintained counter row with conflict retry). KV stays as the 1-hr occurrence cache only. Delete the feature-detect fallback path. |
| `ctx.cron.schedule()` + `plugin:activate` | `rsvp/src/hooks.ts:9-11`, `rsvp/src/index.ts:31-33` | Declare cron statically in the manifest/descriptor per verified `ctx.cron` shape; waitlist-promotion sweep becomes a fixed-schedule job; if dynamic schedules are genuinely needed, store next-run in storage and let a fixed cron poll it. |
| `ctx.waitUntil` / `after()` | `core/src/hooks.ts:18`, `rsvp/src/email.ts:6` | Whichever post-response primitive WS0 (Tender) confirmed; otherwise complete in-request. |
| Hook names behind casts (`content:beforeSave/afterSave/beforeDelete`) | all three `index.ts` | Verified 0.17 hook ids — likely confirmed, but registration shape must come from real types, not casts. |
| `hooks.email-events:register` in capability docs | `docs/capabilities-and-security.md` | Keep only if the verified capability table includes it for the way rsvp uses email; otherwise plain `email:send`. |
| Unused `network:request` on importer | `importer/src/index.ts:28` + zero fetch calls | Either implement remote-feed fetch via `ctx.http` (iCal URLs — probably the intent) or drop the capability. Capabilities are consent events; don't declare unused ones. |

### WS4 — Documentation truth pass
- README: rewrite "Getting started" around real install — marketplace one-click / tarball for sandboxed; `astro.config.mjs` `sandboxed: []` + `sandboxRunner` wiring; delete `emdash.config.ts` and `EMDASH_PLUGIN_MANIFEST_*` sections entirely; fix the architecture diagram's "trusted" labels; correct "Sandboxed" column to match post-WS2 reality.
- `docs/installation.md`, `docs/capabilities-and-security.md`, `docs/plugin-development.md`: same purge; replace budget numbers with measured values; document the real `ctx` surface only.
- Add `MIGRATION.md` (v0.1→v0.2): operators on the fictional install flow never actually had a working install, so frame it as "first real installation guide."

### WS5 — Reference site rebuild
- `examples/reference-site`: scaffold real EmDash (`emdash()` in astro.config.mjs, SQLite + local storage for dev, D1/R2 wrangler config for deploy), seed events/venues/organizers via `seed/seed.json`, install all three plugins sandboxed (workerd runner for Node dev), delete `src/lib/fixtures.js` in favor of `getEmDashCollection` through `@dateline/views`, exercise: month/week/day/list calendars, event detail, RSVP submit → capacity decrement → confirmation email (mock transport), iCal feed route, importer round-trip (export a TEC fixture, import it).
- This site doubles as the family's integration-test harness in CI (mirrors Tender's `harness/` pattern; reuse learnings, don't share infra).

### WS6 — Views/blocks alignment
- `@dateline/views`: bump emdash peer; re-verify `getEmDashCollection` option shapes and `ContentEntry` typing against 0.17/0.18; no architectural change. Note 0.18: entries fetched with `getEmDashEntry`/`getEmDashCollection` now include taxonomy terms inline (`entry.data.terms?.<taxonomy>`, typed in generated `emdash-env.d.ts`) — drop any separate `getEntryTerms()`-style lookups in views.
- `@dateline/blocks`: diff against current upstream Block Kit (`@emdash-cms/blocks@0.18.0` — package still exists under the same name, so this is a bump, not a migration) — keep only builders/validators that still add value over upstream typings; deprecate the rest.

### WS7 — Release
- Changesets minor bump to v0.2.0; CHANGELOG entries per package; CI green incl. reference-site e2e; tarball publish dry-run under the chosen DID.

## 4. Acceptance criteria

1. Three sandboxed plugins load under both sandbox runners; `emdash-plugin validate` green for all three in CI.
2. Grep gates: zero hits for `emdash.config.ts`, `EMDASH_PLUGIN_MANIFEST`, `atomicIncrement`, `atomicDecrement`, `plugin:activate`, `as unknown` on plugin definitions, "trusted" (plugin sense), `createCorePlugin` in docs.
3. Reference site runs `astro dev` (workerd sandbox) and `wrangler dev` with live EmDash data end-to-end; RSVP flow green including capacity + email; fixtures file deleted.
4. RSVP oversell test green under concurrent submissions.
5. Importer either fetches remote feeds via `ctx.http` or no longer declares `network:request`.
6. README install instructions executable verbatim by a new operator against a fresh `npm create emdash@latest` site.
7. No package pins `@emdash-cms/blocks@0.9.0`.

## 5. Risks & open questions

- **Static-only cron** would change waitlist-promotion latency semantics — document sweep interval; acceptable for v0.2.
- **Importer capability policy** (`network:request:unrestricted` vs operator-edited allowedHosts) affects the consent dialog UX — pick after reading the verified capability doc; prefer the narrower grant.
- ~~**`@emdash-cms/blocks` upstream churn** — if the package was renamed/absorbed post-0.13, WS6 becomes a migration rather than a bump; check npm before scheduling.~~ **Resolved 2026-06-11:** `@emdash-cms/blocks@0.18.0` ships under the same name in the 0.18.0 release train — WS6 is a bump.
- **Future ticketing** (the README's 1,500-seat theater story) will need payments — that lands post-Tender-M4 as a v0.3+ feature using the same consumer eventing contract as Carte; explicitly out of scope here so it doesn't creep in.

## 6. Milestones

1. **M1** — WS1 bump; casts eliminated; failure inventory triaged. *(Gated on Tender M0 platform-facts doc.)*
2. **M2** — WS2 conversion ×3 + WS3 remediation; oversell test green.
3. **M3** — WS5 reference site live on real EmDash; CI e2e wired.
4. **M4** — WS4 docs truth pass + WS6 alignment.
5. **M5** — WS7 release v0.2.0.
