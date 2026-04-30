---
plugin: The Events Calendar Pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P1 — Static Analysis
source: lang/tribe-events-calendar-pro.pot (1 708 msgid strings) + src/ static analysis
---

# 03 — Feature Inventory Seed: The Events Calendar Pro 7.4.5

This document is an i18n-string–mined feature inventory. It identifies the major feature areas and the UX vocabulary used within them. It is a seed for PRO-326 (Feature inventory).

---

## 1. Recurring Events Engine

The single largest feature area (470 i18n strings). ECP implements the most comprehensive recurring events system in the WordPress events space.

### Recurrence Rule UI vocabulary

Frequencies: `Daily`, `Weekly`, `Monthly`, `Yearly`, `Once`

Interval phrasing: `Every N days/weeks/months`

Day-of-week: `Monday` through `Sunday`, abbreviated and full.

Day-of-month: `day 1` through `day 31`, ordinal expressions (`1st day`, `2nd day`, etc.)

Month positions: `1st`, `2nd`, `3rd`, `4th`, `Last` (for "last Friday of the month" patterns)

Series end conditions:
- `after N events` — count-based end
- `never` — no end
- `Series ends on this date` — explicit end date
- `Series ends` (label)

Exclusions:
- `Event will not occur:` — header for exception dates
- `Add Exclusion`, `Are you sure you want to delete this exclusion?`

Override recurrence description: `Recurrence Description` / `Use this field if you want to override the auto-generated descriptions`

### Edit-scope modal (CT1)

When editing a recurring event, ECP presents a scope selection dialog:

- `This event only` / `This occurrence`
- `All upcoming events` / `This and all upcoming events`
- `All events` / `All occurrences in the series`
- `Break from Recurring Event` / `Break from Series` — detach a single occurrence
- `Convert this occurrence to a single %s` — permanently separate one occurrence

CT1 migration prompt strings: `Get ready for the new recurring events!`, `Upgrade your recurring events.`, `Faster event editing. Smarter save options.`

### Series posts

- `Edit series`, `Assign event to series`, `Add events to Series`
- `Create or Find a Series`, `Create: <%= term %> (Draft)`
- `Condense %s Series` / `Condense events in Series` (show/hide subsequent occurrences)
- `No events available to attach to a series.`
- `Recurring Events Active`

### Recurrence description

ECP auto-generates a human-readable description of each rule (e.g., "Every week on Monday and Wednesday until December 31"). A custom override field is provided.

---

## 2. Additional Fields (Custom Attributes)

21 i18n strings.

Allows site admins to define arbitrary extra fields on events. Field types:
- `Text`, `Text Area`, `URL`, `Radio`, `Checkbox`, `Dropdown`

Admin UI strings: `Add field`, `Field Type`, `Field Label`, `Options (one per line)`, `Are you sure you wish to remove this field and its data from all events?`

Block editor flag: `Use in Block Editor` / `Include this field on all new events in the Gutenberg block editor`

Template output: `Additional %s Fields` (singular event label substituted), `Additional Fields`

---

## 3. Pro Calendar Views

ECP adds five views on top of TEC's base Day / List / Month:

| View | Slug | Description |
|---|---|---|
| Week | `week` | 7-column grid, `%1$s for week of %2$s`, `Click to select the current week`, optional `week_view_hide_weekends` |
| Photo | `photo` | Image-dominant list; `Display images as a grid on Photo View`, `Check to enforce 16:9 aspect ratio` |
| Map | `map` | Geographic scatter map; geofence-radius filter in tribe bar |
| Summary | `summary` | Dense chronological list grouped by date |
| Location | `location` | Filters events by location/address proximity |

Views are enabled/disabled via `tribeEnableViews` option. Mobile default is separately configurable.

---

## 4. Geolocation & Map View

3 direct i18n strings + substantial code surface.

Capabilities:
- Venue geocoding via Google Maps Geocoding API (requires `google_maps_js_api_key`)
- Geofence-radius search in the tribe bar (unit: miles or kilometres)
- Embedded Google Maps on venue pages (`embedGoogleMaps`, `embedGoogleMapsZoom`)
- Admin tool: `Fix geolocation data` — batch-geocodes venues missing lat/lng

UX strings: `Miles`, `Kilometres`, `Enter Location. Search for %s by Location.`, `Fixed geolocation data for %d venues`

---

## 5. Venue & Organizer Archive Pages

ECP extends TEC's Venue and Organizer CPTs with dedicated archive pages showing upcoming events.

Admin widget: `Displays a list of upcoming events at a specific venue.` (`Tribe__Events__Pro__Venue_Widget`)

Strings: `Edit Upcoming`, `Enter a venue name or ID.`, `Enter an organizer name or ID.`, `Event Venue`, `Event Series Recurrence Day of Week`

---

## 6. Virtual Events

126 strings in the `virtual` area + provider-specific strings below.

Core virtual event capabilities:
- Link any event to an online meeting URL
- Auto-detect the meeting platform from the URL
- Embed the video/meeting iframe directly on the event page
- Control visibility (everyone, logged-in, ticket holders)
- Control timing (`show_embed_at` — reveal the link N minutes before start)
- Include the virtual link in RSVP and ticket confirmation emails
- Show/hide a "Join" button with custom label
- Display virtual icon on calendar views
- Event type label: `online`, `hybrid`, `in-person`

Key UX strings: `Video or Meeting Link URL`, `Find`, `Preview`, `Meeting link with details`, `Include link in %s emails`, `Share:`

### Virtual Events — Meeting Providers

#### Zoom (48 strings)
OAuth-based account connection. Creates Zoom meetings via API.
- `Zoom Meeting`, `Add Zoom Account`, `Refresh Zoom Account`, `Remove Zoom Account`
- `The Zoom Host ID is missing to access the API.`
- Alternative hosts support

#### Google Meet (45 strings)
OAuth-based account connection. Creates Google Meet links.
- `Google Meet`, `Add Google Account`, `Refresh Google Account`, `Using multiple Google Accounts`
- `Connect your site to a Google account to generate Google Meet links`

#### Microsoft Teams (85 strings, includes Webex)
OAuth-based. Creates MS Teams meeting links.
- `Microsoft Meeting`, `Add Microsoft Account`, `Refresh Microsoft Account`
- `Connect your site to a Microsoft account to generate Microsoft Meeting links`
- **Webex** is bundled in same provider group: `Webex Meeting`, `Add Webex Account`

#### YouTube Live (26 strings)
Embed live-stream by Channel ID.
- `YouTube Channel ID`, `Autoplay Video` (with deprecation notice), `Include live chat`, `Related Videos`, `Modest Branding`, `Mute Video`

#### Facebook Live (68 strings)
Connect a Facebook Page/Group to embed a live video.
- `Facebook Live Video`, `Add Facebook Page`, connection flow: `Not Connected` → `click "Continue with Facebook" to authorize it` → `Connected` (token expiry shown)
- `How to find your Facebook App ID.`, `How to find your Facebook page/group ID.`

---

## 7. Shortcodes

5 shortcode-specific i18n strings (minimal — most shortcode UI is inherited from views).

Registered shortcodes:
- `[tribe_events]` — embeds the full calendar view; supports all view types with parameters for view, category, tag, venue, organizer, date, keyword, featured, past, tribe-bar, filter-bar, events_per_page
- `[tribe_event_inline]` — inline text replacement with event field placeholders

Calendar Embed Block (Gutenberg): wraps `[tribe_events]` in an iframe via `GET /tec/v1/events/calendar-embed`; parameters identical to shortcode.

---

## 8. Widgets

274 i18n strings in the widget area — one of the biggest surface areas.

Registered widgets:
- **Events List Widget** — `Upcoming Events`, configurable count, category filter, venue filter, date range, show/hide: cost, venue, category
- **Events Calendar Widget** — mini-calendar navigation; `%1$s Calendar`
- **Countdown Widget** — countdown timer to next occurrence
- **Venue Widget** (`Tribe__Events__Pro__Venue_Widget`) — upcoming events at a specific venue
- **Featured Venue Widget** — `Events Featured Venue`

Widget settings strings: `Title:`, `Number of events to show:`, `Price`, `Venue`, `Street`, `City`, `State (US) Or Province (Int)`, `All Events Link`, `Before HTML`, `After HTML`

---

## 9. Events Manager (CT1 Admin)

Admin page for managing recurring event series and occurrences. Accessible from `Events → Manager`.

Key strings: `Events Manager`, `Edit Upcoming`, `No Default`, `A valid event could not be found.`, `Condense events in Series`

Provides:
- List view of all series and their occurrence counts
- Scope-aware editing (this / upcoming / all)
- Split-occurrence modal

---

## 10. CSV Importer Integration

ECP extends the base TEC CSV/aggregator importer with:
- Recurrence rule columns
- Geolocation overwrite column (`_VenueOverwriteCoords`)
- Virtual events fields

---

## 11. Page Builder Integrations

Full Elementor integration (widgets): `Event Additional Fields`, `Related Events` (with CSS class filter hooks).

Also integrated: Beaver Builder, Avada Fusion Builder, Brizy Builder, SiteOrigin Page Builder.

---

## 12. SEO

Yoast SEO sitemap customisation for recurring events: configurable start/end date window, items-per-page, latest-modified override. Prevents sitemap bloat from materialised occurrences.

---

## 13. Event Status

`tec_event_status_enabled` controls an "event status" feature (cancelled, postponed, moved online). Virtual events extends this with a `moved online` status label.

---

## 14. Settings Additions

ECP adds settings to TEC's admin settings tabs:

- **Defaults tab**: default venue, default organizer (pre-populate new events)
- **Display tab extensions**: `Hide Subsequent Recurrences` default, `User Can Toggle`, `Week View Hide Weekends`, `Photo View Force Grid`, `Hide Related Events`, `Hide Location Search`, `Live Filters Update`, `Mobile Default View`, `Month Event Amount`
- **General tab extensions**: Google Maps API key, Geofence defaults, Geoloc rewrite slug

---

## 15. iCal / Export Extensions

Virtual events adds a location-override export field. Recurrence uses RRULE/RDATE/EXRULE in the iCal export (CT1 path). Calendar Links (Add to Google, Outlook, iCal) inherit occurrence-specific dates.

---

## Feature Count Summary

| Feature Area | i18n Strings | Complexity Estimate |
|---|---|---|
| Recurring Events Engine | 470 | Very High |
| Widgets | 274 | High |
| Virtual Events (all providers) | ~400 total | High |
| Settings Additions | 41 | Medium |
| Series / CT1 | 45 + 12 | Medium |
| Pro Views (5) | ~100 in other | High |
| Additional Fields | 21 | Medium |
| Map / Geolocation | ~27 | Medium |
| Page Builder Integrations | ~50 | Medium |
| Shortcodes | 5 + view strings | Medium |
| CSV Importer | — | Low |
| SEO | ~15 | Low |
| Event Status | ~10 | Low |
