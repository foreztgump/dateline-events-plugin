---
plugin: events-calendar-pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P2 — Feature Inventory
doc: 06-integrations
site: Site A — dateline-site-a.ddev.site (DDEV, WordPress 6.9.4, PHP 8.2)
notes: >
  Live walkthrough of the Settings → Integrations panel on Site A
  combined with static analysis of src/Events_Pro/Integrations/,
  src/Tribe/Integrations/, src/Events_Virtual/Integrations/, and
  src/Tribe/Virtual/. Live OAuth flows (Zoom, Google, Microsoft,
  Facebook) not exercised — they require valid OAuth client credentials
  not provisioned in the research environment. Provider screens and
  field surfaces are documented from admin-views/{provider}/ and the
  i18n strings mined in 03-features.md § 6 (Virtual Events).
---

# Events Calendar Pro 7.4.5 — Integration Touchpoints

This doc enumerates every external system ECP integrates with, organised by category. Integrations fall into three groups:

1. **Meeting / video providers** — Zoom, Google Meet, Microsoft Teams, Webex, YouTube Live, Facebook Live (the Virtual Events bundle, ECP-included since 6.0)
2. **Mapping / geocoding** — Google Maps Geocoding + Maps JS APIs
3. **WP/PHP plugin integrations** — WooCommerce (via Event Tickets Plus), Elementor, Beaver Builder, Avada Fusion, Brizy, SiteOrigin, WPML, Yoast SEO, Filter Bar, Event Aggregator, Promoter, Eventbrite Tickets, Event Automator (Zapier / Power Automate)

For tickets-specific integrations (WooCommerce, Stripe, PayPal) the integration is **delegated to Event Tickets / Event Tickets Plus**, which is a separate plugin family. ECP itself does not handle payments. This doc surfaces the touchpoints and where ECP defers.

Screenshot references: `screenshots/admin-014-settings-integrations.png` and `admin-020-024` per provider section.

---

## 1. Meeting / Video Providers (Virtual Events Bundle)

The Virtual Events module ships inside ECP 7.4.5 (formerly a separate paid add-on). It registers six provider connectors that share a common pattern:

**Common provider pattern**
- OAuth-based connection (except YouTube which is unauthenticated by Channel ID)
- Account stored under encrypted post meta + plugin-scoped option key (encryption via `defuse/php-encryption`)
- Per-event "auto-create meeting" button on the event editor (when the connector is configured) → calls the provider API to mint a new meeting URL and writes it to `_tribe_events_virtual_url`
- Auto-detection: paste any provider URL into the event metabox and ECP auto-classifies the source (`_tribe_events_virtual_autodetect_source`)

### 1a. Zoom (`src/Tribe/Virtual/Meetings/Zoom/`)

Settings location: *Settings → Integrations → Zoom* (`screenshots/admin-020-integrations-zoom.png`).

**Connection flow:**
- `Add Zoom Account` — opens StellarWP-hosted OAuth bridge → Zoom OAuth consent screen → redirects back with token; token encrypted and stored under `tribe_zoom_*` plugin option keys
- `Refresh Zoom Account`, `Remove Zoom Account` — token lifecycle management
- Multiple Zoom accounts supported (host pool); the editor shows an account selector when multiple are connected

**Per-event metabox fields (when Zoom connector active):**
- `Zoom Meeting` toggle (creates a Zoom meeting on save)
- Meeting type: `Meeting` / `Webinar` (when the Zoom account is licensed for webinars)
- Host: dropdown of connected Zoom users
- Alternative hosts: multi-select of secondary hosts
- `Find` / `Preview` controls — re-fetch meeting details from Zoom API

**REST surface:** Zoom callbacks land at `/_emdash`-style WP REST routes registered under the tec namespace; see `src/Events_Virtual/Meetings/Zoom/REST/` (Pro 7.4.5 has these in the legacy Tribe path: `Tribe__Events__Virtual__Meetings__Zoom__Api`).

**Error vocabulary** (i18n strings, `03-features.md` § 6):
- `The Zoom Host ID is missing to access the API.`
- `The OAuth token has expired. Refresh the account.`

### 1b. Google Meet (`src/Tribe/Virtual/Meetings/Google/`)

Settings: *Integrations → Google Meet* (`admin-021-integrations-google.png`).

**Connection flow:**
- `Add Google Account` — Google OAuth via StellarWP-hosted bridge
- Multiple Google accounts supported (`Using multiple Google Accounts` admin help text)
- Token refreshed on demand via `Refresh Google Account`

**Per-event metabox:**
- `Google Meet` toggle — creates a Google Calendar event with a Meet link via Calendar API; URL written to `_tribe_events_virtual_url`
- "Connect your site to a Google account to generate Google Meet links" — empty-state message when no account is linked

### 1c. Microsoft Teams + Webex (`src/Tribe/Virtual/Meetings/Microsoft/` + `src/Tribe/Virtual/Meetings/Webex/`)

The two Microsoft-family providers share one section because Webex is part of Cisco's Microsoft-equivalent ecosystem and ECP groups them in the same admin block (`admin-022-integrations-microsoft.png`).

**Microsoft Teams connection flow:**
- `Add Microsoft Account` — Microsoft Graph OAuth (multitenant)
- `Refresh Microsoft Account`, `Remove Microsoft Account`
- "Connect your site to a Microsoft account to generate Microsoft Meeting links"

**Webex connection flow:**
- `Add Webex Account` — Webex OAuth
- Webex sub-section appears below MS Teams within the same provider card

**Per-event metabox:**
- `Microsoft Meeting` toggle / `Webex Meeting` toggle — when active, ECP creates the meeting via Graph or Webex API and stores URL

### 1d. YouTube Live (`src/Tribe/Virtual/Meetings/YouTube/`)

Settings: *Integrations → YouTube* (`admin-023-integrations-youtube.png`).

YouTube is **unauthenticated** — it identifies a stream by Channel ID and embeds the live player.

**Settings fields:**
- `YouTube Channel ID` (text input)
- `Autoplay Video` (with deprecation notice: *"YouTube has deprecated unmuted autoplay; this option only works with `Mute Video` checked"*)
- `Mute Video` (boolean)
- `Modest Branding` — hides YouTube logo in the player chrome
- `Include live chat` — embeds the YouTube Live chat sidecar
- `Related Videos` — shows recommended videos at end of stream

**Per-event:** the event metabox accepts a YouTube URL directly; auto-detection sets `_tribe_events_virtual_video_source = 'youtube'`. The single-event template renders the YouTube embed iframe at view time.

### 1e. Facebook Live (`src/Tribe/Virtual/Meetings/Facebook/`)

Settings: *Integrations → Facebook Live* (`admin-024-integrations-facebook.png`).

**Connection flow:**
- Requires a Facebook App (Facebook for Developers). Site admin enters:
  - `Facebook App ID`
  - `Facebook App Secret`
  - `Redirect URL` — generated by ECP, copied into the FB App config
- `How to find your Facebook App ID.` link to KB
- `Add Facebook Page` — OAuth into a Facebook Page or Group (`How to find your Facebook page/group ID.`)
- Connection states (per i18n strings):
  - `Not Connected` → click "Continue with Facebook" to authorize → `Connected` (token expiry shown)

**Per-event:**
- `Facebook Live Video` toggle on the event metabox
- Embed renders Facebook's Live player iframe
- Token-expiry warning shown if Page token is older than 60 days (Facebook policy)

### 1f. Other / Generic URL

If a virtual event URL is set but no provider matches the autodetect, `_tribe_events_virtual_video_source = 'other'`. The single-event template falls back to a simple `Join` link.

---

## 2. Mapping & Geolocation

**Provider:** Google Maps Platform (Maps JavaScript API + Geocoding API).

**Settings:** *Display → Maps* sub-tab and *General → APIs* (Google Maps JS API key field).

**Touchpoints in ECP:**

| Where | Behavior |
|---|---|
| Venue edit screen | Address fields → Geocoding API → lat/lng written to `_VenueLat` / `_VenueLng` (manual override via `_VenueOverwriteCoords`) |
| Single-venue page | Embedded Google Map (Maps JS) when `embedGoogleMaps` true |
| Single-event page (with venue) | Embedded Google Map at venue address |
| Map view (`/events/map/`) | Maps JS scatter map with venue markers |
| Tribe Bar geofence search | `Enter Location. Search for events by Location.` — reverse-geocodes input string to lat/lng, then filters by `geoloc_default_geofence` radius |
| Admin tool: `Fix geolocation data` | Batch geocode all venues missing lat/lng (button on Tools page) |

**Required API key:** `google_maps_js_api_key` (option). Without it, map embeds gracefully degrade to a static "Get Directions" link.

**Cost note:** Google Maps charges per geocoding call and per map load. ECP has no built-in caching of geocoded results beyond the per-venue stored lat/lng (one geocode per venue lifetime). Map loads are uncached.

---

## 3. Ticketing — Event Tickets / Event Tickets Plus

**Critical architecture point:** ECP does **not** ship payment integration. All ticketing concerns delegate to the **Event Tickets** plugin family:

- **Event Tickets** (free) — RSVPs, free tickets
- **Event Tickets Plus** (paid) — paid tickets, WooCommerce integration

ECP exposes upsell surfaces for these and implements compatibility layers in `src/views/compatibility/event-tickets/` so that single-event templates render Event Tickets metaboxes/output without conflict.

### Touchpoints

| Surface | Source |
|---|---|
| Event editor admin notice: "Start selling tickets to your Events" | TEC base, with ECP's `tribeAdminTicketsPromoCard()` |
| Event editor metabox: "Tickets" (when Event Tickets active) | Event Tickets — ECP renders inline |
| Setup Guide step: `Event Tickets — Are you planning to sell tickets to your events?` → `Install Event Tickets` | TEC Setup Guide |
| Single-event template: ticket-purchase block | `src/views/compatibility/event-tickets/blocks/rsvp/v2/` and `tickets/v2/` |
| Filter Bar: `Cost` filter (when tickets present) | Filter Bar plugin reads ticket prices |

### Payment processors (delegated to Event Tickets Plus)

When ETP is active, payment processors connect through ETP's settings (not visible from ECP). Supported by ETP:

- **WooCommerce** — gateway delegation; tickets become `shop_order` items; WC's full payment processor stack applies (Stripe, PayPal, Square, Authorize.net, etc.)
- **Stripe** (direct) — ETP's first-party Stripe gateway
- **PayPal** (direct) — ETP's first-party PayPal Smart Buttons / PayPal Commerce
- **Apple Pay / Google Pay** — via Stripe gateway

ECP's only direct payment-touching code is virtual-event ticket-holder gating: if `_tribe_events_virtual_show_embed_to = 'ticket-holders'`, ECP queries Event Tickets to check whether the current user holds a ticket, then conditionally renders the embed.

---

## 4. Event Aggregator (CSV / iCal / Google Calendar / Meetup / Eventbrite Import)

**Provider:** Event Aggregator (StellarWP paid service for live origins; CSV + iCal URL are free).

**Settings:** *Settings → Imports* tab (`admin-013-settings-imports.png`).

**ECP additions to Aggregator:**
- Recurrence rule columns in CSV import
- `_VenueOverwriteCoords` column for manual lat/lng
- Virtual event field columns
- Aggregator UI accessible from `Events → Import`

**Sources:**

| Source | Free / Paid | Notes |
|---|---|---|
| CSV file upload | Free | Per-column field mapping; supports recurrence and virtual columns (ECP) |
| iCalendar URL | Free | Periodic re-fetch; supports RRULE/EXRULE |
| URL (generic ICS feed) | Paid (Aggregator) | Same as iCalendar but with auth-headers support |
| Google Calendar | Paid (Aggregator) | OAuth into a Google Calendar |
| Meetup | Paid (Aggregator) | Meetup API key |
| Eventbrite | Paid (Aggregator) | Eventbrite OAuth |

**Sync mode:** scheduled (hourly / daily / weekly / monthly) with manual "Run Now"; conflict resolution policies per source (preserve local edits / overwrite / skip duplicates).

---

## 5. Eventbrite Tickets (separate add-on)

**Provider:** Eventbrite (separate StellarWP-paid plugin: `eventbrite-tickets`).

When active, exposes:
- "Eventbrite event" linked-post metabox on each TEC event
- Ticket inventory pulled from Eventbrite API
- Order export: Eventbrite → TEC attendee list (read-only sync)

ECP's role: compatibility templates in `src/Tribe/Integrations/` ensure Eventbrite's frontend output coexists with ECP views.

---

## 6. Filter Bar (separate add-on)

**Provider:** The Events Calendar Filter Bar (StellarWP-paid: `the-events-calendar-filterbar`).

When active:
- Adds *Settings → Filters* tab — manage which filters are surfaced and their order
- Adds horizontal multi-filter row above each calendar view: Date, Category, Tag, Cost, Organizer, Venue, Custom Field, Distance (Map only)
- Live AJAX filter updates when `liveFiltersUpdate` is on
- ECP integration: APM Filters API (`src/Tribe/APM_Filters/`) so ECP's recurrence and Pro view filters cooperate with Filter Bar

Hooks observed:
- `tec_events_pro_init_apm_filters` — when ECP registers its APM filters

---

## 7. Promoter (separate add-on)

**Provider:** TEC Promoter — StellarWP-paid email marketing add-on.

When active:
- Adds top-bar `Promoter` admin link
- Triggers email broadcasts on TEC actions: `tribe_events_event_save`, attendee state transitions, etc.
- ECP role: the action hook surface (see `02-hooks.md` § 2) is what Promoter listens on; ECP fires events for save/delete/series-update lifecycle

---

## 8. Page-Builder Integrations

ECP ships first-party widgets for five page builders. Source: `src/Events_Pro/Integrations/Plugins/{builder}/`.

### 8a. Elementor + Elementor Pro (`src/Events_Pro/Integrations/Plugins/Elementor/`)

Tested up to Elementor 3.23.1 / Pro 3.23.0 (per `00-overview.md`).

Widgets registered in Elementor's `tec` category:
- **Event Additional Fields** — Renders Additional Fields output for the current event in a styled block; CSS class filter hooks for theming
- **Related Events** — 3-up grid of related events; CSS class filter hooks
- (TEC base widgets) Event Title, Event Date, Event Cost, Event Venue, Event Organizer, Event Image — extended by ECP for recurring/virtual rendering

### 8b. Beaver Builder (`src/Tribe/Integrations/Beaver_Builder/`)

Beaver-specific module renderers + style override path.

### 8c. Avada Fusion Builder (`src/Tribe/Integrations/Fusion/`)

Fusion-specific element renderers.

### 8d. Brizy Builder (`src/Tribe/Integrations/Brizy_Builder/`)

Brizy-specific element renderers.

### 8e. SiteOrigin Page Builder (`src/Tribe/Integrations/Site_Origin/`)

Bridge to SiteOrigin widget API.

---

## 9. WPML Multilingual

**Provider:** WPML (`sitepress-multilingual-cms`).

Source: `src/Tribe/Integrations/WPML/` and `src/Events_Pro/Custom_Tables/V1/Integrations/WPML/`.

When WPML is active:
- Per-language event duplication (translate event title/content to other languages while preserving `_EventStartDate`, `_EventVenueID`, etc.)
- Translated CT1 occurrences resolve to the language-specific permalink (CT1-aware integration is the harder of the two — implemented in `Custom_Tables/V1/Integrations/WPML/Provider`)
- Series titles translatable
- Custom-fields admin works per language
- Compat with both `String Translation` and `Media Translation`

Compatibility caveats (from i18n strings):
- "Multilingual support: WPML compatibility" — string in admin help

---

## 10. Yoast SEO

**Provider:** Wordpress SEO by Yoast (`wordpress-seo`).

Source: `src/Tribe/Integrations/WP_SEO/`.

When Yoast is active:
- Adds `Events` tab to Yoast's sitemap settings
- Sitemap generation for recurring events: configurable start-date and end-date window (avoids dumping every materialised occurrence into the sitemap)
- Items-per-page in the events sitemap (default 1000; higher cap reduces sitemap chunking)
- Latest-modified override — uses `_EventStartDate` rather than `post_modified` for `<lastmod>` so search engines re-crawl when an event date changes
- Schema.org event markup: rich Event schema (`@type: Event`) populated from event meta + recurrence representation as `eventSchedule`/`Schedule`
- Facebook OpenGraph + Twitter card: pulls from event featured image and excerpt

---

## 11. Event Automator (Zapier / Power Automate)

**Provider:** Event Automator (StellarWP-paid: `event-automator`).

Source: `src/Tribe/Integrations/Event_Automator/`.

When active:
- Exposes Zapier triggers and Power Automate connectors
- ECP supplies recurrence-aware payloads (each occurrence is a separate trigger payload, not just the series parent)
- Compat layer in `src/Events_Pro/Compatibility/Event_Automator/` ensures CT1 occurrence IDs serialize correctly

---

## 12. Custom Tables V1 (CT1) — Internal "Integration"

CT1 isn't an external integration but it is a major *internal* migration boundary that affects every other integration: any third-party code reading recurring events MUST detect whether `Custom_Tables_V1` is active and read from `tec_events` / `tec_occurrences` accordingly.

**Detection:** filter `tec_events_custom_tables_v1_enabled` (returns boolean).

**Documented compatibility shims:**
- Filter Bar — APM filter compat in `src/Events_Pro/Custom_Tables/V1/Integrations/APM/`
- WPML — language-aware CT1 in `src/Events_Pro/Custom_Tables/V1/Integrations/WPML/`
- Event Aggregator — CSV/iCal imports route through CT1 in `src/Events_Pro/Custom_Tables/V1/Integrations/Aggregator/`

---

## 13. PHP / Composer Dependencies

From `00-overview.md` § Dependency Map:

| Library | Version | Purpose |
|---|---|---|
| `defuse/php-encryption` | v2.4.0 | Symmetric encryption of OAuth tokens for meeting providers |
| `paragonie/random_compat` | v9.99.100 | PHP 7 polyfill for `random_bytes()` (still loaded for back-compat) |

Both are bundled inside ECP's `vendor/` and loaded via Composer autoloader.

---

## 14. Hard Dependency

**The Events Calendar (TEC) base plugin ≥ 6.11.1** is a hard dependency. ECP refuses to boot if TEC is missing. TEC contributes:

- Post types: `tribe_events`, `tribe_venue`, `tribe_organizer`
- CT1 base tables: `tec_events`, `tec_occurrences`
- View V2 engine + base templates
- Common assets (Tribe Common library, the parent of all StellarWP plugins)
- REST namespace: `tec/v1`

ECP's `Plugin_Register.php` enforces the version check and shows the admin notice *"To begin using Events Calendar Pro, please install (or upgrade) and activate Events Calendar Pro (X.X.X+)"* when TEC drifts out of range.

---

## 15. Optional Plugin Family (StellarWP add-ons)

Every plugin below is an optional separately-licensed extension to ECP. None are required, but each unlocks specific functionality:

| Plugin | Slug | Purpose |
|---|---|---|
| Event Tickets | `event-tickets` | RSVPs, free tickets |
| Event Tickets Plus | `event-tickets-plus` | Paid tickets, WooCommerce integration |
| Filter Bar | `the-events-calendar-filterbar` | Multi-filter UI |
| Event Aggregator | `event-aggregator` | iCal/Google/Meetup/Eventbrite import |
| Promoter | `promoter` | Email marketing automation |
| Eventbrite Tickets | `eventbrite-tickets` | Eventbrite read-only sync |
| Community Events | `events-community` | Visitor event submission |
| Event Automator | `event-automator` | Zapier / Power Automate |

ECP's *Settings → Add-Ons* page (`admin-016-settings-addons.png`) is the upsell index for the family.

---

## 16. Integration Surfaces Summary (one-line view)

| External system | Direction | Settings location | ECP source path |
|---|---|---|---|
| Zoom | OAuth, REST out (create meetings) | Integrations → Zoom | `src/Tribe/Virtual/Meetings/Zoom/` |
| Google Meet | OAuth, REST out (create meetings) | Integrations → Google Meet | `src/Tribe/Virtual/Meetings/Google/` |
| Microsoft Teams | OAuth, Graph API | Integrations → Microsoft | `src/Tribe/Virtual/Meetings/Microsoft/` |
| Webex | OAuth | Integrations → Microsoft | `src/Tribe/Virtual/Meetings/Webex/` |
| YouTube Live | Embed only (Channel ID) | Integrations → YouTube | `src/Tribe/Virtual/Meetings/YouTube/` |
| Facebook Live | OAuth (FB App) | Integrations → Facebook | `src/Tribe/Virtual/Meetings/Facebook/` |
| Google Maps (Geocoding + JS) | API-key, REST out | General → APIs / Display → Maps | `src/Tribe/Geo_Loc.php` |
| WooCommerce | via Event Tickets Plus | (delegated) | `src/views/compatibility/event-tickets/` |
| Stripe / PayPal | via Event Tickets Plus | (delegated) | (delegated) |
| Eventbrite | via Eventbrite Tickets / Aggregator | Imports / Add-ons | (delegated) |
| Meetup | via Event Aggregator | Settings → Imports | (delegated) |
| Google Calendar | via Event Aggregator + iCal export endpoint | Settings → Imports | `src/Tribe/iCal.php` |
| Outlook 365 / Outlook Live | iCal subscribe URL + WebCal protocol | (per-view "Subscribe to calendar") | `src/Tribe/iCal.php` |
| iCal feed (consumers) | Outbound .ics endpoint | (per-view "Subscribe to calendar") | `src/Tribe/iCal.php` |
| Elementor | Widget bundle | (in Elementor editor) | `src/Events_Pro/Integrations/Plugins/Elementor/` |
| Beaver / Avada / Brizy / SiteOrigin | Widget bundles | (in respective builders) | `src/Tribe/Integrations/{Builder}/` |
| WPML | Compat layer | (in WPML admin) | `src/Tribe/Integrations/WPML/` + `Custom_Tables/V1/Integrations/WPML/` |
| Yoast SEO | Sitemap + schema | Yoast → Sitemap → Events | `src/Tribe/Integrations/WP_SEO/` |
| Filter Bar | APM filter API | Settings → Filters | `src/Tribe/APM_Filters/` |
| Promoter | Action-hook listener | (Promoter admin) | (delegated; ECP fires hooks) |
| Event Automator | Zapier / Power Automate | (Event Automator admin) | `src/Events_Pro/Compatibility/Event_Automator/` |

---

## Cross-References

- Hooks fired during integration boots: `02-hooks.md` § Boot / Lifecycle
- Hooks fired by Virtual Events: `02-hooks.md` § Virtual Events
- Postmeta keys written by virtual integrations: `01-data-model.md` § 3b (Virtual Events meta)
- Settings keys for integrations: `01-data-model.md` § 4 (Options)
- Provider-specific UX vocabulary: `03-features.md` § 6 (Virtual Events — Meeting Providers)
