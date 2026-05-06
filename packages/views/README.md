# @dateline/views

Native Astro component library for Dateline themes. Provides calendar (month, week, day, agenda, list), event cards, event details, venue maps, and organizer cards. Renders on the theme's Astro runtime; does not run sandboxed. Integrates with EmDash's content API for live event data.

## Install

```bash
pnpm add @dateline/views @dateline/core astro emdash@^0.9.0
```

## Peer dependencies

- `astro@>=6.0.0` — Astro framework (required)
- `@astrojs/cloudflare@>=13.3.0` — Cloudflare Workers integration for Astro
- `emdash@^0.9.0` — EmDash CMS runtime
- `@dateline/core` — event schemas (peer dependency for types)
- `react@>=19.2.3` — React (for some interactive components)
- `tailwindcss@3.x` — Tailwind CSS (optional but recommended for styled components)

## Capabilities required

None directly; this is a helper library. It consumes event data via EmDash's public `getEmDashCollection()` API.

## Sandboxed?

❌ No. This is a trusted Astro library that renders at build time and on-demand at the edge via `@astrojs/cloudflare`. It is not a plugin and has no manifest.

## Usage

### Basic calendar view

```astro
---
import { getEmDashCollection } from "emdash";
import { CalendarMonth } from "@dateline/views";

const { entries: events } = await getEmDashCollection("dateline_events", {
  filter: { startsAt: { gte: new Date() } },
  sort: { startsAt: "asc" },
  limit: 365,
});
---

<CalendarMonth events={events} />
```

### Event list and detail

```astro
---
import { CalendarList, EventDetail } from "@dateline/views";

const { entries: events } = await getEmDashCollection("dateline_events", {
  filter: { status: "live" },
  sort: { startsAt: "asc" },
});
---

<CalendarList events={events} />

<!-- Or single event detail -->
{events.length > 0 && (
  <EventDetail event={events[0]} />
)}
```

### Headless components (unstyled)

All components ship styled variants (using Tailwind) and headless variants (no styling) for custom theming:

```astro
---
import { CalendarMonthHeadless, EventCardHeadless } from "@dateline/views";
---

<div class="my-custom-styles">
  <CalendarMonthHeadless events={events} />
</div>
```

### Live collections (Astro content)

For editor preview mode, wire events through Astro's live collections API:

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { emdashLoader } from "@dateline/views";

export const collections = {
  events: defineCollection({
    loader: emdashLoader({ collection: "dateline_events" }),
    schema: z.object({ /* ... */ }),
  }),
};
```

Then reference in your Astro pages:

```astro
---
import { getCollection } from "astro:content";

const events = await getCollection("events");
---
```

## Key gotchas

**RSVP and ticketing components:** If `@dateline/rsvp` or commercial add-ons are installed, additional components are available:

- `<RsvpForm>` — public form to submit an RSVP
- `<TicketSelector>` — interface to select ticket tiers and quantities
- `<SeatPicker>` — interactive seat-map picker (when seats add-on is active)

They're imported the same way:

```astro
import { RsvpForm, TicketSelector, SeatPicker } from "@dateline/views";
```

**Timezone display:** Events are stored in UTC. Components automatically display start/end times in the viewer's local timezone (via `Intl.DateTimeFormat`). To override, pass `timezone="America/Los_Angeles"` to calendar components.

**Styling and dependencies:** Styled components require Tailwind CSS. If you don't have it, either add it to your Astro project or use the headless variants and write your own styles.

**Performance:** Calendar views are edge-cached by `@astrojs/cloudflare` for up to 60 seconds. If you need real-time event updates, lower the cache TTL in your `astro.config.mjs`.

## See also

- [Root README](../../README.md) — architecture overview
- [Reference site](../../examples/reference-site) — full working theme example
- [Installation guide](/docs/installation.md) — Astro + Cloudflare Workers setup
