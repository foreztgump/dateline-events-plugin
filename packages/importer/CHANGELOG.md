# @dateline/importer

## 0.3.0

### Minor Changes

- First public npm release (v0.3.0). All six packages are now published to the npm registry under the `@dateline` scope with public access. Adds npm publish metadata (`repository`, `homepage`, `bugs`, `description`, `keywords`) required for provenance and discovery, and a tagged release workflow that publishes on `v*` tags. No API changes — this promotes the v0.2.0 developer preview to an installable release.

### Patch Changes

- Updated dependencies []:
  - @dateline/core@0.3.0
  - @dateline/blocks@0.3.0

## 0.2.0

### Minor Changes

- Convert `@dateline/importer` to the EmDash 0.18 sandboxed format. Remote feed fetches (TEC, iCal, CSV, JSON) now go through the single network exit `ctx.http.fetch`, gated by the manifest `network:request` capability and `allowedHosts`. Deferred feeds are persisted and drained across invocations rather than held in memory, and idempotent source IDs plus partial error reporting are preserved on the real platform.

### Patch Changes

- Updated dependencies
  - @dateline/blocks@0.2.0
  - @dateline/core@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`14934ff`](https://github.com/foreztgump/dateline-events-plugin/commit/14934ff9feefc1c5a14c37333235b915ef7c8423)]:
  - @dateline/core@0.1.1

## 0.1.0

### Minor Changes

- Ship the v0.1.0 importer plugin with TEC migration, iCal, CSV, and JSON import paths, idempotent source IDs, allowed-host controls, and partial error reporting.

### Patch Changes

- Updated dependencies []:
  - @dateline/blocks@0.1.0
  - @dateline/core@0.1.0
