# @dateline/core

The foundational sandboxed plugin for Dateline. Defines the canonical event content type (`dateline_events`), manages venues and organizers, provides calendar feeds (JSON + iCal), generates schema.org JSON-LD for search engines, and exposes Block Kit admin UIs. All other Dateline packages build on this core.

## Install

```bash
pnpm add @dateline/core emdash@^0.18.0
```

## Peer dependencies

- `emdash@^0.18.0` — EmDash CMS runtime

## Capabilities required

This sandboxed plugin declares these capabilities:

- `content:read` — fetch events, venues, organizers
- `content:write` — create, update, delete events and metadata

## Sandboxed?

✅ Yes. Runs in Cloudflare Workers Dynamic Worker sandbox (Paid plan required; Free plan runs as trusted).

**Budget:** 50ms CPU + 10 subrequests per invocation. Core handlers stay well under this by using fast KV caches and edge-cached feeds.

## Usage

```ts
import datelineCore from "@dateline/core";
import { adminHandlers, afterSave } from "@dateline/core";

export default {
  sandboxed: [datelineCore],
};

// Or manually for testing:
console.log(datelineCore.capabilities); // ["content:read", "content:write"]
```

### Routes

Core exposes these routes at `/_emdash/api/plugins/dateline-core/{route}`:

- `calendar-feed` — JSON list of events (supports filtering by date range)
- `ical` — iCalendar feed (consumable by any calendar app)
- `admin/events`, `admin/venues`, `admin/organizers`, `admin/settings` — Block Kit admin UIs
- `privacy/export`, `privacy/erase` — GDPR compliance helpers

### Collections

Core defines the canonical collections via seed migrations:

- `dateline_events` — events with title, description, time, location, capacity, organizer refs
- `dateline_venues` — physical locations with address, geo, capacity
- `dateline_organizers` — event organizers with contact info and bio

All stored in UTC; display times are computed per viewer's IANA timezone.

## Key gotchas

**Timezone trap:** All datetime fields are stored UTC. The event's declared `timezone` (e.g., "America/Los_Angeles") is used only for display and RRULE computations. Time math is always UTC-first.

**GDPR compliance:** When an event or attendee is deleted, `content:beforeDelete` and `content:afterDelete` hooks trigger. Core implements `/privacy/export` and `/privacy/erase` routes. If you integrate other Dateline plugins, ensure they handle deletions gracefully.

**Schema.org SEO:** Event detail pages auto-generate JSON-LD markup. Ensure `featuredImage` and `organizers` are populated for best search visibility.

## See also

- [Root README](../../README.md) — architecture overview
- [Capabilities & security](/docs/capabilities-and-security.md) — EmDash capability model
- [Plugin development](/docs/plugin-development.md) — hook patterns and testing
