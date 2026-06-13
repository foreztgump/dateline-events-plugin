# @dateline/blocks

## 0.2.0

### Minor Changes

- Rebase the Block Kit facade onto `@emdash-cms/blocks@0.18`. Typed builders and the `validateBlocks()` / `assertResponse()` envelope guards now track the 0.18 block + element surface, and `entry.data.terms` is inlined at the call sites that consume it. `BlockResponse` is imported type-only from the package root so the runtime `validateBlocks` import stays on the `/server` subpath.

## 0.1.0

### Minor Changes

- Ship the v0.1.0 Dateline Block Kit facade with typed builders, `validateBlocks()`, and `assertResponse()` runtime guards for plugin admin responses.
