# PRO-395 Reference Site

## Why

Dateline v0.1 needs a concrete Astro reference site that demonstrates the shipped plugin family with realistic seeded content and Cloudflare Workers deployment configuration.

## What changes

- Convert `examples/reference-site` from a TypeScript stub into an Astro 6 site.
- Register the Cloudflare adapter and Dateline view package dependencies.
- Seed events, venues, and organizers covering RSVP, recurrence, timezone, venue/organizer, and x402 cases.
- Add pages for the landing calendar, event list, event detail, RSVP confirmation, local RSVP handling, and iCal output through core.

## Impact

The reference site becomes the milestone 4 validation surface for calendar render, RSVP form behavior, schema.org JSON-LD, and downloadable iCal.
