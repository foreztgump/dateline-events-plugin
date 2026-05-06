# @dateline/rsvp

## 0.1.1

### Patch Changes

- [#30](https://github.com/foreztgump/dateline-events-plugin/pull/30) [`238f86c`](https://github.com/foreztgump/dateline-events-plugin/commit/238f86c526eb13d4c1536c08d77e5a8ebcaaf5f7) Thanks [@foreztgump](https://github.com/foreztgump)! - Canonicalize the capacity lock key in the fallback (non-atomic KV) path so reserve and release for the same event share a lock, preventing counter drift under concurrency. Clean up capacity lock map entries by comparing the inserted chained promise, preventing unbounded lock map growth after reserve/release cycles complete. [PRO-488, PRO-491]

## 0.1.0

### Minor Changes

- Ship the v0.1.0 RSVP plugin with zero-price registrations, atomic capacity handling, waitlists, confirmation email deferral, and admin Block Kit routes.

### Patch Changes

- Updated dependencies []:
  - @dateline/blocks@0.1.0
