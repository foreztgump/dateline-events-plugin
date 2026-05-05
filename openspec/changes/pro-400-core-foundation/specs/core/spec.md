# Core Plugin Specification

## Manifest

### Scenario: core plugin declares sandbox capabilities

Given `@dateline/core` is imported
When the default export is invoked
Then the manifest id is `dateline-core`
And the capabilities are exactly `content:read`, `content:write`, and `media:read`.

## Collections

### Scenario: foundation content schemas exist

Given the core collection exports
When validators inspect the schemas
Then `dateline_events`, `dateline_venues`, and `dateline_organizers` are present
And `dateline_events` includes the 34 convergence MVP fields.

## Hooks

### Scenario: event saves normalize and validate time

Given a `dateline_events` content save
When `content:beforeSave` runs
Then invalid IANA timezones are rejected
And `startsAt` and `endsAt` are normalized to UTC ISO strings
And `endsAt <= startsAt` is rejected
And RRULE strings are delegated to `@dateline/recurring`.

### Scenario: event deletes protect attendees

Given a `dateline_events` delete
When matching `dateline_attendees` rows exist
Then `content:beforeDelete` rejects the delete with a structured error.

### Scenario: cache invalidation is deferred correctly

Given a `dateline_events` save completes
When `content:afterSave` runs
Then cache invalidation is passed to `ctx.waitUntil`.

## Routes

### Scenario: feeds expose event data

Given published event content exists
When `/calendar-feed` is requested with a date range
Then the JSON response contains matching events.
When `/ical` is requested
Then the response is RFC 5545-style iCal text with TZID and RRULE lines.

### Scenario: admin and privacy primitives work

Given admin pages are requested
When the four admin handlers render
Then each response passes `validateBlocks()`.
Given a privacy email query
When export or erase is requested
Then a structured JSON envelope is returned.

## schema.org

### Scenario: event JSON-LD is generated

Given an event with venue, organizer, and x402 price metadata
When `eventToJsonLd()` runs
Then it emits `Event`, `Place`, `Organization`, and `Offer` objects using schema.org context.
