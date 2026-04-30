---
plugin: eventon
version: 4.8
analyzed: 2026-04-30
analyst: claudeflare
phase: 3
doc: 07-edge-cases
priority: P0
note: >
  Live walkthrough on Site B (https://dateline-site-b.ddev.site:8443),
  WordPress 6.9.4 + EventON 4.8 + 12 active add-ons. WooCommerce NOT active
  on Site B (ticket/seats/variations add-ons in degraded/banner state).
  RSVP, Waitlist, CSV Importer, QR Code, Weekly View, Full Cal, Slider,
  Wishlist, Invitees add-ons fully active.
  Seed events created via WP-CLI eval-file; frontend captured via Playwright.
  Screenshots in screenshots/ec-s*.png.
  Related issues: PRO-335 (edge cases), PRO-343 (anti-patterns).
---

# EventON 4.8 — Edge Cases

---

## Summary

EventON stores all event times as **raw Unix timestamps (UTC)** in `evcal_srow` / `evcal_erow` postmeta. The data model has no first-class IANA timezone binding, no RRULE occurrence exceptions, no automated lifecycle hooks for cancellation or date changes, and a calendar query architecture (filter-by-start-only) that silently breaks multi-day events spanning month boundaries.

These are not minor oversights — they are structural gaps that cost EventON users data integrity. Dateline must address each one.

---

## Scenario 1 — Timezone Shifts

**Setup:** Created "TZ Test: PST Morning Meeting" with `evcal_srow` = Unix timestamp for tomorrow 9:00 AM PST (`America/Los_Angeles`), `_evo_tz = America/Los_Angeles`, `evo_event_timezone = PST`.

**Observed behavior:**
- EventON stores the event start as a UTC timestamp. The IANA timezone (`_evo_tz`) is saved in postmeta but is used only for the **display label** (e.g., "PST" appended to the time string in the EventCard). It does NOT affect how the event is stored or queried.
- A PST 9:00 AM event (`UTC 17:00`) appears on the calendar on the correct day.
- The timezone label ("PST") surfaces on the event card when the add-on is configured.
- **No timezone conversion for the viewer.** A visitor in EST sees "9:00 AM" — the same label the PST author entered. EventON has no viewer-timezone detection or conversion mechanism.
- The `evo_event_timezone` field is a free-text string (e.g., "PST", "EST", "CET"). It is not parsed or validated — any string can be entered.

**Confirmed:**
```
PST start: 2026-05-01 09:00 PDT (local) = 2026-05-01 16:00 UTC
EST viewer sees: 12:00 EDT (correct, but EventON does not display this — it shows 9:00 AM)
```

**Dateline implication:**
- Store `start_utc` + `iana_timezone` per event (IANA key, not freetext).
- Render displayed time in the **viewer's local timezone** by default, with an option to pin to the event's home timezone.
- Never use free-text timezone labels for computation.

---

## Scenario 2 — DST Transitions

**Setup:** Created "DST Test: Weekly Meeting (Feb–Apr 2026)" — weekly recurring event, 8 occurrences, starting 2026-02-22 at 10:00 AM PST (`evcal_srow = 1740247200`, UTC 18:00), IANA tz = `America/Los_Angeles`. US Spring DST 2026 = March 8 at 2:00 AM.

**Observed behavior:**
EventON's repeat engine computes occurrences by **adding N × 7 × 86400 to the base UTC timestamp**. It does not re-anchor to "Sunday 10:00 AM local time" after a DST boundary.

```
Week 1 (Feb 22): UTC 18:00 → PST 10:00 ✓
Week 2 (Mar  1): UTC 18:00 → PST 10:00 ✓
Week 3 (Mar  8): UTC 18:00 → PDT 11:00 ✗  ← 1-hour drift after DST spring-forward
Week 4 (Mar 15): UTC 18:00 → PDT 11:00 ✗
... all subsequent occurrences: 11:00 PDT
```

The event that was "Weekly Tuesday 10am" silently becomes "Weekly Tuesday 11am" for all post-DST occurrences. No admin warning. No frontend indicator. Attendees who rely on recurrence descriptions are misled.

**Root cause:** EventON uses `evcal_rep_gap * 7 * 86400` arithmetic. RFC 5545 RRULE with `TZID` anchors each occurrence to the named timezone's wall-clock time, which is the correct approach. EventON does not implement RRULE.

**Dateline implication:**
- Implement RRULE with `TZID` per [RFC 5545 §3.8.5.3](https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.5.3).
- Each occurrence should be computed as: "what is the UTC timestamp for [WEEKDAY] at [HH:MM] in [IANA_TZ]?" — not "UTC + N days".
- Per AGENTS.md: "RRULE recurrences MUST set `tzid` for correct DST handling — `rrule.js` Issue #501 documents the trap of stripping the zone."

---

## Scenario 3 — Recurring Event with One-Off Exception

**Setup:** Inspected the existing "Weekly Developer Meetup" (8-occurrence weekly recurring, `evcal_rep_freq=weekly`) on its edit screen and source code.

**Observed behavior:**
- EventON has **no native occurrence-exception UI**. There is no "skip this date" or "edit this occurrence" control anywhere in the admin.
- The only workaround is switching to `evcal_rep_freq=custom` and editing `repeat_intervals` directly — a serialized PHP array of `[start_unix, end_unix]` pairs. This requires raw postmeta editing (no UI).
- The available `evcal_rep_freq` options are: `daily`, `hourly`, `weekly`, `monthly`, `yearly`, `custom`.
- `custom` mode lets a user manually enter each occurrence timestamp — but the UX is a text field, not a date picker. Non-technical users cannot use it.
- Inspected `class-repeat.php`: no `EXDATE` or `EXRULE` concept exists in the codebase.

**Example:** "Every Monday except Memorial Day (May 25)" cannot be expressed. The only options are: (a) delete the whole series and recreate without that date, (b) use `custom` repeat_intervals.

**Dateline implication:**
- Implement RRULE `EXDATE` for occurrence-level exclusions.
- Admin UI: "Edit this occurrence" (detach from series) and "Skip this occurrence" (add to EXDATE).
- These are standard Google Calendar / Outlook behaviors users expect.

---

## Scenario 4 — RSVP: Capacity Sold Out → Waitlist → Cancellation → Promotion

**Setup:** Created "RSVP Capacity Test Event" with `evors_cap=2`, `evors_cap_type=num`, `_evorsw_waitlist_on=yes`. Created 3 RSVP records: Alice (yes), Bob (yes), Carol (waitlist). Cancelled Alice's RSVP by trashing her post and firing `evors_rsvp_updated`.

**Observed behavior:**

1. **Capacity enforcement** — `evors_cap` is a limit on `evors_ans=yes` count. The enforcement happens in the AJAX handler (`evors_add_rsvp_record()`), not at the DB level. There is no row-level constraint — two concurrent AJAX calls can both succeed and exceed the cap.

2. **RSVP counter** — `evors_yes_count` on the event is NOT automatically updated when records are inserted via `wp_insert_post()`. The counter syncs only via the AJAX handler. Our WP-CLI seed confirmed `evors_yes_count=""` even after 2 yes-RSVPs.

3. **Waitlist promotion bug** — Firing `evors_rsvp_updated` (the hook the waitlist plugin uses for promotion) causes a **PHP Fatal Error**:
   ```
   Error: Call to undefined method WP_Post::check_yn()
     in eventon-rsvp-events-waitlist/includes/class-event-waitlist.php:20
   ```
   `EVORSW_Waitlist::is_waitlist_active()` passes a raw `WP_Post` object to a method that expects an `EVO_Event` wrapper object with the custom `check_yn()` method. In a web context this error is swallowed silently — **waitlist promotion silently fails when triggered programmatically or in certain edge code paths**.

4. **No atomic promotion** — Even when the `offer_space_to_waitlist()` method works correctly (web AJAX path), it is not wrapped in a DB transaction. Two simultaneous RSVP cancellations could both trigger promotion and offer the same slot to two different waitlist entrants.

5. **Screenshots:** `ec-s4-05-rsvp-all-records.png` (RSVP admin list: 2 published + 1 trashed), `ec-s4-06-rsvp-event-metabox.png` (RSVP toggle in block editor).

**Dateline implication:**
- Atomic inventory decrement on RSVP submit (KV `inventory:{eventId}` per AGENTS.md).
- Waitlist promotion MUST be a single atomic operation: read-and-decrement-inventory + promote exactly one waitlist entry in the same KV transaction.
- Do not use hook-based promotion — use explicit queue with deduplication.
- Per AGENTS.md: "atomically decrement inventory per line; on rejection restore prior decrements; write `hold:{cartId}` with TTL 600s."

---

## Scenario 5 — Ticket Refund → Quantity Restoration

**Setup:** Attempted to activate WooCommerce on Site B; WC is not installed. The `evotx_tickets` add-on class is loaded but all WC hooks are absent. Inspected ticket settings and hook registrations.

**Note:** WooCommerce was intentionally excluded from Site B for this research phase to isolate EventON core + RSVP behaviors. The observations below are based on source-code analysis of `eventon-tickets` + the settings panel.

**Observed behavior:**

1. **WC-dependent** — Every ticket-to-stock roundtrip runs through WooCommerce order lifecycle hooks. Without WC, `evotx` is inert. Hook check confirmed:
   - `woocommerce_order_status_cancelled`: NOT registered
   - `woocommerce_order_status_refunded`: NOT registered
   - `woocommerce_order_refunded`: NOT registered

2. **Auto-restock settings** — Three global options in `evcal_options_evcal_tx`:
   - `evotx_res_cancel` — restock on order cancelled
   - `evotx_res_refund` — restock on order refunded
   - `evotx_res_failed` — restock on payment failed
   All were `not-set` on this site (defaults not populated without WC active).

3. **Dual-counter problem** — Ticket quantity lives in two places: WooCommerce product stock AND `evotx_tix_qty_sold` postmeta. These are synced via WC hooks but can drift if: a partial refund occurs (WC refunds N items, EventON decrements by the same N — only if the hook is coded for partial refunds, which is not confirmed in source). A network failure between WC hook and EventON handler also causes drift.

4. **Screenshot:** `ec-s5-04-ticket-settings.png` (ticket settings tab showing 3 restock option fields).

**Dateline implication:**
- Single source of truth: `inventory:{tierId}` in KV, decremented atomically on purchase, incremented atomically on refund.
- No secondary postmeta counter. Stripe webhook deduplication via Stripe event ID in KV (TTL 7 days) per AGENTS.md.
- At-least-once delivery: refund webhook must be idempotent. First refund decrements inventory; duplicate refund is a no-op (already decremented).

---

## Scenario 6 — Event Date Change After Tickets Sold

**Setup:** Changed `evcal_srow` / `evcal_erow` on the Ticket Refund Test Event (which had `evotx_tix_qty_sold=3`) and fired `save_post`.

**Observed behavior:**
- Date change is purely a postmeta update. **No hooks fire** that would notify ticket holders:
  - `evotx_event_date_changed`: NOT registered (hook does not exist)
  - `evotx_event_updated`: NOT registered
  - `evors_event_date_changed`: NOT registered
  - `save_post_ajde_events`: NOT registered
  - `eventon_event_date_changed`: NOT registered
- The `evo-tix` CPT records (one per attendee) are not updated. They still reference the WC order which was created with the original date in the order line-item metadata.
- WC product name auto-update: a setting `evotx_auto_update_product_name` exists, but it only renames the WC product title — it doesn't notify customers.
- **Admin workflow:** admins must manually bulk-email ticket holders via WooCommerce order notes or an external email tool.

**Dateline implication:**
- Emit `event.date_changed` webhook/event on any change to `start_utc` or `end_utc`.
- Queue automated notification email to all ticket holders via `ctx.waitUntil`.
- Ticket records should snapshot `original_start_utc` at purchase time for audit trail.
- Provide a diff view: "Event was: May 1 · Is now: May 8 · Reason: [admin-entered text]".

---

## Scenario 7 — Event Cancellation Entirely

**Setup:** Set `_status=cancelled` and `_cancel_reason="Venue closed unexpectedly"` on the Ticket Refund Test Event. Checked all relevant hooks.

**Observed behavior:**
1. **Status mechanics** — EventON supports 4 `_status` values: `published`, `cancelled`, `rescheduled`, `postponed`. These are stored in postmeta, not WP `post_status`. The WP post remains `publish` — cancelled events are still publicly queryable.

2. **No cancellation hooks:**
   - `evotx_event_cancelled`: NOT registered
   - `evors_event_cancelled`: NOT registered
   - `evo_event_cancelled`: NOT registered
   - `eventon_event_status_changed`: NOT registered
   - `eventon_event_cancelled`: NOT registered

3. **Frontend display** — Cancelled events show with a "CANCELLED" badge overlaid on the event tile (rendered via CSS class `evo_event_cancelled` + inline style). The event card slide-down still opens. The cancel reason text is NOT displayed to visitors — it is admin-only.

4. **No automated cleanup:**
   - WooCommerce orders for the event are NOT automatically refunded.
   - RSVP records for the event are NOT automatically trashed or marked cancelled.
   - Ticket-holder notification emails are NOT sent.
   - RSVP holders are NOT notified.
   - Admin must manually: process WC refunds, send cancellation emails, clean up RSVP records.

5. **Query:** Events with `_status=cancelled` are returned by standard `WP_Query` because `post_status=publish` is unchanged. The calendar shortcode must explicitly filter them out or render the badge — it renders the badge.

**Screenshot:** `ec-s7-06-cancelled-event-edit.png` (admin edit screen with `_status=cancelled` and cancel reason field visible).

**Dateline implication:**
- Cancellation workflow must be automated:
  1. Set `status=cancelled` + store `cancel_reason` and `cancelled_at`.
  2. Void all open WC orders or issue Stripe refunds via API.
  3. Send `event.cancelled` notification to all ticket holders and RSVP attendees via `ctx.waitUntil`.
  4. Archive (soft-delete) all RSVP records.
- Cancel reason should be visible to attendees in the notification email and on the event page.

---

## Scenario 8 — Multi-Day Event Spanning Month Boundary

**Setup:** Created "Month Boundary Conference (May30–Jun2)" with `evcal_srow = 2026-05-30 09:00` and `evcal_erow = 2026-06-02 18:00`.

**Observed behavior:**
EventON's calendar query filters events by `evcal_srow` (start timestamp only):

```sql
WHERE meta_key = 'evcal_srow' AND meta_value BETWEEN {month_start_unix} AND {month_end_unix}
```

This means:
- **May calendar:** event appears (start is in May). ✓
- **June calendar:** event does NOT appear (start is in May, not June). ✗

Confirmed via direct DB query:
```
Event appears in May calendar query: YES
Event appears in June calendar query: NO
```

The June calendar is completely blank for this event, even though the event runs May 30 through June 2. A visitor who opens June sees nothing. There is no "multi-month span" visual or cross-month tile.

**Workaround available:** Switch to `evcal_rep_freq=custom` and add a separate `repeat_intervals` entry for each calendar-day. This is a developer-only workaround.

**Dateline implication:**
- Calendar month query MUST use range intersection: `start_utc <= month_end AND end_utc >= month_start`.
- Multi-day events spanning a month boundary appear in both months.
- Render a continuation indicator on days 2–N (e.g., "→ continues from [date]").

---

## Scenario 9 — Past Events (Display, Search, Archival)

**Setup:** Created "Past Event: March Meetup 2026" with `evcal_srow` 30 days ago. Set `_completed=yes`. Examined calendar display, event list, and settings.

**Observed behavior:**

1. **Calendar display** — EventON has a global `hide_past` setting (`evcal_hp`). The default on a fresh install is `not-set` (no value), which means past events ARE shown. In the current site config, past events appear greyed-out on the April calendar tile ("PAST EVENT — LAST FRIDAY LUNCH" shown with grey background vs blue for future events). The calendar defaults to the current month and cannot be URL-navigated via `?evo_month=` — navigation is AJAX-only via the arrow controls.

2. **Past events in month view** — When navigating backwards to March, past events for that month ARE shown. There is no mechanism to hide events from already-passed months.

3. **`_completed=yes`** — This is a **cosmetic/display flag only**. It does not change `post_status`. The event remains `publish`. It does not hide the event from search, archives, or the calendar.

4. **No auto-archival** — No cron job or expiry mechanism archives or unpublishes events after they end. Events remain `publish` indefinitely. There are 3 events with `evcal_erow` in the past out of 11 total on this site, all `post_status=publish`.

5. **Search visibility** — WP site search finds past events (the CPT is searchable by default; hidden only if the `evo_cpt_search_visibility` filter returns `false`). On this site, past events appear in WP search results. This is arguably correct for SEO — past events have archival value.

6. **Event list shortcode** — The `[add_eventon_list]` shortcode respects `hide_past` and shows/hides based on the shortcode attribute `hide_past=yes`.

**Screenshot:** `ec-s9-07-march-calendar-past.png`, `ec-s9-08-event-list-past.png`.

**Dateline implication:**
- Implement a `status=completed` transition that fires automatically when `end_utc` passes (via `ctx.cron.schedule()` sweep).
- `completed` ≠ `cancelled`. Completed events should remain searchable and archivally visible, but hidden from "upcoming events" queries by default.
- Configurable per-installation: show/hide past events on calendar, show/hide in list views, search indexing opt-out.

---

## Scenario 10 — Imported Events: CSV/iCal — What Data Is Lost vs Preserved

**Setup:** Activated CSV Importer add-on (active on Site B). Uploaded a test CSV with one event. Inspected the importer's column map. Checked for iCal/ICS support.

**Observed CSV import:**

The CSV Importer's sample file reveals the accepted column set:

```
publish_status | featured | color | event_name | evcal_subtitle |
event_description | event_start_date | event_start_time |
event_end_date | event_end_time | hide_end_time |
evcal_rep_freq | evcal_rep_gap | evcal_rep_num |
location_name | event_location | evo_location_id | event_gmap |
event_organizer | event_type | event_type_2 |
cmd_1 | cmd_2 | cmd_2L | image_url | evcal_lmlink | evors_rsvp
```

**Import UI:** The importer shows a "Verify Processed Events & Import" preview screen before final import. The test CSV ("CSV Import Test Event") parsed correctly — 1 event, status=publish, description ✓, start/end date ✓, organizer ✓.

**Data lost on CSV import:**

| Field | Available? | Notes |
|---|---|---|
| Event name | ✓ | `event_name` |
| Start/end date+time | ✓ | `event_start_date/time`, `event_end_date/time` |
| Description | ✓ | `event_description` |
| Location text | ✓ | `location_name` (creates new term if needed... or does it?) |
| Event type taxonomy | ✓ | `event_type` — but term must PRE-EXIST. Import silently skips unknown terms |
| Featured flag | ✓ | `featured=yes/no` |
| Color | ✓ | Hex code in `color` |
| External link | ✓ | `cmd_1` (URL), `cmd_2` (label), `cmd_2L` (target) |
| Repeat settings | Partial | `evcal_rep_freq`, `evcal_rep_gap`, `evcal_rep_num` — but NO `repeat_intervals` for custom |
| RSVP toggle | ✓ | `evors_rsvp=yes/no` — enables RSVP, but no capacity/waitlist settings |
| IANA timezone | ✗ | No column. All imported events are timezone-naive |
| Event status | ✗ | Cannot import as cancelled/rescheduled/postponed |
| Ticket settings | ✗ | No ticket price, stock, tier via CSV |
| Zoom link | ✗ | No Zoom URL column |
| Occurrence exceptions | ✗ | No EXDATE equivalent |
| Image (upload) | Partial | `image_url` — must be an already-uploaded URL, not a file upload |
| Subtitle | ✓ | `evcal_subtitle` |

**iCal/ICS support:**
- No native ICS import. The CSV Importer is the only bulk import mechanism.
- No iCal/ICS export either. EventON does not generate an ICS feed.
- The Zoom integration generates an ICS attachment for individual events (single-event calendar invite), but there is no site-wide iCal subscription URL.
- `EVO_iCal` class: NOT found in this installation.

**Screenshots:** `ec-s10-04-csv-importer.png` (column map UI), `ec-s10-05-csv-file-selected.png`, `ec-s10-06-csv-import-result.png` (preview with 1 event parsed).

**Dateline implication:**
- CSV import must support IANA timezone per event.
- ICS/iCal import via RFC 5545 parser is essential — it's the universal calendar interchange format.
- Auto-create taxonomy terms on import; never silently skip.
- ICS subscription URL (webcal://) for outbound calendar sync to Google/Apple Calendar is a day-1 feature.
- Ticket tiers importable via CSV (price, stock, name per tier) — organizers batch-create events with ticket info.

---

## Cross-Cutting Findings

### Architecture-level gaps confirmed in this walkthrough

| Gap | Severity | Dateline fix |
|---|---|---|
| UTC-only timestamp storage, no viewer-TZ conversion | High | `start_utc + iana_timezone`; render in viewer's TZ |
| DST drift in weekly recurrence | High | RRULE with TZID, not epoch arithmetic |
| No occurrence-level exceptions | High | RRULE EXDATE + admin UI |
| RSVP capacity not enforced atomically | High | Atomic KV decrement; no AJAX race |
| Waitlist promotion fatal bug (check_yn on WP_Post) | High | EventON bug — do not replicate |
| No hooks on date-change or cancellation | High | First-class lifecycle events |
| Multi-day events invisible in continuation months | High | Range-query, not start-only query |
| No automated ticket/RSVP cleanup on cancel | High | Automated cancel workflow |
| `_completed` is cosmetic; no auto-archival | Medium | `status=completed` cron transition |
| No iCal import/export | Medium | RFC 5545 ICS import + webcal:// subscription |
| CSV import drops IANA tz, tickets, status, Zoom | Medium | Richer import column set |
| WC hard-required for all paid workflows | Medium | Native Stripe payment, no WC dependency |
