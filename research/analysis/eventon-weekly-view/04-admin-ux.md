---
plugin: eventon-weekly-view
version: 2.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Static analysis only — no live site walkthrough. Source files examined:
  eventon-weekly-view.php, includes/admin/admin-init.php,
  includes/class-shortcode.php, includes/class-frontend.php. No
  screenshots directory for this add-on.
---

# eventon-weekly-view 2.1.4 — Admin UX

---

## Navigation & Menu Structure

eventon-weekly-view adds surfaces to the existing EventON admin menus — it does **not** create a top-level menu of its own.

```
EventON
└── Settings → admin.php?page=eventon
    └── Appearance tab → "WeeklyView Styles" section (hidden by default)
    └── Time/Date tab → "WeeklyView Time/Date Settings" sub-section
    └── Language tab → "ADDON: Weekly View" language strings section
```

There is no dedicated "Weekly View" tab. The add-on's settings are injected inline into existing EventON Settings tabs via filters.

---

## 1. Appearance Tab — WeeklyView Styles

Injected via the `eventon_appearance_add` filter. Appears as a collapsible section ("WeeklyView Styles", displayed: none by default) within the main Appearance/Styles tab.

### Color Settings

| Field | Option Key | Default |
|---|---|---|
| Date Box Background Color | `evowv_4c` | `#f1f1f1` |
| Date Box Text Color | `evowv_4d` | `#737373` |
| Date Box Border Color | `evowv_4e` | `#dedede` |
| Focused Date Box Background Color | `evowv_1` | EventON primary color |
| Focused Date Box Text Color | `evowv_2` | `#ffffff` |
| "Other Weeks" Dropdown Button Background | `evowv_3a` | EventON prime color |
| "Other Weeks" Dropdown Background | `evowv_3b` | `#ffffff` |
| "Other Weeks" Dropdown Text Color | `evowv_3c` | EventON color 1 |
| "Current Week" Item Background in Dropdown | `evowv_3e` | EventON secondary color |
| Dropdown Border Color | `evowv_3g` | EventON color 2 |
| Today Date Box Top Bar Color | `evowv_4f` | `#f79191` (light red) |

These values are persisted in EventON's main options and emitted as dynamic CSS via the `eventon_inline_styles_array` filter. The plugin also hooks into `evo_styles_primary_font` and `evo_styles_secondary_font` to apply the site's configured font families to the day-number/day-name labels, tooltip, and the week-range date list.

---

## 2. Time/Date Tab — WeeklyView Settings

Injected via the `eventon_settings_time` filter. A sub-header ("WeeklyView Time/Date Settings") separates the weekly-view field from the existing time settings.

| Field | Option Key | Options |
|---|---|---|
| Week range date format | `evowv_range_timeformat` | `MM D/MM D, YYYY` (Feb 1 – Feb 3, 2020) / `MMMM D/MMMM D, YYYY` / `MM D, YYYY/MM D, YYYY` / `MMMM D, YYYY/MMMM D, YYYY` |

The selected format controls the date range string displayed in the week navigation header (e.g., "Feb 1 – Feb 7, 2026"). The value is stored as a `/`-delimited format pair; the frontend splits on `/` to format the start and end dates separately.

The week start day (Sunday vs Monday) is **not** a plugin-specific setting — it inherits from WordPress core's "Week Starts On" option (`get_option('start_of_week')`). There is no per-shortcode week-start override.

---

## 3. Language Tab — Weekly View Strings

Injected via the `eventon_settings_lang_tab_content` filter. Adds a collapsible section "ADDON: Weekly View" with three editable strings:

| Label | Internal key |
|---|---|
| Week View | `evoWV_001` |
| Click on Date to see events | (no explicit key; label-only) |
| This Week | (label-only) |

"Week View" is the label used in the view-switcher tab when this add-on is active. "This Week" appears in the week switcher dropdown to identify the current week. "Click on Date to see events" appears as a hint when `hide_events_onload=yes`.

---

## 4. Shortcode Builder Integration

The plugin registers its shortcode (`add_eventon_wv`) in EventON's visual shortcode builder popup via the `eventon_shortcode_popup` filter. The builder entry is labelled "WeeklyView" and exposes the following controls:

| Shortcode Arg | Builder Control | Notes |
|---|---|---|
| `show_et_ft_img` | Shared EventON field | Show featured image |
| `ft_event_priority` | Shared EventON field | Featured event priority |
| `event_type` | Shared EventON field | Filter by taxonomy |
| `event_type_2` | Shared EventON field | Second taxonomy filter |
| `event_location` | Shared EventON field | Filter by location |
| `event_organizer` | Shared EventON field | Filter by organizer |
| `fixed_week` / `fixed_month` / `fixed_year` | Three-input group ("Fixed Week/Month/Year") | Pin calendar to a specific week in a given month/year |
| `week_incre` | Text input | `+N` or `-N` offset from the current week on initial render |
| `hide_events_onload` | Yes/No toggle | Suppress event list until user clicks a day in the week strip |
| `disable_week_switch` | Yes/No toggle | Lock navigation (hides prev/next arrows and week-picker dropdown) |
| `week_style` | Select: Default / Table | Grid layout variant |
| `table_style` | Select: Default / Solid | Border variant; only applies when `week_style=1` |
| `event_order` | Shared EventON field | Sort order |
| `lang` | Shared EventON field | Language override |
| `UIX` | Shared EventON field | UI experience version |
| `evc_open` | Shared EventON field | Open event cards by default |
| `etc_override` | Shared EventON field | Event type color override |
| `hide_sortO` | Shared EventON field | Hide sort/filter bar |
| `expand_sortO` | Shared EventON field | Expand sort bar |
| `filter_type` | Shared EventON field | Filter UI type |
| `members_only` | Shared EventON field | Restrict to logged-in users |

All shortcode arguments also work in the PHP template helper `add_eventon_wv($args)`.

---

## 5. No Per-Event Metabox

eventon-weekly-view adds no metabox to the event edit screen. It is purely a calendar display format — events are standard EventON events with no add-on-specific fields.
