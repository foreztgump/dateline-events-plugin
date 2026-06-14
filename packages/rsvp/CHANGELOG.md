# @dateline/rsvp

## 0.3.0

### Minor Changes

- First public npm release (v0.3.0). All six packages are now published to the npm registry under the `@dateline` scope with public access. Adds npm publish metadata (`repository`, `homepage`, `bugs`, `description`, `keywords`) required for provenance and discovery, and a tagged release workflow that publishes on `v*` tags. No API changes — this promotes the v0.2.0 developer preview to an installable release.

### Patch Changes

- Updated dependencies []:
  - @dateline/blocks@0.3.0

## 0.2.0

### Minor Changes

- Convert `@dateline/rsvp` to the EmDash 0.18 sandboxed format and rework capacity off the invented atomic-KV primitive. Capacity now lives in the `rsvps` storage collection as `claim` records with conflict-retry admission semantics; KV is no longer used for counters. Cron is registered via `ctx.cron.schedule()` in the `plugin:install` / `plugin:activate` lifecycle hooks and consumed through the real `cron` hook, with both the waitlist-promotion and hold-expiry/rate-limit-purge sweeps capped to stay inside the 10-subrequest sandbox budget. Boundary/unexpected route errors now surface as `500` instead of being masked as `4xx`. Confirmation email is delivered via a registered `email:deliver` transport.

### Patch Changes

- Updated dependencies
  - @dateline/blocks@0.2.0

## 0.1.1

### Patch Changes

- [#30](https://github.com/foreztgump/dateline-events-plugin/pull/30) [`238f86c`](https://github.com/foreztgump/dateline-events-plugin/commit/238f86c526eb13d4c1536c08d77e5a8ebcaaf5f7) Thanks [@foreztgump](https://github.com/foreztgump)! - Canonicalize the capacity lock key in the fallback (non-atomic KV) path so reserve and release for the same event share a lock, preventing counter drift under concurrency. Clean up capacity lock map entries by comparing the inserted chained promise, preventing unbounded lock map growth after reserve/release cycles complete. [PRO-488, PRO-491]

## 0.1.0

### Minor Changes

- Ship the v0.1.0 RSVP plugin with zero-price registrations, atomic capacity handling, waitlists, confirmation email deferral, and admin Block Kit routes.

### Patch Changes

- Updated dependencies []:
  - @dateline/blocks@0.1.0
