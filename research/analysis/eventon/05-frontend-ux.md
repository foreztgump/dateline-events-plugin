---
plugin: eventon
version: 4.8
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Frontend walkthrough on Site B. Theme: Twenty Twenty-Five (default WP block
  theme). EventON renders independent of theme via inline scripts/styles
  enqueued conditionally on pages containing EventON shortcodes. Screenshots
  in screenshots/, frontend-* prefix.
---

# EventON 4.8 — Frontend UX

EventON is a **shortcode-driven** plugin. There are no first-party Gutenberg blocks for the calendar (the Gutenberg-blocks integration registers a single block that wraps the shortcode generator). All frontend rendering happens inside containers spawned by 8 distinct shortcodes plus the auto-generated single-event template.

The signature interaction pattern: an event tile that **slides down to reveal a card** with full event details (the EventCard), without leaving the calendar page. This is EventON's UX trademark and the reason it remains the WordPress events-plugin UX leader despite an increasingly dated admin.

---

## 1. Shortcode Inventory

Discovered via `add_shortcode()` calls across the base plugin and 12 add-ons:

| Shortcode | Source | Purpose |
|-----------|--------|---------|
| `[add_eventon]` | core | Standard month-view calendar |
| `[add_eventon_list]` | core | Compact event list (no calendar header) |
| `[add_eventon_tabs]` | core | Tabbed calendar (month / week / day) |
| `[add_single_eventon]` | core | Render a specific event by ID anywhere |
| `[add_eventon_now]` | core | Live "happening now" event card |
| `[add_eventon_sv]` | core | Schedule view (timeline) |
| `[eventon_anywhere]` | core | Embed event card in any context (sidebar, footer) |
| `[add_eventon_search]` | core | Search input + filter dropdown |
| `[add_ajde_evcal]` | core (legacy) | Pre-2.0.8 alias for `[add_eventon]` |
| `[add_eventon_fc]` | `eventon-full-cal` | Full-calendar grid (month-grid like Outlook) |
| `[add_eventon_wv]` | `eventon-weekly-view` | Weekly day-cards horizontal scroll |
| `[add_eventon_slider]` | `eventon-slider` | Carousel of upcoming events |
| `[add_eventon_checkin]` | `eventon-qrcode` | QR ticket-scanner attendee check-in page |
| `[evo_checking_page]` | `eventon-qrcode` | Alias for `add_eventon_checkin` |
| `[add_eventon_wishlist_manager]` | `eventon-wishlist-add-on` | User wishlist management UI |
| `[evo_rsvp_manager]` | `eventon-rsvp` | User-facing RSVP management ("My RSVPs") |
| `[evotx_btn]` | `eventon-tickets` | Ticket purchase button (anywhere) |
| `[evotx_attendees]` | `eventon-tickets` | Public attendee list per event |

Each shortcode accepts a substantial attribute set. The base `[add_eventon]` alone has **100+ attributes** (verified in the `data-sc` JSON dropped onto the rendered calendar). Notable groups: layout (`tile_style`, `eventtop_style`, `grid_ux`), filter (`event_type`, `event_location`, `event_organizer`), date scope (`fixed_year`, `fixed_month`, `month_incre`, `number_of_months`, `hide_past`, `event_past_future`), display toggles (`hide_so`, `hide_arrows`, `hide_month_headers`, `livenow_bar`, `social_share`), pagination (`show_limit`, `show_limit_paged`, `event_count`).

> Screenshots: `frontend-014-search.png` (search shortcode), `frontend-015-event-list.png` (compact list)

---

## 2. Calendar Shortcode `[add_eventon]` — The Default View

The flagship rendering. Default behavior:

1. Page loads with a **calendar shell** (header, "Current Month" pill, prev/next arrows, month title) and a **loading skeleton** of 5 placeholder rows.
2. Calendar is `ajax_loading_cal` by default — events are fetched via AJAX (`admin-ajax.php?action=the_ajax_hook` or REST `/wp-json/eventon/v1/...`) **after** the page first paints.
3. A `data-sc` JSON blob holds the 100+ shortcode attributes; a `data-od` JSON holds locale-specific text (`lang_no_events: "No Events"`, `cal_tz`, `cal_tz_offset`).
4. Once the AJAX completes, the skeleton is replaced with **EventTop** rows (the always-visible event tiles) sorted by date.
5. The calendar default shows the user's "current month" (server time), with prev/next arrow navigation.

### EventTop tile (the row visible in calendar list)

Each tile has a colored bar with:
- Day number + month abbreviation (left)
- Event title (uppercase, bold)
- Optional time / location chips (configured in EventCard settings)
- Color = `evcal_event_color` postmeta (event-level override)
- Cancelled events render with a 50% opacity treatment + "Cancelled" overlay text

Click a tile → **the EventCard slides down** beneath it without navigating away.

> Screenshot: `frontend-010a-calendar-loaded.png` (April 2026 — past event in grey, today's demo in blue), `frontend-010b-calendar-next-month.png` (May with all 5 demo events in their respective brand colors)

### EventCard (the slide-down card)

A card containing one or more "boxes" — each box is configurable on/off in `Settings → EventCard`:

| Box | Content | Postmeta source |
|-----|---------|-----------------|
| **Event Details** | Description / excerpt | `post_content` |
| **Time** | Formatted start/end with timezone tag | `evcal_srow`, `evcal_erow`, `_evo_tz` |
| **Location** | Address + "Other Events" link to taxonomy archive + Map | `event_location` term meta |
| **Organizer** | Organizer name + image + "Learn More" link | `event_organizer` term meta |
| **Schema** | JSON-LD schema.org Event markup | computed |
| **Tickets** | Ticket button (`[evotx_btn]`) | requires Tickets add-on |
| **RSVP** | RSVP form | requires RSVP add-on |
| **Map** | Google Maps iframe at lat/lon | `evcal_lat`, `evcal_lon` |
| **Custom Meta** | Per-CMF rendered values | `_<cmf_id>` keys |
| **Tags** | Post tag list | `post_tag` |
| **Wishlist** | Add to wishlist button | requires Wishlist add-on |
| **Repeat Series** | Other instances of recurring event | `_evcal_rep_series=yes` |

Box order, visibility, and style (grid-2, grid-3, single-column) are global Settings → EventCard options, with per-event overrides via the Event Options metabox.

> Screenshot: `frontend-010c-calendar-event-card.png` — "API Architecture Roundtable" expanded with Event Details, Time, Location, Organizer boxes visible.

---

## 3. Full Calendar Grid `[add_eventon_fc]` (Full Cal add-on)

A traditional **month-grid layout** (rows = weeks, columns = Mon–Sun). Each cell:

- Day number (top)
- Small colored dot per event scheduled that day
- Click a cell → the EventTop list of that day's events appears below the grid (same EventCard expand behavior)

Today's date is highlighted with a subtle yellow underline. Multi-day events span across cells with a continuous bar.

> Screenshot: `frontend-013-full-calendar.png` — April 2026 grid, day 26 / 29 / 30 each show a dot, click on day 29 reveals the "Tomorrow Evening Demo" tile below.

---

## 4. Weekly View `[add_eventon_wv]` (Weekly View add-on)

A horizontal **week strip** showing 7 day-cards (Mon→Sun by default, configurable). Each day-card shows:

- Day name + date number
- Today is highlighted in red/pink
- Small dot per event scheduled that day
- A range pill at the top (e.g., "APR 27 – MAY 3, 2026") with prev/next arrows and a "today" jump button

Click a day-card → events for that day list below in EventTop format with the same EventCard slide-down behavior.

> Screenshot: `frontend-012-weekly-view.png` — April 27–May 3, 2026; today (Thursday Apr 30) highlighted, three days have event dots.

---

## 5. Slider `[add_eventon_slider]` (Slider add-on)

A **carousel** of upcoming events. Each slide is a single event tile (EventTop-styled, full-width). Prev/next arrows and optional auto-advance / pause-on-hover. Useful as a homepage hero or sidebar promo.

Configurable: `slides_visible` (1–5), `slide_auto`, `slider_pause` (ms), `slider_speed` (transition ms), `slide_nav_dots`.

> Screenshot: `frontend-011-slider.png` — single slide showing "Tomorrow Evening Demo" with arrow controls.

---

## 6. Search `[add_eventon_search]`

A simple search input + Search button. Submits a GET form to the same page with query string `?search=<term>` which the calendar shortcode reads via `$_GET['search']`. Optional dropdown filter for taxonomies (configured per shortcode attribute).

> Screenshot: `frontend-014-search.png`

---

## 7. Compact Event List `[add_eventon_list]`

Renders only the EventTop rows without the calendar header / month-nav / filter bar. Honors `number_of_months` to span multiple months in one list. Common use: site footer "Upcoming Events" or sidebar widget.

> Screenshot: `frontend-015-event-list.png`

---

## 8. Single Event Page (`/events/<slug>/`)

Auto-generated WordPress single-template page for the `ajde_events` CPT. EventON ships a custom page template (`Event Page`) that renders the **same EventCard** as the calendar slide-down — but as a full page, with a back-link to the originating calendar.

Default order:
1. Event title (large)
2. EventTop pill (date + colored bar)
3. EventCard boxes (same as the calendar slide-down card)
4. Schema.org JSON-LD in the page head
5. Optional comments form (if `comments` post-type support is enabled in `eventon_event_post_supports` filter)

The single-event page **does not show a "Back to calendar" link by default**; user must use the browser back button or theme breadcrumbs. Settings → Single Events offers a "Add navigation arrows" toggle for prev/next event in date order.

> Screenshots: `frontend-020-single-conference.png` (single-day featured), `frontend-020-single-workshop.png` (multi-day), `frontend-020-single-recurring.png` (recurring), `frontend-020-single-online.png` (with external link), `frontend-020-single-cancelled.png` (cancelled with reason)

---

## 9. Taxonomy Archive Pages

Each first-party taxonomy (`event_type`, `event_location`, `event_organizer`, `event_type_2`) registers a public archive route with a default WP archive template. Out of the box, the theme renders a generic post-list — **EventON does not override the archive template** unless the active theme provides `taxonomy-event_type.php` etc.

To get an EventON-styled archive, users must either:
- Create a regular WP page with `[add_eventon event_type="conferences"]` and link to it from the term metaboxes
- Add the Visual Composer / Elementor widget (also a shortcode wrapper)
- Override the theme template

> Screenshots: `frontend-031-tax-conferences.png` (theme default — post list with featured image), `frontend-032-tax-sf.png` (San Francisco term, same theme treatment)

This is a UX gap: term archives are a natural URL pattern (`/event-location/san-francisco/`) but require user effort to look like the rest of the calendar.

---

## 10. Events CPT Archive (`/events/`)

Same situation as taxonomy archives: theme-default rendering. Users either replace it via a custom page or accept the WP archive template. The "Events" menu item in the seeded site nav links to this URL.

> Screenshot: `frontend-030-events-archive.png`

---

## 11. Frontend Interactivity & State

### AJAX endpoint

`POST admin-ajax.php` with `action=the_ajax_hook` (legacy) or REST `/wp-json/eventon/v1/calendar` (post-4.0). Request includes:
- The full `data-sc` JSON of the calendar instance
- The `cal_id` for the specific calendar (multiple calendars on one page disambiguate via `cal_id`)
- `month_incre` / `year_incre` for prev/next nav
- Filter selections (active taxonomy term filters)

Response is rendered HTML — server-side templating, not JSON-to-DOM hydration. This keeps the calendar fast on first paint but means **client-side filter changes always round-trip to the server**.

### URL state

Filters and search **do not** update the URL by default. Refreshing the page resets all in-page filter selections. There is no native deep-linking support — users cannot share a filtered view URL. Add-on `eventon-deeplinks` (not on this site) addresses this.

Pagination (`show_limit_paged`) does support page-state via URL hash (`#evcal_p2`).

### Live "Now" bar

If `livenow_bar=yes` (default on), an animated "Live Now" badge appears on tiles when the current time falls within `evcal_srow`/`evcal_erow`. A jQuery interval (default 60s) re-evaluates this state without page reload.

---

## 12. Mobile / Responsive Behavior

EventON ships with a mobile breakpoint at 480px (configurable in `Settings → Scripts & Styling`). Below the breakpoint:

- Multi-column tile grids collapse to single-column
- The EventCard expands inline rather than as a sliding panel
- Filter/sort dropdowns stack vertically
- Day-of-week column headers in the Full Cal grid abbreviate to single letters

All shortcodes are explicitly mobile-friendly except the **shortcode generator** in admin, which assumes ≥1024px viewport.

---

## 13. Theming & Style Hooks

Two layers:

1. **Settings → Styles tab** (`evcal_3`) — global color & typography variables, written into a CSS variables block on every page. Inline (not separate stylesheet) → no caching gain but hot-reloadable.
2. **Custom CSS** — `Settings → General → Scripts & Styling → Custom CSS` field, output last in the head/footer for high specificity.

Theme overrides via template hierarchy:
- `theme/eventon/single-ajde_events.php` overrides the single-event template
- `theme/eventon/calendar.php` overrides the calendar shell
- Any file in `eventon/templates/` can be copied to `theme/eventon/` and modified — same pattern as WooCommerce's `templates_loader`

The `EVO_Temp` class (`includes/class-templates.php`) is the locator: it walks `STYLESHEETPATH/eventon/`, then `TEMPLATEPATH/eventon/`, then plugin's `templates/` — first match wins.

---

## 14. Frontend Performance Notes

- Calendar HTML output of `[add_eventon]` for an empty calendar: **~8.5 KB**
- Up to ~20 events: **~30–40 KB** per fetch
- AJAX payload includes inline JS for each event card (event color, schema JSON, RSVP nonces if enabled) — **not** lazy-loaded; all event details in one round-trip
- Asset enqueue: 14 stylesheets + 9 JS files when all 12 add-ons active. The `Scripts & Styling` settings include a "Load EventON CSS only on calendar pages" toggle (default off — every page on the site loads EventON CSS unless toggled on)
- Google Fonts (Roboto, Open Sans) hardcoded — not configurable. A privacy concern for GDPR-strict deployments.

---

## 15. Frontend UX Strengths (observed)

1. **EventCard slide-down is genuinely the best-in-class WordPress events UX** — fast, no page navigation, all event detail visible at a glance.
2. **Color-per-event** is striking and useful — the May 2026 view in `frontend-010b` instantly distinguishes 5 different event types by color band.
3. **Cancelled-event treatment** is excellent — translucent with overlay text, no need to click to discover the cancellation.
4. **Multi-shortcode flexibility** — same data, 8 visual presentations (calendar, list, slider, weekly, full-grid, tabs, schedule view, single embed). Designers can mix and match per page.
5. **Per-event timezone display** with optional "View in my time" button — proper IANA TZ handling, not just offsets.

## Frontend UX Weaknesses (observed)

1. **No first-class Gutenberg blocks** — the entire frontend is shortcode-driven, which fights the modern WP block editor experience.
2. **AJAX-loaded calendar means slower TTI** vs server-rendered competitors.
3. **No URL state** for filters/search — can't share filtered views.
4. **Theme archives are not styled** — taxonomy term URLs render as default WP archives.
5. **Inline CSS variables on every page** — tens of KB of CSS-vars output even on pages with no calendar.
6. **Mobile: shortcode generator unusable** — admins on tablet/phone effectively cannot configure new calendars.
7. **No native dark mode** — users must override via custom CSS.
8. **Hardcoded Google Fonts** — privacy / latency concerns.
