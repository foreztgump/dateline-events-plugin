# Reference Site Spec

## ADDED Requirements

### Requirement: Astro Cloudflare reference app

`examples/reference-site` SHALL build as an Astro 6 app using `@astrojs/cloudflare` and a Workers `wrangler.jsonc` with `nodejs_compat`.

#### Scenario: Build and serve

- **WHEN** the package build and dev commands run
- **THEN** the root route renders a Dateline calendar view.

### Requirement: Seeded Dateline content

The app SHALL include at least 10 source events with a weekly recurring event, a venue+organizer event, an x402-priced event, a non-UTC timezone event, and an RSVP-required capacity-5 event.

#### Scenario: Events render in views

- **WHEN** `/events` and `/events/<slug>` are requested
- **THEN** Dateline view components render seeded content and detail pages include schema.org JSON-LD.

### Requirement: iCal and RSVP surfaces

The app SHALL expose `/events.ics` through core iCal behavior and an RSVP form that submits to a reference route returning confirmation.

#### Scenario: iCal download and RSVP confirmation

- **WHEN** `/events.ics` is requested
- **THEN** the response is an RFC 5545 calendar with VEVENT records.
- **WHEN** the RSVP form is submitted
- **THEN** a confirmation page is shown.
