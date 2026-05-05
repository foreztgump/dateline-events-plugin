# PRO-400 Core Foundation Plugin

## Why

Dateline needs a sandboxed foundation plugin that owns the canonical event, venue, and organizer content surfaces. RSVP, recurring, importer, views, and the reference site all depend on these stable schemas and route contracts.

## What Changes

- Add `@dateline/core` manifest metadata for `dateline-core` with `content:read`, `content:write`, and `media:read`.
- Export collection schemas for `dateline_events`, `dateline_venues`, and `dateline_organizers`.
- Add lifecycle hooks for event time validation, RRULE validation, cache invalidation via `ctx.waitUntil`, and attendee-aware delete blocking.
- Add calendar JSON, iCal, Block Kit admin, GDPR export/erase, and schema.org helper surfaces.

## Rollback

Revert the PRO-400 feature commit to return `@dateline/core` to the prior package stub. No migration is required because this change only introduces package code and tests.
