---
plugin: eventon-csv-importer
version: 1.1.10
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Static analysis only. No frontend output exists — the plugin is admin-only.
---

# eventon-csv-importer 1.1.10 — Frontend UX

## No Frontend Surface

eventon-csv-importer is a purely administrative tool. It registers no shortcodes, outputs no HTML to public pages, enqueues no scripts or styles on the frontend, and has no REST or `wp-ajax-nopriv` endpoints accessible to unauthenticated users. The `init()` bootstrap only loads `class-admin-init.php` inside `is_admin()`, and `class-ajax.php` inside `!is_admin() || defined('DOING_AJAX')` — but the sole AJAX action (`evocsv_001`) calls `if(!is_admin()) exit;` immediately, so it is effectively admin-only.

## Post-Import Confirmation (Admin)

The only "result" UX is the import results panel that fades in on the admin screen after all selected rows are processed:

```
Import complete!  N Imported  M Failed
[View all imported events → edit.php?post_type=ajde_events]
```

Imported events become standard EventON `ajde_events` posts. They immediately appear in the EventON calendar on the frontend according to the `publish_status` column value (`publish` or `draft`). There is no import-specific frontend indicator — the events are indistinguishable from manually created ones.
