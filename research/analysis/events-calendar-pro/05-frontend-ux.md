---
plugin: events-calendar-pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P2 — Feature Inventory
doc: 05-frontend-ux
site: Site A — dateline-site-a.ddev.site (DDEV, WordPress 6.9.4, PHP 8.2)
notes: >
  Live walkthrough on Site A with TEC base 6.11.1 + ECP 7.4.5. Calendar
  views render correctly with full chrome (search bar, view selector,
  date navigator, subscribe-to-calendar widget) but show empty-state on
  Site A because CT1 occurrence-permalink resolution requires the full
  save pipeline that direct postmeta seeding bypasses. Single-event
  template structure documented from src/views/v2/single-event/ + the
  ECP overrides in src/views/v2/. View-specific layouts derived from
  src/views/v2/{day,list,month,week,photo,map,summary,location}/.
---

# Events Calendar Pro 7.4.5 — Frontend UX

ECP renders calendar views via the **TEC V2 view engine** (introduced in TEC 5.x). Templates live in `src/views/v2/` and override TEC base templates of the same name. Each view is an enable/disable switch in *Settings → Display → Calendar*.

Screenshots referenced as `screenshots/frontend-NNN-*.png`.

---

## 1. Common Calendar Chrome (all views)

Visible across every enabled view:

**Top bar — search + view selector**
- Search input: `Search for events` (placeholder)
- `Find Events` primary CTA button (submit)
- View dropdown (right side): the active view's name + chevron — clicking expands the list of enabled views (List, Month, Day, Week, Photo, Map, Summary)

**Date navigator**
- `< / >` chevrons to navigate previous/next period
- `Today` button (resets to today)
- Date range label — clickable to open a date-jump popover (`April 2026`, `April 27 – May 3 2026`, etc.)

**Empty-state row** (when no events in current range)
- Icon (`tribe-events-c-messages__message-icon`) + message:
  - `There are no upcoming events.`
  - `There are no events in this date range.`

**Bottom bar**
- `< Previous Events` / `Next Events >` pagination
- `Subscribe to calendar ▾` dropdown — exposes export links: **Google Calendar** (oneoff), **iCalendar** (download .ics), **Outlook 365** / **Outlook Live**, **Export .ics file**

These elements are rendered by partial templates `src/views/v2/components/events-bar.php`, `src/views/v2/components/top-bar.php`, `src/views/v2/components/messages.php`, `src/views/v2/components/subscribe-to.php`.

---

## 2. Default Calendar URL — `/events/`

`screenshots/frontend-001-default.png`

Resolves to the calendar's default view configured in *Settings → Display → Calendar → Default view*. On Site A this is **Month View**. Heading: `April 2026 ▾`. Renders the full month grid with empty cells (no events visible due to CT1 permalink/query state).

The same URL on mobile resolves to the *mobile default view* (separate setting), e.g., List view on phones, Month view on tablets/desktop.

---

## 3. List View — `/events/list/`

`screenshots/frontend-002-list.png`

A vertically stacked list of events.

**Layout** (per source `src/views/v2/list/`):
- Heading row: `Today` button + date label (`Upcoming ▾`) + view selector
- Per-event card:
  - Date strip (left rail) — month abbrev + day number, optionally `Recurring` badge
  - Featured image thumbnail (small, left or right depending on `image_alignment` setting)
  - Title (`<a class="tribe-events-calendar-list__event-title-link">`)
  - Date/time line: `8:00 AM – 9:30 AM` or `April 12 @ 8:00 AM – April 14 @ 5:00 PM`
  - Venue line (when set): `Soundcheck Hall, 123 Main St, Portland OR`
  - Cost chip (when set): `Free` / `$25` / `$199 – $499`
  - Description excerpt (first 55 words, configurable)
  - Featured badge (gold star) when `_tribe_featured` set
  - Recurring icon when `has_recurrence`
  - Virtual icon (camera glyph) when `_tribe_virtual_events_type=online|hybrid`

**Pagination:** Previous Events / Next Events at bottom.

**Filter Bar (when active):** horizontal filter row above the list — Date, Category, Tag, Cost, Organizer, Venue, Other (custom-fields).

---

## 4. Month View — `/events/month/`

`screenshots/frontend-003-month.png`

Traditional 7×5 (or 6) calendar grid.

**Layout:**
- Header row: `MON | TUE | WED | THU | FRI | SAT | SUN` (configurable start of week per WP option)
- Today's day cell highlighted (blue text, blue bottom border)
- Out-of-month days greyed out (Apr 30 / May 1–3 in the screenshot)
- Each day cell shows up to *N* event tiles (default 3, configurable in *Display → Calendar → Month view events per day*)
  - Tile shows colored bar (category color), event title, start time
  - Multi-day events span horizontally across cells with rounded ends
- Day number is clickable → drill-down to Day view
- "+N more" link when overflow → opens a daily popover with the full list

**Mobile:** collapses to a single-column list grouped by date with a date-strip "stripe" on the left.

**Caching:** when *Settings → General → Enable the Month View Cache* is on, the month HTML is stored in transients (`_transient_tribe_events_month_*`). Invalidated on event save / category change.

---

## 5. Day View — `/events/day/{date}/`

(captured as `frontend-004-day.png` — 502K = 404 from missing date param; the view itself works at `/events/day/2026-05-15/`)

**Layout:**
- Heading: full date with day name (`Friday, May 15, 2026`)
- Events listed chronologically by start time
- Hour-grouped layout (each hour as a labelled section)
- All-day events at the top in a separate `All-day` row
- Same per-event card structure as List view

---

## 6. Week View (ECP) — `/events/week/`

`screenshots/frontend-005-week.png`

7-column horizontal grid with hourly rows (a "calendar app" layout).

**Layout** (visible in the screenshot, week of April 27 – May 3 2026):
- Column header per day: weekday abbreviation + day number (`MON 27 | TUE 28 | …`)
- Today's column header highlighted (in screenshot, `THU 30` is bolded)
- Left rail: hour labels (`1:00 am`, `2:00 am`, `3:00 am`, …, `12:00 pm`, …)
- Body: 7 vertical lanes, hourly horizontal grid lines
- Events render as colored blocks positioned by start time, height proportional to duration
- All-day events render in a separate strip across the top of the grid
- Multi-day events span multiple columns

**Settings affecting Week view (ECP):**
- `week_view_hide_weekends` — drop Sat/Sun columns (enables Mon–Fri 5-column layout)
- Hour range — auto-zoomed by event density; manual range configurable via filter `tribe_events_week_view_hour_range`

The "This Week" button replaces the generic "Today" CTA on this view.

---

## 7. Photo View (ECP) — `/events/photo/`

`screenshots/frontend-006-photo.png`

Image-dominant grid, intended for visually-led event sites (concerts, exhibitions, food).

**Layout** (per source `src/views/v2/photo/`):
- Grid of cards (responsive: 1/2/3 columns by viewport)
- Each card:
  - Featured image (force-cropped to 16:9 if `photo_view_force_grid` is on)
  - Date strip overlay (top-left of image) — month abbrev + day
  - Title below image
  - Date/time + venue lines
  - Cost chip (bottom-right corner)

**Empty state** (in screenshot): `Upcoming ▾ — There are no upcoming events. — < Previous Events | Next Events > — Subscribe to calendar ▾`.

**ECP-only setting:** *Display → Calendar → Display images as a grid on Photo View* (forces 16:9 crop and equal-height cards).

---

## 8. Map View (ECP) — `/events/map/`

`screenshots/frontend-007-map.png`

Geographic scatter map combined with a list pane.

**Layout** (per source `src/views/v2/map/`):
- Top bar: search input + "Search by Location" geofence input + radius dropdown (Miles / Kilometres) + Find Events
- Map pane (right): Google Maps embed with markers per event venue
- List pane (left): standard list-view event cards; clicking a card pans the map to its venue and opens an info window
- Cluster markers when multiple events share a venue or markers overlap at zoom level
- "Geofence radius" filter — defaults to value of `geoloc_default_geofence` site option

**Settings affecting Map:**
- `google_maps_js_api_key` — required for live geocoding + map render
- `embedGoogleMaps` / `embedGoogleMapsZoom` — embed and default zoom
- `geoloc_default_geofence` (km) + `geoloc_default_unit`

**Empty state** (screenshot): `Upcoming ▾ — There are no upcoming events.` (no map renders when there are no events with geocoded venues).

---

## 9. Summary View (ECP) — `/events/summary/`

`screenshots/frontend-008-summary.png`

Dense chronological list grouped by date — a more compact alternative to List view.

**Layout:**
- Date sub-headings (e.g., `Tuesday, May 12 2026`) followed by stacked event rows
- Event row: time | title | venue | cost (single line, hover-expand for description)
- No featured images by default
- Designed for high event-density sites (multiple events per day)

**Settings affecting Summary:** uses `postsPerPage` and date-range filters from URL.

---

## 10. Location View (ECP) — `/events/location/{place}/`

Geographic-search-driven view (different from Map: text-based, no map render).

**Layout:**
- Heading: `Events in {searched location}`
- Mile/km dropdown selector for geofence
- Event list filtered to within radius
- "Find Events near another location" search input

Powered by the same `geoloc_default_geofence` system. Surfaced through the tribe-bar's `Enter Location. Search for events by Location.` field.

---

## 11. Single Event Template

Single-event template `src/views/v2/single-event.php` aggregates partials. Sections, top to bottom:

### 11a. Title bar
- Event title (`<h1>`)
- Status pill (when `_EventStatus` set): `Cancelled`, `Postponed`, `Moved Online` — badge with colored background
- Recurring icon + "Recurring" badge when applicable

### 11b. Schedule strip
- Start/end date and time, formatted per *Display → Date & Time*
- Time zone label (when `tribe_events_timezones_show_zone` is true)
- All-day indicator (when `_EventAllDay`)
- Multi-day indicator: `April 12 @ 8:00 am – April 14 @ 5:00 pm`

### 11c. Featured image
- Standard WP featured image (full-width hero)
- Alt text from media library

### 11d. Body content
- TinyMCE content from `post_content`
- Block editor blocks (when block editor used) — datetime, organizer, venue, website, price blocks render here

### 11e. Virtual Event panel (ECP)
- When `_tribe_events_virtual_url` is set:
  - `Video or Meeting Link URL` rendered as embedded iframe (`_tribe_events_virtual_embed_video` true) OR as a link (`_tribe_events_virtual_linked_button`)
  - `Join` button (custom label from `_tribe_events_virtual_linked_button_text`)
  - Visibility gate: only shown to users matching `_tribe_events_virtual_show_embed_to` (everyone, logged-in, ticket-holders) — and only when current time ≥ `_tribe_events_virtual_show_embed_at`
  - Provider-specific renderers (`src/views/zoom/`, `src/views/google/`, `src/views/microsoft/`, `src/views/webex/`, `src/views/youtube/`, `src/views/facebook/`)
  - For Facebook Live / YouTube Live: live-video player iframe with `Modest Branding`, `Mute Video`, `Autoplay Video`, `Include live chat` flags

### 11f. Details metabox
- `Date:` …
- `Time:` …
- `Cost:` … (`_EventCost` value)
- `Website:` link (`_EventURL`)
- `Event Categories:` chips (with category color)
- `Tags:` chips
- Custom Fields (Additional Fields) — each enabled field appears here as a labeled row

### 11g. Venue card
- Venue title (link to venue archive)
- Address line (street, city, state, zip, country)
- Phone (when set)
- Website (when set)
- Embedded Google Map (when `embedGoogleMaps` true and venue has lat/lng) — `embedGoogleMapsZoom` zoom level
- "Get Directions" link (Google Maps `dir/?api=1&destination=...`)

### 11h. Organizer card(s)
- Each organizer rendered as a small card: name (link to organizer archive), phone, email, website
- Multiple organizers stacked vertically

### 11i. Series card (CT1)
- When event belongs to a series: "This event is part of a series" panel
- Series title (link to series archive)
- "Other dates" mini-list — next 3 occurrences in the series
- "View all dates" link

### 11j. Related Events (ECP)
- 3-up grid of related events (same category/tag); hidden when `hideRelatedEvents` site option is on
- Per related-event card: featured image thumbnail, title, date

### 11k. Calendar export bar
- `Add to calendar ▾` dropdown: Google Calendar, iCalendar, Outlook 365, Outlook Live, Export .ics file
- Specific to the *occurrence* (CT1): export URL contains `?eventDate=YYYY-MM-DD` so calendars sync only this instance, not the entire series
- "Share:" social share buttons (Facebook, Twitter/X, LinkedIn, Email) — render when share template hook fires

### 11l. Comments section
- Standard WP comment template, when *Display → Calendar → Show comments* is enabled

### 11m. Recurring scope notice
- When viewing a non-current occurrence: "This is a recurring event. Use the navigation below to find a different date." + `‹ Earlier event` / `Later event ›` chevrons

---

## 12. Single Venue Page — `/venue/{slug}/`

`screenshots/frontend-020-venue-archive.png`

(Site A renders the venue archive 404 because the venue post status was set to publish but the rewrite refresh didn't include venue archive rules — covered by `tribe_venue` rewrite rules at `Tribe__Events__Pro__Rewrite`.)

**Expected layout** (per `src/views/v2/venue/single-venue.php`):
- Venue title (h1)
- Address block + embedded Google Map
- Phone, website, contact links
- "Upcoming Events at {Venue}" — list-view embed scoped to this venue (per ECP's Venue Widget logic)
- Past events toggle

---

## 13. Single Organizer Page — `/organizer/{slug}/`

`screenshots/frontend-021-organizer-archive.png`

**Expected layout** (per `src/views/v2/organizer/single-organizer.php`):
- Organizer title (h1)
- Bio (post content)
- Contact: phone, email, website
- "Upcoming Events organized by {Organizer}" — list-view embed scoped to this organizer

---

## 14. Past Events — `/events/list/?tribe_event_display=past`

`screenshots/frontend-030-past.png`

Same templates as List view, with the date filter inverted — events ending before now in reverse-chronological order. Subscribe-to-calendar dropdown still exposes export of past events.

Settings:
- `Show only the next instance of each recurring event` (General → Viewing) — when on, reduces past-event listings to one row per series

---

## 15. iCal Export — `/?ical=1&tribe_display=list` (and per-event `?ical=1`)

`screenshots/frontend-040-ical.png` (5,850 bytes — confirms `.ics` file content, not HTML)

Returns an `.ics` file. The export endpoint is keyed by view context:
- Per-event: `/event/{slug}/?ical=1` — single VEVENT
- Per-view: `/?ical=1&tribe_display=list` — all events visible in current list filters
- Per-venue: `/venue/{slug}/?ical=1`
- Per-organizer: `/organizer/{slug}/?ical=1`
- Per-category: `/events/category/{slug}/?ical=1`

Recurring events export with proper `RRULE` / `EXRULE` / `RDATE` lines per RFC 5545. Virtual events embed `LOCATION:Online` and a `URL:{meeting-link}` line.

---

## 16. Shortcodes

ECP registers two shortcodes for embedding calendar views or events anywhere:

### 16a. `[tribe_events]`

Embeds a full calendar view in any post / page / widget area.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `view` | string | `month` | View slug |
| `category` | string | — | Filter to category slug(s) (CSV) |
| `exclude-category` | string | — | Exclude category slug(s) |
| `tag` | string | — | Filter to tag slug(s) |
| `events_per_page` | int | site default | Per-page count |
| `month_events_per_day` | int | site default | Max events per day cell in Month view |
| `featured` | bool | false | Filter to featured events only |
| `past` | bool | false | Show past events |
| `tribe-bar` | bool | true | Show the search bar |
| `filter-bar` | bool | true (when Filter Bar active) | Show filter row |
| `date` | string | today | Initial date |
| `keyword` | string | — | Pre-applied keyword search |
| `author` | int | — | Filter to author |
| `organizer` | int | — | Filter to organizer post ID |
| `venue` | int | — | Filter to venue post ID |
| `tax_operand` | string | OR | AND/OR for category/tag |

### 16b. `[tribe_event_inline]`

Inline single-event placeholder for body text. Replaces template tags inside content.

Example: `[tribe_event_inline id=123]Join us for {start_date} at {venue}![/tribe_event_inline]`

Supported tokens (subset):
- `{title}`, `{permalink}`, `{start_date}`, `{end_date}`, `{start_time}`, `{end_time}`
- `{venue}`, `{venue_address}`, `{venue_city}`, `{venue_state}`
- `{organizer}`, `{cost}`, `{website_url}`
- `{recurrence_description}`

---

## 17. Widgets

ECP ships five widgets (registered via `widgets_init`):

| Widget | Class | Surface |
|---|---|---|
| Events List Widget | `Tribe__Events__Pro__Widgets__List_Widget` | Sidebar — N upcoming events with cost/venue/category toggles |
| Events Calendar Widget | `Tribe__Events__Pro__Widgets__Calendar_Widget` | Sidebar — mini-month grid for navigation |
| Countdown Widget | `Tribe__Events__Pro__Widgets__Countdown_Widget` | Sidebar — countdown timer to next occurrence |
| Venue Widget | `Tribe__Events__Pro__Venue_Widget` | Sidebar — upcoming events at a specific venue |
| Featured Venue Widget | `Tribe__Events__Pro__Featured_Venue_Widget` | Sidebar — featured venue spotlight + upcoming events at venue |

All widgets accept Title, Number of events, Date range, Hide cost / Hide venue / Hide category toggles, Before/After HTML.

Block-editor widget blocks are not separately registered — the Calendar Embed block (`tribe/calendar-embed`) covers full-calendar embedding inside Gutenberg widgets.

---

## 18. Tribe Bar (search filter)

A horizontal filter strip rendered above each view (controlled by `tribeDisableTribeBar` site option):

- Keyword search input
- Date input (date picker)
- Location input (geofence search) — Map view only
- Category filter chips
- "Find Events" submit button

When **Filter Bar** plugin is active, this expands into the multi-filter bar with category, tag, cost-range, organizer, venue, custom-fields filters.

`Live Filters Update` site option enables AJAX (no full page reload) when filters change.

---

## 19. Calendar Embed Block / Iframe

When the **Calendar Embed Gutenberg block** is dropped into a post:
- Renders an `<iframe>` whose `src` points at `GET /tec/v1/events/calendar-embed?view=month&...`
- Same view selector / filter / shortcode parameters are exposed as block-controls
- Iframe size controlled by `width` / `height` block attributes
- Accessibility: `title` attribute mirrors the block label

This is the primary way to embed a calendar in another EmDash- or React-managed page where the parent context doesn't natively support TEC's templates.

---

## 20. Empty / Error / Loading States

**Empty state** (no events in current range):
- Icon: calendar with `x` glyph
- Message text: `There are no upcoming events.` / `There are no events in this date range.`
- Subscribe-to-calendar still rendered

**Loading state** (during AJAX view swap):
- Loader overlay: spinning calendar icon centered over the view container
- Aria-live region announcement: `Loading events…`

**Error state** (API failures, e.g., Google Maps API quota exceeded):
- Inline notice within the affected view (Map view only): `Geocoding service unavailable. Showing list view.`
- Falls back to list rendering

---

## Cross-References

- View-related options: `01-data-model.md` § 4 (Options)
- View source files: `00-overview.md` § "Source Tree" → `src/views/v2/`
- View hooks: `02-hooks.md` § 2 (Recurrence) and § 3 (Filters Applied)
- Recurring-event UX vocabulary: `03-features.md` § 1 (Recurring Events Engine)
- Pro-views-by-i18n-string mapping: `03-features.md` § 3 (Pro Calendar Views)
