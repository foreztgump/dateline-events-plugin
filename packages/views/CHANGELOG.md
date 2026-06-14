# @dateline/views

## 0.3.0

### Minor Changes

- First public npm release (v0.3.0). All six packages are now published to the npm registry under the `@dateline` scope with public access. Adds npm publish metadata (`repository`, `homepage`, `bugs`, `description`, `keywords`) required for provenance and discovery, and a tagged release workflow that publishes on `v*` tags. No API changes — this promotes the v0.2.0 developer preview to an installable release.

### Patch Changes

- Updated dependencies []:
  - @dateline/core@0.3.0

## 0.2.0

### Minor Changes

- Update the trusted Astro view package for EmDash 0.18. Calendar and event components consume `getEmDashCollection` against the real platform, and `entry.data.terms` is read inline from the collection entry rather than via a removed helper. Timezone-aware formatters and `safeHref()` sanitization carry forward unchanged.

### Patch Changes

- Updated dependencies
  - @dateline/core@0.2.0

## 0.1.1

### Patch Changes

- [#31](https://github.com/foreztgump/dateline-events-plugin/pull/31) [`58c2319`](https://github.com/foreztgump/dateline-events-plugin/commit/58c23199f3d943f338f4618ed559d542f26c0361) Thanks [@foreztgump](https://github.com/foreztgump)! - Sanitize external `href` values via `safeHref()` in OrganizerCard, OrganizerCardHeadless, VenueMap, and VenueMapHeadless to block `javascript:` / `data:` / `vbscript:` XSS through CMS-controlled organizer/venue website fields, and pass `event.timezone` (defaulting to `UTC`) into `Intl.DateTimeFormat` in `formatEventTimeRange` / `formatEventDateTime` so rendered times reflect the event timezone instead of the host. Invalid CMS-stored timezone strings now fall back to `UTC` instead of crashing view rendering. [PRO-482, PRO-479, PRO-493]

- Updated dependencies [[`14934ff`](https://github.com/foreztgump/dateline-events-plugin/commit/14934ff9feefc1c5a14c37333235b915ef7c8423)]:
  - @dateline/core@0.1.1

## 0.1.0

### Minor Changes

- Ship the v0.1.0 native Astro component package with calendar views, event presentation components, RSVP form, venue/organizer helpers, headless variants, and live collection wiring.

### Patch Changes

- Updated dependencies []:
  - @dateline/core@0.1.0
