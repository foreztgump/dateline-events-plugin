# eventon-csv-importer — Hooks

## Actions Registered

| Hook | Purpose |
|------|---------|
| `admin_menu` | Add "CSV Import" submenu under EventON |
| `admin_init` | Enqueue admin styles/scripts for CSV import page |

## Filters Fired (extensibility)

| Hook | Purpose |
|------|---------|
| `evocsv_additional_csv_fields` | Allow other plugins to add supported CSV column names |
| `evocsv_import_date_format` | Override date format detection |

## Actions Fired (extensibility)

| Hook | Purpose |
|------|---------|
| `evocsv_save_event_custom_data` | Called per field during save; allows custom field handling |
| `evocsv_save_additional_event_metadata` | Called after all standard fields saved; bulk custom handling |

## AJAX Handlers

- `wp_ajax_evocsv_*` — Import chunked processing (details in `class-ajax.php`, not read in depth)

## No Frontend Hooks, No REST Endpoints

Admin-only operation. No user-facing output.

## Dateline Design Implications

- **CSV import is an admin/ops tool** — maps to a `POST /api/admin/events/import` endpoint accepting CSV upload.
- **Field mapping surface is large**: 30+ fields. Dateline import API should accept a JSON body (events array) and handle CSV parsing client-side or as a pre-processing step.
- **Upsert by ID**: `event_id` in CSV = update existing; no `event_id` = create new.
- **Taxonomy auto-creation**: Location and organizer terms created if name doesn't match existing. Dateline needs to handle location/organizer dedup by name.
- **Image sideloading**: `download_url()` + `media_handle_sideload()` pattern. Dateline: fetch image URL, upload to R2/storage, return CDN URL.
- **Repeat interval computation**: `eventon_get_repeat_intervals()` generates an array of start/end pairs. Dateline uses RRULE instead — map CSV repeat fields to RRULE string during import.
- **Date format**: Dateline should accept ISO 8601 only; provide a migration guide / converter for `m/d/Y` format.
