---
plugin: eventon-csv-importer
version: 1.1.10
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Static analysis only — no live site walkthrough. All UX described from
  class-settings.php, class-admin-init.php, script.js, and assets/csv_import_styles.css.
---

# eventon-csv-importer 1.1.10 — Admin UX

---

## Navigation & Menu Structure

The plugin adds a single submenu page under the existing EventON top-level menu:

```
EventON (top-level menu)
└── CSV Import        ← admin.php?page=evocsv
```

Registered via `add_submenu_page('eventon', 'CSV Import', 'CSV Import', 'manage_eventon', 'evocsv', ...)`.
A "Settings" shortcut link also appears in the WP Plugins list row for this plugin.

There is no tab inside EventON's main Settings page — the importer is a standalone submenu, not embedded within the EventON settings rail.

---

## 1. Step 1 — File Upload Form (`?page=evocsv&steps=ichi`)

The landing state of the CSV Import page shows a minimal upload form:

```
Settings for Importing Events

[ Import ] tab (nav-tab-wrapper)

  Get Started, Select a CSV file
  Select the properly formatted CSV file with events to import.

  [Choose File]  [Upload CSV file]

  **CSV file guidelines
  Please read the guidelines below for correct CSV format...
  [Guide for CSV file] (button — opens popup)
```

The form POSTs to `admin.php?page=evocsv&steps=ni` with `enctype="multipart/form-data"` and includes a WP nonce field (`eventon_csv_noncename`). The plugin custom CSS and JS are enqueued only on this page (`pagenow == 'admin.php'` and `$_GET['page'] == 'evocsv'`).

The guide popup is an EventON-standard popup window (`output_eventon_pop_window`) whose content comes from `guide.php`. It lists all acceptable CSV column names with their expected values, organised into groups: core fields, date/time fields, location fields, organiser fields, custom meta fields, user interaction fields, and ActionUser fields.

---

## 2. Step 2 — Verify & Import (`?page=evocsv&steps=ni`)

After upload and CSV parse, the page renders a review screen:

```
Verify Processed Events & Import
Please look through the events processed from the uploaded CSV file
and select the ones you want to import. Processed N items total.

[Deselect All]  [Select All]                         [IMPORT]

┌──────────────────────────────────────────────────────────────┐
│ Status │ Post Status │ Event Name │ Desc │ Start │ End │ Loc │ Org │ Img │
├────────────────────────────────────────────────────────────────
│  ●ss   │ publish     │ Cacao ...  │  ✓  │ 3/28  │ ... │  ✓  │  ✓  │  ✓  │
│  ●ss   │ draft       │ Hatha ...  │  ✗  │ 5/12  │     │  ✗  │  ✗  │  ✗  │
└──────────────────────────────────────────────────────────────┘
```

The table (`#evocsv_events`) is a standard `wp-list-table widefat` with nine columns:

| Column | Content |
|---|---|
| Status | Toggle indicator — green dot (selected, `ss`) or greyed (not selected, `ns`) |
| Post Status | `publish` or `draft` from CSV; defaults to `draft` if absent |
| Event Name | Event title from CSV |
| Description | Check/dash icon indicating whether a description is present |
| Start Date & Time | Parsed date + time; invalid format shown as a red icon |
| End Date & Time | Same; falls back to start date if missing |
| Location | Check/dash icon; tooltip shows location name or ID if present |
| Organizer | Check/dash icon; tooltip shows organizer name or ID |
| Image | Check/dash icon indicating `image_id` or `image_url` present |

Each table row is clickable — clicking toggles the row between selected (`ss`) and deselected (`ns`) states. "Select All" and "Deselect All" bulk-toggle all rows. Invalid date/time values render as inline error icons but do not prevent row selection.

All CSV field values for each row are serialised into hidden `<input>` and `<textarea>` elements within the form, keyed as `events[N][fieldname]`. This is the data payload submitted to the AJAX importer.

---

## 3. Import Progress UI

When the admin clicks "IMPORT", a JavaScript-driven AJAX loop takes over; the table remains visible and the following elements animate:

```
[Progress bar — fills left to right]
X out of N processed.  [loading spinner]  Y Failed

[Results panel — fades in on completion]
Import complete!  Z Imported  W Failed
[View all imported events]
```

The import runs **one row per AJAX call** (sequential, not batched) to the `wp_ajax_evocsv_001` handler. Each call posts a single event's hidden field values and receives a JSON response `{ status: 'success'|'bad', event_id: N }`. On success, the processed row receives a CSS class `done`; on failure, `failed`. The progress bar percentage is computed as `(index / total) * 100`. After the last row, the progress bar fades out and the results summary fades in.

The results panel includes a direct link to `edit.php?post_type=ajde_events` to review the imported events in the WP All Events list.

If zero CSV rows were parsed, an error message is displayed and the upload form is re-shown without proceeding to the table.

---

## 4. Error Handling

- **No file uploaded:** Inline WP error notice, upload form re-displayed.
- **CSV load failure:** Inline WP error notice (`"Failed to load file"`), upload form re-displayed.
- **BOM stripping:** If the uploaded file has a UTF-8 BOM, it is silently stripped before parsing; an admin notice logs "Getting rid of byte order mark...".
- **Nonce failure:** PHP dies with `"Action failed. Please refresh the page and retry."`.
- **Zero processed rows:** Inline warning block with instruction to check CSV formatting.

---

## 5. No Per-Event Column Mapping UI

There is no column-mapping step. The plugin assumes CSV headers match its fixed column name schema exactly. Any column not in the accepted list is silently ignored. No drag-and-drop or dropdown mapping is offered.
