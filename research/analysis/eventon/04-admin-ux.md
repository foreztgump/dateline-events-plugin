---
plugin: eventon
version: 4.8
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Live walkthrough on Site B (https://dateline-site-b.ddev.site:8443),
  WordPress 6.7 + EventON 4.8 + 12 active add-ons. Five seeded events
  (single, multi-day, recurring, online, cancelled) plus two current-month
  demo events used to populate the calendar. Screenshots in screenshots/,
  observations in observations.json. See 00-overview.md and 01-data-model.md
  for static-analysis context.
---

# EventON 4.8 — Admin UX

This document walks the EventON admin surface end-to-end as a calendar manager would experience it. EventON is a settings-heavy plugin: the 12 active add-ons each contribute either their own admin surface (CSV Importer, RSVP records, Tickets via WC orders) or extra metaboxes on the event-edit screen (Tickets, RSVP, Seats, Wishlist, Invitees, Waitlist, QR codes, Ticket Variations).

---

## Navigation & Menu Structure

EventON contributes two top-level menu entries to the WordPress sidebar:

```
Events (Dashicons calendar)                        ← WordPress CPT menu
├── Events                  → edit.php?post_type=ajde_events
├── Add New Event           → post-new.php?post_type=ajde_events
├── Tags                    → edit-tags.php?taxonomy=post_tag
├── Event Location          → edit-tags.php?taxonomy=event_location
├── Event Organizer         → edit-tags.php?taxonomy=event_organizer
├── Event Type              → edit-tags.php?taxonomy=event_type
├── Event Type 2            → edit-tags.php?taxonomy=event_type_2     (custom-taxonomy slot)
└── All Event RSVPs         → edit.php?post_type=evo-rsvp             (RSVP add-on)

EventON (Dashicons calendar-alt)                    ← Plugin menu
├── Settings (default)      → admin.php?page=eventon
├── Language                → admin.php?page=eventon&tab=evcal_2
├── Styles                  → admin.php?page=eventon&tab=evcal_3
├── Addons & Licenses       → admin.php?page=eventon&tab=evcal_4
├── Support                 → admin.php?page=eventon&tab=evcal_5
├── CSV Import              → admin.php?page=evocsv                   (CSV Importer add-on)
└── RSVP                    → admin.php?page=eventon&tab=evcal_rs     (RSVP add-on)
```

Two additional Welcome screens live under the Dashboard menu, exposed only after activation/upgrade:

- `index.php?page=evo-about` — Welcome / About
- `index.php?page=evo-getting-started` — Getting Started guide
- `index.php?page=evo-changelog` — Changelog

Each settings tab is **a query-arg variant of the same page** (`page=eventon&tab=evcal_N`). Inside the default `evcal_1` (General) tab, a left-rail navigation switches between sub-sections without changing the URL — content is rendered in a single long form per tab.

> Screenshot: `admin-160-welcome-about.png`, `admin-161-getting-started.png`, `admin-170-plugins-list.png`

---

## 1. Events List Table (`/wp-admin/edit.php?post_type=ajde_events`)

A standard WordPress list table for the `ajde_events` CPT.

**Columns (default):**
- Title (with quick-edit, edit, view, trash row actions)
- Author
- Event Type, Event Location, Event Organizer (taxonomies)
- Start Date / End Date (computed from `evcal_srow` postmeta)
- Tags
- Date (post created date)

**Filters:**
- All / Mine / Published / Draft / Trash tabs
- Date filter (month/year of post creation, **not** event date — a known UX gotcha)
- Event Type / Event Location / Event Organizer dropdowns
- Bulk actions: Edit, Move to Trash

**Admin notices on this screen:**
- Three persistent yellow banners across the entire EventON admin: *"EventON tickets needs WooCommerce plugin to function properly. Please install WooCommerce"* (Tickets add-on), *"EventON Seats needs WooCommerce plugin to function properly"* (Seats add-on), *"EventON Ticket Variations & Options needs WooCommerce plugin to function properly"* (Ticket Variations add-on). These three add-ons hard-require WooCommerce; the others do not.

> Screenshot: `admin-001-events-list.png`

---

## 2. New / Edit Event Screen

This is the workhorse of the admin. EventON 4.8 uses the **Gutenberg / block editor** as the host shell (template `Event Page`), but **all event-specific data is captured in classic metaboxes** rendered in the right sidebar and below the editor canvas. There is no Gutenberg block for the event meta itself — the integration point is metabox-only.

### 2a. Detected metaboxes (top to bottom)

From the seeded `Annual Tech Conference 2026` edit screen:

| Metabox ID | Title | Source |
|------------|-------|--------|
| `evors_mb1` | RSVP Event | `eventon-rsvp` add-on |
| `ajdeevcal_mb1` | Main Event Details | EventON core |
| `ajdeevcal_mb1_cmf` | Event Custom Meta Fields | EventON core (only shown if CMFs activated in settings) |
| `ajdeevcal_mb2` | Event Colors | EventON core |
| `ajdeevcal_mb3jd` | Event Options | EventON core |
| `ajdeevcal_mb_ei` | Event Extra Images | EventON core |

When add-ons that depend on WooCommerce are activated and WC is **not** installed, their metaboxes (Tickets, Seats, Ticket Variations) are still registered but hidden behind the "Please install WooCommerce" admin notice.

### 2b. Title & Content

- **Title field** — Gutenberg post-title input
- **Content** — Gutenberg classic block (TinyMCE shim) is the default, not the full block editor. EventON ships its own template (`Event Page`) that locks the layout.
- **Subtitle** — `evcal_subtitle` text input, rendered above the title on frontend single-event view.

### 2c. RSVP Event metabox (`evors_mb1`, RSVP add-on)

A single toggle: *Activate RSVP for this Event*. When toggled on, the metabox expands to expose:

- RSVP open/close timestamps
- Maximum number of RSVPs (capacity)
- Per-event email notification addresses
- Custom RSVP form fields (extra questions)
- Invitees-only mode (gates RSVP behind invitee link, requires `eventon-rsvp-invitees`)
- Waitlist enable/disable (requires `eventon-rsvp-events-waitlist`)

The metabox detects sibling add-ons and conditionally renders sub-sections — RSVP itself is the host, and Invitees/Waitlist append rather than replace.

### 2d. Main Event Details metabox (`ajdeevcal_mb1`, EventON core)

The richest section. Field groups (in display order):

**Status & Cancellation panel**
- `_status` hidden + visible status pill: Published, Cancelled, Rescheduled, Postponed, Moved Online
- Contextual textareas appear when status changes: `_cancel_reason`, `_rescheduled_reason`, `_postponed_reason`, `_movedonline_reason`
- `_attendance_mode` hidden field (sets schema.org event attendance mode)

**Date & Time panel**
- `event_start_date` / `event_end_date` — date pickers (jQuery UI), stored alongside their `_x` Unix timestamp twins
- `_start_hour` / `_start_minute` / `_start_ampm` selects (`_end_*` mirrors)
- `event_vir_date` + `_vir_hour/minute/ampm` — virtual end time (display until X even though event already ended; great for live-stream replays)
- `_time_ext_type` — time extension type: none / day-long / month-long / year-long
- `_evo_tz` — IANA timezone select (`America/Los_Angeles`, etc.)
- `evo_event_timezone` — text label override (e.g. "PST")
- `_evo_virtual_endtime`, `evo_hide_endtime`, `evo_span_hidden_end` — three independent toggles for end-time display behavior

**Repeating panel** (visible when `evcal_repeat=yes`)
- `evcal_rep_freq` — daily / hourly / weekly / monthly / yearly / custom
- `evcal_rep_gap` — interval (e.g. every 2 weeks)
- `evcal_rep_num` — number of occurrences
- `evp_repeat_rb_wk` — weekly mode: single day vs day-of-week set
- `evp_repeat_rb` — monthly mode: day-of-month vs day-of-week
- `evo_rep_WK` / `evo_rep_WKwk` — comma-separated day-of-week (0=Sun…6=Sat)
- `evo_repeat_wom` — week-of-month for monthly DOW (1–5, -1=last)
- `_evcal_rep_series` (yes/no) — show full series of repeat instances on the event card
- `_evcal_rep_endt`, `_evcal_rep_series_clickable`, `_evcal_rep_series_ux` — instance click behavior (`def`, `defA`, `lb`)
- "Custom repeats" mode: dynamic add-rows of `(start, end)` pairs stored in `repeat_intervals`

**Location panel**
- Location selector — autocomplete on `event_location` taxonomy terms, or "create new"
- `_location_name`, `_location_address`, `_location_city`, `_location_state`, `_location_country`, `_location_zip` — when creating a new term, fill via inline form (deleted from postmeta after save; promoted to taxonomy term meta)
- `evcal_lat`, `evcal_lon` — latitude / longitude (auto-filled by Google Maps geocoding or OpenStreetMap fallback)
- `evcal_gmap_gen` (yes/no) — generate Google Map for this event (overrides global setting)
- `evcal_hide_locname` / `evcal_name_over_img` — display options

**Organizer panel** — same model as Location but on `event_organizer` taxonomy.

**External Link panel**
- `evcal_exlink` — URL
- `_evcal_exlink_target` — `_blank` / `_self`
- `_evcal_exlink_option` — link behavior: 1=new window, 2=same window, 3=lightbox, 4=event single page

**Featured / Visibility**
- `_featured` (yes/no) — featured event
- `evo_exclude_ev` (yes/no) — exclude from all calendars
- `_onlyloggedin` (yes/no) — visible to logged-in users only
- `_evo_lang` — language variation key (`L1` default; gates the multi-language display feature)

### 2e. Event Custom Meta Fields metabox (`ajdeevcal_mb1_cmf`)

By default this metabox shows: *"You do not have any custom meta fields activated."* with a CTA linking to `Settings → Custom Meta Fields` (sub-section `#evcal_009`). Once CMFs are activated, this metabox renders the configured CMF inputs (text, dropdown, color, etc., 13 types per the static-analysis hooks file).

### 2f. Event Colors metabox (`ajdeevcal_mb2`)

- `evcal_event_color` — primary color (hex picker, no `#`)
- `evcal_event_color_n` (1=no color set) — toggle
- `evcal_event_color2` — secondary color (gradient)

### 2g. Event Options metabox (`ajdeevcal_mb3jd`)

A grab-bag of toggles: hide progress bar, JSON-LD overrides per event, frontend display switches.

### 2h. Event Extra Images metabox (`ajdeevcal_mb_ei`)

Multi-image gallery uploader. Stored in `_evo_event_extra_images` postmeta as a serialized array of attachment IDs. Used by add-ons (Slider, lightbox).

### 2i. Add-on metaboxes that activate per add-on

Beyond the six core metaboxes, the following add-ons inject their own metaboxes when activated and (if WC-dependent) WC is present:

| Add-on | Metabox | Purpose |
|--------|---------|---------|
| `eventon-tickets` | Ticket Tiers | Multiple tier rows: name, price, capacity, dates, WC product link |
| `eventon-seats` | Seats Map | SVG seat-map editor (rows, sections, accessibility) |
| `eventon-ticket-variations-options` | Ticket Variations | Per-tier extra options (lunch, parking, swag) |
| `eventon-rsvp-events-waitlist` | Waitlist | Cap waitlist size, auto-promote on cancellation |
| `eventon-rsvp-invitees` | Invitees | CSV upload + per-invitee tokens |
| `eventon-qrcode` | QR Code | Event-level QR generation |
| `eventon-wishlist-add-on` | Wishlist | Per-event wishlist control |

> Screenshots: `admin-010-event-new.png`, `admin-011`/`012`/`013`/`014`/`015`/`016` (scroll progression), `admin-020-event-edit-conference.png` (single-day featured), `admin-021-event-edit-recurring.png` (recurring), `admin-022-event-edit-cancelled.png` (cancelled with reason)

---

## 3. Settings Page (`/wp-admin/admin.php?page=eventon`)

The settings page is structured as **5 top tabs × N sub-sections per tab**, with the bulk of options living under tab 1 (`evcal_1`, "Settings").

### Top tabs (left → right)

| Tab | Tab ID | Purpose |
|-----|--------|---------|
| Settings (default) | `evcal_1` | All operational settings: maps, time, sorting, filtering, appearance, scripts, EventCard, CMFs, categories, paging, shortcodes, single-event, advanced |
| Language | `evcal_2` | i18n string overrides per language variation key (L1, L2, …) |
| Styles | `evcal_3` | Global color & typography variables (no per-event overrides) |
| Licenses | `evcal_4` | Per-add-on license-key fields (manual entry) |
| Support | `evcal_5` | Support contact form + diagnostic info |
| RSVP | `evcal_rs` | Injected by RSVP add-on; site-wide RSVP defaults |
| Tickets | `evcal_tx` | Injected by Tickets add-on; ticket defaults, WC integration |

### Sub-sections under "Settings" (`evcal_1`)

The left rail inside the General tab exposes these sub-sections (vertical nav):

1. **General Calendar Settings** — `evcal_cal_hide`, `evo_header_meta_data`, `evo_rtl`, `evo_hide_shortcode_btn`, `evo_lang_corresp`, `evo_login_link`. Plus search engine structured data toggles (`evo_schema`, `evo_remove_jsonld` with section selectors), no-events display style, settings export/import block.
2. **Maps API** — Google Maps API key, disable maps, scrollwheel toggle, default format / zoom level / map style, custom marker icon URL, OpenStreetMap fallback.
3. **Time & Date Settings** — global timezone offset, footer timezone display, WP date-format reuse, custom event-card time format (`evo_timeF_v`, `evo_timeF_tf`), "View in my time" button toggle, GMT-hide, minute-increment for time pickers.
4. **Sorting & Filtering** — global hide for sort/filter bars, sort options checkboxes (Title, Color, Posted Date, Date), filter options checkboxes.
5. **Appearance** — calendar tile style, event-top style (1–4 layouts), feature-image positioning.
6. **Scripts & Styling** — enqueue toggles (load EventON CSS only on calendar pages, lazy-load images, AJAX vs server-render).
7. **Icons** — font icon set selection.
8. **EventTop** — event tile layout (the row visible inside the calendar list before expansion).
9. **EventCard** — the slide-down card itself: which boxes appear (Time, Location, Organizer, Description, Tickets, RSVP, Map, Schema, Tags, Custom Meta).
10. **Custom Meta Fields** — activate / configure CMFs (13 input types: text, textarea, dropdown, multi-dropdown, radio, checkbox, color, image, URL, email, number, date, time).
11. **Categories** — taxonomy display options (which taxonomies show as filters, color-per-term).
12. **Events Paging** — pagination/load-more behavior on calendar lists.
13. **Shortcodes** — show/hide the shortcode generator button in the post editor.
14. **Single Events** — single-event-page layout (which boxes, header style, breadcrumb).
15. **Advanced Settings** — cron, transient cache, performance.
16. **In/Tally APIs** — webhook outgoing config.
17. **Reverse Events** — display past events in reverse-chronological order.
18. **Diagnose** — runtime diagnostic dump (PHP version, WP version, EventON version, active add-ons, conflict checks).
19. **Old Code** — legacy compatibility flags (turn on pre-4.0 behavior).

> Screenshots: `admin-100-settings-general.png` (full panel with left rail), `admin-110` through `admin-116` (scroll progression of the General tab content). `admin-101`/`102`/`103`/`104` for Language/Styles/Licenses/Support tabs.

### RSVP add-on settings (`evcal_rs`)

- Default RSVP form fields (name, email, phone, message)
- Email-from address / from name overrides
- Email subject + body templates (per status: pending, confirmed, cancelled, waitlisted)
- Default RSVP capacity
- Auto-confirm vs manual approval
- Cron-based reminder schedule

> Screenshot: `admin-120-settings-rsvp.png`

### Tickets add-on settings (`evcal_tx`)

- Default ticket type (per-attendee, group)
- WooCommerce-product creation defaults (catalog visibility, virtual flag, downloadable PDF ticket)
- Email-attached PDF ticket toggle
- Refund window (days)
- Stripe-direct toggle (bypass WC checkout for one-click)

> Screenshot: `admin-121-settings-tickets.png`

---

## 4. Taxonomy Admin

Three first-party taxonomies plus one extensible slot:

- **Event Type** (`event_type`) — primary classification
- **Event Type 2** (`event_type_2`) — secondary slot, exposed only when needed (acts like Categories in Posts)
- **Event Location** (`event_location`) — locations as taxonomy terms with extended term meta (address, lat/lon, country, etc.)
- **Event Organizer** (`event_organizer`) — organizers as taxonomy terms with extended term meta (email, phone, URL, image)

The Location and Organizer term-edit screens add custom fields beyond the default WordPress term form: address, lat/lon, contact info, social links. These fields persist as term meta and are surfaced on frontend event cards.

> Screenshots: `admin-002-tax-event-type.png`, `admin-003-tax-event-location.png`, `admin-004-tax-event-organizer.png`

---

## 5. CSV Import (`/wp-admin/admin.php?page=evocsv`)

A single-page importer (CSV Importer add-on). The page surfaces:

- Upload field (CSV file)
- Sample CSV download link
- Field-mapping panel (CSV column → EventON postmeta)
- Update-existing-vs-create-new toggle (matched by Event Title or by external ID column)
- Timezone-of-input dropdown (interpret CSV timestamps as UTC, site default, or per-row column)

The importer is **not** a WP-CLI hook — admin-only. Importing 1000s of events through this UI is a known performance pain point (single-batch, no chunking).

> Screenshot: `admin-130-csv-importer.png`

---

## 6. RSVP Records List (`/wp-admin/edit.php?post_type=evo-rsvp`)

A WP list table of RSVP submissions across all events.

**Columns:**
- RSVP ID (post title is auto-generated, format: `RSVP - <event title> - <attendee name>`)
- Event (linked back to the event post)
- Attendee name / email
- Status (Pending, Confirmed, Cancelled, Waitlisted)
- Submitted date

**Bulk actions:** Confirm, Cancel, Move to Trash, Resend confirmation email

**Filters:** by event, by status, by date range

The RSVP records CPT (`evo-rsvp`) is **not publicly queryable**, **not in REST**, and **shows in admin under the Events menu** (not the EventON menu) — slightly inconsistent placement vs CSV Import.

> Screenshot: `admin-140-rsvp-records.png`

---

## 7. Ticket Records — Routed Through WooCommerce

EventON Tickets does **not** maintain a standalone ticket-records list table. Instead, when WC is active:

- Ticket purchases create WC orders (one line item per ticket)
- The "Ticket Orders" submenu under WC routes to `admin.php?page=wc-orders&evofilter=evotix` — a WC orders list pre-filtered to orders containing event tickets
- The `evo-tix` CPT exists for individual ticket records (one post per attendee, linked to the WC order line item) but is registered with `public=false, show_ui=false` — visible only via the order detail page

This is a deliberate design: tickets reuse WooCommerce's full payment, refund, and tax infrastructure rather than reimplementing it. The trade-off is that **tickets cannot be sold without WooCommerce installed**, and the persistent admin notice on every EventON page reinforces that.

> Screenshot: `admin-150-wc-ticket-orders.png` (the filtered WC orders view; note: filter only applies if there are existing ticket orders — empty state shown here)

---

## 8. Welcome Screens

Activated on plugin activation/upgrade. They are a series of three tabs under the Dashboard (`index.php?page=evo-*`):

- **Welcome** (`evo-about`) — version-marketing copy + "Configure Settings" CTA
- **Getting Started** (`evo-getting-started`) — 4-step quickstart (set timezone, add a category, add an event, embed via shortcode)
- **Changelog** (`evo-changelog`) — release notes pulled from `readme.txt`

These do not appear in the WP menu after first dismissal — must be reached via direct URL.

> Screenshots: `admin-160-welcome-about.png`, `admin-161-getting-started.png`, `admin-162-changelog.png`

---

## 9. Plugins Page Footprint

EventON installs as **one base plugin + 12 separate add-on plugins** on the WP Plugins screen. All 12 are GPL-licensed with their own update channels (manual ZIP upload via Addons & Licenses, or License-key-driven auto-updates if Envato/CodeCanyon credentials are entered).

Each add-on declares EventON 4.x as a dependency in its plugin header. The activation logic in EventON's bootstrap (`eventon.php`) does **not** prevent activating an add-on without the base — instead, each add-on's `__construct` checks for `class_exists('EventON')` and silently no-ops if missing.

> Screenshot: `admin-170-plugins-list.png`

---

## 10. Shortcode Generator

EventON injects a **"Add EventON" button** above the editor on Pages (and Posts, if enabled). The button opens a lightbox with form fields covering all 100+ shortcode attributes (calendar style, filter taxonomies, event count, sort order, layout, hide flags). Generated shortcode is inserted at the cursor position.

The button is hidden by default in Gutenberg's full-screen mode. With the block editor active (as in WP 6.x), the user must first switch to "Classic block" or use the block-editor "Inline shortcode generator" alternative — a known UX friction point. The setting `evo_hide_shortcode_btn` lets admins suppress the button entirely.

> Screenshot: `admin-180-page-new.png` (note: no shortcode-button visible in Gutenberg full-screen mode — must switch to classic to access)

---

## Admin UX Pain Points (observed)

1. **Persistent yellow banners** — Three "needs WooCommerce" notices show on every EventON admin page when WC is missing. They are not dismissable, and there is no per-add-on suppression. New users frequently disable the relevant add-ons rather than understand the dependency.
2. **Settings page is one giant scrollable form per tab** — 19 sub-sections under General, no AJAX-save, no per-section save. A wrong scroll position + Save Changes wipes any unsaved changes elsewhere on the same tab. The left-rail nav is in-page anchor jumps, not separate URLs.
3. **Date filter on Events list filters by post-creation date, not event date** — confuses managers looking for "events this month" who instead get "events I created this month".
4. **`evo-tix` and `evo-rsvp` CPTs live in different menu sections** (RSVP under Events submenu, Tickets only via WC) — inconsistent.
5. **Block editor compatibility is partial** — event meta is metabox-only, content is shoved into a Classic block, no first-party Gutenberg block for event embedding (separate Visual Composer / Elementor integrations exist but are heavy).
6. **CSV importer is not chunked** — large imports time out or partial-fail without resume.
7. **Welcome / Getting Started screens orphan after dismissal** — only reachable via direct URL afterward; no link from the Settings page.
