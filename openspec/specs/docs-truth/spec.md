# docs-truth Specification

## Purpose
TBD - created by archiving change mission-20260611-213645-pro-872-emdash-018-modernization. Update Purpose after archive.
## Requirements
### Requirement: Fictional surfaces purged
README and `docs/` SHALL contain no references to `emdash.config.ts`, `EMDASH_PLUGIN_MANIFEST_*` wrangler vars, the pre-v0.13 "Free plan runs as trusted" format×mode model, or any `ctx` API absent from `VERIFIED-PLATFORM-0.18.md`. Install documentation SHALL describe the real flow: marketplace one-click / tarball for sandboxed plugins, `astro.config.mjs` `sandboxed: []` + `sandboxRunner` wiring.

#### Scenario: Fresh-operator install
- **WHEN** a new operator follows README install instructions verbatim against a fresh `npm create emdash@latest` site
- **THEN** all three plugins install and load successfully

### Requirement: Migration guide
A `MIGRATION.md` SHALL document v0.1 → v0.2, framed as the first real installation guide (v0.1's documented flow never worked), covering the manifest-based install, capability consent, and the waitlist-sweep latency semantics.

#### Scenario: v0.1 operator upgrades
- **WHEN** an operator on v0.1.x reads MIGRATION.md
- **THEN** they can reach a working v0.2.0 install without consulting any other source

### Requirement: Views/blocks alignment
`@dateline/views` SHALL read taxonomy terms inline from `entry.data.terms` (dropping separate term lookups) and type against 0.18 `ContentEntry`. `@dateline/blocks` SHALL build on `@emdash-cms/blocks@0.18.0`, retaining only builders/validators that add value over upstream typings.

#### Scenario: Views typecheck
- **WHEN** the workspace typechecks against emdash 0.18 types
- **THEN** views and blocks compile with no casts and no 0.9-era type references

