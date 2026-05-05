# PRO-400 Tasks

- [x] Add manifest export with canonical resource:verb capabilities.
  - Acceptance: unit test asserts id, version, capabilities, and hooks.
- [x] Define events, venues, and organizers collection schemas.
  - Acceptance: unit test asserts all three slugs and 34 MVP event fields.
- [x] Implement content hooks.
  - Acceptance: tests cover timezone rejection, UTC normalization, end-after-start, RRULE validation, delete blocking, and `ctx.waitUntil`.
- [x] Implement route helpers.
  - Acceptance: tests cover iCal TZID/RRULE, range-filterable JSON feed, admin Block Kit validity, and privacy export/erase envelopes.
- [x] Implement schema.org helper.
  - Acceptance: test covers Event, Place, Organization, and Offer output.
- [x] Validate package quality gates.
  - Acceptance: `typecheck`, `lint`, `test`, `build`, and sandbox profile exit 0.
