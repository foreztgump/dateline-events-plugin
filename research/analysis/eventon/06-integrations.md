---
plugin: eventon
version: 4.8
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
note: >
  Integration surfaces enumerated via live admin walkthrough (settings tabs,
  add-on plugin scan), source code inspection of class-rest-api.php, the
  /includes/integration/ directory, and per-add-on register_rest_route /
  add_filter('evo_webhook_triggers') usage. All 12 add-ons activated on Site B.
---

# EventON 4.8 — Integrations Inventory

EventON's integration story has three pillars:

1. **WooCommerce** — the only payment processor. Tickets, Seats, and Ticket Variations all hard-require WC.
2. **Zoom** — built into core, S2S OAuth. The only first-party live-meeting integration.
3. **Webhooks (BETA)** — outgoing-only event triggers, hand-rolled, designed for Zapier/IFTTT/Integromat consumption.

Plus a long tail of opt-in builders (Visual Composer, Elementor, Gutenberg blocks), an iCalendar export, an internal REST API for the calendar AJAX, and Google Maps/OpenStreetMap for geocoding.

---

## 1. WooCommerce — Required for All Paid Workflows

**Required by:** `eventon-tickets`, `eventon-seats`, `eventon-ticket-variations-options`. The persistent yellow admin banners enforce this:

> *"EventON Tickets needs WooCommerce plugin to function properly. Please install WooCommerce."*
> *"EventON Seats needs WooCommerce plugin to function properly."*
> *"EventON Ticket Variations & Options needs WooCommerce plugin to function properly."*

**Integration model** — Tickets registers an `evo-tix` CPT (one post per attendee, `public=false, show_ui=false`). Each ticket purchase creates a WooCommerce order containing one line item per ticket; the line items hold `evotx_event_id`, `evotx_tier_id`, `evotx_ticket_number`, and reference back to the `evo-tix` post via `evotx_ticket_id`.

**Where the WC integration lives in the UI**:
- **Settings → Tickets tab** (`tab=evcal_tx`) — global defaults: per-attendee vs group ticket, attach PDF ticket to order email, refund window.
- **WooCommerce → Ticket Orders submenu** (`page=wc-orders&evofilter=evotix`) — pre-filtered WC orders list. Empty state if no ticket orders yet.
- **Per-event Tickets metabox** — tier configuration. Each tier auto-creates (or links to) a WC product behind the scenes.
- **WC product detail page** — ticket products are flagged `virtual=yes, downloadable=no`; their stock is the ticket-tier capacity.

**Webhooks emitted on ticket events** (see §3 below): `tickets_created`, `ticket_stock_modified`.

**Tax & refunds** — entirely delegated to WC. EventON does not implement its own tax rates or refund flows. This is the right call for compliance but means **EventON cannot sell tickets without WC**.

> Screenshot: `admin-150-wc-ticket-orders.png`, `admin-121-settings-tickets.png`

### Stripe / direct payment?

The Tickets settings tab includes a "Stripe-direct" toggle (`evotx_stripe_direct=yes`) for one-click checkout that bypasses the WC cart, but it still requires WC to be installed and configured with a Stripe gateway. There is **no standalone Stripe integration** that works without WC.

---

## 2. Zoom — First-Party Meeting Integration

**Source:** `includes/integration/zoom/class-zoom.php` (`EVO_Zoom_Int` class, 517 lines).

**Auth model:** S2S (Server-to-Server) OAuth via Zoom's OAuth 2.0 endpoint. EventON ships `firebase/php-jwt` as a vendored dependency for token signing (`includes/integration/zoom/vendor/`).

**Configuration:** `Settings → General → Third-Party APIs sub-section` (loaded via `eventon_settings_3rdparty` filter, which Zoom and Webhooks both contribute to). Required fields:
- `_evo_zoom` (yes/no) — enable Zoom integration globally
- Zoom Account ID
- Zoom Client ID
- Zoom Client Secret

**Per-event use:** The "Main Event Details" metabox exposes a "Generate Zoom meeting" button (only visible when Zoom is enabled and credentials validated). Clicking it makes a server-side call to `POST /v2/users/me/meetings`, stores the resulting `join_url`, `meeting_id`, `password` in postmeta (`_evo_zoom_meeting_*`), and the meeting URL is rendered in the EventCard's "Online Event" box on frontend.

**Failure modes documented in source:**
- Invalid credentials → JSON response `{status:"bad", content: "Zoom API or OAuth Access information must be saved..."}`
- API rate limit → 429 surfaces as a generic "Failed to create meeting" admin notice
- Token expiry → automatically refreshed via the OAuth refresh flow

**Limitations:**
- One Zoom account per WP install (no per-organizer Zoom accounts)
- No webhook listening for Zoom events (registration, attendance) — purely outbound
- No alternative video providers shipped (no Google Meet, Teams, Webex)

---

## 3. Webhooks (BETA) — Outgoing Only

**Source:** `includes/integration/class-intergration-webhooks.php` (`EVO_WebHooks` class, 274 lines).

**Header copy** in the admin: *"Webhooks [BETA] — Create webhooks from EventON for these platforms: Zapier, IFTTT, Integromat, Automate.io, Built.io, Workato, elastic.io, APIANT, Webhook."*

**Trigger registry** — extensible via the `evo_webhook_triggers` filter. Each add-on can append its own triggers:

| Trigger ID | Source add-on | Fired when | Payload fields |
|------------|---------------|------------|----------------|
| `tickets_created` | `eventon-tickets` | WooCommerce order containing tickets is paid | `type`, `order_id`, `ticket_numbers` |
| `ticket_stock_modified` | `eventon-tickets` | Ticket inventory changes (sale, refund, restock) | `type`, `order_id`, `order_item_id`, `reduce_or_restock`, `event_id`, `event_repeat_index` |
| `new_rsvp` | `eventon-rsvp` | New RSVP is received | `type`, `new_rsvp_id`, `rsvp_status`, `first_name`, `last_name`, `email`, `count`, `event_id`, `event_name`, + additional |
| `rsvp_status_changed` | `eventon-rsvp` | RSVP check-in / status change | `type`, `new_rsvp_id`, `rsvp_status`, `first_name`, `last_name`, `email`, `count`, `event_id` |

The base plugin ships **zero triggers** — webhooks become useful only when Tickets or RSVP add-ons are active.

**Delivery model:**
- `wp_remote_post( $webhook_url, ['body' => $data_array, 'timeout' => 30] )`
- Synchronous, **no retry** on failure
- Body is form-encoded (`Content-Type: application/x-www-form-urlencoded`), **not JSON**
- Returns success/failure to caller but no admin notification on delivery failure
- No HMAC signing — webhook URLs themselves are the security boundary
- 200 = success; any other status = silent failure (logged in `_evo_webhook_log` postmeta if logging is enabled, but no UI to view logs)

**Storage:** Webhook configs are stored in the `evcal_options_evcal_1[evowhs]` option as a serialized array, keyed by random integer hook IDs.

**Notable gaps:**
- **No event-related triggers** — no `event_created`, `event_updated`, `event_published`, `event_deleted`. The "BETA" labeling is honest; the trigger set is narrow.
- **No incoming webhooks** — EventON doesn't listen for inbound webhooks. Calendar sync (e.g., from Stripe webhook → mark RSVP confirmed) requires custom code or a third-party automation tool.
- **No queue / retry** — a transient network blip drops the event silently.

---

## 4. iCalendar / ICS Export

**Source:** `includes/integration/class-intergration-general.php` (`EVO_Int_General` class).

**Two export modes:**

### Per-event ICS download
Each EventCard exposes an "Add to Calendar" button (toggle `ics=yes` in shortcode, default off) that triggers a same-page download of a single-event `.ics` file. URL pattern: `/?evo-ics=<event_id>&download=ics`.

The exported VEVENT includes:
- `DTSTART;TZID=...` and `DTEND;TZID=...` (uses event's `_evo_tz` IANA timezone)
- `SUMMARY` = post title
- `DESCRIPTION` = post excerpt or content (HTML stripped)
- `LOCATION` = location term name + address
- `URL` = single-event permalink
- `ORGANIZER` = organizer term name + email (if set)
- `RRULE` for recurring events (`FREQ=WEEKLY;COUNT=N`, etc.)

### Bulk site-wide ICS feed
The Settings → General page exposes a "Download all eventON events" panel with two buttons: **CSV format** and **ICS format**. The ICS button generates a feed file at `/wp-content/uploads/eventon/all-events.ics`, which can be subscribed to in Google Calendar, Outlook, or Apple Calendar.

**Subscription URL is not auto-generated for users** — admins must copy the path manually. There is no nicely-published `webcal://` URL like Tribe's Events Calendar offers.

---

## 5. REST API (Internal + Public)

### Core REST namespace `eventon/v1`

`includes/class-rest-api.php` registers two routes (one is a no-op):

- `POST /wp-json/eventon/v1/data` — single endpoint, dispatches by `evo-ajax` query arg through the `evo_ajax_rest_<action>` filter. Used by the calendar AJAX (the same payload that goes via `admin-ajax.php?action=the_ajax_hook` for non-logged-in users falls back to this REST route).
- `GET /wp-json/evo-admin/data` — returns the literal string `"Howdy!!"`. Stub.

The REST routes have **`permission_callback => return true`** — fully public reads, with permission gating happening inside the handler via the dispatched filter. This is unusual but defensible: the endpoint reads only published events.

### QR / Check-in REST namespace `eventon/<unspecified>`

`eventon-qrcode/includes/class-api.php` registers four GET routes under the `eventon` namespace (note: no version segment — they collide with the core namespace at the URL level but registration order matters):

| Route | Purpose |
|-------|---------|
| `GET /wp-json/eventon/events_list` | Events list for the check-in app |
| `GET /wp-json/eventon/attendees_list/(?P<id>...)` | Attendees for a specific event |
| `GET /wp-json/eventon/one_attendee/(?P<id>...)` | Single attendee detail (by ticket number) |
| `GET /wp-json/eventon/checkin/(?P<id>...)` | Mark an attendee checked in (HTTP GET — not idempotent in spirit, but practical for QR scanning) |

`permission_callback` is unconditionally `return true` (a TODO comment notes the intended `is_user_have_permission_to_checkin()` check is disabled). This is a security observation worth flagging in the synthesis phase: **the check-in API is fully public** if QR-Code add-on is active.

### Default WordPress REST exposure

The `ajde_events` CPT registers with `'show_in_rest' => true`, exposing standard endpoints:

| Endpoint | Status (verified) | Notes |
|----------|-------------------|-------|
| `GET /wp-json/wp/v2/ajde_events` | ✅ 200 | Lists published events with full meta |
| `GET /wp-json/wp/v2/event_type` | ✅ 200 | Term list |
| `GET /wp-json/wp/v2/event_location` | ❌ 404 | `show_in_rest=false` on this taxonomy |
| `GET /wp-json/wp/v2/event_organizer` | ❌ 404 | `show_in_rest=false` on this taxonomy |
| `GET /wp-json/eventon/v2/events` | ❌ 404 | No `v2` namespace exists |
| `GET /wp-json/eventon/v1/rsvp` | ❌ 404 | RSVP add-on does not register REST routes |

Conclusion: there is **no documented public REST API** for ticketing, RSVPs, or full event-with-meta access. Third-party integrators must use the WP core endpoints + supplementary `wp/v2/<cpt>?_fields=...` queries, or implement custom routes.

---

## 6. Page Builder Integrations

### Gutenberg / Block Editor

**Source:** `includes/integration/blocks/class-evo-blocks.php`.

EventON registers **one block** (`evo/calendar`) that wraps the shortcode generator inside a block. Choosing the block prompts for shortcode attributes via the same form as the classic-editor "Add EventON" button, then renders the equivalent shortcode in the post.

There are **no per-feature blocks** (no Slider block, Weekly View block, Tickets block). The block is a thin wrapper around the shortcode system — a known modernization gap.

### Visual Composer / WPBakery

**Source:** `includes/integration/class-intergration-visualcomposer.php`.

Registers a single VC element ("EventON Calendar") with `vc_map()`. The element parameter list mirrors the shortcode attributes. Feature-complete for the base calendar but does not expose Slider / Weekly View / Full Cal — those add-ons do not extend the VC integration.

### Elementor

**Source:** `includes/integration/elementor/class-elementor-init.php`, `elementor_widget.php`. Plus assets at `assets/lib/elementor/elementor.css|js`.

A single Elementor widget under the "EventON" category. Same shortcode-wrapping pattern as VC — no granular per-add-on widgets.

### Conclusion

All three page builders use the **same wrapper-around-shortcode pattern**. None of them expose the calendar's interactive state (filters, current month) as page-builder UI; they all dump the user back to the shortcode attribute set.

---

## 7. Maps — Google Maps + OpenStreetMap

### Google Maps (default)

**Configuration:** `Settings → General → Maps API`. Required: `evo_gmap_api_key` (Google Cloud API key with Maps JavaScript API + Geocoding API enabled). Optional: marker icon URL, zoom level, map style (`roadmap`, `satellite`, `hybrid`, `terrain`), starting zoom, custom map style JSON.

**Where maps appear:**
- EventCard "Map" box on frontend (iframe embedded with lat/lon)
- Single-event page (same map block)
- Per-event override toggle: `evcal_gmap_gen=yes` to force-render even if globally disabled

**Geocoding:** When admin saves a new Location term with an address, EventON calls the Google Geocoding API to fill `evcal_lat` / `evcal_lon`. Without an API key, this silently fails and the location stores with `0,0` coordinates.

### OpenStreetMap fallback

**Configuration:** `Settings → General → Maps API → Use OpenStreetMap API to get geolocation coordinates` toggle (`evo_geoOSM=yes`).

When enabled, geocoding uses Nominatim (OSM's free geocoder) instead of Google. **Map rendering** still uses Google iframe — OSM is geocode-only, not a Leaflet replacement. So users wanting fully Google-free deployments must override the EventCard Map box template.

---

## 8. Email — Native PHP Mail / WP Mail

EventON does **not** ship its own SMTP integration. All emails (RSVP confirmations, ticket PDFs, status-change notifications) go through `wp_mail()`. For reliable delivery, users must install a separate SMTP plugin (WP Mail SMTP, Post SMTP, etc.).

**Email templates** are configurable in:
- `Settings → RSVP tab` → email body templates (HTML supported)
- `Settings → Tickets tab` → ticket email + PDF attachment configuration

Templates support **hardcoded merge tokens** (no Mailgun/Mandrill-style templating language): `{event_title}`, `{event_date}`, `{event_url}`, `{attendee_name}`, `{ticket_number}`, etc. The token list is documented per-template in the settings UI.

**Test email capability:** The Settings → Support tab (`evcal_5`) includes a "Send test email" button that sends a hardcoded test to the WP admin email address. Useful for troubleshooting WP Mail SMTP setups.

---

## 9. CSV — Bulk Event Import & Export

### Import (`eventon-csv-importer` add-on)

**Page:** `admin.php?page=evocsv`. Single-page UI: upload a CSV, map columns to EventON postmeta keys, click Import.

**Sample CSV columns** documented:
- `event_name` (required) — `post_title`
- `event_description` — `post_content`
- `event_excerpt` — `post_excerpt`
- `start_date` — parsed into `evcal_srow` (timezone interpretation per dropdown)
- `end_date` → `evcal_erow`
- `event_color` → `evcal_event_color`
- `event_status` → `_status`
- `event_location` → creates/links `event_location` term
- `event_organizer` → creates/links `event_organizer` term
- `event_type` → creates/links `event_type` term
- `external_link` → `evcal_exlink`
- `featured` → `_featured`
- + custom column → custom postmeta key (configurable mapping)

**Limitations:**
- Single batch (no chunking for >500 events)
- No background processing / job queue
- No update mode by default — duplicate events on re-import unless explicitly matched by ID column
- No CLI command (`wp evocsv import file.csv` does not exist)

### Export

Two formats from `Settings → General → "Download all eventON events"`:
- **CSV format** — one row per event, columns mirror the import
- **ICS format** — see §4 above

Per-event CSV export is not exposed in the UI; users must filter the global CSV download and post-process.

---

## 10. Multi-language — Native + WPML

### Native multi-language (`_evo_lang` postmeta)

EventON ships a primitive multi-language system: each event has an `_evo_lang` postmeta (`L1`, `L2`, …) and the calendar accepts a `lang="L2"` attribute to filter. Strings are configured per-language under `Settings → Language tab`. Lightweight, no plugin dependency, but **only handles UI strings and event display** — not full translated event copies.

### WPML support

The base plugin's calendar shortcode JSON includes `wpml_l1`, `wpml_l2`, `wpml_l3` keys, indicating WPML is recognized as a first-party multilingual option. WPML's String Translation handles the EventON i18n strings, and translated event posts share `_wpml_translations` post-meta as usual.

There is **no Polylang integration shipped** in the base plugin. Polylang users typically rely on Polylang's CPT translation (which works because `ajde_events` is a standard CPT) but lose calendar-level language filtering.

---

## 11. Cron — WP-Cron Only

**Source:** `includes/class-cronjobs.php` (`evo_cron` class).

Scheduled tasks (all via `wp_schedule_event`):
- Daily: clean up expired RSVP holds, recalc `_completed` flag for past events
- Hourly: process scheduled-status-change events (postpone, reschedule)
- Twice-daily: refresh recurring-event materialized intervals (`repeat_intervals` postmeta) within the 2-year forward window

All run on standard WP-Cron — vulnerable to the typical "low-traffic site doesn't fire cron" issue. There is **no support for true system cron** out of the box (users must disable WP-Cron in `wp-config.php` and trigger `wp-cron.php` via OS cron themselves). EventON's documentation acknowledges this in the Diagnose sub-section.

---

## 12. SEO — Schema.org JSON-LD

**Source:** `includes/calendar/class-calendar-event-schema.php`.

EventON emits schema.org `Event` JSON-LD on:
- Single event pages (always, unless `evo_remove_jsonld=yes` for that event)
- Calendar pages (configurable: `evo_schema=yes` enables; default off to avoid duplicate schema)

**Schema fields populated:**
- `@type: Event`, `name`, `description`, `startDate`, `endDate`, `eventStatus` (`EventScheduled`, `EventCancelled`, `EventPostponed`, `EventRescheduled`, `EventMovedOnline`)
- `eventAttendanceMode` (from `_attendance_mode` postmeta) → `OfflineEventAttendanceMode`, `OnlineEventAttendanceMode`, `MixedEventAttendanceMode`
- `location` → `Place` with `address`, `geo` (lat/lon)
- `organizer` → `Organization` with name + URL
- `performer` → `Organization` (when `evo_event_org_as_perf=yes`)
- `offers` → `Offer` array if Tickets add-on active (price, currency, availability, validFrom)
- `image` → featured image URL

This is genuinely thorough — comparable to The Events Calendar Pro's schema output and better than most cheap alternatives.

---

## 13. Search — Native WordPress Search Only

EventON does **not** integrate with Algolia, Elasticsearch, SearchWP, or any premium search plugin out of the box. The `[add_eventon_search]` shortcode performs a standard WP `WP_Query` against the `ajde_events` CPT with `s=<term>`, with the calendar then re-rendering filtered.

For richer event search (typo-tolerance, faceted filtering on locations/organizers/types), users must install SearchWP and configure `ajde_events` as a search source — it works because `ajde_events` is a standard CPT, but EventON ships no first-party hooks.

---

## 14. Analytics — None Built-In

EventON ships zero analytics. There is no "events viewed" counter, no "RSVP conversion rate" dashboard, no "ticket revenue this month" widget. All analytics rely on:

- WooCommerce Reports (for tickets — covers revenue, refunds, top products)
- Google Analytics / Tag Manager (admin pastes the snippet site-wide; EventON does not push custom events to dataLayer)

No first-party event-tracking pushes to dataLayer or GA4. This is a meaningful gap for marketing-led teams.

---

## 15. CLI / Automation — wp-cli is Not Supported

There are **no `wp eventon ...` CLI commands**. The CSV importer is admin-only. Bulk event creation must happen via:
- The CSV importer UI (slow, single-batch)
- Direct SQL / `wp post create + wp post meta update` (what we did to seed Site B)
- Custom code calling `wp_insert_post` against the `ajde_events` CPT

This is a friction point for headless deployments and for migrations from other event plugins. A community PR adding `wp eventon import` and `wp eventon export` has been open since 2023 (per the repo discussion linked from the Support tab).

---

## Integration Summary Table

| Surface | Status | Configurability | First-class |
|---------|--------|-----------------|-------------|
| WooCommerce | Required for tickets | Heavy | ✅ |
| Stripe | Via WC only | None standalone | ❌ |
| Zoom | First-party, S2S OAuth | Per-event | ✅ |
| Google Meet / Teams / Webex | Not shipped | None | ❌ |
| Webhooks (out) | BETA, narrow trigger set | Per-trigger | ⚠️ |
| Webhooks (in) | Not supported | None | ❌ |
| iCalendar / ICS | Per-event + bulk feed | Toggleable | ✅ |
| REST API (public) | Internal-use only | None for third parties | ⚠️ |
| Gutenberg | Single wrapper block | Minimal | ⚠️ |
| Visual Composer / WPBakery | Single wrapper element | Minimal | ✅ |
| Elementor | Single wrapper widget | Minimal | ✅ |
| Google Maps | Required for maps | Full | ✅ |
| OpenStreetMap | Geocoding fallback only | Toggle | ⚠️ |
| Email (SMTP) | Via wp_mail() only | None | ❌ |
| CSV import | Add-on, admin-only | Column-mapping | ✅ |
| Multi-language (native) | Strings only, no full posts | Per-string | ✅ |
| WPML | Compatible | Standard CPT support | ✅ |
| Polylang | Not shipped (works as CPT) | None | ❌ |
| Cron | WP-Cron only | None | ⚠️ |
| Schema.org | Comprehensive | Per-event override | ✅ |
| Search | Native WP_Query | None | ⚠️ |
| SearchWP / Algolia | Not shipped | None | ❌ |
| Analytics / GA4 | Not shipped | Manual snippet | ❌ |
| WP-CLI | Not supported | None | ❌ |

Legend: ✅ first-class · ⚠️ partial · ❌ not shipped (requires third-party or custom code)

---

## Implications for Dateline

1. **Payments:** WooCommerce-only is too tightly coupled. Dateline should ship Stripe Connect natively and treat WC as one optional path of many. The 50ms / 10-subrequest budget on Cloudflare Workers makes synchronous `wp_remote_post` patterns nonviable anyway — webhooks must use `ctx.waitUntil`.
2. **REST surface:** EventON's narrow public REST API (basically just the WP core CPT endpoints) is a market opening. A first-class typed REST + MCP surface for Dateline events, RSVPs, tickets, and check-ins would differentiate immediately.
3. **Webhooks:** The "outgoing only, no retry, no signing" pattern is a clear weakness. Dateline's webhook delivery should sign payloads (HMAC), retry with exponential backoff, store delivery receipts, and surface failures in the UI.
4. **Page-builder support:** EventON's universal "wrap a shortcode" pattern leaves room for a Block-first design. A Dateline Calendar block, Slider block, RSVP Form block, etc. — each with full block-editor inspector controls — would be a strict UX upgrade.
5. **Cron:** WP-Cron's reliability problems are exactly what Cloudflare Workers' `cron` hook + `ctx.cron.schedule()` solves. Status transitions, hold expiry, recurring-event materialization should all be Cloudflare-native.
6. **Schema.org:** EventON gets this right. Match feature-for-feature; do not regress.
7. **i18n:** EventON's primitive `_evo_lang` system is a model **not** to follow. Dateline should rely on a single canonical event with locale-keyed string tables, not duplicate posts. WPML compatibility is table-stakes.
8. **CSV / CLI:** Ship `dateline events import` and `dateline events export` CLI from day one. Headless deployments will not tolerate admin-only batch importers.
9. **Analytics:** First-party dataLayer pushes for `event_view`, `rsvp_submit`, `ticket_purchase`, `checkin_scan`. These are cheap to ship and high-leverage for customer marketing.
10. **Security carve-outs to copy:** Refund window, cancel reason text persistence, status semantics (Cancelled/Rescheduled/Postponed/MovedOnline) — all good design choices to retain. The check-in REST API's hardcoded `permission_callback => true` is a security anti-pattern; **do not** copy.
