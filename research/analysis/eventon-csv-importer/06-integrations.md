---
plugin: eventon-csv-importer
version: 1.1.10
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-csv-importer 1.1.10 — Integrations

---

## 1. EventON Core (Required)

The plugin hard-depends on EventON core and its `evo_addons` class. On `plugins_loaded`, it checks for `$GLOBALS['eventon']` and `class_exists('evo_addons')`; if either is missing, it displays an admin notice and returns without initialising. It also calls `evo_addons::evo_version_check()` to confirm EventON ≥ 4.4.

During import, the plugin calls several EventON core helpers directly:

| Function | Purpose |
|---|---|
| `eventon_get_unix_time()` | Convert parsed date/time array to Unix timestamps for `evcal_srow` / `evcal_erow` postmeta |
| `eventon_get_repeat_intervals()` | Compute the `repeat_intervals` postmeta array from frequency/gap/count fields |
| `eventon_get_latlon_from_address()` | Geocode a location address string to lat/lon when auto-creating a new location term |
| `evo_save_term_metas()` | Save term meta (address, link, lat/lon) for newly created location/organiser taxonomy terms |
| `evo_get_ett_count()` | Determine how many `event_type_N` taxonomy columns to accept |
| `evo_calculate_cmd_count()` | Determine how many `cmd_N` custom meta columns to accept |
| `$GLOBALS['eventon']->output_eventon_pop_window()` | Render the guide popup wrapper |

All event data is written to the `ajde_events` CPT using EventON's standard postmeta and taxonomy schema — the importer creates no new data structures.

---

## 2. ActionUser (eventon-actionuser — Optional, Column Only)

ActionUser integration is handled entirely through the CSV column `evoau_assignu`. If this column is present in the CSV, its comma-separated user ID values are written to the `event_users` taxonomy via `wp_set_object_terms()`. There is no `class_exists()` guard — the taxonomy assignment runs unconditionally if the column is populated. If ActionUser is not active the `event_users` taxonomy will not exist and `wp_set_object_terms()` will return a `WP_Error`, which is silently discarded (the result is not checked).

---

## 3. WordPress Media Library (Image Sideloading)

When a CSV row contains an `image_url` column (and no `image_id`), the plugin downloads the remote image and imports it into the WordPress media library using the standard WP sideload API:

1. `download_url($url)` — fetches the remote image to a temp file.
2. `media_handle_sideload($file_array, 0, $desc)` — moves it into the uploads directory and creates an attachment post.
3. `set_post_thumbnail($post_id, $attachment_id)` — assigns it as the event's featured image.

If `image_id` is provided instead, the plugin verifies the attachment exists via `wp_get_attachment_image()` and calls `set_post_thumbnail()` directly. If `image_id` is present but invalid, it falls back to `image_url` if that column is also populated.

This is synchronous — image downloads block the AJAX request for that row. On slow or large images this can hit PHP timeout limits. The guide recommends setting `max_execution_time=0` in `php.ini` for large imports.

---

## 4. CSV Format Specification

The plugin uses an embedded third-party CSV parser (`DataSource.php`, MIT, circa 2008) rather than PHP's built-in `fgetcsv`. The parser calls `$csv->symmetrize()` after loading to fill missing columns in rows that have fewer fields than the header row.

**Accepted header names** (exact match required — case-sensitive):

| Group | Columns |
|---|---|
| Core | `publish_status`, `event_id`, `event_name`, `event_description` |
| Display | `featured`, `color`, `evcal_subtitle`, `hide_end_time` |
| Dates | `event_start_date`, `event_start_time`, `event_end_date`, `event_end_time`, `extend_type` |
| Repeat | `evcal_rep_freq`, `evcal_rep_gap`, `evcal_rep_num`, `evp_repeat_rb_wk`, `evo_rep_WKwk`, `evp_repeat_rb`, `evo_rep_WK`, `evo_repeat_wom` |
| Location | `location_name`, `event_location`, `evcal_location_link`, `evo_location_id`, `event_gmap` |
| Organizer | `event_organizer`, `evcal_org_contact`, `evcal_org_address`, `evcal_org_exlink`, `evo_organizer_id` |
| Taxonomy | `event_type`, `event_type_2` … `event_type_N` (count from EventON settings) |
| Custom meta | `cmd_1` … `cmd_N`, `cmd_1L` … `cmd_NL` (count from EventON settings) |
| Image | `image_url`, `image_id` |
| Links | `evcal_lmlink`, `evcal_lmlink_target`, `_evcal_exlink_option`, `evcal_exlink`, `_evcal_exlink_target` |
| ActionUser | `evoau_assignu` |

**Date format:** `m/d/YYYY` or `m/d/YY` (2- or 4-digit year, auto-detected). ISO 8601 is not accepted.

**Time format:** `h:mm:AM` or `h:mm:PM` (12-hour with colon-separated AM/PM as a third segment, e.g. `6:30:PM`).

**Encoding:** UTF-8. BOM is stripped automatically before parsing.

**Delimiter:** Comma. The file must be saved as "Windows Comma Separated (.csv)" per the guide.

**Boolean fields** (`featured`, `event_gmap`, `hide_end_time`, `evcal_lmlink_target`): accept `yes` or `no` (case-insensitive). Absent values default to `no`.

**Extensibility hooks** allow third-party code to register additional column names (`evocsv_additional_csv_fields` filter) and handle their storage (`evocsv_save_event_custom_data` action, `evocsv_save_additional_event_metadata` action).

---

## 5. No External Services

Beyond image sideloading from arbitrary URLs (which are admin-supplied), the plugin makes no calls to external APIs or third-party services. It has no license-check network calls, no analytics, no CDN dependency.

---

## Integration Summary

| Integration | Required? | Direction | Mechanism |
|---|---|---|---|
| EventON Core | Yes | Inbound (calls helpers) | Direct function calls |
| WordPress Media Library | Conditional | Outbound (upload) | `download_url` + `media_handle_sideload` |
| ActionUser | Optional | Outbound (taxonomy) | `wp_set_object_terms` on `event_users` |
| External image host | Conditional | Inbound (fetch) | `download_url` on user-supplied URL |

---

## Dateline Design Notes

1. **CSV format is legacy** — Dateline's import API should accept ISO 8601 dates and a well-typed JSON body; offer a client-side CSV→JSON converter or server-side pre-processor as a migration path.
2. **Image sideloading is synchronous and blocking** — Dateline should fetch remote images in `ctx.waitUntil` (or a background job) and store to R2; return event IDs immediately with a `pending_image` status updated asynchronously.
3. **ActionUser taxonomy assignment** (`event_users`) maps to Dateline's user–event assignment feature; implement as an explicit `assignedUserIds` array field on the event record rather than a taxonomy.
4. **Location/organizer auto-creation** (upsert by name) is the correct behaviour to preserve — avoid requiring pre-existing IDs for bulk import.
5. **Repeat field mapping** — the CSV `evcal_rep_freq`/`evcal_rep_gap`/`evcal_rep_num` triplet plus day-of-week selectors map to RRULE properties (`FREQ`, `INTERVAL`, `COUNT`, `BYDAY`); convert at import time.
