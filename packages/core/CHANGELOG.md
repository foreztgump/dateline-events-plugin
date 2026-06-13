# @dateline/core

## 0.2.0

### Minor Changes

- Convert `@dateline/core` to the EmDash 0.18 sandboxed plugin format: a single `src/plugin.ts` default-exporting a typed `SandboxedPlugin`, paired with a hand-authored `emdash-plugin.jsonc` manifest (capabilities `content:read` / `content:write`, admin Block Kit pages). Drops the legacy `definePlugin()` / factory-export shape and the invented `emdash.config.ts` / `EMDASH_PLUGIN_MANIFEST` surfaces. Data access goes exclusively through `ctx.content` / `ctx.storage` — no raw SQL or D1. Events, venues, organizers, calendar/iCal feeds, schema.org metadata, and GDPR export/erase helpers are preserved on the real platform.

### Patch Changes

- Updated dependencies
  - @dateline/blocks@0.2.0
  - @dateline/recurring@0.2.0

## 0.1.1

### Patch Changes

- [#33](https://github.com/foreztgump/dateline-events-plugin/pull/33) [`14934ff`](https://github.com/foreztgump/dateline-events-plugin/commit/14934ff9feefc1c5a14c37333235b915ef7c8423) Thanks [@foreztgump](https://github.com/foreztgump)! - Four v0.1.1 patch fixes:
  - PRO-480: invalidate cached calendar/iCal feeds via an inverted `event-cache-index:<kind>:<eventId>` map so range-keyed entries containing a mutated event are evicted on save.
  - PRO-478: `privacyExport`/`privacyErase` now filter events by `contactEmail` (was: `email`), matching the GDPR-relevant field on `dateline_events`.
  - PRO-481: recurring-event range filter derives each occurrence's end from the event's duration (`occurrence.startsAt + (event.endsAt - event.startsAt)`) instead of reusing the original series end for every occurrence.
  - PRO-492: range-keyed iCal feeds now render and index only events inside the requested range, preventing all-events cache poisoning; invalid recurrence durations are clamped to zero for range matching.

- Updated dependencies [[`b6ab30e`](https://github.com/foreztgump/dateline-events-plugin/commit/b6ab30e6e144f7a4be67a97f9b3ff09b0ce6e80d)]:
  - @dateline/recurring@0.1.1

## 0.1.0

### Minor Changes

- Ship the v0.1.0 core events plugin with event, venue, organizer, admin, iCal, calendar feed, schema.org, x402 metadata, and GDPR primitives.

### Patch Changes

- Updated dependencies []:
  - @dateline/blocks@0.1.0
  - @dateline/recurring@0.1.0
