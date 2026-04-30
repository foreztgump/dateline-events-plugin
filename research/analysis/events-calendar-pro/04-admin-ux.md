---
plugin: events-calendar-pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P2 — Feature Inventory
doc: 04-admin-ux
site: Site A — dateline-site-a.ddev.site (DDEV, WordPress 6.9.4, PHP 8.2)
notes: >
  Live walkthrough on Site A with TEC base 6.11.1 + ECP 7.4.5 active.
  Eventin Pro deactivated for the walkthrough to avoid CPT-registration
  conflicts (notice "Eventin Pro requires Eventin v4.0.21" — Eventin core
  4.0.16 in Site A is older than Eventin Pro 4.0.19 expects).
  Seven sample events seeded covering: standard, all-day, virtual (Zoom),
  past, multi-day spanning month boundary, recurring weekly (legacy meta),
  and featured. CT1 tables (tec_events / tec_occurrences) populated
  manually via raw INSERT — single-event permalinks 404 because CT1
  occurrence-permalink resolution requires the full save pipeline. The
  list, calendar, and admin screens render correctly; single-event
  template details are documented from `src/views/v2/single-event/`.
---

# Events Calendar Pro 7.4.5 — Admin UX

This doc inventories every admin screen, list table, settings tab, and metabox introduced or extended by The Events Calendar Pro 7.4.5. The base TEC plugin contributes the foundation (post types, list tables, settings shell); ECP layers Pro features on top (recurrence editor, virtual events, additional Pro views, defaults tab, custom fields).

Screenshots referenced as `screenshots/admin-NNN-*.png`.

---

## 1. Admin Menu Structure

ECP and TEC together register a single top-level menu under **Events** (Dashicons calendar icon). The full sub-menu ordering observed on Site A (`screenshots/admin-001-events-list.png`):

```
Events                       wp-admin/edit.php?post_type=tribe_events
├── Events                   (list table for tribe_events)
├── Add New Event            wp-admin/post-new.php?post_type=tribe_events
├── Tags                     wp-admin/edit-tags.php?taxonomy=post_tag&post_type=tribe_events
├── Event Categories         wp-admin/edit-tags.php?taxonomy=tribe_events_cat&post_type=tribe_events
├── Series                   wp-admin/edit.php?post_type=tribe_event_series   (CT1 only)
├── Venues                   wp-admin/edit.php?post_type=tribe_venue
│   └── Categories           wp-admin/edit-tags.php?taxonomy=tribe_venue_cat
├── Organizers               wp-admin/edit.php?post_type=tribe_organizer
│   └── Categories           wp-admin/edit-tags.php?taxonomy=tribe_organizer_cat
├── Import                   wp-admin/edit.php?post_type=tribe_events&page=aggregator
├── Calendar Embeds          (Gutenberg-block iframe management)
├── Settings                 wp-admin/admin.php?page=tec-events-settings
├── Help
├── Troubleshooting          wp-admin/admin.php?page=tec-troubleshooting
├── Event Add-Ons
└── Setup Guide              (TEC Setup Wizard — first-run wizard)
```

The **TEC Setup Guide** (admin-001) is a guided onboarding wizard that ECP populates with extra Pro steps (Calendar Views, Currency, Date format, Event Organizer, Event Venue, Create an event, Event Tickets upsell, Useful Resources panel with AI Chatbot link).

---

## 2. Events List Table — `wp-admin/edit.php?post_type=tribe_events`

`screenshots/admin-001-events-list.png`

Standard WordPress list table extended by ECP/TEC with calendar-specific columns:

| Column | Source | Description |
|---|---|---|
| Title | WP core | Event title (sortable) |
| Author | WP core | Post author |
| Event Categories | TEC | `tribe_events_cat` taxonomy chips |
| Tags | WP core | `post_tag` chips |
| Series | ECP (CT1) | Series this occurrence belongs to (empty for non-recurring) |
| Start Date | TEC | `_EventStartDate` (sortable) |
| End Date | TEC | `_EventEndDate` (sortable) |

**Top of list:**
- Filter tabs: `All (N)` / `Published (N)` / `Trash`
- Top-right: `Manager` button — links to ECP's Events Manager (CT1 admin)
- **Admin notices**: TEC timezone warning (recommends `America/Los_Angeles` over `UTC+0`); Event Tickets upsell card with `Install Event Tickets` CTA
- `Add New Event` button next to "Events" page title
- Search box + `Filter by date` dropdown

**Row quick-actions:** Edit | Quick Edit | Trash | View

---

## 3. Add / Edit Event Screen — `wp-admin/post-new.php?post_type=tribe_events`

`screenshots/admin-002-event-new.png`

Site A renders the **classic editor** path (Block-editor disabled by another plugin or theme decision). Both editors are supported; the metabox arrangement below applies to the classic editor and is largely mirrored as side-panel groups in the block editor.

### Title & content
- Title field
- TinyMCE/Quicktags editor with media uploader
- Excerpt metabox

### `The Events Calendar` metabox (TEC base, extended by ECP)

**TIME & DATE section**
- `Start / End` — paired date + time pickers; site-default timezone applies unless changed at site level
- `All Day Event` checkbox — when ticked, hides the time picker and sets `_EventAllDay`
- Time zone display: `Time Zone: America/Los_Angeles` (sourced from site option)

**RECURRING EVENT section** (ECP, the largest extension)
- `Schedule multiple events` button — opens the recurrence rule editor modal:
  - Frequency: `Daily | Weekly | Monthly | Yearly | Once`
  - Interval: `Every N <unit>` (numeric input)
  - Day-of-week selector (for Weekly): toggleable Monday – Sunday
  - Day-of-month selector (for Monthly): `Day N` or `1st/2nd/3rd/4th/Last <weekday>`
  - End condition: `Never` / `After N events` (count) / `Series ends on this date`
  - `Add Exclusion` — date picker for EXDATE
  - `Recurrence Description` — manual override of the auto-generated human description
- For an existing recurring event: edit-scope modal appears on save:
  - `This event only`
  - `All upcoming events`
  - `All events in the series`
  - `Break from Recurring Event` (detach single occurrence)

**LOCATION section**
- `Venue` — Select2 dropdown of `tribe_venue` posts; `Add new venue` inline link
- `Map` — radio: `Show map` / `Show map link` — controlled by `embedGoogleMaps` site option
- Fallback note when API key missing: *"This requires the use of an API key…"* with link to APIs settings

**VIRTUAL EVENT section** (ECP — visible because Virtual Events is bundled in Pro)
- `Configure with Add-Ons` link — jumps to APIs / Integrations settings to connect Zoom/Google/MS providers
- When configured: provider dropdown (Zoom, Google Meet, MS Teams, Webex, YouTube, Facebook, Other), URL field, autodetect toggle, embed-on-page toggle, visibility selector (`Everyone | Logged-in users | Ticket holders`), `show embed N minutes before start`, custom Join button label, "Include link in RSVP / ticket emails" checkboxes

**ORGANIZERS section**
- Multi-select Select2 of `tribe_organizer` posts; multiple organizers allowed (stored as serialised `_EventOrganizerID`)
- `Add new organizer` inline link

**EVENT WEBSITE section**
- `URL` field — single text input; persisted as `_EventURL`

**EVENT COST section**
- `Currency Symbol` text input + `Before / After` position radios
- `Cost` text input — free-form display string (`Free`, `$25`, `$199-499`); persisted as `_EventCost`

**ADDITIONAL FUNCTIONALITY section**
- Static link card: *"Look for additional functionality including custom events, ticket sales, publish recurring events, new views and more!"* → links to `Event Add-Ons` page

### `Recurring Event` metabox (ECP, separate)

Older legacy recurrence UI (when `_EventRecurrence` postmeta path is active). Replaced by the inline `Schedule multiple events` flow on CT1 sites. CT1 migration prompt appears as an admin notice on event-edit screens for legacy events:

> *"Get ready for the new recurring events! Faster event editing. Smarter save options. Upgrade your recurring events."*

### Sidebar (right column)

| Box | Contents |
|---|---|
| Publish | Save Draft, Preview, Visibility, Publish/Update; **Move to Trash** |
| Tags | Standard WP tags |
| Event Categories | Tree-checkbox list of `tribe_events_cat` (with category-color picker if configured) |
| Post Attributes | `Template` selector (page templates) |
| Event Options (ECP) | Checkboxes: `Hide From Event Listings`, `Sticky in Month View`, `Featured Event` |
| Series | Select2: `Create or Find a Series` (CT1) — links event to a series post |
| Event Status | `Set status: Scheduled / Cancelled / Postponed / Moved Online` |
| Featured Image | Standard WP featured image |
| Custom Fields | TEC Additional Fields render here |
| Author | Author selector |

### Block-editor variant (when active)

ECP registers blocks `tribe/event-datetime`, `tribe/event-organizer`, `tribe/event-venue`, `tribe/event-website`, `tribe/event-price`, `tribe/event-category`, `tribe/event-tags`, `tribe/featured-image`, plus a **Calendar Embed** block (renders a `[tribe_events]` shortcode in an iframe via `GET /tec/v1/events/calendar-embed`). Recurrence is edited through the panel `Schedule multiple events` exposing the same RRULE rule builder; rules persist as `_tribe_blocks_recurrence_rules` JSON until save when CT1 converts them to RRULE/iCal `rset`.

---

## 4. Venues — `wp-admin/edit.php?post_type=tribe_venue`

`screenshots/admin-003-venues-list.png` (list) · `admin-004-venue-new.png` (editor)

Venues are a separate CPT registered by TEC base. ECP extends this with archive pages and a **Venue Widget** (events at a specific venue).

**List columns:** Title (with row-locked "is locked" indicator when actively edited), Author, Date.

**Edit screen metaboxes:**
- `Venue` (TEC) — Address, City, State (US), Province (Int), Country, Zip/Postal Code, Phone, Website URL
- ECP adds: `Latitude` / `Longitude` (auto-populated from address via Google Geocoding API); `Show Google Map` toggle; `Show Google Maps Link` toggle
- `Categories` taxonomy sidebar (`tribe_venue_cat`) — for filtering venue archives

---

## 5. Organizers — `wp-admin/edit.php?post_type=tribe_organizer`

`screenshots/admin-005-organizers-list.png` (list) · `admin-006-organizer-new.png` (editor)

Organizers are a separate CPT registered by TEC base. ECP extends with archive pages and an **Events Featured Venue widget** family.

**Edit metaboxes:**
- Title + content (bio)
- `Organizer` metabox: Phone, Website URL, Email — persisted as `_OrganizerPhone`, `_OrganizerWebsite`, `_OrganizerEmail`
- `Categories` taxonomy sidebar (`tribe_organizer_cat`)

---

## 6. Series — `wp-admin/edit.php?post_type=tribe_event_series` (CT1)

`screenshots/admin-007-series-list.png`

Introduced with CT1 (ECP 6.0+). One series post represents one recurring event definition; individual `tec_occurrences` rows link back via the `tec_series_relationships` table.

**List view:** Title | Author | Date | Number of Events. Top button: `Add New Series`.

**Series edit screen:**
- Series title + content (description applied to all occurrences)
- `Events in Series` metabox: list of `tribe_events` posts attached, with `Add events to Series` button (Select2)
- `_tec-series-show-title` toggle: whether the series title appears on individual occurrence single-event templates

---

## 7. Event Categories — `wp-admin/edit-tags.php?taxonomy=tribe_events_cat`

`screenshots/admin-008-categories.png`

Standard WP taxonomy admin with one ECP extension:
- `Category Colors` metabox per term — primary color + secondary color via WP Color Picker. Used to tint events on calendar views.

Hierarchical (parent terms supported); description field; slug; default edit table view.

---

## 8. Settings — `wp-admin/admin.php?page=tec-events-settings`

`screenshots/admin-010-settings-general.png` · `admin-011-settings-display.png` · `admin-012-settings-defaults.png` · `admin-013-settings-imports.png` · `admin-014-settings-integrations.png` · `admin-016-settings-addons.png` · `admin-017-settings-licenses.png`

Top-level horizontal tab strip on Site A:

```
General | Display | Default Content | Additional Fields | Licenses | Filters | Community | Integrations | Imports
```

(Some tabs only appear when their owning add-on is active: `Filters` requires Filter Bar, `Community` requires Community Events.)

### 8a. General tab

`screenshots/admin-010-settings-general.png`

Sub-tabs (horizontal pills): `Viewing | Editing | Maintenance | Debugging`.

**Viewing sub-tab fields:**
- `Events URL slug` — input (default `events`); preview link displayed
- `Single event URL slug` — input (default `event`); preview link displayed
- `Include events in main blog loop` — checkbox
- `Recurring event instances` — `Show only the next instance of each recurring event (only affects list-style views)`
- `Front-end recurring event instances toggle` — `Allow users to decide whether to show all instances of a recurring event on list-style views`
- `Enable the Month View Cache` — checkbox (writes month HTML to transients)
- `Show The Events Calendar link` — branding footer toggle

**Editing sub-tab:** date format default, time format default, Block Editor toggle, multi-day event display behavior.

**Maintenance sub-tab:** clear cache buttons, reset/uninstall actions (Pro-only: license reset).

**Debugging sub-tab:** debug log toggle, query log display.

### 8b. Display tab

`screenshots/admin-011-settings-display.png`

Sub-tabs: `Calendar | Organizers | Date & Time | Currency | Maps | Additional Content`.

**Calendar sub-tab (the densest panel):**
- `Calendar Template` — radio: `Skeleton styles` (CSS-light) / `Default Styles` (full CSS)
- `Enable event views` — multi-checkbox (the key Pro switch):
  - List ✓
  - Month ✓
  - Day ✓
  - Summary ✓ (ECP)
  - Photo ✓ (ECP)
  - Week ✓ (ECP)
  - Map ✓ (ECP)
  - "You must select at least one view"
- `Default view` — dropdown
- `Default mobile view` — dropdown (`Use Default View` or any enabled view)
- `Month view events per day` — number input (default 3)
- `Number of events to show per page` — number input (List/Photo/Map views; default 12)
- `Show comments` — `Enable comments on event pages` checkbox
- `Disable the event search bar` — `Hide the search bar on all views` checkbox
- `Hide related events` — checkbox (ECP) — controls 3-event "Related Events" section on single template
- `Hide weekends on Week View` — `Check this to only show weekdays on Week View. This also affects the Events in Week widget.` (ECP)
- `Display images as a grid on Photo View` — `Check this to enforce an aspect ratio of 16:9 for photos on the Photo view` (ECP)

**Organizers sub-tab:** show/hide organizer on month/list views.

**Date & Time sub-tab:** display formats (date with year, date without year, time format, time-range separator, date-time separator), datepicker format.

**Currency sub-tab:** Currency symbol, position (before/after), thousands and decimal separators.

**Maps sub-tab:** `Embed Google Maps` toggle, default zoom level, geolocation default geofence (radius in miles or km).

**Additional Content sub-tab:** "Before HTML" / "After HTML" raw HTML inputs prepended/appended to calendar shortcode + view output.

### 8c. Default Content tab (ECP)

`screenshots/admin-012-settings-defaults.png`

ECP-only tab. Pre-fills new events with default values:
- Default Venue (Select2 of `tribe_venue` posts)
- Default Organizer (Select2 of `tribe_organizer` posts)
- Default address fields (street, city, state, province, zip, country, phone)

Used so a venue's address auto-populates when creating an event with no venue selected — speeds up common single-venue sites.

### 8d. Additional Fields tab (ECP)

`screenshots/admin-031-additional-fields.png`

The custom-fields manager. UI:
- "Custom fields are extra information you can add to events"
- List of currently defined fields (table: Label | Type | Block Editor | Actions)
- `Add field` button reveals form with: `Field Type` (Text, Text Area, URL, Radio, Checkbox, Dropdown), `Field Label`, `Options (one per line)` (only for Radio/Checkbox/Dropdown), `Use in Block Editor` checkbox
- Confirmation prompt on field removal: *"Are you sure you wish to remove this field and its data from all events?"*

### 8e. Licenses tab

`screenshots/admin-017-settings-licenses.png`

ECP exposes its license key form here (PUE — Plugin Update Engine). Fields:
- License key (text input — masked as `••••••••N9CC` once saved)
- Expiration date (read-only)
- Status indicator (red error notice if invalid: *"Sorry, key validation server is not available."*)
- "Renew key" button → external StellarWP store

Licenses tab also lists keys for any other StellarWP plugins active (Filter Bar, Event Aggregator, etc.).

### 8f. Filters tab (only with APM/Filter Bar)

When **Filter Bar** plugin is installed, this tab manages discoverable filters: filter type registration, sort order, frontend display.

### 8g. Community tab (only with Community Events)

Community Events allows visitors to submit events. Tab governs submission rules, captcha, moderation flow.

### 8h. Integrations tab

`screenshots/admin-014-settings-integrations.png`

Integration toggles per provider. Each provider shows a card with: connect button, status indicator, settings (e.g., default meeting duration, host email) when connected. Providers seen on Site A:
- **Zoom** — `Add Zoom Account` (OAuth), default duration, alternative hosts
- **Google Meet** — `Add Google Account` (OAuth)
- **Microsoft Teams** — `Add Microsoft Account` (OAuth) — Webex shares this section
- **YouTube** — Channel ID, autoplay (deprecated notice), modest branding, mute video, related videos toggle
- **Facebook Live** — `Add Facebook Page` (OAuth) — App ID + App Secret + redirect URL display

(Site A's `tab=integrations` query param renders "You've requested a non-existent tab" message — actual tab slug is different. The provider sub-panels live under each provider's card on the cards index. See `admin-020` through `admin-024` for individual sections.)

### 8i. Imports tab

`screenshots/admin-013-settings-imports.png`

Configures **Event Aggregator** importer: default origin (CSV / iCalendar URL / Google Calendar / Meetup / Eventbrite — paid Aggregator service required for live sources), default category, default status, import schedule frequency.

### 8j. Add-Ons (Event Add-Ons page) — `wp-admin/admin.php?page=tec-events-settings&tab=addons`

`screenshots/admin-016-settings-addons.png`

Marketing landing page for the ECP/StellarWP add-on family. Lists Event Tickets, Event Tickets Plus, Filter Bar, Aggregator, Community Events, Promoter, Eventbrite Tickets, Virtual Events, etc. with `Install` / `Activate` / `Get Plugin` buttons that link to wp.org or the StellarWP store.

---

## 9. Event Aggregator (Importer) — `wp-admin/edit.php?post_type=tribe_events&page=aggregator`

`screenshots/admin-030-aggregator.png`

Tabs: **Import | Scheduled | History | Settings**.

**Import tab:** Source selector (CSV upload | iCalendar URL | URL | Google Calendar | Meetup [Aggregator-only] | Eventbrite [Aggregator-only]); preview pane shows parsed events before commit; per-import field mapping. Free origins: CSV + iCal URL. Paid origins require **Event Aggregator subscription** (separate license key).

**Scheduled tab:** list of recurring imports with frequency (hourly, daily, weekly, monthly), next-run timestamp, manual `Run Now` button.

**History tab:** chronological log of past imports with row count, success/error status, click-through to per-import event list.

**ECP-specific column extensions in CSV import:**
- Recurrence rule columns (RRULE-format strings)
- `_VenueOverwriteCoords` column (manual lat/lng override)
- Virtual event fields (URL, source, embed, visibility)

---

## 10. Calendar Embeds — `wp-admin/admin.php?page=tec-events-calendar-embeds`

Manager for the `[tribe_events]` shortcode + Calendar Embed Gutenberg block. Lists previously created embed configurations with `Embed Code` copy buttons. Each embed maps to a saved set of `[tribe_events]` parameters (view, category, venue, organizer, etc.) and is rendered by `GET /tec/v1/events/calendar-embed` inside an iframe.

---

## 11. Troubleshooting — `wp-admin/admin.php?page=tec-troubleshooting`

`screenshots/admin-032-troubleshooting.png`

Self-service diagnostics. Sections:
- **System info** — PHP version, WP version, MySQL version, site URL, memory limit, max execution time, plugins active
- **Recent log entries** — TEC's debug log tail
- **Recent template overrides** — list of theme files overriding TEC templates with version mismatch warnings
- **Common Issues** — accordion with curated solutions (e.g., "Events not showing in main loop", "Recurrence not generating")
- **Tools** — `Recreate the rewrite rules`, `Clear caches`, `Re-run upgrade scripts`

---

## 12. Setup Guide — Top-bar item `+ Setup Guide`

`admin-001-events-list.png` shows the wizard panel at top. Five-step onboarding:

1. **Calendar Views** — "Edit your calendar views" → links to Display tab
2. **Currency** — "Edit currency"
3. **Date format** — "Edit date format"
4. **Event Organizer** — "Add Organizer"
5. **Event Venue** — "Add Venue"

Plus: **Create an event** card ("Ready to publish your first event? Add new event" / "Do you already have events you want to import? Import events"); **Event Tickets upsell** ("Are you planning to sell tickets to your events? Install Event Tickets"); **Useful Resources** ("Ask our AI Chatbot anything", documentation links).

Tracked via option `tec_admin_setup_guide_dismissed` and per-step completion meta.

---

## 13. Admin Notices

Common ECP admin notices observed during walkthrough:

| Notice | Trigger | Severity |
|---|---|---|
| *"Eventin Pro requires Eventin v4.0.21 or higher to be active"* | Eventin core older than Eventin Pro expects | Error |
| *"To begin using Events Calendar Pro, please install (or upgrade) and activate Events Calendar Pro (7.7.12+)"* | TEC base ahead of ECP version | Warning |
| *"When using The Events Calendar, we recommend that you use a geographic timezone such as 'America/Los_Angeles' …"* | Site timezone is UTC offset | Info |
| *"The Events Calendar offers basic support for themes using Site Editor. Read more."* | FSE theme detected | Info |
| *"Start selling tickets to your Events"* | Event Tickets not active | Promo (dismissable) |

---

## 14. Other Admin Surfaces (not screenshotted, observed in source)

These admin surfaces exist but were not exercised in the live walkthrough:

- **Promoter integration banner** — `Promoter` menu item appears in the admin bar (top-right) when Promoter add-on is active
- **Customizer color settings** — `wp-admin/customize.php` exposes `Tribe Customizer` panel: primary calendar color, secondary, link color, button color, on-day cell background
- **WPML / Polylang language switcher** — when active, event-edit screens get a language column and translation duplication action
- **Yoast SEO sitemap settings** — `wp-admin/admin.php?page=wpseo_dashboard` adds an "Events" tab governing recurring-event sitemap caps (start/end window in months, items per page)
- **Site Health** — TEC adds a Site Health section reporting PHP encryption availability (defuse/php-encryption), CT1 schema status, REST namespace availability
- **Tools → Export** — `tribe_events`, `tribe_venue`, `tribe_organizer` are includable in WP's native export
- **Tools → Site Health** — PUE check section reports licensed plugin versions

---

## 15. Capabilities & Roles

ECP/TEC register the following caps (mapped onto WP's role system):

| Capability | Default for | Purpose |
|---|---|---|
| `edit_tribe_events` | Editor, Administrator | Edit any event |
| `publish_tribe_events` | Editor, Administrator | Publish events |
| `read_private_tribe_events` | Editor, Administrator | Read private events |
| `delete_tribe_events` | Editor, Administrator | Delete events |
| `edit_tribe_venues` | Editor, Administrator | Edit venues |
| `edit_tribe_organizers` | Editor, Administrator | Edit organizers |
| `manage_options` | Administrator | Configure settings tabs |

Authors get `edit_tribe_events` for their own events but not `publish_tribe_events`; events submitted via Community Events run through this lower-privilege flow.

---

## Cross-References

- Source-tree map: `00-overview.md` § "Source Tree"
- Postmeta keys exposed by these metaboxes: `01-data-model.md` § 3 (Post Meta Keys)
- Hooks fired during the save pipeline: `02-hooks.md` § 2 (Actions Fired by ECP)
- i18n strings backing each metabox label: `03-features.md` § 1 (Recurring Events Engine), § 6 (Virtual Events), § 14 (Settings Additions)
