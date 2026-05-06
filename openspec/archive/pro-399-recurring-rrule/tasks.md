# PRO-399 Tasks

- [x] Add required dependencies to `@dateline/recurring`.
  - Acceptance: package resolves `rrule@2.8.1` and `zod@4.4.2` from the recurring workspace.
- [x] Write Vitest coverage for RRULE validation.
  - Acceptance: valid weekly rule accepts; bogus tzid, missing `FREQ`, and invalid `FREQ` reject with structured errors.
- [x] Implement `validateRRule(rule, tzid)`.
  - Acceptance: parser performs timezone validation, FREQ preflight, and rrule parse check.
- [x] Write Vitest coverage for occurrence materialization.
  - Acceptance: range filtering, 2-year cap, EXDATE/RDATE, embedded EXDATE/RDATE, and DST behavior are asserted.
- [x] Implement `materializeOccurrences(input, cache?)`.
  - Acceptance: occurrences are UTC ISO strings; Los Angeles spring-forward keeps 09:00 wall time.
- [x] Add read-through KV cache support.
  - Acceptance: second call hits cache; `put` receives `expirationTtl: 3600`.
- [x] Run package validators.
  - Acceptance: `typecheck`, `lint`, `test`, `build`, and sandbox profiler exit 0.
