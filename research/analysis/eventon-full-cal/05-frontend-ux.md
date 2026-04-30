---
plugin: eventon-full-cal
version: 2.1.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Static analysis only — no live site. UX inferred from PHP source in
  includes/class-frontend.php, includes/class-shortcode.php, includes/class-evo-fc-widget.php,
  and the Handlebars template strings embedded in init_ajax_data(). See 00-overview.md
  for architecture context.
---

# eventon-full-cal 2.1.3 — Frontend UX

---

## Display Model

The plugin replaces EventON's default list view with a **month-grid overlay** while keeping the EventON event list intact underneath. The grid is rendered entirely client-side from Handlebars templates; the server returns event data in EventON's standard AJAX format and `fc_script.js` builds the grid from that data.

The calendar is placed on the page via the `[add_eventon_fc]` shortcode, a PHP function call (`add_eventon_fc($args)`), or the evoFC sidebar widget.

---

## 1. Month Grid Layout

The grid renders as a standard calendar month view: a header row of weekday abbreviations (Sun–Sat) followed by rows of day cells. The grid always shows exactly one month.

### Structure

```
[ Sun ][ Mon ][ Tue ][ Wed ][ Thu ][ Fri ][ Sat ]   ← .eventon_fc_daynames
[  -  ][  -  ][  1  ][  2  ][  3  ][  4  ][  5  ]  ← .eventon_fc_days
[  6  ][  7  ][  8  ][  9  ][ 10  ][ 11  ][ 12  ]
...
```

Empty cells before the first day of the month are rendered as placeholder elements (`.evo_fc_empty`). The Handlebars template variable `blanks` controls the count of leading empty cells.

### Day Cell States

Each day cell (`.evo_fc_day`) has CSS class variants applied by the JS layer:

| Class | Meaning |
|---|---|
| _(none)_ | Normal day, no events |
| `has_events` | One or more events fall on this day |
| `on_focus` | The currently selected/focused day |
| `today` | Calendar date matches today; a yellow accent bar (`::before` pseudo-element) is shown |
| `evo_fc_empty` | Padding cell before day 1 |

Each day cell stores `data-su` (event start unix timestamp) and `data-eu` (end unix timestamp) attributes, which the JS uses to show events within that day range when the cell is clicked.

### Day Number Display

The day number is displayed inside a `<span class="evo_day_in">`. When events exist, a child `<span class="day_evs">` holds a count or event name snippet depending on the `style` shortcode argument:

| `style` value | Cell content |
|---|---|
| `def` (Default) | Day number only |
| `nobox` | Day number, no cell border |
| `names` | Day number + up to 2 event names |

---

## 2. Hover Tooltip

When a user hovers over a day cell, a tooltip appears (`.evoFC_tip` or `.evofc_title_tip`). Content depends on the `hover` shortcode argument:

| `hover` value | Tooltip shows |
|---|---|
| `number` | Count of events on that day |
| `numname` | Count + first 3 event names, each prefixed with a colored left-border matching the event's color |

The tooltip is a floating element positioned by JS. Its background and text colours are controlled by the `evofc_8` and `evofc_9` Appearance settings.

---

## 3. Month Navigation

Navigation controls are inherited from EventON's standard calendar header (prev/next arrows, month/year label). The full-cal plugin does not add its own navigation widgets — it passes `calendar_type='fullcal'` to EventON's calendar factory, which renders its standard header.

When switching months via the EventON prev/next arrows:
- A loading spinner (`.evofc_pre_loader`) is shown over the grid while the AJAX request is in flight.
- The `mo1st` shortcode option controls whether the focus day resets to the 1st of the new month or stays on the same day number.

---

## 4. Day Click Interaction (Grid UX Modes)

Clicking a day cell triggers one of three behaviors controlled by the `grid_ux` shortcode argument:

### Mode 0 — Default

Clicking a day filters the EventON event list (below or beside the grid) to show only events on that day. The focused cell gets the `on_focus` class.

### Mode 1 — Focus to Events

Same as Mode 0 but the page also scrolls down to the event list.

### Mode 2 — Lightbox Events List

Clicking a day opens a lightbox (`.evofc_lightbox`) containing the event list for that day. The event list renders inside the modal without a page scroll. This mode adds the `evofc_nolist` class to the calendar container so the inline list below is hidden on initial load (`load_fullmonth=no`).

---

## 5. Events Next to Grid (nexttogrid)

When `nexttogrid=yes` is set (only valid with `grid_ux=0`), the layout switches to a two-column arrangement: the month grid occupies the left 50% and the EventON event list occupies the right 50%. The JS adds the `evoFC_nextto` class to the calendar container to trigger the CSS column layout.

---

## 6. Full Month Loading

When `load_fullmonth=yes`, all events for the entire month are loaded on initial page load and again whenever the month changes. The default behavior is to load events lazily as days are clicked.

---

## 7. Heat Map Coloring

When `heat=yes` is set on the shortcode, day cells receive CSS background-color values derived from event density: cells with more events get a darker shade of the `evofc_heat` base color (configured in Appearance settings, default cyan). The color intensity is calculated client-side by `fc_script.js` from the event count per day.

---

## 8. View Switcher Integration

When EventON's `view_switcher=yes` option is active, the plugin adds a "Month" tab to the view switcher bar alongside any other configured views (e.g., list view). Clicking "Month" activates the full-cal grid; clicking another view tab deactivates it. The tab label is localizable via `evo_lang('Month')`.

---

## 9. Sidebar Widget

The `evoFC_Widget` renders the same month grid in a WordPress sidebar widget area. The widget output is wrapped in `<div id="evcal_widget" class="evo_fc_widget evo_widget">`. An optional widget title renders as `<h3 class="widget-title">` above the grid. On the WP Widgets admin screen, the widget renders a placeholder text instead of the full calendar to avoid unnecessary data loading in the admin.

---

## 10. Assets

Two files are enqueued on any page that renders a full-cal calendar:

| Asset | Purpose |
|---|---|
| `assets/fc_styles.css` | Grid layout, cell sizing, tooltip styles, heat-map colors |
| `assets/fc_script.js` | Handlebars-based grid rendering, click handlers, tooltip logic |

Assets are registered unconditionally on `init` but only enqueued when a full-cal instance is detected on the page (via the `EVOFC()->load_script` flag set during shortcode rendering).

---

## Summary

The frontend UX is a client-rendered month grid overlaying EventON's standard calendar. Key UX decisions for a Dateline reimplementation: a 7-column grid with leading empty cells, three cell states (empty / has-events / today), three click behaviors (inline filter / scroll-to / lightbox), optional side-by-side layout, optional heat-map cell coloring, and a "Month" tab in the view switcher. The data shape required is simply a map of day numbers to event counts and start/end timestamps — the same data EventON's list calendar already returns.
