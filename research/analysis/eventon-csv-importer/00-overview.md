# eventon-csv-importer — Overview

**Version:** 1.1.10  
**Classification:** P2 add-on (bulk event import)  
**Entry point:** `eventon-csv-importer.php` → `EventON_csv_import` singleton  
**Text domain:** `eventon` (inherits EventON domain)  
**Requires:** EventON ≥ 4.4, WP ≥ 6.0  

## File Census

```
eventon-csv-importer.php          — bootstrap, singleton
includes/
  class-admin-init.php            — evocsv_admin: admin UI, import logic, field mapping
  class-settings.php              — settings page HTML
  class-ajax.php                  — AJAX handlers for import progress
  class-admin_check.php           — (addon license check)
  DataSource.php                  — File_CSV_DataSource: CSV parser (MIT, 2008)
assets/
  csv_import_styles.css
  script.js                       — import progress UI
sample.csv / sample.numbers       — example import files
guide.php
```

## Architecture

Admin-only plugin (no frontend). Import flow:

1. Admin uploads CSV file via form in `Settings > CSV Import`.
2. `class-ajax.php` processes rows via AJAX (chunked to avoid timeout).
3. `evocsv_admin::import_event()` creates/updates `ajde_events` posts and saves all postmeta/taxonomies.
4. `DataSource.php` (MIT-licensed third-party CSV parser) handles CSV parsing.

## Dependency Map

```
EventON_csv_import
  └─ evocsv_admin (admin-only)
      └─ File_CSV_DataSource (embedded, MIT)
      └─ EventON core helpers: eventon_get_unix_time(), evonton_get_repeat_intervals(),
                               eventon_get_latlon_from_address(), evo_save_term_metas()
```

## Key Observation

The import is upsert-capable: if `event_id` is in the CSV row and the post exists, it updates rather than creates. Repeat event intervals are computed and saved as a `repeat_intervals` postmeta array. Location and organizer terms are auto-created if they don't exist.
