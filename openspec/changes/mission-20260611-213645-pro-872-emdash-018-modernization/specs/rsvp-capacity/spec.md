# Spec Delta: rsvp-capacity (race-safe without atomic KV)

## ADDED Requirements

### Requirement: Storage-backed capacity counters
RSVP capacity SHALL be enforced through the plugin `storage` collection (D1 single-writer): a unique constraint per event+attendee prevents duplicate RSVPs, and the available-count check uses query-count or a counter row with conflict retry. `ctx.kv` SHALL be used only for the 1-hour occurrence cache.

#### Scenario: Concurrent oversell attempt
- **WHEN** N concurrent RSVP submissions target an event with fewer than N remaining seats
- **THEN** exactly the remaining number succeed and the rest receive a capacity-full response, verified by an automated concurrent-submission test

#### Scenario: Duplicate RSVP
- **WHEN** the same attendee submits twice for the same event
- **THEN** the second submission is rejected by the unique constraint without double-counting capacity

### Requirement: Lifecycle-registered waitlist sweep
The waitlist-promotion sweep SHALL be registered via `ctx.cron.schedule()` inside `plugin:install` (idempotently re-asserted in `plugin:activate`) and consumed via the `cron` hook, discriminating on `event.name`. The sweep interval SHALL be documented as a latency semantic in user-facing docs.

#### Scenario: Promotion after cancellation
- **WHEN** a confirmed RSVP is cancelled and the sweep fires
- **THEN** the earliest waitlisted attendee is promoted and notified through the email pipeline (when a transport is registered)
