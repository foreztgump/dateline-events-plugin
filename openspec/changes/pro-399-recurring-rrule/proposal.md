# PRO-399 Recurring RRULE Handling

## Why

Dateline needs RFC 5545 recurrence support that avoids eager materialization while still preserving timezone-correct wall-clock behavior across DST. `@dateline/core`, `@dateline/views`, and later RSVP/importer flows need a small package API for validating stored RRULE strings and materializing bounded date ranges on read.

## What changes

- Add `rrule@2.8.1` and `zod@4.4.2` to `@dateline/recurring`.
- Export `validateRRule(rule, tzid)` with structured rejection codes for invalid timezone, missing `FREQ`, invalid `FREQ`, and malformed RRULE syntax.
- Export `materializeOccurrences(input, cache?)` with 2-year forward cap, EXDATE/RDATE handling, IANA timezone wall-clock preservation, and read-through KV cache support.
- Cache occurrence ranges under a SHA-256 key derived from rule, `dtstart`, `tzid`, range, EXDATE, and RDATE with a 1-hour TTL.

## Rollback plan

Revert this change directory plus the `packages/recurring` implementation and dependency additions. Downstream packages can continue to treat recurrence as unsupported until the API is restored.
