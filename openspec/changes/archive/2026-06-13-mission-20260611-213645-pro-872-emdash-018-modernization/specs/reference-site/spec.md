# Spec Delta: reference-site (real EmDash integration)

## ADDED Requirements

### Requirement: Real EmDash site
`examples/reference-site` SHALL run the `emdash()` Astro integration with all three Dateline plugins installed via `sandboxed: []` (default imports) and a configured `sandboxRunner` (workerd for dev, Cloudflare for deploy). Static fixtures (`src/lib/fixtures.js`) SHALL be deleted; all pages render live `getEmDashCollection`/`getEmDashEntry` data through `@dateline/views`.

#### Scenario: Dev mode end-to-end
- **WHEN** `astro dev` runs with SQLite + local storage + workerd sandbox
- **THEN** month/week/day/list calendars, event detail, RSVP submit → capacity decrement → confirmation email (mock transport), iCal feed, and importer round-trip all function against seeded data

#### Scenario: Deploy mode
- **WHEN** `wrangler dev` runs with D1 + R2 configuration
- **THEN** the same flows function end-to-end

### Requirement: CI e2e harness
The reference site SHALL serve as the family's integration-test harness: a CI job seeds the site, starts it, and runs Playwright e2e covering the scenario flows above, blocking merge on failure from M3 onward.

#### Scenario: Regression in a plugin route
- **WHEN** a change breaks the RSVP submit route
- **THEN** the e2e job fails and blocks the PR
