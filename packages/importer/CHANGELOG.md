# @dateline/importer

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
