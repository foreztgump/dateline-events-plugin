# eventon-weekly-view — Hooks

## Structure

Identical hook pattern to `eventon-full-cal`. Consumes:

- EventON's AJAX/calendar pipeline via `calendar_type` argument
- `evo_global_data` filter to signal JS activation (`'EVOWV'` in calendars array)
- `evo_init_ajax_data` filter to inject week-view Handlebars templates
- `evo_view_switcher_items` to add "Week" tab to view switcher
- `wp_footer` for conditional script enqueue

No REST endpoints. No new actions beyond the standard EventON add-on pattern.

## Dateline Design Implications

- Week view uses the same event data as month/list views — no additional data fetching.
- Navigation increment: 7 days (vs. 1 month for full-cal).
- Week start day (Sun/Mon) should be user-configurable and must respect IANA timezone for correct day boundary assignment.
- Multi-day events need to span multiple day columns — the WP implementation handles this in `wv_script.js` (not examined in detail; not critical for P2 scope).
