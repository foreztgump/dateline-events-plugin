# Recurring Capability Spec

## ADDED Requirements

### Requirement: Validate RRULE strings before event save

Dateline SHALL expose `validateRRule(rule, tzid)` for downstream save hooks.

#### Scenario: Valid rule accepted

- **GIVEN** `FREQ=WEEKLY;BYDAY=MO;COUNT=2`
- **AND** timezone `America/Los_Angeles`
- **WHEN** the rule is validated
- **THEN** validation returns `{ ok: true }`

#### Scenario: Bad timezone rejected

- **GIVEN** a syntactically valid RRULE
- **AND** timezone `Mars/Olympus_Mons`
- **WHEN** the rule is validated
- **THEN** validation returns `{ ok: false, code: "INVALID_TZID" }`

#### Scenario: Missing FREQ rejected

- **GIVEN** `BYDAY=MO;COUNT=2`
- **WHEN** the rule is validated
- **THEN** validation returns `{ ok: false, code: "MISSING_FREQ" }`

#### Scenario: Invalid FREQ rejected

- **GIVEN** `FREQ=SOMEDAY;COUNT=2`
- **WHEN** the rule is validated
- **THEN** validation returns `{ ok: false, code: "INVALID_FREQ" }`

### Requirement: Materialize recurring occurrences lazily

Dateline SHALL materialize occurrences for a requested date range without eagerly storing occurrence rows.

#### Scenario: Range-limited materialization

- **GIVEN** a weekly Monday RRULE starting in May 2026
- **WHEN** occurrences are materialized for May 2026
- **THEN** only May occurrences are returned as UTC ISO strings

#### Scenario: Two-year forward cap

- **GIVEN** an unbounded weekly RRULE
- **WHEN** occurrences are requested for a 10-year range
- **THEN** no more than two years of weekly occurrences are returned

#### Scenario: EXDATE and RDATE applied

- **GIVEN** an RRULE with explicit excluded and included dates
- **WHEN** occurrences are materialized
- **THEN** excluded dates are absent and included dates are present

### Requirement: Cache materialized ranges in KV

Dateline SHALL support read-through KV caching for materialized occurrence ranges.

#### Scenario: Cache hit on repeated request

- **GIVEN** a cache object implementing `get` and `put`
- **WHEN** the same materialization input is called twice
- **THEN** the second call reads from the cached JSON
- **AND** cache writes use a 3600 second TTL

### Requirement: Preserve wall-clock time across DST

Dateline SHALL preserve event-local wall-clock time for IANA timezones.

#### Scenario: Los Angeles spring-forward

- **GIVEN** a weekly 09:00 America/Los_Angeles rule spanning March 2026
- **WHEN** occurrences are materialized
- **THEN** each occurrence formats to 09:00 in America/Los_Angeles
- **AND** UTC offsets change from 17:00Z to 16:00Z after DST starts
