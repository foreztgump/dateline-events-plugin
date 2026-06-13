# plugin-platform Specification

## Purpose
TBD - created by archiving change mission-20260611-213645-pro-872-emdash-018-modernization. Update Purpose after archive.
## Requirements
### Requirement: Verified platform facts document
The repo SHALL contain `VERIFIED-PLATFORM-0.18.md` recording empirically probed answers for every platform fact marked UNRESOLVED in `research/emdash-0.18-research-2026-06-11.md`, including workerd-runner per-invocation limits and offline plugin-cli behavior.

#### Scenario: Unresolved fact needed during implementation
- **WHEN** a workstream needs a platform fact not covered by the research report
- **THEN** the fact is resolved by probe and recorded in `VERIFIED-PLATFORM-0.18.md` before code depends on it

### Requirement: Sandboxed plugin format
`@dateline/core`, `@dateline/rsvp`, and `@dateline/importer` SHALL each ship an `emdash-plugin.jsonc` manifest (slug, publisher, license, author, security, capabilities, allowedHosts, storage, admin as applicable) and a single `src/plugin.ts` whose default export uses the M0-verified TS2742-safe shape: `import type { SandboxedPlugin } from "emdash/plugin"; const plugin: SandboxedPlugin = {...}; export default plugin;`.

#### Scenario: CLI validation
- **WHEN** `emdash-plugin validate` runs against any of the three plugins in CI
- **THEN** validation passes with zero errors

#### Scenario: Loading under sandbox runners
- **WHEN** the reference site starts with the three plugins in `sandboxed: []` under the workerd runner (dev) or Cloudflare runner (deploy)
- **THEN** all three plugins load and serve their hooks and routes

### Requirement: No invented runtime APIs
Plugin code SHALL only call APIs present on the verified 0.18 `PluginContext`. `ctx.kv.atomicIncrement`/`atomicDecrement` calls and their feature-detect fallbacks SHALL be removed. `as unknown` casts on plugin definitions SHALL be eliminated.

#### Scenario: Grep gates
- **WHEN** CI greps the repo for `emdash.config.ts`, `EMDASH_PLUGIN_MANIFEST`, `atomicIncrement`, `atomicDecrement`, `as unknown` on plugin definitions, "trusted" (plugin sense), `createCorePlugin` in docs
- **THEN** zero hits are found

### Requirement: Dependency baseline
All packages SHALL declare `emdash` peer `^0.18` and consume `@emdash-cms/blocks@^0.18.0`; no package pins `@emdash-cms/blocks@0.9.0`. CI SHALL run a non-blocking canary against `emdash@latest`.

#### Scenario: Canary detects upstream minor
- **WHEN** a new emdash minor is published to npm `latest`
- **THEN** the canary job surfaces typecheck/build failures without blocking main CI

