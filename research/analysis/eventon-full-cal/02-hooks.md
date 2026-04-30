# eventon-full-cal — Hooks

## Filters Consumed

| Hook | Purpose |
|------|---------|
| `eventon_events_list_classnames` | Add FC-specific CSS classes to event list |
| `eventon_cal_class` | Add `evoFC` and `evoFC_nextto` CSS classes to calendar container |
| `evo_global_data` | Inject `'EVOFC'` into calendars array to activate JS |
| `evo_init_ajax_data` | Inject Handlebars templates + text strings into JS payload |
| `evo_calendar_defaults` | Pass timezone offset to calendar defaults |
| `eventon_shortcode_defaults` | Add full-cal-specific shortcode arg defaults |
| `evo_frontend_lightbox` | Register lightbox config for `grid_ux=2` mode |

## Actions Consumed

| Hook | Purpose |
|------|---------|
| `eventon_below_sorts` | Inject loading spinner HTML before grid renders |
| `evo_ajax_cal_before` | Set `fixed_day` from today's date before AJAX calendar init |
| `widgets_init` | Register `evoFC_Widget` |
| `evo_view_switcher_items` | Add "Month" button to EventON's view switcher |
| `wp_footer` | Conditionally enqueue `evo_fc_script` if calendar was rendered |

## No REST Endpoints

All data flows through EventON's standard AJAX calendar mechanism.

## Dateline Design Implications

- **Rendering pattern**: Client-side Handlebars grid built from server event list. Dateline can use React components with the same approach: fetch events for month range, render grid client-side.
- **Data needed per day**: Just start/end unix timestamps + count. Current EventON data model already provides this.
- **Timezone handling**: Must account for display timezone vs. UTC storage. The `cal_tz_offset` approach is correct in concept; Dateline should use IANA timezone + `Intl.DateTimeFormat` for day boundary calculation.
- **Heat map**: Count events per day → CSS class. Simple derived value, no server-side data needed.
- **View switcher**: Architecture pattern — multiple views (list, month, week) are toggled client-side; server returns same event data for all views.
