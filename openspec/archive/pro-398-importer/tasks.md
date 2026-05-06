# PRO-398 Importer Tasks

- [x] Define importer manifest and admin Block Kit routes.
  - Acceptance: manifest declares exact capabilities and no unrestricted network capability.
  - Tests: `packages/importer/src/index.test.ts`.
- [x] Add iCal parser via `ical.js`.
  - Acceptance: VEVENT DTSTART/DTEND/SUMMARY/RRULE/TZID/EXDATE map to Dateline event rows.
  - Error handling: parse failures surface as per-source structured errors.
- [x] Add CSV parser with explicit field mapping.
  - Acceptance: mapped rows create events; bad rows are collected while valid rows continue.
  - Error handling: row-level failures do not abort the batch.
- [x] Add TEC JSON migrator.
  - Acceptance: a 50-event fixture maps to 50 Dateline event rows with venue, organizer, timezone, recurrence, taxonomy, and custom field data.
  - Error handling: malformed rows are returned as row errors.
- [x] Add idempotent writer.
  - Acceptance: re-import with identical `sourceId` values creates zero duplicate events.
  - Error handling: `ctx.content` failures become row-level errors with partial success preserved.
- [x] Run scoped validators and sandbox profiler.
  - Acceptance: typecheck, lint, test, build, and sandbox profiling exit 0.
