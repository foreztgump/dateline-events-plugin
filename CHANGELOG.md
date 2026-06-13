# Dateline

## 0.2.0 — 2026-06-13

EmDash 0.18 modernization (PRO-872 epic). The dependency family moves from `emdash` ^0.9 to ^0.18, the three runtime plugins convert to the real sandboxed plugin format, invented platform APIs and fictional docs are purged, and the reference site is rebuilt on real EmDash. All six published packages bump to 0.2.0.

- `@dateline/core` — converted to the EmDash 0.18 sandboxed format: single `src/plugin.ts` default-exporting a typed `SandboxedPlugin` plus a hand-authored `emdash-plugin.jsonc` manifest. Dropped the legacy `definePlugin()`/factory shape and the invented `emdash.config.ts`/`EMDASH_PLUGIN_MANIFEST` surfaces. Data access is `ctx.content`/`ctx.storage` only — no raw SQL/D1. Events, venues, organizers, calendar/iCal feeds, schema.org, and GDPR helpers preserved on the real platform.
- `@dateline/rsvp` — sandboxed conversion plus capacity rework off the invented atomic-KV primitive: capacity now lives in the `rsvps` storage collection as `claim` records with conflict-retry admission. Cron registered via `ctx.cron.schedule()` in lifecycle hooks and consumed through the real `cron` hook; waitlist-promotion and hold-expiry/rate-limit-purge sweeps capped to the 10-subrequest sandbox budget. Boundary/unexpected route errors now surface as 500 instead of masked 4xx.
- `@dateline/importer` — sandboxed conversion: remote feed fetches (TEC/iCal/CSV/JSON) go through `ctx.http.fetch` gated by `network:request` + `allowedHosts`; deferred feeds persist and drain across invocations; idempotent source IDs and partial error reporting preserved.
- `@dateline/blocks` — rebased onto `@emdash-cms/blocks@0.18`; typed builders and `validateBlocks()`/`assertResponse()` guards track the 0.18 surface; `entry.data.terms` inlined at call sites.
- `@dateline/views` — updated trusted Astro components for EmDash 0.18 via `getEmDashCollection`; `entry.data.terms` read inline; tz-aware formatters and `safeHref()` carry forward.
- `@dateline/recurring` — type-bump only; the tzid-anchored RRULE materialization algorithm (2-year cap, EXDATE/RDATE, KV occurrence cache) is intentionally untouched.
- `examples/reference-site` — rebuilt on real EmDash 0.18 with seed data, live RSVP/capacity/email flows, importer round-trip, Playwright e2e (blocking CI), and Cloudflare deploy validation.
- `docs` — truth pass purging invented APIs; `MIGRATION.md` added as the v0.1→v0.2 first-real-installation guide; capability model, `ctx` surface, and measured workerd budgets documented from `VERIFIED-PLATFORM-0.18.md`.

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
