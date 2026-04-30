# eventon-weekly-view — Data Model

## No New Post Types or Post Meta

No new data structures. Pure rendering layer over existing EventON events.

## Options

Minimal settings stored in EventON's main options. No dedicated options key identified in source (settings tab added to EventON admin panel via `admin-init.php`).

## Shortcode Arguments

| Arg | Meaning |
|-----|---------|
| Standard EventON args | Passed through to `EVO()->calendar->_get_initial_calendar()` |
| Week-specific display args | Controlled via `wv_script.js` configuration |

## JS Data Contract

Week view receives the same event data as the list view (events with `start_unix`, `end_unix`, event ID, title). The JS script partitions events into 7-day buckets and renders columns.

Week start day (Sunday vs Monday) is likely controlled by a shortcode/settings argument — not explicitly seen in the PHP class files examined.

## Timezone

Same approach as full-cal: UTC offset passed through EventON's standard calendar defaults mechanism.
