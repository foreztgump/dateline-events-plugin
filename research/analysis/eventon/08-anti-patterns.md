---
plugin: eventon
version: 4.8
analyzed: 2026-04-30
analyst: claudeflare
phase: 4
doc: 08-anti-patterns
priority: P0
note: >
  Anti-pattern analysis based on live Site B inspection (EventON 4.8 + 12 add-ons),
  DB query analysis via WP-CLI, REST API probing via curl, PHP source inspection,
  and findings from edge case walkthrough (07-edge-cases.md).
  WooCommerce NOT active on Site B. QR check-in REST endpoint confirmed from 06-integrations.md.
  Related: PRO-343.
---

# EventON 4.8 — Anti-Patterns

This document catalogs patterns in EventON 4.8 that cause performance problems, UX failures, data integrity issues, or security vulnerabilities. Each entry explains the problem, shows evidence, and specifies what Dateline must do differently.

---

## AP-1 — Postmeta Timestamp Proliferation (DB Bloat)

**Category:** Performance / DB Bloat

**Pattern:** EventON stores every event's timestamps in **five separate postmeta rows** per event:

| Key | Purpose |
|-----|---------|
| `evcal_srow` | Start Unix timestamp (canonical) |
| `evcal_erow` | End Unix timestamp (canonical) |
| `_unix_start_ev` | Duplicate of `evcal_srow` |
| `_unix_end_ev` | Duplicate of `evcal_erow` |
| `_evo_virtual_erow` | "Virtual" end — another end-time variant |

**Evidence:**
```
DB query on Site B:
  evcal_srow rows:     22
  evcal_erow rows:     22
  _evo_virtual_erow:   11  (subset with virtual end enabled)
  _unix_start_ev:      present on all seeded events
  _unix_end_ev:        present on all seeded events
```

A single event create/update writes 4–5 postmeta rows just for time. At 1,000 events, that's 4,000–5,000 rows in `wp_postmeta` used solely for redundant timestamps — before any add-on metadata is added.

**Why it happened:** Each generation of EventON code added a new timestamp key for a new feature (virtual end times, local-time display) without migrating the old keys. The `_unix_start_ev` / `_unix_end_ev` keys are now unused in the query path but remain populated on all events.

**Dateline rule:** One canonical `start_utc` + `end_utc` in the `events` table, indexed. Zero duplicates. Virtual-end behavior is a display flag, not a separate column.

---

## AP-2 — Calendar Query Uses Unindexed Postmeta JOIN

**Category:** Performance / Slow Queries

**Pattern:** The EventON calendar AJAX endpoint queries events for a given month by joining `wp_posts` to `wp_postmeta` on `meta_key='evcal_srow'`, then filtering by `meta_value BETWEEN month_start AND month_end`.

**Evidence from EXPLAIN:**
```sql
EXPLAIN SELECT p.ID, p.post_title
  FROM wp_posts p
  JOIN wp_postmeta pm ON p.ID = pm.post_id
    AND pm.meta_key = 'evcal_srow'
  WHERE p.post_type = 'ajde_events'
    AND p.post_status = 'publish'
    AND pm.meta_value BETWEEN {month_start} AND {month_end};

-- Result:
-- type=ref  key=meta_key  rows=22  Extra="Using where"
-- type=ref  key=meta_key  rows=22  Extra="Using where"
```

The query uses the `meta_key` index but then must scan ALL rows matching `meta_key='evcal_srow'` and filter by `meta_value` (which is a VARCHAR column in WP — numeric comparison on a string). With 22 events this is fast; with 10,000 events this becomes a full index scan plus type-cast comparison.

**Compare:** The Events Calendar Pro uses a dedicated `wp_tec_occurrences` table with integer columns `start_date_utc` and `end_date_utc` and proper B-tree indexes. A month query on TEC uses `WHERE start_date_utc BETWEEN ? AND ?` — a single indexed range scan.

**Dateline rule:** Dedicate a `dateline_events` table (or KV index) with typed, indexed columns for `start_utc BIGINT`, `end_utc BIGINT`, `event_id`, `iana_tz`. Never use postmeta for queryable scalar data.

---

## AP-3 — Start-Only Calendar Query Breaks Multi-Day Events

**Category:** Correctness / Silent Data Loss

**Pattern:** The calendar month query filters on `evcal_srow BETWEEN month_start AND month_end` — it matches only events whose **start** falls in the month. Events that start in month N–1 and end in month N are invisible in month N's calendar.

**Evidence (confirmed in scenario 8):**
```
Event #48 "Month Boundary Conference" — starts May 30, ends Jun 2
  May query: FOUND (start = May 30)
  Jun query: NOT FOUND (start = May 30, outside June range)
```

This is not an edge case — any multi-day event near a month boundary (conferences, festivals, workshops) silently disappears from the continuation month. The event appears to end on May 31 from the frontend's perspective.

**Workaround used by EventON power users:** `custom` repeat_intervals with one entry per calendar-day — a hack that multiplies postmeta rows and loses the multi-day event semantic entirely.

**Dateline rule:** Month query = `start_utc <= month_end AND end_utc >= month_start`. Multi-day events appear in every month they overlap.

---

## AP-4 — Settings Stored in Single Serialized Array (Options Table Anti-Pattern)

**Category:** Performance / Maintainability

**Pattern:** All EventON configuration for each settings tab is stored as one serialized PHP array in `wp_options`:

```
evcal_options_evcal_1  → General settings (serialized array, all tab-1 options)
evcal_options_evcal_2  → Language settings
evcal_options_evcal_3  → Styles
evcal_options_evcal_tx → Ticket settings (entire ticket config as one blob)
evcal_options_evcal_rs → RSVP settings
```

**Problems:**
1. All options in a group must be read/written together — updating one boolean requires deserializing, mutating, and re-serializing the entire array.
2. No type enforcement — values are strings even when semantically boolean/numeric.
3. No migration path — adding a new option requires either a default fallback everywhere or a migration script that touches all existing sites.
4. The `evcal_options_evcal_tx` blob includes ticket defaults, WC integration settings, email templates, appearance, AND stock behavior — completely unrelated concerns in one array.
5. `autoload=auto` means these blobs are loaded on every request.

**Dateline rule:** Store settings as individual typed key-value entries in KV, or as structured config objects per plugin with schema versioning. Never a single serialized blob.

---

## AP-5 — Open REST API Endpoints (Security)

**Category:** Security

**Pattern:** EventON registers two REST API namespaces with `permission_callback => __return_true` (completely open, no authentication required):

### `/wp-json/evo-admin/data` (GET)
```bash
$ curl https://dateline-site-b.ddev.site:8443/wp-json/evo-admin/data
"Howdy!!"
```
This endpoint responds to unauthenticated GET requests. The response "Howdy!!" suggests it's likely a placeholder or health-check, but the endpoint accepts requests from anyone without any authentication. The `evo-admin` namespace implies admin-level functionality.

### `/wp-json/eventon/v1/data` (POST)
```bash
$ curl -X POST https://dateline-site-b.ddev.site:8443/wp-json/eventon/v1/data \
    -H "Content-Type: application/json" \
    -d '{"action":"test"}'
{"r":{"action":"test"},"d":[]}
```
This endpoint is EventON's calendar AJAX backend. It accepts arbitrary JSON action payloads with no authentication. The response includes a `d` array (event data). The full attack surface is not known without further fuzzing, but accepting arbitrary action parameters without auth is a recognized OWASP A01/A07 pattern.

### QR Check-In REST endpoint (documented in 06-integrations.md)
The `eventon-qrcode` add-on registers a REST route with `permission_callback => true` (hardcoded). This allows unauthenticated attendee check-in or CSRF-based check-in manipulation if the check-in token is predictable.

**Dateline rule:** All REST routes must declare explicit `permission_callback` that validates either a valid nonce or a signed API key. Public calendar data endpoints (event list for a public calendar) may be unauthenticated for reads, but all state-mutating routes MUST be authenticated. Check-in endpoints MUST use cryptographic signed tokens with TTL.

---

## AP-6 — PHP 8.1+ Dynamic Property Deprecations on Every Page Load

**Category:** Code Quality / Forward Compatibility

**Pattern:** 4 add-ons emit PHP 8.1 `deprecated: Creation of dynamic property` warnings on every request. Observed in nginx/PHP error logs and in every WP-CLI command output:

```
eventon-rsvp-events-waitlist:
  EVORSW::$assets_path, ::$addon, ::$front, ::$integrations  (4 warnings)

eventon-csv-importer:
  EventON_csv_import::$assets_path, ::$addon  (2 warnings)

eventon-wishlist-add-on:
  evowi::$assets_path, ::$addon, ::$front, ::$manager
  evowi_frontend::$fnc, ::$user_wishlist  (6 warnings)

eventon-weekly-view:
  eventon_weeklyview::$addon, ::$shortcodes, ::$frontend  (3 warnings)

Total: 14+ deprecation warnings per request with all 12 add-ons active
```

These warnings will become fatal errors in PHP 9. They indicate all 4 plugins assign properties in `__construct()` without declaring them in the class body — a basic PHP 8.1 breaking change that EventON has not addressed since PHP 8.1's 2021 release.

**Dateline rule:** All class properties declared explicitly. TypeScript removes this class entirely.

---

## AP-7 — Waitlist Promotion Bug: `check_yn()` on WP_Post

**Category:** Correctness / Silent Failure

**Pattern:** The `eventon-rsvp-events-waitlist` plugin's `EVORSW_Waitlist::is_waitlist_active()` method calls `$event->check_yn()` where `$event` is a `WP_Post` object passed from the `evors_rsvp_updated` hook callback.

`check_yn()` is a method on EventON's internal `EVO_Event` wrapper class — it does not exist on `WP_Post`. The result:

```
PHP Fatal Error: Call to undefined method WP_Post::check_yn()
  in eventon-rsvp-events-waitlist/includes/class-event-waitlist.php:20
```

In a WP-CLI context, this crashes the script. In a web AJAX context, WordPress's error handler catches the fatal and returns a WP_Error — **the waitlist promotion silently fails** with no admin notification and no retry mechanism.

**Effect:** A RSVP cancellation that should promote a waitlisted attendee does nothing. The waitlisted attendee never receives the promotion email, never gets a confirmed spot. They remain on the waitlist indefinitely.

**Root cause:** The hook `evors_rsvp_updated` passes `(rsvp_id, status, rsvp_post_object)` but the waitlist handler expects to receive an `EVO_Event` object, not `WP_Post`. This is a type mismatch between two add-ons developed by the same vendor.

**Dateline rule:** Never pass mutable domain objects through hook arguments. Pass scalar IDs; let the handler load its own representation. Test every cross-plugin hook in isolation.

---

## AP-8 — No Lifecycle Hooks for Critical State Changes

**Category:** Extensibility / Correctness

**Pattern:** EventON fires NO hooks when:
- An event's date/time changes (`evcal_srow` / `evcal_erow` updated)
- An event's status changes to cancelled, rescheduled, or postponed
- A ticket refund occurs and quantity is restored
- An RSVP is promoted from waitlist to confirmed

Verified via `has_action()` checks:
```
evotx_event_date_changed:     NOT registered
evotx_event_cancelled:        NOT registered
evors_event_cancelled:        NOT registered
evo_event_cancelled:          NOT registered
eventon_event_status_changed: NOT registered
eventon_event_date_changed:   NOT registered
```

**Effect:** Integrations (email tools, analytics, Zapier webhooks, external booking systems) have no reliable signal to act on critical event lifecycle transitions. The webhooks BETA feature in `06-integrations.md` covers only a few actions (`tickets_created`, `ticket_stock_modified`, `new_rsvp`) and misses all the most operationally important ones.

**Dateline rule:** Implement first-class lifecycle events with guaranteed delivery:
- `event.created`, `event.updated`, `event.date_changed`, `event.cancelled`, `event.published`
- `rsvp.created`, `rsvp.confirmed`, `rsvp.cancelled`, `rsvp.waitlisted`, `rsvp.promoted`
- `ticket.purchased`, `ticket.refunded`, `ticket.cancelled`

Route all through `ctx.waitUntil` with at-least-once delivery and deduplication.

---

## AP-9 — WooCommerce Hard Dependency for All Paid Workflows

**Category:** Architecture / Vendor Lock-in

**Pattern:** EventON Tickets, EventON Seats, and EventON Ticket Variations all hard-require WooCommerce:

```
"EventON Tickets needs WooCommerce plugin to function properly. Please install WooCommerce."
"EventON Seats need Woocommerce plugin to function properly. Please install woocommerce."
"EventON Ticket Variations & Options need Woocommerce plugin to function properly."
```

These banners appear on every admin page when WC is absent. The plugins are completely non-functional without WC — there is no standalone payment path.

**Consequences:**
- WooCommerce adds ~40MB to disk, hundreds of DB tables, and significant page-load overhead for every request (WC hooks on `init`, WC sessions on each load).
- WC 7+ requires PHP 7.4+ and MySQL 5.6+. Adds a separate WC update and security surface.
- A WC checkout UX (cart → checkout → order confirmation) is inappropriate for simple event ticket purchasing — it adds 3–5 extra steps vs a direct purchase flow.
- WC Stripe gateway + EventON Tickets = Stripe webhook delivery can be blocked by Cloudflare Bot Fight Mode (documented in AGENTS.md).
- Refund logic, tax calculation, inventory management, and email all route through WC — EventON has no direct control over these flows.

**Dateline rule:** Native Stripe integration (no WC). Direct purchase flow: pick ticket → enter details → Stripe Elements → confirmation. No cart required for single-event tickets. Per AGENTS.md: Stripe webhooks must be deduplicated by Stripe event ID in KV.

---

## AP-10 — Shortcode-Only Frontend Architecture

**Category:** UX / Maintainability

**Pattern:** EventON's entire frontend is shortcode-driven. Core registers 9 shortcodes; 12 add-ons add 8 more (17 total). There are **no Gutenberg blocks** for any core calendar view — the "Gutenberg block" is a wrapper that renders a shortcode-generator UI which then drops a `[add_eventon]` shortcode into the post content.

**Problems:**
1. **100+ attributes on `[add_eventon]`** — The base calendar shortcode has over 100 attributes (verified in `05-frontend-ux.md`). Non-technical users cannot configure the calendar without the shortcode generator UI (which itself has poor discoverability).
2. **No separation of content and presentation** — Shortcode attributes embed presentation decisions (tile style, colors, layout) directly in post content. Changing the default calendar layout requires editing every page with the shortcode.
3. **No server-side rendering for static output** — All calendar content loads via AJAX on first visit, even for publicly cacheable content. LCP (Largest Contentful Paint) is delayed by the AJAX round-trip.
4. **17 shortcodes for 12 add-ons** — Each add-on adds its own shortcode with its own attribute set. There's no unified calendar configuration API. Upgrading or removing one add-on can break pages that use its shortcode.

**Dateline rule:** Native Block Kit blocks (EmDash standard). Calendar configuration stored in structured content (not in shortcode strings). Initial render via server-side Block Kit JSON. No AJAX dependency for above-the-fold calendar content.

---

## AP-11 — Add-on Stacking: 12 Add-ons, Compounding Complexity

**Category:** UX / Performance

**Pattern:** EventON's add-on model works by each add-on registering additional metaboxes, settings tabs, hooks, and shortcodes on top of the core plugin. With all 12 add-ons active:

- **Metabox overload on event edit screen:** Every add-on contributes one or more metaboxes (RSVP settings, Tickets, Seats, Ticket Variations, Waitlist settings, Invitees, QR code, Wishlist count). The event edit screen has 12+ metaboxes visible simultaneously. Admins must scroll through all of them to find the one relevant to their current task.
- **Settings sprawl:** 5 settings tabs in the main EventON settings page + dedicated settings added by CSV Importer (separate submenu page) + RSVP submenu page. Finding a specific setting requires knowing which tab it's on.
- **PHP warnings compound:** Each add-on contributes 2–4 PHP 8.1 deprecation warnings per page load. With all 12 active, the error log fills rapidly.
- **18 JS files + 12 CSS files** registered by EventON components on every page (confirmed via `wp_scripts()`/`wp_styles()` registry count). Conditional loading is partial — some assets load on all pages that have a shortcode, even when the specific add-on feature isn't used on that page.
- **WooCommerce absence banners:** With WC not installed, 3 add-ons (Tickets, Seats, Ticket Variations) each emit a separate admin notice on every admin page. On a site without WC, every admin screen has 3 red banners — permanent noise that trains admins to ignore banners.

**Dateline rule:** Module isolation. Each add-on's admin UI contributes to a unified block-based settings system rather than raw metaboxes. No unconditional banner spam — degrade gracefully when dependencies are missing. Assets loaded only on pages where the feature is actively used.

---

## AP-12 — `_evo_lang` Language Variant Anti-Pattern

**Category:** Data Model / i18n

**Pattern:** EventON implements multilingual event support via a `_evo_lang` postmeta key containing a language variant key (e.g., `L1`, `L2`). This creates one `ajde_events` post per language variant — **duplicate posts with the same event data but different content languages**.

**Problems:**
1. Cancelling an event requires cancelling each language variant separately (no synchronized status across variants).
2. Ticket stock must be managed per-variant or combined externally — there's no built-in sync.
3. WP search, archives, and sitemap see all variants as separate events.
4. Admin events list shows all variants as separate rows with no relationship indicator.
5. Recurring events with language variants multiply: 8 recurrences × 3 languages = 24 posts.

This is the "duplicate-post" multilingual approach that WPML deprecated in 2019 in favor of language-keyed string tables. EventON's approach is architecturally inferior to both WPML and Polylang's shadow-post system.

**Dateline rule:** Single canonical event document. Language variants are locale-keyed string maps within the same document (Portable Text supports this natively via `_type: 'localeString'` blocks). Status, inventory, and dates are shared across all locales.

---

## Summary: Anti-Pattern Severity Matrix

| # | Pattern | Severity | Type |
|---|---|---|---|
| AP-1 | 5× duplicate timestamp postmeta | Medium | DB bloat |
| AP-2 | Postmeta JOIN query — no dedicated table | High | Performance |
| AP-3 | Start-only calendar query breaks multi-day | High | Correctness |
| AP-4 | Serialized-array settings blobs | Medium | Maintainability |
| AP-5 | Open REST endpoints (no auth) | **Critical** | Security |
| AP-6 | 14 PHP 8.1 deprecation warnings per request | Medium | Forward compat |
| AP-7 | Waitlist check_yn() fatal on WP_Post | High | Correctness |
| AP-8 | No lifecycle hooks on critical state changes | High | Extensibility |
| AP-9 | WooCommerce hard dependency | High | Architecture |
| AP-10 | Shortcode-only frontend (100+ attrs, AJAX-first) | Medium | UX/Perf |
| AP-11 | 12 add-ons: metabox overload, asset spam | Medium | UX/Perf |
| AP-12 | Language variants as duplicate posts | Medium | Data model |
