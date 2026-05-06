# Dateline

## 0.1.1 — 2026-05-06

Audit-driven release: pr-agent surfaced all defects in two passes (r1 → fix-up → r2).

- `@dateline/core` — calendar feed cache invalidation via inverted index (PRO-480), privacy export/erase filters by `contactEmail` (PRO-478), recurrence range derives per-occurrence end from event duration (PRO-481), iCal range filter renders only in-range events (PRO-492), KV non-atomic invariant documented in code with v0.1.2 follow-up tracked (PRO-495).
- `@dateline/recurring` — offset-less ISO values interpreted as wall time in supplied tzid for host-tz determinism (PRO-483), `extractTzidParam` walks `;`-separated iCal property params instead of splitting on `TZID=` (PRO-489), TZID param name compared case-insensitively (PRO-494).
- `@dateline/rsvp` — capacity lock key canonicalized in fallback non-atomic KV path so reserve/release share a lock (PRO-488), lock map cleanup compares the inserted chained promise to prevent unbounded growth (PRO-491).
- `@dateline/views` — `Intl.DateTimeFormat` receives `event.timezone` (default `UTC`) so rendered times reflect the event timezone (PRO-479), `safeHref()` blocks `javascript:`/`data:`/`vbscript:` XSS in OrganizerCard/VenueMap (PRO-482), invalid CMS-stored timezone strings fall back to `UTC` instead of crashing rendering (PRO-493).
- `docs` — manifest variable corrections (PRO-484), atomic-KV example (PRO-485), `process.env` on Workers note (PRO-486), secrets-in-vars warning (PRO-487), subrequest claim correction (PRO-490).

## 0.1.0 — 2026-05-05

Dateline v0.1.0 ships the foundational EmDash 0.9 plugin family and reference showcase:

- `@dateline/blocks` — typed Block Kit builders plus `validateBlocks()` and `assertResponse()` guards.
- `@dateline/core` — events, venues, organizers, admin routes, calendar feed, iCal, schema.org, x402 metadata, and GDPR helpers.
- `@dateline/recurring` — RRULE validation, timezone-aware occurrence materialization, EXDATE/RDATE handling, and KV cache helpers.
- `@dateline/rsvp` — free RSVP registrations, capacity accounting, waitlists, deferred confirmation email, and admin routes.
- `@dateline/importer` — TEC, iCal, CSV, and JSON import paths with idempotency and partial error reporting.
- `@dateline/views` — native Astro calendar and event components, headless variants, RSVP form, and live collection wiring.
