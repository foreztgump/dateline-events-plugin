# PRO-396 — @dateline/views native Astro package

## Why

Dateline needs frontend Astro components because theme rendering happens in the user's trusted Astro project, not inside sandboxed plugin workers. The package provides reusable calendar, event-detail, RSVP, venue, and organizer views backed by Dateline core event data.

## What changes

- Ship styled Tailwind-default Astro components and parallel headless variants from `@dateline/views`.
- Add month, week, day, list, agenda, event card/detail/hero, RSVP, venue, and organizer components.
- Wire EventDetail JSON-LD through `@dateline/core` schema.org helper.
- Export `emdashLoader({ collection })` for Astro live collection integration.

## Impact

The reference site can consume one native package for Dateline frontend rendering while preserving theme-level control through headless variants.
