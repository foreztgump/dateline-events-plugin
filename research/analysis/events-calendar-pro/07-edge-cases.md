---
plugin: events-calendar-pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P3 — Edge Cases
doc: 07-edge-cases
site: Site A — dateline-site-a.ddev.site (DDEV, WordPress 6.9.4, PHP 8.2, MariaDB 11.8)
notes: >
  Live testing on Site A with TEC base 6.11.1 + ECP 7.4.5 active.
  Site timezone: America/Los_Angeles (UTC-8 PST / UTC-7 PDT).
  No Event Tickets plugin installed — EC4 and EC5 tested via source analysis.
  EC1 and EC2 tested via WP-CLI + eval scripts; CT1 tables verified via direct DB queries.
  All test events created during testing were deleted after each scenario.
---

# Events Calendar Pro 7.4.5 — Edge Cases

This doc documents edge-case behavior observed on Site A. Each scenario includes the
trigger condition, what TEC actually does, the data trail left in the DB, and Dateline
design implications.

---

## EC1 — Timezone Shift: PST Event Viewed by EST User

**Setup**: Test event created with `_EventTimezone=America/Los_Angeles`, start 10:00 AM,
`_EventStartDateUTC=2026-06-01T17:00:00Z` (correct UTC-7 PDT offset).

**Trigger**: Viewer in `America/New_York` (UTC-4 EDT in summer) visits the calendar.

**What TEC does**:

- **No per-viewer timezone conversion.** TEC has exactly two display modes, controlled by
  `Settings → Display → Timezone` (`tribe_events_timezone_mode`):
  - `event` (default) — always show time in the event's own timezone.
  - `site` — always show time in the WordPress site timezone.
- There is **no user-facing timezone selector** and no browser timezone detection.
- An EST viewer sees `10:00 AM PDT` (event timezone) — there is no automatic conversion
  to `1:00 PM EDT`.
- `tribe_get_start_date($id, false, 'g:i A T')` returns `10:00 AM PDT` in both modes
  on this site because site TZ = event TZ (both `America/Los_Angeles`).
- The REST API exposes both `start_date` (local) and `utc_start_date`. The timezone
  field is `timezone: "America/Los_Angeles"` with an empty `timezone_abbr`.

**DB trail**:
```
_EventStartDate:    2026-06-01 10:00:00   ← local time (PST/PDT)
_EventStartDateUTC: 2026-06-01 17:00:00   ← correct UTC
tec_events.start_date:    2026-06-01 10:00:00  (local)
tec_events.start_date_utc: 2026-06-01 17:00:00 (correct)
tec_occurrences.start_date:    2026-06-01 10:00:00
tec_occurrences.start_date_utc: 2026-06-01 17:00:00
```

**Anomaly found**: For the 5 original seeded events (IDs 11–17), `_EventStartDate` and
`_EventStartDateUTC` are **identical** (both store local time). UTC offset was not
applied during the manual INSERT. This means the CT1 `start_date_utc` column is incorrect
for those events. Only events processed through TEC's full save pipeline get the correct
UTC value.

**Dateline implications**:
- Must store normalized UTC; local display computed from UTC + IANA timezone.
- No TEC-style "site vs event" duality — always display in event timezone with an option
  to show UTC conversion client-side.
- EST viewer problem is entirely a UI concern; the UTC field is the source of truth.

---

## EC2 — DST Transition: Recurring Weekly Through March/November

**Setup**: Created 8-occurrence weekly event starting Feb 17 2026 (PST, UTC-8),
running through Apr 7 2026. US DST sprang forward March 8 2026 at 2:00 AM.

**Trigger**: Recurrence spans the PST→PDT transition (March 8).

**What TEC does**:

- **Correct**: Pre-DST occurrences stored as UTC-8 (e.g. `start_date_utc=18:00` for
  `start_date=10:00`); post-DST occurrences stored as UTC-7 (e.g.
  `start_date_utc=17:00` for `start_date=10:00`). The wall clock time is preserved.
- The RRULE stored in `wp_tec_events.rset` uses `DTSTART;TZID=America/Los_Angeles`
  which is correct — the `TZID` qualifier ensures DST is applied per-occurrence.
- **Warning triggered**: `Undefined array key "same-time"` in
  `Events_Pro/Custom_Tables/V1/Traits/With_Event_Recurrence.php:239` when the
  recurrence array is missing the `same-time` key. This is a non-fatal PHP notice
  triggered by all manually constructed `_EventRecurrence` arrays that lack this key.
- **Deprecated**: `php-rrule` 2.x (`rlanvin/php-rrule`) has multiple `#[\ReturnTypeWillChange]`
  warnings on PHP 8.x. All 6 iterator methods in `RSet` and `RRule` emit deprecation
  notices. This is a vendored library issue, not surfaced to users but visible in
  `WP_DEBUG` logs.

**RRULE stored**:
```
DTSTART;TZID=America/Los_Angeles:20260217T100000
DTEND;TZID=America/Los_Angeles:20260217T110000
RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=8;WKST=SU;BYDAY=TU
```

**Occurrence UTC offsets verified**:
| Date       | TZ  | local start | utc start  | offset |
|------------|-----|-------------|------------|--------|
| 2026-02-17 | PST | 10:00:00    | 18:00:00   | -8h    |
| 2026-02-24 | PST | 10:00:00    | 18:00:00   | -8h    |
| 2026-03-03 | PST | 10:00:00    | 18:00:00   | -8h    |
| 2026-03-10 | PDT | 10:00:00    | 17:00:00   | -7h    |
| 2026-03-17 | PDT | 10:00:00    | 17:00:00   | -7h    |

**Dateline implications**:
- RRULE with `TZID` qualifier is the correct approach. Our recurrence engine must pass
  `TZID` on `DTSTART` to get correct DST expansion. Confirmed: `rrule.js` issue #501
  (stripping `tzid` causes wrong DST offsets) is real — we must keep `tzid` when
  serializing to iCal.
- The `same-time` key absence causing PHP notices suggests TEC's own save pipeline
  populates this key — external meta inserts must match the full structure.

---

## EC3 — Recurring Event With One-Off Exception

**Setup**: Existing recurring event ID=16 (Weekly Tuesday Standup, 8 occurrences,
`America/Los_Angeles`). Exclusion added for 2026-05-19.

**Trigger**: Add a date exclusion to a recurring series.

**What TEC does**:

- Exclusions are stored in `_EventRecurrence['exclusions']` as an array of rule objects:
  ```php
  ['type' => 'Date', 'end-type' => 'On', 'end' => '2026-05-19',
   'custom' => ['date' => ['date' => '2026-05-19']]]
  ```
- **CT1 NOT auto-synced**: After writing the exclusion to `_EventRecurrence` postmeta,
  `tec_occurrences` is NOT automatically regenerated. The excluded occurrence row
  remains in the table.
- **`wp_update_post` is NOT enough**: Calling `wp_update_post()` does not trigger CT1
  occurrence regeneration. TEC's CT1 sync requires the full admin save pipeline
  (the `save_post_tribe_events` hook with TEC's `_wpnonce` validation).
- **`tribe_events_update_meta` hook**: Firing this action directly also does not
  regenerate occurrences from within WP-CLI context — the CT1 `Occurrences_Generator`
  is only wired to fire inside the full request/admin context.

**Practical result**: A site operator adding an exclusion via direct postmeta write
(e.g., migration, CLI tool, REST API without TEC's extension) will have stale
`tec_occurrences` rows that still show the excluded date.

**Dateline implications**:
- Exceptions/exclusions must be first-class objects in our data model, not embedded in
  a serialized meta blob.
- Occurrence generation must be triggered explicitly via a dedicated API, not as a
  side-effect of postmeta writes.
- The WP-CLI / REST-only path for modifying recurrence is effectively broken in TEC.

---

## EC4 — Capacity Sold Out → Waitlist → Cancellation → Promotion

**Status**: **Partially blocked** — Event Tickets plugin is not installed on Site A.

**What TEC base provides**:
- `_EventCost` is a plain string (`"$25"`, `"Free"`, `"$199-499"`). No capacity integer.
- `tribe_get_cost()` returns a formatted string, not a numeric capacity.
- No capacity, ticket, attendee, or waitlist tables exist in the DB without Event Tickets.

**What Event Tickets (separate plugin) would add**:
- Attendee CPT (`tribe_rsvp_attendees` or `tribe_wooticket_attendees`)
- `_tribe_ticket_capacity` postmeta on ticket posts
- `_tribe_ticket_show_global_stock` for event-level cap
- Waitlist: requires **Event Tickets Plus v5.x+** — not part of TEC or base Event Tickets

**Expected flow** (from source analysis + documentation):
1. Ticket capacity decremented on purchase (via `tribe_tickets_ticket_inventory_decrease`).
2. Sold-out state: `tribe_events_tickets_is_ticket_past_capacity()` returns true; frontend
   shows "Sold Out" badge.
3. Waitlist join: user added to `tribe_rsvp_attendees` with `post_status=waitlist`
   (Event Tickets Plus feature).
4. Cancellation: attendee post status changed to `cancelled`; capacity restored via
   `tribe_tickets_ticket_inventory_increase` action.
5. Promotion: next waitlist attendee promoted to `going` status and notified via
   `tribe_tickets_waitlist_attendee_promoted` action.

**Dateline implications**:
- Ticket capacity must be an integer field on the tier/SKU entity, not a string on the
  event.
- Waitlist is a first-class state machine: `waitlisted → promoted → attending` or
  `waitlisted → expired`.
- Cancellation must atomically restore inventory (KV decrement reversal per AGENTS.md).

---

## EC5 — Ticket Refund → Quantity Restoration

**Status**: **Blocked** — Event Tickets and a payment gateway are not installed on Site A.

**What TEC base provides**:
- `_EventCost` string only; no payment processing.
- No refund hooks or attendee status transitions in TEC base.

**Expected flow** (from source analysis):
1. Refund initiated in WooCommerce / Stripe dashboard (external to TEC).
2. TEC's WooCommerce integration hooks: `woocommerce_order_status_refunded` fires
   `tribe_tickets_ticket_refunded`.
3. Ticket attendee post status → `refunded`; inventory counter incremented.
4. For partial refunds (one ticket of many): only the refunded attendee is updated;
   other tickets unchanged.
5. Stripe-direct: no automatic hook — requires manual reconciliation or a webhook
   handler (TEC has no native Stripe gateway).

**Dateline implications**:
- Refund event from payment gateway triggers inventory restore, not the other way around.
- Never trust client-side refund signals — only the gateway webhook is authoritative.
- Attendee states: `pending → attending → refunded | cancelled`.

---

## EC6 — Event Date Change After Tickets Sold

**Setup**: Event ID=15 (Annual Conference 2026, May 30–Jun 2). Date updated via REST API
(`PUT /tribe/events/v1/events/15`) with admin auth, then via direct `wp_update_post`.

**Trigger**: Admin changes event start/end dates after the event was created.

**What TEC does**:

- **REST API (`PUT`) updates `_EventStartDate` postmeta** correctly.
- **CT1 tables NOT synced**: `wp_tec_events.start_date` and
  `tec_occurrences.start_date` remain at the original values after REST PUT.
- **`wp_update_post` also does NOT sync CT1**: The CT1 Occurrences sync is gated
  behind TEC's own save hooks, which only fire in the full admin save context.
- **No ticket notification**: No hook fires to notify ticket holders of the date change.
  TEC has no built-in "event date changed" email.

**DB state after REST PUT (admin-authenticated)**:
```
postmeta _EventStartDate:       2026-07-01 09:00:00  ← updated
wp_tec_events.start_date:       2026-05-30 09:00:00  ← STALE
wp_tec_events.start_date_utc:   2026-05-30 09:00:00  ← STALE
tec_occurrences.start_date:     2026-05-30 09:00:00  ← STALE
```

**Practical result**: The REST API and postmeta show the new date; the CT1 tables used
for all calendar queries show the old date. The event appears on the wrong calendar day
until a full admin save is performed.

**Dateline implications**:
- Date changes must update a single source of truth atomically. No postmeta + CT1 split.
- Ticket holders must be notifiable on event date change (hook: `dateline:event:date_changed`).
- REST API must own the canonical update, including all downstream CT1-equivalent updates.

---

## EC7 — Event Cancellation Entirely

**Setup**: Event ID=17 (VIP Gala Night) trashed via `wp_trash_post()`. Then untrashed and
republished.

**What TEC does**:

- **No native "cancelled" status**: TEC does not register a `cancelled` post status.
  The only EA-specific custom statuses are: `tribe-ea-success`, `tribe-ea-failed`,
  `tribe-ea-schedule`, `tribe-ea-pending`, `tribe-ea-draft` — all for import records,
  not events.
- **Trash = soft delete**: `post_status = 'trash'`. Event removed from all frontend
  calendar views (TEC excludes `trash` from all queries).
- **CT1 rows NOT removed on trash**: After `wp_trash_post()`, both `tec_occurrences`
  and `wp_tec_events` rows for the event still exist. CT1 is not cleaned up.
- **Untrash → `draft`**: `wp_untrash_post()` sets `post_status = 'draft'`, not `publish`.
  Must call `wp_publish_post()` to restore to live status.
- **No ticket cancellation cascade**: No hook fires to cancel tickets or refund attendees
  when an event is trashed.

**Dateline implications**:
- A first-class `cancelled` status is required. Cancellation triggers:
  1. Event hidden from public calendar
  2. Ticket holders notified
  3. Refunds initiated (if applicable)
  4. Event remains queryable for auditing (not hard-deleted)
- CT1-equivalent tables must cascade on status transitions, not just on hard delete.

---

## EC8 — Multi-Day Event Spanning Month Boundary

**Setup**: Event ID=15 (Annual Conference 2026): starts May 30 09:00, ends June 2 17:00.
This is the only seeded multi-day event and crosses the May/June boundary.

**What TEC does**:

- **Single occurrence row**: One row in `tec_occurrences` with `start_date=2026-05-30`
  and `end_date=2026-06-02`. No per-day splitting.
- **Duration stored correctly**: `duration=288000` seconds (3.33 days, i.e. 80 hours).
- **Month view behavior**: The event appears on every day from May 30 through June 2 in
  the month view. TEC generates these visual "spans" client-side from the single
  occurrence's start/end range.
- **`all_day` = false**: Multi-day events are not the same as all-day; times are
  preserved.
- **Search**: `tribe_get_events(start_date=2026-05-30, end_date=2026-06-03)` returns
  this event. A query for `start_date=2026-06-01` (a date during the event) also
  returns it via a range overlap check in the CT1 query.

**REST API response**:
```json
{
  "start_date": "2026-05-30 09:00:00",
  "end_date": "2026-06-02 17:00:00",
  "start_date_details": { "year":"2026","month":"05","day":"30","hour":"09","minutes":"00" },
  "end_date_details":   { "year":"2026","month":"06","day":"02","hour":"17","minutes":"00" }
}
```

**Dateline implications**:
- Store a single occurrence with `start_date` + `end_date`; compute visual day spans at
  query time.
- Range overlap queries: `event.start_date <= query_end AND event.end_date >= query_start`.

---

## EC9 — Past Events (Display, Search, Archival)

**Setup**: Event ID=14 (Last Month — DevOps Summit, 2026-03-10) is the only seeded past
event.

**What TEC does**:

- **No auto-archival**: Past events remain `post_status=publish` indefinitely. TEC has
  no cron job or hook to auto-change status when an event date passes.
- **Frontend — List view**: TEC hides past events from the default list view
  (`tribe_get_events()` defaults to `start_date >= now()`). The "Latest Past Events"
  sidebar widget shows the most recent past events (configurable count, default 5).
- **Frontend — Month view**: Past months accessible by navigating backwards. Past events
  appear normally.
- **Search**: `tribe_get_events(start_date='2020-01-01', end_date='now')` returns past
  events. Direct `WP_Query` with `meta_key=_EventStartDate, meta_compare=<, meta_value=now`
  also works.
- **WP_Query caveat**: A direct `WP_Query` for `post_type=tribe_events` without TEC's
  query integration sees **occurrence proxy posts** (IDs `100000X`) for recurring events
  in addition to the real post IDs. These are CT1 virtual posts.
- **REST API**: `GET /tribe/events/v1/events?per_page=5` excludes past events by default.
  Use `start_date=2020-01-01&end_date=2026-04-30` to include them.
- **Admin list**: Past events appear in `wp-admin/edit.php?post_type=tribe_events` with
  no visual distinction from upcoming events.
- **TEC hooks registered**: `tribe_rest_events_archive_data`,
  `tribe_template_entry_point:events/v2/latest-past/event/title:after_container_open`.

**Dateline implications**:
- Events need an `ended_at` derived field for efficient past/upcoming filtering.
- "Archival" should be an explicit state transition (e.g., `concluded`) not a calendar
  query. Supports hiding from search without deletion.
- CT1 virtual proxy posts are a significant footgun for tools that use `WP_Query` directly.

---

## EC10 — Imported Events (CSV/iCal)

**Setup**: TEC Event Aggregator (EA) is licensed on Site A (`pue_key_status=valid`).
CSV and iCal importers are available. No import jobs have run (no `tribe-ea-*` posts exist).
Analysis from source inspection of `File_Importer_Events.php` and `Record/Abstract.php`.

**Importer types available**:
- `Tribe__Events__Aggregator__Record__CSV` — CSV file upload
- `Tribe__Events__Aggregator__Record__iCal` — iCal URL subscription
- `Tribe__Events__Aggregator__Record__ICS` — ICS file upload
- `Tribe__Events__Aggregator__Record__gCal` — Google Calendar (external service required)
- `Tribe__Events__Aggregator__Record__Meetup` — Meetup.com (external service required)

**CSV Import — Fields preserved**:
| Source column | TEC field | Notes |
|---|---|---|
| `event_name` | `post_title` | Required |
| `event_start_date` + `event_start_time` | `_EventStartDate` | Required; combined |
| `event_end_date` + `event_end_time` | `_EventEndDate` | Defaults to start+1hr |
| `event_description` | `post_content` | Full HTML preserved |
| `event_timezone` | `_EventTimezone` | IANA tz string |
| `event_cost` | `_EventCost` | String |
| `event_website` | `_EventURL` | |
| `event_category` | `tribe_events_cat` taxonomy | Comma-separated; created if not exists |
| `event_show_map` | `_EventShowMap` | Boolean |
| `event_comment_status` | `comment_status` | open/closed |
| Venue columns | `tribe_venue` CPT | Matched by title; created if not found |
| Organizer columns | `tribe_organizer` CPT | Matched by title or email |

**CSV Import — Fields NOT preserved / lost**:
- No recurrence columns in CSV format — recurring events cannot be batch-imported via CSV.
- No featured image column (only via EA service image import from URL).
- No custom fields (ECP custom fields not importable via CSV).
- No `_tribe_featured` (sticky/featured flag) from CSV.

**iCal/ICS Import — Fields preserved**:
- `SUMMARY` → `post_title`
- `DESCRIPTION` → `post_content`
- `DTSTART` / `DTEND` with `TZID` → `_EventStartDate` + `_EventTimezone` (correct)
- `LOCATION` → venue title (geocoded to lat/lon via EA service; `resolve_geolocation=1`)
- `URL` → `_EventURL`
- `RRULE` → `_EventRecurrenceRRULE` postmeta (raw RRULE string stored)
- `CATEGORIES` → `tribe_events_cat` taxonomy terms
- `ORGANIZER;CN=...` → `tribe_organizer` CPT (name and email)
- Featured image: imported from `ATTACH;FMTTYPE=image/*` if EA service processes it

**iCal/ICS Import — Fields lost**:
- `STATUS` (CONFIRMED/TENTATIVE/CANCELLED) — not mapped to any TEC field
- `GEO` (raw lat/lon) — geocoding API resolves address, raw coords discarded
- `PRIORITY` — not stored
- `TRANSP` (OPAQUE/TRANSPARENT) — not stored
- `CLASS` (PUBLIC/PRIVATE/CONFIDENTIAL) — not stored
- `VALARM` components — not stored (no reminder system in TEC base)
- `EXDATE` / `EXRULE` — partially handled via `_EventRecurrenceRRULE` raw string
- `RDATE` — not stored as a separate data point
- `COMMENT` — not stored
- `LAST-MODIFIED` — not tracked; re-import always overwrites if `global_id` matches

**Import deduplication**: Events are matched by `_tribe_events_global_id` (a hash from
the source UID). Re-importing the same iCal/CSV updates existing events if the global ID
matches; otherwise creates new events. No merge/diff logic.

**Post-import status**: Configurable via Settings → Integrations → Default post status
(`tribe_aggregator_default_post_status`). Defaults to `publish`.

**Dateline implications**:
- iCal import must map `STATUS:CANCELLED` to our `cancelled` event state.
- `RRULE` should be parsed into our native recurrence structure, not stored raw.
- `GEO` lat/lon should be stored directly; don't depend on a geocoding API round-trip
  that can fail or change.
- Import deduplication by UID hash is the right approach — preserve this.
- `LAST-MODIFIED` should drive update decisions, not overwrite unconditionally.
