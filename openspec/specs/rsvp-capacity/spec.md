# rsvp-capacity Specification

## Purpose
TBD - created by archiving change mission-20260611-213645-pro-872-emdash-018-modernization. Update Purpose after archive.
## Requirements
### Requirement: Storage-backed capacity counters
RSVP capacity SHALL be enforced through the plugin `storage` collection (D1 single-writer): duplicate event+attendee RSVPs are rejected by an explicit application-level conflict check, and the available-count check uses query-count or a counter row with conflict retry. Manifests SHALL still declare event+attendee `uniqueIndexes` as production-backend defense in depth, but correctness MUST NOT rely on unique-index conflicts because the M0 probe verified local workerd does not enforce them. `ctx.kv` SHALL be used only for the 1-hour occurrence cache.

#### Scenario: Concurrent oversell attempt
- **WHEN** N concurrent RSVP submissions target an event with fewer than N remaining seats
- **THEN** exactly the remaining number succeed and the rest receive a capacity-full response, verified by an automated concurrent-submission test

#### Scenario: Duplicate RSVP
- **WHEN** the same attendee submits twice for the same event
- **THEN** the second submission is rejected by the application-level duplicate check without double-counting capacity, even if the local storage backend accepts duplicate rows for declared `uniqueIndexes`

### Requirement: Lifecycle-registered waitlist sweep
The waitlist-promotion sweep SHALL be registered via `ctx.cron.schedule()` inside `plugin:install` (idempotently re-asserted in `plugin:activate`) when `ctx.cron` is available, and consumed via the `cron` hook, discriminating on `event.name`. The integrated reference site SHALL verify schedule persistence before downstream code depends on the sweep, because M0 verified the local workerd harness invokes lifecycle hooks but does not expose `ctx.cron` or persist cron rows there. The sweep interval SHALL be documented as a latency semantic in user-facing docs.

#### Scenario: Promotion after cancellation
- **WHEN** a confirmed RSVP is cancelled and the sweep fires
- **THEN** the earliest waitlisted attendee is promoted and notified through the email pipeline (when a transport is registered)

