# @dateline/blocks

## 0.3.0

### Minor Changes

- First public npm release (v0.3.0). All six packages are now published to the npm registry under the `@dateline` scope with public access. Adds npm publish metadata (`repository`, `homepage`, `bugs`, `description`, `keywords`) required for provenance and discovery, and a tagged release workflow that publishes on `v*` tags. No API changes — this promotes the v0.2.0 developer preview to an installable release.

## 0.2.0

### Minor Changes

- Rebase the Block Kit facade onto `@emdash-cms/blocks@0.18`. Typed builders and the `validateBlocks()` / `assertResponse()` envelope guards now track the 0.18 block + element surface, and `entry.data.terms` is inlined at the call sites that consume it. `BlockResponse` is imported type-only from the package root so the runtime `validateBlocks` import stays on the `/server` subpath.

## 0.1.0

### Minor Changes

- Ship the v0.1.0 Dateline Block Kit facade with typed builders, `validateBlocks()`, and `assertResponse()` runtime guards for plugin admin responses.
