# eventon-full-cal — Data Model

## No New Post Types or Post Meta

This plugin introduces no new post types, custom tables, or event-level postmeta. It is purely a rendering layer over existing EventON event data.

## Options (`evcal_options_evcal_1`)

| Key | Values | Meaning |
|-----|--------|---------|
| `evofc_heat` | `yes`/`no` | Enable heat-map coloring on grid days (days with more events = darker) |

## Shortcode Arguments (client-side data contract)

| Arg | Default | Meaning |
|-----|---------|---------|
| `calendar_type` | `'fullcal'` | Activates full-cal rendering path |
| `number_of_months` | `1` | Always 1 for full-cal (month grid shows one month) |
| `grid_ux` | `0` | `0`=standard, `2`=lightbox mode |
| `nexttogrid` | `'no'` | Place grid next to list instead of above |
| `fixed_day` | int | Starting day for month view |
| `day_incre` | int | Offset from today in days |
| `view_switcher` | `'yes'`/`'no'` | Show view switcher buttons |

## JS Data Contract (Handlebars template vars)

```js
// evofc_grid template variables
{
  month: 1..12,
  day_names: { 0: 'Sun', 1: 'Mon', ... },
  blanks: N,      // empty cells before day 1
  days: {
    1: { su: <unix_start>, eu: <unix_end>, cls: '' },
    ...
  }
}
```

## `global_data` contribution

```js
global_evo_data.calendars[] = 'EVOFC'  // signals fc_script.js to activate
```

## Timezone

`cal_tz_offset` passed as `(utc_offset_minutes * -1) / 60` to the JS layer for correct day boundary calculation in the client-rendered grid.
