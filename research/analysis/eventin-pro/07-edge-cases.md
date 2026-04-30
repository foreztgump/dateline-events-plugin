---
plugin: eventin-pro
version: 4.0.19
base-plugin: wp-event-solution 4.0.16
analyzed: 2026-04-30
analyst: claudeflare
phase: 3
doc: 07-edge-cases
issue: PRO-344
site: dateline-site-a (WP 6.9.4, PHP 8.2, DDEV)
method: >
  Mixed: static analysis of source code + live WP-CLI probing on Site A.
  Both plugins activated (eventin-pro 4.0.19 + wp-event-solution 4.0.16).
  No WooCommerce on Site A — payment-dependent scenarios (capacity/waitlist
  promotion, ticket refund, date change after purchase, event cancellation)
  are documented from source code analysis and user-reported behaviour.
  Site A timezone set to America/Los_Angeles for timezone/DST scenarios.
---

# Eventin Pro 4.0.19 — Edge Cases

---

## Test Environment

| Item | Value |
|------|-------|
| Site | dateline-site-a.ddev.site (local DDEV) |
| WP version | 6.9.4 |
| PHP | 8.2 |
| Base plugin | wp-event-solution 4.0.16 |
| Pro plugin | eventin-pro 4.0.19 |
| WooCommerce | Not installed |
| Site timezone | America/Los_Angeles (set for testing) |

**Note on WooCommerce absence:** Eventin Pro requires WooCommerce for paid ticket flows. Without WC, ticket purchase, checkout, refund, and order-driven attendee promotion scenarios cannot be exercised live. Those scenarios are documented from source code analysis of `src/WC/`, `src/Integrations/Stripe/`, `src/Integrations/Paypal/`, hook wiring in `02-hooks.md`, and user-reported behaviour on WordPress.org forums.

---

## Scenario 1 — Timezone Shift (PST event viewed by EST user)

### Setup
Event created with `event_timezone = America/Los_Angeles`, start date/time `2026-06-15 14:00`.

### Observed Behaviour

**How Eventin stores time:**
- `etn_start_date`: `2026-06-15` (date only, no TZ)
- `etn_start_time`: `14:00` (time string, no TZ)
- `event_timezone`: `America/Los_Angeles` (IANA identifier, stored as separate meta)

**Frontend display:**
- Times are output directly from `etn_start_time` string with no timezone conversion applied to the display.
- The `event_timezone` meta is used to populate `.ics` / Google Calendar export links (correctly encodes the TZID), but the page itself shows the raw stored time.
- There is **no viewer-timezone detection or conversion** — an EST user sees "2:00 PM" with no indication that this is Pacific time.
- The `[etn_pro_add_calendar]` shortcode does correctly pass `TZID:America/Los_Angeles` in the ICS download, so calendar apps will convert correctly after import.

**Countdown timer:**
- `[etn_pro_countdown]` calculates milliseconds from `new Date("2026-06-15 14:00")` in client-side JS.
- The JS string is injected without a TZ suffix, so countdown interprets the time in the **visitor's local timezone**, not the event timezone.
- **Bug:** An EST user sees a countdown 3 hours shorter than intended; a UTC user sees it 7 hours shorter.

**Summary:**
| Component | Handles TZ correctly? |
|-----------|----------------------|
| Event storage | Partial — has IANA TZ field but date/time fields are naive strings |
| Frontend time display | No — shows raw stored time, no conversion |
| ICS / Google Cal export | Yes — TZID passed correctly |
| Countdown timer | No — JS uses browser local time, ignores event_timezone |

**Dateline implication:** Store all datetimes as UTC epoch + IANA zone. Display with user-browser Intl.DateTimeFormat or server-side Luxon. Never store naive date/time string pairs.

---

## Scenario 2 — DST Transition (recurring weekly through Mar / Nov)

### Setup
Recurring weekly event on Mondays starting 2026-02-16, using `etn_event_recurrence` serialized meta.

### Observed Behaviour

**Recurrence data model:**
- `etn_event_recurrence` is a serialized PHP array (not RRULE format).
- Fields observed in source: `recurrence_type` (daily/weekly/monthly), `recurrence_end_date`, `recurrence_days` (array of day names).
- No `TZID` stored alongside recurrence rules — the rule is purely calendar-arithmetic with no awareness of DST transitions.

**DST gap behaviour (March 8–9, 2026, clocks spring forward):**
- The plugin does not materialize future occurrences into individual posts. Instead, `[etn_event_recurring]` renders them dynamically at query time.
- Because the recurrence arithmetic is timezone-naive (date arithmetic on Y-m-d strings), the Monday occurrence on March 9 is generated with the stored `etn_start_time` (e.g., "10:00") regardless of the DST shift.
- Result: The March 9 occurrence appears at "10:00 AM" — which is correct wall-clock time — but the countdown timer and ICS export will be off by one hour if they use UTC-relative calculations, because the stored string is naive.

**Key finding:** Eventin uses calendar-arithmetic recurrence (naive date strings) rather than RFC 5545 RRULE with TZID. This avoids the "skipped hour" creation problem but creates the countdown/export DST bug documented in Scenario 1.

**Source evidence:**
- `src/Event/Script_Generator.php` — outputs `etn_start_date` / `etn_start_time` directly into JS vars
- No DST-compensating logic found in the plugin source
- RRULE format is not used anywhere in the codebase

**Dateline implication:** Use RRULE + TZID (via rrule.js with tzid set — see AGENTS.md). Store each occurrence's UTC instant, not a naive wall-clock string.

---

## Scenario 3 — Recurring Event with One-Off Exception

### Observed Behaviour

**Does Eventin support occurrence exceptions?**
- No. There is no `EXDATE` mechanism or per-occurrence override in the data model.
- `etn_event_recurrence` stores a rule with a start date and end date. All occurrences within that window are generated uniformly.
- To exclude "every Monday except Memorial Day (May 25)," an admin would have to:
  1. End the recurrence before May 25
  2. Create a new recurrence starting May 26
  3. Or manually track the exception outside the plugin

**Admin UX for exceptions:**
- No "skip this occurrence" UI found in admin screens or REST API
- No `EXDATE` field in `etn_event_recurrence` serialized array
- The recurring event block (`[etn_event_recurring]`) renders all generated occurrences with no ability to suppress individual ones

**Summary:** Exception handling is a hard gap. Eventin's recurrence model is simpler than RFC 5545 and cannot represent arbitrary exclusions.

**Dateline implication:** First-class `EXDATE` support in RRULE is required for any enterprise recurring-event use case.

---

## Scenario 4 — Capacity Sold Out → Waitlist → Cancellation → Promotion

### Method
Source analysis (no WooCommerce on Site A). Relevant files: `src/WC/`, inventory meta keys, hooks.

### Observed Behaviour

**Capacity tracking:**
- Two postmeta keys: `etn_total_avaiilable_tickets` (total inventory, note: typo with double-i) and `etn_total_sold_tickets` (running count).
- Per-tier inventory in `etn_ticket_variations` serialized array: each tier has `avaiilable_qty` (same typo) and `sold_qty`.
- Sold-out detection in `woocommerce_add_to_cart_validation`: validates against per-tier `avaiilable_qty - sold_qty`.

**Waitlist:**
- No native waitlist in Eventin Pro. There is no waitlist module, no waitlist CPT, no waitlist meta key.
- The sold-out state simply shows "Sold Out" label and disables the quantity stepper — no "join waitlist" option.
- i18n scan: no "waitlist" or "waiting list" strings found in `languages/eventin-pro.pot`.

**Cancellation / promotion flow:**
- Cancellations are handled via WooCommerce order status transitions (`wc-cancelled`, `wc-refunded`).
- On order cancellation, the hook `woocommerce_order_status_changed` should restore inventory — however, inspection of `src/WC/` shows no explicit inventory-restoration hook. The plugin relies on WC's own stock management to restore inventory.
- There is no "promotion from waitlist" feature because there is no waitlist.

**Summary:**
| Step | Supported? |
|------|-----------|
| Capacity limit per tier | Yes |
| Sold-out display | Yes |
| Waitlist signup | No — not implemented |
| Cancellation inventory restoration | Partial — via WC stock management, not explicit Eventin logic |
| Waitlist promotion after cancellation | No |

**User-reported issue (WP.org):** Ticket inventory is per-tier only — no shared-pool inventory across tiers. Cannot set "1000 total tickets split flexibly across adult/child/senior tiers." Each tier must have a fixed allocation.

**Dateline implication:** Native waitlist with position tracking is a clear gap. Inventory race-correctness is flagged in AGENTS.md.

---

## Scenario 5 — Ticket Refund → Quantity Restoration

### Method
Source analysis of WooCommerce integration hooks.

### Observed Behaviour

**Refund flow:**
- WooCommerce processes the refund (Stripe or PayPal refund via WC order).
- No Eventin-specific hook found on `woocommerce_order_refunded` or `woocommerce_create_refund`.
- The `etn-attendee` CPT created at purchase is **not automatically trashed or modified** on refund — attendee records persist.
- Inventory (`etn_total_sold_tickets`, per-tier `sold_qty`) is not decremented by an Eventin hook on refund.
- WooCommerce's own stock management (`woocommerce_update_product_stock`) *may* restore WC product stock, but this is separate from Eventin's meta counters.

**Confirmed behaviour (from WordPress.org support, 2025):**
- "Visitors have been able to get a ticket to an event without paying for it" — suggests inventory counters and WC stock can diverge (reported by heathertgp).
- After a refund, the attendee can still technically use their QR code for check-in unless an admin manually changes the attendee status.

**Summary:**
| Item | Behaviour |
|------|-----------|
| WC refund triggers | No Eventin-specific refund hook found |
| Ticket inventory restoration | Not guaranteed — relies on WC stock, which can drift from Eventin meta |
| Attendee CPT after refund | Persists — not automatically invalidated |
| QR code validity after refund | Still valid unless admin manually cancels attendee |

**Dateline implication:** Refund must atomically decrement inventory counters AND invalidate the ticket/attendee record. WC-free architecture allows this to be handled in one transaction.

---

## Scenario 6 — Event Date Change After Tickets Sold

### Method
Source analysis of REST API and webhook system.

### Observed Behaviour

**Admin flow:**
- Admin edits `etn_start_date` / `etn_start_time` on the event post.
- The `post_updated` hook (priority 10, `Webhook\Hooks::updated_post`) fires a webhook to any registered endpoints.
- No automatic notification email to ticket holders on date change — there is no "event updated" email template.
- Attendee confirmation emails sent at purchase contain the original date/time. After a date change, those emails are stale.

**ICS / calendar links:**
- Add-to-calendar links are generated at page-load time from current `etn_start_date` / `etn_start_time` — so new visitors see the updated date.
- Attendees who already added the event to their calendar via the original link have a stale calendar entry with no mechanism to push an update.

**Countdown timer:**
- Updates immediately on next page load (reads current meta).

**Summary:**
| Item | Behaviour |
|------|-----------|
| Admin can change date | Yes — standard post edit |
| Webhook fires on update | Yes |
| Attendee notification email | No — no "event updated" email |
| Previously sent ICS entries | Stale — no update mechanism |
| QR / ticket validity | Unaffected — tickets remain valid |

**Dateline implication:** Date-change notification to ticket holders (email + push) is a must-have. ICS subscription feeds (live-updating .ics URLs) solve the stale-calendar problem.

---

## Scenario 7 — Event Cancellation Entirely

### Method
Source analysis + WP-CLI observation.

### Observed Behaviour

**How cancellation is done:**
- Eventin has no "cancel event" button or status field. The admin either trashes the post or marks the event as "expired" via ticket availability.
- `wp_trash_post` hook fires `Webhook\Hooks::delete_resource` — sends a webhook with `event.deleted` topic.
- No cancellation email template exists in the email system (`src/Email/`). i18n scan confirms: no "event cancelled", "cancellation notice", or "event has been cancelled" strings in `languages/eventin-pro.pot`.
- The event frontend page shows a 404 or the WP trashed-post page after trashing.
- No attendee notification is triggered.

**Ticket/payment status:**
- Existing WooCommerce orders for the event are unaffected. Refunds must be processed manually in WooCommerce.
- Attendee CPTs remain, so the admin can export the attendee list for manual refund processing.

**Summary:**
| Item | Behaviour |
|------|-----------|
| "Cancel event" UI | No — trash post or expire tickets |
| Webhook fires | Yes (`event.deleted` on trash) |
| Attendee notification email | No — not implemented |
| Existing tickets | Remain valid until manually handled |
| Automatic refund trigger | No |

**Dateline implication:** First-class cancellation with attendee notification + optional automatic refund initiation is a strong differentiator.

---

## Scenario 8 — Multi-Day Event Spanning Month Boundary

### Setup
Event with `etn_start_date = 2026-01-30`, `etn_end_date = 2026-02-02`.

### Observed Behaviour

**Data model:**
- `etn_start_date` and `etn_end_date` are stored as `Y-m-d` strings. Multi-day span is fully supported in the data model.

**Calendar display:**
- `[etn_pro_calendar_standard]` (FullCalendar-based): multi-day events render as spanning blocks across the Jan 30 – Feb 2 range. Month boundary is handled correctly by FullCalendar's rendering engine — the event block wraps to the new month row as expected.
- `[etn_pro_events_classic]` grid: shows the event once in the grid with the start date. Does not repeat the card on each day of the span.
- Archive page: the event appears in the archive ordered by `etn_start_date`. It does not appear in February archive pages (because the start date is January).

**Date display on single event:**
- Template outputs both `etn_start_date` and `etn_end_date` when they differ.
- Format: "Jan 30 – Feb 2, 2026" (uses `DateTimeHelper::format_date_range()`).

**Recurring recurrence boundary:**
- If a recurring event's generated occurrence straddles a month boundary, the same behaviour applies — the occurrence starts in one month and ends in the next, displaying correctly.

**Summary:** Month-boundary multi-day events work correctly. The main limitation is archive/filter queries using `etn_start_date` only — searching "February events" won't surface an event that starts January 30.

**Dateline implication:** Overlap-aware queries (event spans the queried range) vs. start-date-only queries. Use `start_date <= range_end AND end_date >= range_start` logic.

---

## Scenario 9 — Past Events (Display, Search, Archival)

### Observed Behaviour

**Frontend display:**
- `[etn_pro_events_classic]` and similar listing shortcodes have a `hide_past_events` parameter (default: `no`).
- When `hide_past_events=yes`, past events are filtered out client-side via JS class manipulation, **not** server-side via query modification. This means past events are still fetched from the DB — they are just hidden in the DOM.
- **Performance implication:** On a large site, all events including past ones are queried; the DOM hides them. This is an N+1 performance pattern when events accumulate.

**Admin list:**
- Past events remain as published posts — no auto-archival or status change.
- Admin can filter by date range using the "Start Date" column sort, but there is no bulk "archive past events" action.

**Search:**
- WordPress default search (`s=`) includes past events — no date filter in the default search integration.
- `[etn_pro_calendar_list]` has a date-range filter the user can set, but defaults show all upcoming events.

**Frontend dashboard:**
- "My Events" tab shows all events authored by the user, including past ones. No "past / upcoming" toggle in the UI.

**`etn-advanced-search` filter:**
- Pro adds an `etn_advanced_search` hook that extends the WP_Query for advanced filtering. Date-range filtering is available via this hook but is not surfaced in a default UI.

**Summary:**
| Item | Behaviour |
|------|-----------|
| Past events hidden from listing | Optional (`hide_past_events`), client-side JS only |
| Auto-archival | No |
| Past events in search | Yes — included by default |
| Admin bulk archive | No |
| Frontend "past events" view | Not built-in — requires custom shortcode parameters |

**Dateline implication:** Server-side date filtering at query time is essential. "Upcoming / today / past" tabs should be a first-class UI element, not a parameter.

---

## Scenario 10 — Imported Events (CSV / iCal) — Data Lost vs Preserved

### Observed Behaviour

**Import capabilities:**
- Eventin Pro (4.0.19) has **no built-in import feature** — no CSV importer, no iCal/ICS importer.
- i18n scan: no "import", "csv import", "ical import", or "feed" strings in `languages/eventin-pro.pot`.
- REST API has no `POST /eventin/v2/events/import` endpoint.
- `[etn_pro_dashboard]` frontend event creation form: manual entry only, no import/bulk-create UI.

**Export capabilities (present):**
- Attendee CSV export: `admin-export-attendees.php` — exports attendee list for a given event.
- ICS/add-to-calendar: per-event `.ics` download for attendees to add to their own calendars.
- These are attendee/calendar exports, not event exports.

**Workarounds used in practice:**
- WP All Import (third-party) with custom field mapping to `etn_start_date`, `etn_start_time`, `etn_ticket_variations` etc. This requires knowing Eventin's meta key schema (including the typos — `etn_total_avaiilable_tickets`).
- REST API: `POST /eventin/v2/events` exists (base plugin) and can be used for programmatic import.

**Data loss when importing via REST / WP All Import:**
| Field | Importable? | Notes |
|-------|-------------|-------|
| Title, description, date, time | Yes | Standard WP post fields |
| Ticket tiers (`etn_ticket_variations`) | Partial | Serialized array — complex to construct correctly |
| Speakers | No | Require existing `etn-speaker` CPT references |
| Schedule | No | Complex serialized array |
| Location | Yes (text) | Structured location data requires exact serialized format |
| Event timezone | Yes | Simple string meta |
| Recurring rule | No | Serialized format not documented |
| Categories / tags | Yes | Standard WP taxonomy terms |
| Banner / featured image | Partial | Requires media import separately |

**Summary:** Import is a hard gap. No built-in importer; data fidelity is moderate at best via third-party tools due to serialized meta complexity and schema typos.

**Dateline implication:** Native CSV and ICS import with full field mapping is a significant differentiator. Clean, typed schema (no serialized arrays, no typo-riddled keys) makes third-party import tools viable.

---

## Cross-Cutting Observations

### Timezone Handling
Eventin stores naive date/time strings + a separate timezone string. This creates two recurring bugs:
1. Countdown timer calculates in browser local time, ignoring `event_timezone`
2. Recurring event arithmetic is timezone-naive — DST transitions are not modelled

### Data Integrity
- Inventory meta keys contain persistent typos (`etn_total_avaiilable_tickets`, `etn_attendeee_ticket_status`)
- WC stock and Eventin meta counters can diverge — especially on refund
- No transactional integrity for concurrent ticket purchases (reliant on WC's own add-to-cart locking)

### Feature Gaps vs Scenarios
| Scenario | Gap |
|----------|-----|
| Waitlist | Not implemented |
| Cancellation notifications | Not implemented |
| Date-change notifications | Not implemented |
| Import (CSV / iCal) | Not implemented |
| Occurrence exceptions | Not implemented |
| Viewer-timezone conversion | Not implemented |
