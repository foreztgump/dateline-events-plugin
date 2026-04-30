---
plugin: eventon-slider
version: 2.1
analyzed: 2026-04-30
analyst: static-analysis
phase: 2
doc: 04-admin-ux
note: >
  Static analysis of PHP source files. No live site walkthrough — plugin is P3
  priority. Source at research/sources/eventon-slider/.
---

# eventon-slider 2.1 — Admin UX

---

## Navigation & Menu Structure

eventon-slider adds no top-level menu. Its only admin surface is a colour-customisation section injected into EventON's existing **Appearance** settings tab (EventON → Settings → Appearance). The plugin also adds a "Guide" action link on the WP Plugins list page pointing to `admin.php?page=eventon&tab=evcal_4`.

---

## 1. Appearance Settings — "Slider Styles" Section

**Location:** EventON → Settings → Appearance → (hidden section labelled "Slider Styles")

The section is registered via the `eventon_appearance_add` filter in `admin-init.php` and is rendered as a collapsible panel using EventON's standard `hiddensection_open` / `hiddensection_close` framework elements. All colour values are stored in EventON's main options array and emitted as inline CSS via the `eventon_inline_styles_array` filter.

Three subsections are exposed:

### Circle Arrow Nav Button (`evosl1`, `evosl1h`, `evosl2`, `evosl3`)

| Setting | Key | Default |
|---|---|---|
| Background Color | `evosl1` | `#ffffff` |
| Background Color (on Hover) | `evosl1h` | `#ffffff` |
| Arrow Color | `evosl2` | EventON primary color |
| Border Color | `evosl3` | EventON primary color |

### Arrow Nav Bar Button (`evosl7`, `evosl8`)

| Setting | Key | Default |
|---|---|---|
| Background Color | `evosl7` | `#f1f1f1` |
| Arrow Color | `evosl8` | `#808080` |

### Nav Dots (`evosl4`, `evosl5`, `evosl5h`)

| Setting | Key | Default |
|---|---|---|
| Outer Ring Color | `evosl4` | EventON primary color |
| Dot Color | `evosl5` | `#a5a5a5` |
| Dot Color (on Hover) | `evosl5h` | EventON primary color |

There is no slider-specific settings tab and no per-slider configuration stored in wp_options. All behavioural options are set per-shortcode at insertion time (see §2 below).

---

## 2. Shortcode Generator Integration

eventon-slider registers itself in EventON's shortcode popup generator via the `eventon_shortcode_popup` filter. When a content editor opens the EventON shortcode builder, an "Event Slider" option appears alongside the standard calendar shortcode. Selecting it reveals the following configuration fields:

| Option | Shortcode Attribute | Type | Values / Notes |
|---|---|---|---|
| Calendar ID | `cal_id` | text | Standard EventON calendar filter |
| Slider Type | `slider_type` | select | `def` (single event), `multi` (multi horizontal), `mini` (mini horizontal), `micro` (micro horizontal), `vertical` |
| Slides Visible at Once | `slides_visible` | select | 1–5; overridden to 1 when `slider_type=def` |
| Slide Display Style | `slide_style` | select | `def` (data only), `imgbg` (image as background), `imgtop` (image above data), `imgleft` (image left of data — single type only) |
| Slide Controls Display Style | `control_style` | select | `def` (bottom arrow circles), `Dbac` (dark bottom arrow circles), `tb` (top/bottom arrow bars), `lr` (left/right arrow bars), `lrc` (left/right arrow circles) |
| Enable Nav Dots | `slide_nav_dots` | yes/no | Adds dot indicators below slider |
| Auto Start and Slide | `slide_auto` | yes/no | Autoplay on load |
| Pause Between Slides (ms) | `slider_pause` | select | 2000, 4000, 6000, 8000, 10000 (shown only when `slide_auto=yes`) |
| Pause Autoplay on Hover | `slide_pause_hover` | yes/no | Shown only when `slide_auto=yes` |
| Transition Duration (ms) | `slider_speed` | select | 200, 400, 600, 800, 1000 |
| Hide Slide Controls | `slide_hide_control` | yes/no | Hides prev/next arrows entirely |
| Open Events As | `ux_val` | select | Lightbox popup (`3`), Single Events Page (`4`), Do not interact (`X`) |
| Select Event List Type | `el_type` | select | `ue` (upcoming), `pe` (past events) |
| Event Cut-off | `pec` | select | Current Time, Current Date, Fixed Time |
| Number of Months | `number_of_months` | text | 0 = default (one month from current) |
| Event Count Limit | `event_count` | text | 0 = unlimited |
| Event Order | `event_order` | (shared EventON field) | ASC / DESC |
| Hide Multiple Occurrences | `hide_mult_occur` | (shared EventON field) | |
| Show All Repeating Events While HMO | `show_repeats` | yes/no | |
| Event Type / Type 2 | `event_type`, `event_type_2` | (shared EventON fields) | Category/type taxonomy filters |
| Featured Events Only | `only_ft` | (shared EventON field) | |

The shortcode tag is `[add_eventon_slider]`. All standard EventON event-query arguments (`cal_id`, `event_type`, `event_count`, etc.) are merged in from EventON's supported defaults at render time.

---

## 3. Per-Event Configuration

There is no per-event metabox or event-level toggle. The slider operates purely on EventON's standard event query — it shows whatever events match the shortcode filters. No event-level opt-in or opt-out exists.

---

## Dateline Design Notes

The admin surface is minimal: a palette section in a shared settings tab, and shortcode parameters as the configuration mechanism. A Dateline equivalent needs only a `<EventCarousel>` component accepting the equivalent query props. No dedicated settings page is needed — palette overrides can be handled via CSS custom properties or a theme layer.
