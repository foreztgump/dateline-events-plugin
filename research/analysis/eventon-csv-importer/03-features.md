# eventon-csv-importer — Features & i18n

## Core Features

1. **CSV upload** — Admin uploads CSV; parsed using embedded MIT-licensed `File_CSV_DataSource`.
2. **Upsert** — If `event_id` column present and post exists, update; otherwise create new.
3. **Full field coverage** — 30+ supported columns covering all EventON event fields (dates, location, organizer, taxonomies, repeat rules, custom meta, image).
4. **Taxonomy auto-creation** — Location and organizer terms created on first import if name is new; existing terms matched by name or ID.
5. **Image sideloading** — `image_url` column: image downloaded from remote URL and attached as featured image.
6. **Repeat event support** — Repeat frequency/gap/count columns compute the `repeat_intervals` postmeta array.
7. **Custom meta fields** — `cmd_N` and `cmd_NL` columns map to EventON's custom meta fields.
8. **Chunked AJAX processing** — Import runs in chunks via AJAX to avoid PHP timeouts on large files.
9. **ActionUser integration** — `evoau_assignu` column assigns users to events via `event_users` taxonomy.
10. **Extensible** — Three hooks for adding custom fields and metadata handling.

## Known Limitations

- Date format: `m/d/Y` only (no ISO 8601).
- No validation/preview step before import (no dry run).
- No rollback on partial failure.
- Image sideloading is synchronous and can timeout on large imports.
- No duplicate detection beyond `event_id` match.

## i18n

No significant user-facing strings. Admin UI strings are plain English (no text domain applied in PHP seen).

## Sample CSV Structure

```csv
publish_status,event_name,event_start_date,event_start_time,event_end_date,event_end_time,event_description,evcal_location_name,event_type
publish,Summer Gala,06/15/2025,07:00 pm,06/15/2025,11:00 pm,Join us!,Grand Hall,Social
```

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| CSV upload form | `POST /api/admin/events/import` (multipart/form-data) |
| Field mapping | JSON schema validation on import payload |
| Upsert by event_id | `ON CONFLICT (id) DO UPDATE` |
| Taxonomy auto-create | Location/organizer upsert by name |
| Image sideload | Fetch URL → upload to R2 → store CDN URL; run in `ctx.waitUntil` |
| Repeat fields | Convert to RRULE string during import preprocessing |
| Chunked processing | Stream response or background job for large files |
| Custom meta fields | Pass through as `extra_fields` JSON column |
