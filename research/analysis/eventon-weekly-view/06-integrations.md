---
plugin: eventon-weekly-view
version: 2.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-weekly-view 2.1.4 — Integrations

---

## Integration Architecture

eventon-weekly-view is a pure rendering layer. It has no optional integrations with other add-ons, no external service calls, no REST endpoints, and no webhooks. All coupling is upward to EventON core.

---

## 1. EventON Core (Required)

**Type:** Hard dependency.
**Check:** `plugins_loaded` — plugin self-disables with an admin notice if EventON core (`$GLOBALS['eventon']`) or the `evo_addons` class is absent. A version check (`evo_version_check()`) further gates initialisation against the minimum EventON version (4.6).

Hooks consumed from EventON core:

| Hook | Type | Purpose |
|---|---|---|
| `eventon_appearance_add` | Filter | Inject WeeklyView colour settings into the Styles tab |
| `eventon_settings_time` | Filter | Inject week range date-format setting into the Time/Date tab |
| `eventon_inline_styles_array` | Filter | Emit dynamic CSS variables for WeeklyView colour settings |
| `evo_styles_primary_font` | Filter | Apply site font to day-number/day-name labels |
| `evo_styles_secondary_font` | Filter | Apply secondary font to the `.eventon_weeklyview` container |
| `eventon_settings_lang_tab_content` | Filter | Add "Week View" language strings to the Language settings tab |
| `eventon_shortcode_popup` | Filter | Register `add_eventon_wv` in EventON's visual shortcode builder |
| `ajde_shortcode_box_interpret_fwmy` | Action | Render the three-input fixed-week/month/year group in the shortcode builder |
| `evo_calendar_defaults` | Filter | Pass `wv_range_format` and `cal_tz_offset` into the JS calendar config |
| `eventon_events_list_classnames` | Filter | Add `.evo_hide` to the event list on Table layout initial render |
| `eventon_below_sorts` | Action | Inject week-grid preloader spinners below the sort bar |
| `evo_ajax_cal_before` | Action | Calculate and store week unix date range before AJAX event query |
| `evo_global_data` | Filter | Signal JS activation by adding `'EVOWV'` to the `calendars` array |
| `evo_init_ajax_data` | Filter | Inject Handlebars templates and "This Week" text into JS init data |
| `evo_view_switcher_items` | Filter | Add "Week" tab to the view switcher |
| `evo_init_ajax_cals` | Filter | Validate weekly calendars in the AJAX init payload |
| `eventon_ajax_arguments` | Filter | Re-run week date-range calculation on `wv_newweek` AJAX requests |
| `evo_ajax_query_returns` | Filter | Post-process AJAX response for weekly calendars (currently a passthrough) |
| `eventon_cal_class` | Filter | Append `evoWV` (and `evoWV_tb` for Table layout) to calendar container class list |

The plugin delegates all event data fetching, shortcode processing infrastructure, and AJAX dispatch to EventON core via `EVO()->calendar->_get_initial_calendar()`. It does not issue its own database queries.

---

## 2. No Optional Integrations

There are no `class_exists()` guards, no add-on detection checks, and no integration files for any other EventON add-on. eventon-weekly-view does not interact with RSVP, Tickets, Seats, Virtual Events, QR Code, Webhooks, or any other add-on. It is invisible to those add-ons — they operate on the same events regardless of which calendar view is used to display them.

---

## 3. No External Services

No HTTP calls to external APIs. No WooCommerce dependency. No REST endpoints registered. No WP-Cron tasks added.

---

## Integration Summary

| Dependency | Required? | Direction | Key Mechanism |
|---|---|---|---|
| EventON Core | Yes | Bidirectional | ~16 WordPress filters/actions |
| Any other add-on | No | — | None |
| External services | No | — | None |

---

## Dateline Design Notes

1. **Zero external dependencies** makes this the simplest add-on in the corpus to port. There are no third-party APIs or optional integrations to replicate — the Dateline equivalent is a `WeekGrid` rendering component that consumes the same event data contract as the list and month views.
2. **View switcher hook** (`evo_view_switcher_items`) is the only "system" integration beyond data display. In Dateline, the equivalent is a tab registration in the shared view-switcher bar component — the weekly view simply registers itself as the `week` tab option.
3. **Week start day is site-wide** in EventON (from WP core option). In Dateline, this should be a user-level preference (ISO 8601 default: Monday), consistent with the AGENTS.md RRULE/timezone guidance.
4. **No per-event data** — no add-on-specific fields, metaboxes, or CPT records. Events are plain Dateline events; only the rendering component changes.
