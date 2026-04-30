---
plugin: eventon-weekly-view
version: 2.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Static analysis only. Source files examined: includes/class-frontend.php,
  includes/class-shortcode.php, includes/class-ajax.php, assets/wv_styles.css
  (inspected for class names), assets/wv_script.js (not fully read — large;
  behaviour inferred from PHP template output and class names).
---

# eventon-weekly-view 2.1.4 — Frontend UX

---

## Display Model

The weekly view is a 7-column day grid rendered entirely client-side by `wv_script.js`. EventON's AJAX pipeline delivers the same event data it sends to the standard list view; the weekly-view JavaScript partitions that data into day buckets and paints the columns. There is no standalone page — the calendar is embedded via the `[add_eventon_wv]` shortcode or the `add_eventon_wv()` PHP helper anywhere on a page.

---

## 1. Overall Layout

```
[← prev week]  [Feb 1 – Feb 7, 2026 ▼ (week picker)]  [→ next week]

 Sun    Mon    Tue    Wed    Thu    Fri    Sat
  1      2      3      4      5      6      7
 [ev]  [ev]          [ev][ev]       [ev]
```

The outer container `.ajde_evcal_calendar.evoWV` wraps two child sections:

- **`.EVOWV_dates`** — the navigation header: previous/next arrows and the current week range label. A "sort" button (`.EVOWV_change`) opens a scrollable week-picker dropdown (`.EVOWV_ranger`) listing ~100 weeks centred on the current week. The navigation elements are hidden when `disable_week_switch=yes`.
- **`.EVOWV_grid`** — the 7-column day grid, populated client-side from a Handlebars template after the initial AJAX response.

---

## 2. Week Strip (Day Columns)

Each day column is an `.evo_wv_day` div rendered from the `evowv_week` Handlebars template. A column contains:

- **`.evowv_daybox`** — the date header cell, showing:
  - `.mo_name` — month abbreviation, displayed only for the first day of a new month within the week (i.e., when the week spans a month boundary)
  - `.day_name` — three-letter weekday name (Mon, Tue, …)
  - `.day_num` — numeric day of month
  - `.day_events` — event count badge or event titles (populated by JS from event data)
- **`.evowv_col_events`** — full event list below the date header; present only when `week_style=1` (Table layout).

The focused day (the day the user has clicked) gets the `.focus` modifier class on `.evo_wv_day`, which applies the "Focused Date Box" background and text colors from admin settings. Today's date column gets the `.today` modifier and a top accent bar (`.evoWV.ajde_evcal_calendar .EVOWV_content .EVOWV_grid .evo_wv_day.today:before`) in the configured "Today Date Box Top Bar Color" (`evowv_4f`, default light red).

---

## 3. Layout Variants

### Default Layout (`week_style=0`)

Events are listed in the standard EventON slide-down card pattern. Clicking a day column header focuses that day and the event list below the grid updates to show that day's events. This is the EventON list view acting as the detail panel.

### Table Layout (`week_style=1`)

Events are rendered inline within each day column (`.evowv_col_events` inside each `.evo_wv_day`). Clicking a day does not update a shared event list — events are persistently visible per column. Two sub-variants exist:

| `table_style` | Appearance |
|---|---|
| `0` (Default) | Minimal borders — border-color from `evowv_4e` |
| `1` (Solid) | Full table borders — `.evoWV_days.wk_style_1 .evowv_table` |

When `week_style=1` the `ux_val` shortcode argument is overridden to `3` internally (overriding the slide-down UX experience to a mode compatible with inline column rendering). The event list container also receives the `.evo_hide` class on initial render, hiding it until JS populates the columns.

---

## 4. Navigation

### Prev / Next Week

`.evowv_prev` and `.evowv_next` anchor tags carry `data-dir` ("prev"/"next") and `data-week` ("-1"/"+1") attributes. Clicking fires an AJAX request (`ajaxtype=wv_newweek`) that re-runs the week date-range calculation server-side (`set_week_unix_date_range`) and returns the new event set for the adjacent week. The grid and event list update without a page reload.

### Week Picker Dropdown

`.EVOWV_change` (the sort icon button) reveals `.EVOWV_ranger`, a scrollable dropdown listing ~101 week ranges (50 weeks before to 50 weeks after the current week). Scrolling is handled by `.EVOWV_range_mover` up/down buttons. The current week entry receives the `thisweek` class and is highlighted in the "Dropdown Current Week Background Color". Clicking a week entry navigates directly to that week.

---

## 5. Week Start Day

The first column of the grid is determined by WordPress core's "Week Starts On" option (`get_option('start_of_week')`, 0=Sunday … 6=Saturday). The PHP `set_week_unix_date_range()` method aligns the grid start date to the configured weekday; the JavaScript receives this via the `sow` (start-of-week) value in the `evo_view_switcher_items` data. There is no shortcode-level override — it is site-wide.

---

## 6. Initial State Options

| Shortcode arg | Effect |
|---|---|
| `hide_events_onload=yes` | Event list starts hidden; user must click a day column to reveal events |
| `disable_week_switch=yes` | All navigation elements hidden; grid is locked to the computed or fixed week |
| `fixed_week` + `fixed_month` + `fixed_year` | Pins the calendar to a specific week in a given month/year rather than the current week |
| `week_incre=+N` or `-N` | Offsets the initial week by N weeks from the current or fixed week |

---

## 7. Month Boundary Display

When a week spans two months (e.g., Jan 29 – Feb 4), the first day of the new month within the week shows a `.mo_name` span with the abbreviated month name above the day number. This is computed server-side in `get_grid_data()` by comparing each day's month number against the calendar's current month (`$cur_mo`).

---

## 8. Loading States

Two animated preloaders are injected into the DOM by `add_wv_loading()`:

- `.evowv_pre_loader` — single dot spinner, shown during event data fetch
- `.evowv_pre_loader_week` — seven bar spinner (one per day column), shown during week navigation

---

## 9. View Switcher Tab

When the weekly view shortcode is present on a page alongside EventON's standard calendar and the standard calendar has `view_switcher=yes`, this add-on adds a "Week" tab to the view switcher bar via the `evo_view_switcher_items` hook. The tab is labelled with the configurable "Week View" language string. Switching to the Week tab transitions to the `.evoWV`-classed calendar instance. The `evoWV` class on the tab data is the identifier JS uses to locate and activate the correct calendar instance on switch.

---

## 10. Scripts & Styles

| Asset | Enqueue Key | Condition |
|---|---|---|
| `wv_styles.css` | `evo_wv_styles` | Always (on non-admin pages, if EventON concat-styles is on) |
| `wv_script.js` | `evo_wv_script` | Conditionally, from `wp_footer` — only when a `[add_eventon_wv]` shortcode or view-switcher has been encountered on the page (`EVOWV()->load_script === true`) |

The JS activation flag in the global EventON data object (`evo_global_data`) is the `EVOWV` string in the `calendars` array — JS checks for this before initialising the week-view logic.
