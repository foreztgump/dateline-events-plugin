# @dateline/recurring

Helper library (not a plugin) that extends Dateline events with RFC 5545 recurrence rules. Validates RRULE syntax, lazily materializes occurrences on-read with a 2-year forward cap, caches ranges in EmDash KV, and handles IANA timezone-aware DST transitions correctly.

## Install

```bash
pnpm add @dateline/recurring emdash@^0.9.0
```

## Peer dependencies

- `emdash@^0.9.0` — for KV caching and type definitions
- `rrule` — RFC 5545 recurrence rule parsing (peer dependency, must install separately)

```bash
pnpm add rrule
```

## Capabilities required

None directly; this is a helper library. However, plugins that use `@dateline/recurring` must declare `content:read` and `content:write` to work with Dateline events.

## Sandboxed?

❌ No. This is a helper library used by `@dateline/core` and sandboxed plugins. It has no plugin manifest.

## Usage

```ts
import { validateRRule, materializeOccurrences } from "@dateline/recurring";

// Validate an RRULE string
const validation = validateRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR");
if (!validation.ok) {
  console.error(validation.error); // message + code (e.g., "INVALID_FREQ")
}

// Materialize occurrences for a date range
const occurrences = await materializeOccurrences({
  rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=52",
  dtstart: "2026-05-05T19:00:00",
  tzid: "America/Los_Angeles",
  exdates: ["2026-06-08"],
  range: {
    start: new Date("2026-05-05"),
    end: new Date("2027-05-05"),
  },
  ctx, // EmDash context for KV access
});

occurrences.forEach((occ) => {
  console.log(occ.startsAt, occ.endsAt); // ISO8601 strings in UTC
});
```

## Key gotchas

**DST trap (critical):** RRULE must include `TZID` parameter to handle DST correctly. Without it, occurrences will drift during DST transitions.

```ts
// ✅ Correct: RRULE with TZID
const rrule = "FREQ=WEEKLY;BYDAY=MO;TZID=America/New_York";

// ❌ Wrong: RRULE without TZID will miss DST transitions
const rrule = "FREQ=WEEKLY;BYDAY=MO";
```

Source: `rrule.js` Issue #501 — timezone-aware recurrences require explicit TZID.

**2-year cap:** By default, occurrences are capped at 2 years forward. This protects against expensive computations on very long-running series (e.g., daily events for 20+ years).

**KV caching:** Materialized occurrence ranges are cached in KV with a 1-hour TTL, keyed by series ID and date range hash. If you modify an event's RRULE, the cache is automatically invalidated by `@dateline/core`'s `content:afterSave` hook.

**Exceptions:** EXDATE (excluded dates) and RDATE (appended dates) are supported. Store them as an array of ISO8601 strings on the parent event.

## See also

- [Root README](../../README.md) — architecture overview
- [Plugin development](/docs/plugin-development.md) — RRULE patterns and testing
