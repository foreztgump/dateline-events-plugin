# Importer Specification

## ADDED Requirements

### Requirement: Sandboxed importer manifest

The importer plugin SHALL declare only `content:read`, `content:write`, and `network:request` capabilities and SHALL configure import-source hostnames through a whitelist setting.

#### Scenario: Manifest avoids unrestricted network

- **Given** the importer plugin is created
- **When** the manifest capabilities are inspected
- **Then** they are exactly `["content:read","content:write","network:request"]`
- **And** no capability is `network:request:unrestricted`

### Requirement: TEC migration

The TEC migrator SHALL convert TEC JSON exports into Dateline events, venues, and organizers while preserving source identifiers for idempotency.

#### Scenario: TEC fixture migrates completely

- **Given** a TEC JSON fixture with 50 event rows
- **When** the migrator parses the fixture
- **Then** it produces 50 `dateline_events` rows
- **And** timezone, RRULE, venue, organizer, category, tag, and custom field data are populated.

### Requirement: iCalendar import

The importer SHALL parse valid ICS data with `ical.js` and map each VEVENT into one Dateline event row.

#### Scenario: Recurring VEVENT is preserved

- **Given** an ICS file containing a recurring VEVENT with TZID, RRULE, and EXDATE
- **When** the iCal parser runs
- **Then** the output event has `timezone`, `recurrenceRule`, and `recurrenceExceptions` set.

### Requirement: CSV import

The importer SHALL accept explicit field mappings for CSV columns and collect row errors while importing valid rows.

#### Scenario: Partial CSV import

- **Given** a CSV with one valid mapped row and one invalid mapped row
- **When** the CSV importer runs
- **Then** the valid row is returned as an import row
- **And** the invalid row appears in `errors`.

### Requirement: Idempotent writes

The importer SHALL skip rows whose `sourceId` already exists unless update behavior is explicitly requested later.

#### Scenario: Re-import creates no duplicates

- **Given** a row with source ID `ical:launch`
- **When** it is imported twice
- **Then** the first import creates one event
- **And** the second import creates zero events and reports one skipped row.
