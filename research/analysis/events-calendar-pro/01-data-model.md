---
plugin: The Events Calendar Pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P1 — Static Analysis
---

# 01 — Data Model: The Events Calendar Pro 7.4.5

All storage is on top of WordPress's native data layer. ECP adds one custom database table, two custom fields on TEC's CT1 tables, and a large set of post-meta keys.

---

## 1. Post Types

ECP registers or depends on the following post types:

| Post Type | Registering Plugin | Purpose |
|---|---|---|
| `tribe_events` | TEC (base) | Single event or recurring-event parent |
| `tribe_venue` | TEC (base) | Venue CPT |
| `tribe_organizer` | TEC (base) | Organizer CPT |
| `tribe_event_series` | ECP | Series grouping post (CT1 only) |

### `tribe_event_series`

Introduced with CT1 (ECP 6.0). One series post corresponds to a recurring event definition. Individual occurrences (`tec_occurrences` rows) link back to the series via `tec_series_relationships`. The series post carries the human-readable title and is the edit target for "all occurrences" scope.

---

## 2. Custom Database Tables (CT1)

The base TEC plugin defines two CT1 tables; ECP **extends** them with additional columns and adds one new table:

### 2a. `{prefix}tec_events` — extended by ECP

TEC defines the base table. ECP adds one column via the `Events` custom-field class (`src/Events_Pro/Custom_Tables/V1/Tables/Events.php`):

| Column | Type | Description |
|---|---|---|
| `rset` | `longtext` (nullable) | RRULE/RDATE/EXRULE set in iCalendar format. Populated on save; drives occurrence materialisation. |

### 2b. `{prefix}tec_occurrences` — extended by ECP

TEC defines base columns (`occurrence_id`, `event_id`, `post_id`, `start_date`, `end_date`, etc.). ECP adds three columns via `Occurrences` custom-field class (`src/Events_Pro/Custom_Tables/V1/Tables/Occurrences.php`):

| Column | Type | Default | Description |
|---|---|---|---|
| `has_recurrence` | `boolean` | `FALSE` | Whether this occurrence belongs to a recurring event |
| `sequence` | `bigint unsigned` | `0` | Position index within the series (drives `_EventSequence` permalink) |
| `is_rdate` | `boolean` | `FALSE` | Whether this occurrence is an explicit RDATE (vs. RRULE-generated) |

### 2c. `{prefix}tec_series_relationships` — new table (ECP only)

Defined in `src/Events_Pro/Custom_Tables/V1/Tables/Series_Relationships.php`. Maps `tribe_event_series` posts to their constituent `tribe_events` occurrences.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `relationship_id` | `bigint unsigned` | PK AUTO_INCREMENT | Row identifier |
| `series_post_id` | `bigint unsigned` | KEY | WP post ID of the `tribe_event_series` post |
| `event_id` | `bigint unsigned` | — | CT1 event ID (row in `tec_events`) |
| `event_post_id` | `bigint unsigned` | KEY | WP post ID of the event occurrence |

Schema version option: `tec_ct1_series_relationship_table_schema_version` = `1.0.0`.

---

## 3. Post Meta Keys

### 3a. Event meta (`tribe_events` posts)

| Meta Key | Type | Description |
|---|---|---|
| `_EventStartDate` | string (Y-m-d H:i:s) | Event start in site local time |
| `_EventEndDate` | string (Y-m-d H:i:s) | Event end in site local time |
| `_EventStartDateUTC` | string (Y-m-d H:i:s) | Event start in UTC |
| `_EventEndDateUTC` | string (Y-m-d H:i:s) | Event end in UTC |
| `_EventTimezone` | string (IANA tz) | Timezone identifier |
| `_EventAllDay` | bool-string | Whether event spans the whole day |
| `_EventDuration` | int (seconds) | Duration computed from start/end |
| `_EventURL` | string | Event website URL |
| `_EventCost` | string | Cost/price display string |
| `_EventVenueID` | int | Post ID of linked `tribe_venue` |
| `_EventOrganizerID` | int (or serialised array) | Post ID(s) of linked `tribe_organizer` |
| `_EventSequence` | int | Occurrence sequence number (CT1: mirrors `tec_occurrences.sequence`) |
| `_EventNextPendingRecurrence` | string (date) | Legacy: next queued recurrence to materialise |
| `_EventOriginalParent` | int | Post ID of the series parent (legacy recurrence) |
| `_EventRecurrence` | serialised array | Legacy recurrence rule storage (pre-CT1) |
| `_EventRecurrenceBackup` | serialised array | Backup copy of `_EventRecurrence` pre-migration |
| `_tec_requires_first_save` | bool-string | Flags that a newly created event needs a re-save |

#### CT1 / Block-editor recurrence meta (modern path)

| Meta Key | Description |
|---|---|
| `_tribe_blocks_recurrence_rules` | JSON: array of RRULE/RDATE rule objects (block editor format) |
| `_tribe_blocks_recurrence_exclusions` | JSON: array of EXRULE/EXDATE exclusion objects |
| `_tribe_blocks_recurrence_description` | Human-readable override for the recurrence description label |

#### Series meta

| Meta Key | Description |
|---|---|
| `_tec-series-show-title` | bool — whether to show the series title on occurrence single views |

### 3b. Virtual Events meta (`tribe_events` posts)

All keys prefixed `_tribe_events_virtual_`:

| Meta Key | Description |
|---|---|
| `_tribe_events_virtual_url` | The meeting/video URL |
| `_tribe_events_virtual_video_source` | Source identifier: `zoom`, `google-meet`, `ms-teams`, `webex`, `youtube`, `facebook`, `other` |
| `_tribe_events_virtual_autodetect_source` | Detected source from URL pattern analysis |
| `_tribe_events_virtual_embed_video` | bool — embed the video on the event page |
| `_tribe_events_virtual_show_on_event` | Who can see the link on the event page (everyone, logged-in, ticket-holder) |
| `_tribe_events_virtual_show_on_views` | Whether the virtual icon/link shows on calendar views |
| `_tribe_events_virtual_show_embed_at` | Timestamp (or offset) when embed becomes visible |
| `_tribe_events_virtual_show_embed_to` | Visibility scope for the embed |
| `_tribe_events_virtual_linked_button` | bool — show a "Join" button |
| `_tribe_events_virtual_linked_button_text` | Custom label for the join button |
| `_tribe_events_virtual_rsvp_email_link` | bool — include virtual link in RSVP emails |
| `_tribe_events_virtual_ticket_email_link` | bool — include virtual link in ticket emails |
| `_tribe_virtual_events_type` | string — event type label (online / hybrid / in-person) |

### 3c. Venue meta (`tribe_venue` posts)

| Meta Key | Description |
|---|---|
| `_VenueAddress` | Street address |
| `_VenueCity` | City |
| `_VenueState` | State/province |
| `_VenueProvince` | Province (non-US) |
| `_VenueZip` | Postal code |
| `_VenueCountry` | Country name |
| `_VenueLat` | Latitude (geocoded) |
| `_VenueLng` | Longitude (geocoded) |
| `_VenueOverwriteCoords` | bool — manual lat/lng override |

---

## 4. Options (wp_options)

All ECP settings live under WordPress options, accessed through `tribe_get_option()` / `tribe_update_option()`, which wraps them in the shared `tribe_events_calendar_options` option array unless stated otherwise.

### Settings options (stored in tribe's option array)

| Key | Type | Description |
|---|---|---|
| `custom-fields` | serialised array | Array of Additional Fields definitions (label, type, options) |
| `recurrenceMaxMonthsAfter` | int | How many months ahead to materialise recurrences |
| `recurrenceMaxMonthsBefore` | int | How many months back to materialise recurrences |
| `hideSubsequentRecurrencesDefault` | bool | Default: hide all-but-first occurrence in list views |
| `userToggleSubsequentRecurrences` | bool | Allow front-end visitors to toggle subsequent occurrences |
| `eventsDefaultVenueID` | int | Default venue post ID |
| `eventsDefaultOrganizerID` | int | Default organizer post ID |
| `eventsDefaultAddress` | string | Default venue address string |
| `eventsDefaultCity` | string | Default city |
| `eventsDefaultState` | string | Default state |
| `eventsDefaultProvince` | string | Default province |
| `eventsDefaultZip` | string | Default zip code |
| `eventsDefaultPhone` | string | Default phone |
| `eventsDefaultCountry` | string | Default country |
| `eventsSlug` | string | Base rewrite slug for events archive |
| `geoloc_default_geofence` | int (km) | Default geofence radius for location search |
| `geoloc_default_unit` | string (miles/km) | Distance unit |
| `geoloc_rewrite_slug` | string | Slug for location/map view rewrite |
| `google_maps_js_api_key` | string | Google Maps JS API key |
| `embedGoogleMaps` | bool | Show embedded Google Map on venue pages |
| `embedGoogleMapsZoom` | int | Default map zoom level |
| `hideLocationSearch` | bool | Hide location search bar |
| `tribeEnableViews` | array | List of enabled view slugs |
| `viewOption` | string | Default view slug |
| `mobile_default_view` | string | Default view on mobile |
| `monthEventAmount` | int | Max events per day cell in month view |
| `photo_view_force_grid` | bool | Force grid layout in photo view |
| `week_view_hide_weekends` | bool | Hide Saturday/Sunday columns in week view |
| `hideRelatedEvents` | bool | Hide related events section |
| `tribeDisableTribeBar` | bool | Disable the filter bar |
| `liveFiltersUpdate` | bool | Live AJAX filtering |
| `tribe_events_timezones_show_zone` | bool | Show timezone on event display |
| `tribe_facebook_app_id` | string | Facebook App ID for Live integration |
| `default_admin_calendar_manager` | string | Default view in WP admin calendar |
| `postsPerPage` | int | Events per page |
| `datepickerFormat` | string | Date picker format string |
| `dateTimeSeparator` | string | Separator between date and time |
| `timeRangeSeparator` | string | Separator in time range display |
| `dateWithoutYearFormat` | string | Date format without year |
| `date_with_year` | string | Date format with year |
| `stylesheetOption` | string | CSS stylesheet choice |
| `tribeEventsShortcodeBeforeHTML` | string | HTML prepended to shortcode output |
| `tribeEventsShortcodeAfterHTML` | string | HTML appended to shortcode output |

### Standalone wp_options entries

| Option Name | Description |
|---|---|
| `tribe_geoloc_options` | Geolocation settings (array: geofence, unit, API key details) |
| `pue_install_key_events_calendar_pro` | License key for PUE update engine |
| `tribe_pue_key_notices` | PUE key notice state array |
| `tec_ct1_occurrences_field_schema_version` | CT1 occurrences field schema version (`1.0.1`) |
| `tec_ct1_events_field_schema_version` | CT1 events field schema version (`1.0.1`) |
| `tec_ct1_series_relationship_table_schema_version` | CT1 series relationships table version (`1.0.0`) |

---

## 5. Taxonomies

ECP depends on taxonomies registered by TEC base; it does not register additional taxonomies itself. TEC registers:

| Taxonomy | Post Types | Purpose |
|---|---|---|
| `tribe_events_cat` | `tribe_events` | Event categories |
| `post_tag` (extended) | `tribe_events` | Event tags |

ECP extends these with the linked-post taxonomy system (Venue / Organizer as linked post types rather than taxonomies).

---

## 6. Custom Fields (Additional Fields)

Additional Fields are not separate post-meta keys per field. They are:
- **Defined** as an array stored under the `custom-fields` tribe option.
- **Values** stored as individual post-meta entries where the meta key equals the field's `name` attribute from the option definition.

Field types supported: Text, Text Area, URL, Radio, Checkbox, Dropdown.

Each definition in the `custom-fields` array has: `label`, `name` (the meta key), `type`, `options` (for Radio/Checkbox/Dropdown), and a `gutenberg_editor` flag.

---

## 7. Recurrence Storage: Legacy vs. CT1

ECP maintains two parallel recurrence storage paths:

| Path | When Used | Storage |
|---|---|---|
| **Legacy** | Pre-CT1 sites; fallback | `_EventRecurrence` postmeta (serialised PHP array encoding RRULE-like rules) |
| **CT1** (current) | Sites with CT1 activated | `rset` column in `tec_events`, rows in `tec_occurrences`, relationships in `tec_series_relationships` |
| **Block Editor** | Modern Gutenberg flow | `_tribe_blocks_recurrence_rules` / `_tribe_blocks_recurrence_exclusions` JSON meta — converted to RRULE `rset` on save |

Migration from Legacy → CT1 is handled by `Events_Pro/Custom_Tables/V1/Migration/` strategies. The migration is gated by the `tec_events_pro_custom_tables_v1_migration_enabled` filter.
