---
plugin: eventon-full-cal
version: 2.1.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Static analysis only — no live site. All UX inferred from PHP source in
  includes/admin/admin-init.php, includes/class-shortcode.php, and guide.php.
  See 00-overview.md for architecture context.
---

# eventon-full-cal 2.1.3 — Admin UX

---

## Navigation & Menu Structure

eventon-full-cal adds **no top-level admin menu** and **no custom settings tab**. All admin configuration surfaces appear inside existing EventON UI:

```
EventON (Dashicons calendar-alt)
└── Settings → admin.php?page=eventon
    └── Appearance tab
        └── "FullCal Styles" collapsible section   ← colour pickers

Pages (any)
└── WYSIWYG editor → EventON shortcode popup
    └── "FullCal" shortcode entry                   ← shortcode builder
```

---

## 1. FullCal Styles Section (EventON Settings → Appearance)

The plugin hooks into EventON's `eventon_appearance_add` filter to inject a collapsible "FullCal Styles" section into the Appearance tab. The section is collapsed by default (`display: none`) and must be expanded manually.

All settings in this section are colour pickers; there are no toggles, selects, or text inputs.

### Date Number Font Color

Controls the text colour of day-number labels inside each calendar cell, across three states with hover variants:

| Sub-field | Option key | Default |
|---|---|---|
| Default | `evofc_1` | `#d4d4d4` |
| Default (Hover) | `evofc_2` | `#9e9e9e` |
| Days with events | `evofc_3` | `#dfa872` (amber) |
| Days with events (Hover) | `evofc_4` | `#9e9e9e` |
| Focus Day | `evofc_5` | `#d4d4d4` |
| Focus Day (Hover) | `evofc_6` | `#9e9e9e` |

### Date Number Box Color

Controls the background colour of each day cell, with the same three-state structure:

| Sub-field | Option key | Default |
|---|---|---|
| Default | `evofc_1b` | `#ffffff` |
| Default (Hover) | `evofc_2b` | `#fbfbfb` |
| Days with events | `evofc_3b` | `#ffffff` |
| Days with events (Hover) | `evofc_4b` | `#F5F5F5` |
| Focus Day | `evofc_5b` | `#ededed` |
| Focus Day (Hover) | `evofc_6b` | `#fbfbfb` |

### Day Name Color

Controls the colour of the column header row (Sun, Mon, Tue…):

| Sub-field | Option key | Default |
|---|---|---|
| Default | `evofc_7` | `#9e9e9e` |
| Default (Hover) | `evofc_7b` | `#d4d4d4` |

### Today Box Bar Color

A single colour picker for the accent bar that marks today's cell. Option key `evofc_tbbc`, default `#ffcb55` (yellow).

### Date Hover Tooltip

Controls the appearance of the tooltip that appears when hovering a day cell:

| Sub-field | Option key | Default |
|---|---|---|
| Background color | `evofc_8` | `#808080` |
| Font Color | `evofc_9` | `#f7f7f7` |

### Heat Map Base Color

A single colour picker for the base hue used by the heat-map density coloring feature. Option key `evofc_heat`, default `#4ccdea` (cyan). Darker variants of this colour are applied to cells with more events when `heat=yes` is set on the shortcode.

---

## 2. Shortcode Builder (WYSIWYG Editor Popup)

The plugin registers a "FullCal" entry in EventON's shortcode popup builder via the `eventon_shortcode_popup` filter. This is the primary per-instance configuration surface — all per-calendar options live here, not in global Settings.

**Shortcode generated:** `[add_eventon_fc ...]`

Options available in the builder:

| Field name | Shortcode arg | Type | Default | Notes |
|---|---|---|---|---|
| Calendar ID | `cal_id` | text | — | From EventON defaults |
| Show featured image | `show_et_ft_img` | YN | — | From EventON defaults |
| Featured event priority | `ft_event_priority` | — | — | From EventON defaults |
| Month Grid Interaction | `grid_ux` | select | `0` | `0`=Default, `1`=Focus to Events, `2`=Lightbox Events List |
| UI Experience | `UIX` | — | — | From EventON defaults |
| Date hover information | `hover` | select | `number` | `number`=count only, `numname`=count + first 3 event names |
| FullCal Style | `style` | select | `def` | `def`=Default, `nobox`=No Date Outline, `names`=2 Event Names |
| Show events next to grid | `nexttogrid` | YN | `no` | Side-by-side layout; only works with `grid_ux=0` |
| Show all events of month below | `load_fullmonth` | YN | `no` | Load entire month's events on init and on month switch |
| Day Increment | `day_incre` | text | `0` | Offset starting day (e.g. `+1`) |
| Month Increment | `month_incre` | text | — | From EventON defaults |
| Fixed month/year | `fixed_mo_yr` | — | — | From EventON defaults |
| Event Type 1–5 | `event_type`…`event_type_5` | — | — | From EventON defaults |
| Fixed Day | `fixed_day` | text | `0` | Integer day of month to focus on |
| ETC Override | `etc_override` | — | — | From EventON defaults |
| Open eventCards on load | `evc_open` | YN | `no` | Open event cards by default on page load (not available in lightbox mode) |
| Event order | `event_order` | — | — | From EventON defaults |
| Language | `lang` | — | — | From EventON defaults |
| Month jumper | `jumper` | — | — | From EventON defaults |
| Switch to first of month | `mo1st` | YN | `no` | When switching months, focus day resets to 1st |
| Heat style box coloring | `heat` | YN | `no` | Darker cells for days with more events |

---

## 3. Widget Settings (Appearance → Widgets)

The plugin registers an `evoFC_Widget` widget. Its configuration panel in the Widgets screen has:

| Field | Notes |
|---|---|
| Widget ID | Arbitrary string; used as the calendar's `cal_id` |
| Widget Title | Optional heading rendered above the grid |
| Set fixed month/year | Toggle; reveals Month and Year text inputs when enabled |
| Fixed Month | Integer month (1–12) |
| Fixed Year | Integer year |
| Event Types | Comma-separated event type IDs; leave blank for all |

---

## 4. PHP Template Tag

The plugin registers a global PHP function `add_eventon_fc($args)` documented in `guide.php`. This is for theme developers embedding the calendar without a shortcode. No admin UI — purely a code-level entry point.

---

## Summary

The admin UX surface is minimal: a single collapsible colour-picker section in EventON Appearance settings, plus shortcode builder options for per-instance layout and interaction configuration. There is no dedicated settings page, no data management screen, and no per-event metabox. All global style customization is colour-only; layout and interaction behavior is controlled per-shortcode-instance.
