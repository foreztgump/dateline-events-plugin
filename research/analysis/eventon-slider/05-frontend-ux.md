---
plugin: eventon-slider
version: 2.1
analyzed: 2026-04-30
analyst: static-analysis
phase: 2
doc: 05-frontend-ux
note: >
  Static analysis of PHP and JS source files. No live site walkthrough — P3
  priority. Source at research/sources/eventon-slider/.
---

# eventon-slider 2.1 — Frontend UX

---

## Display Model

The slider is a full replacement for the standard EventON calendar/list view — not an overlay or sidebar widget. Placing `[add_eventon_slider]` on a page renders a self-contained carousel block. Events are fetched via EventON's standard event-list generator and wrapped in slide containers by the plugin's own JS (`evosl_script.js`). There is no lightbox, no calendar navigation, no month-switching — just a horizontal (or vertical) scroll through a set of events.

---

## 1. HTML Structure

The slider outputs the following DOM skeleton:

```html
<div id="evcal_calendar_{id}" class="ajde_evcal_calendar evoslider evosliderbox {type}Slider cs_{control} ss_{style} sltac evoSL">
  <div class="evo_slider_outter">
    <!-- preload skeleton (5 placeholder bars) -->
    <div class="eventon_events_list" style="display:none">
      <!-- EventON event items: .eventon_list_event -->
      <!-- JS wraps each in: <div class="slide sl" data-index="N"> -->
    </div>
  </div>
  <div class="evosl_footer_outter">
    <div class="evosl_footer">
      <!-- navigation controls injected by JS -->
    </div>
  </div>
  <!-- EventON inline data script tag (shortcode args as JSON) -->
</div>
```

CSS class names on the root element encode the configured options:
- `{slider_type}Slider` — e.g. `defSlider`, `multiSlider`, `miniSlider`, `microSlider`, `verticalSlider`
- `cs_{control_style}` — e.g. `cs_def`, `cs_tb`, `cs_lr`, `cs_lrc`, `cs_Dbac`
- `ss_{slide_style}` — e.g. `ss_def`, `ss_imgbg`, `ss_imgtop`, `ss_imgleft`
- `rtlslider` — added when EventON's RTL option is active

---

## 2. Slide Types

### `def` — Default Single-Event Slider

One event visible at a time. `slides_visible` is forced to 1. Each slide fills the full slider width. Best for featured-event spotlight use.

### `multi` — Multi-Events Horizontal Scroll

Multiple events visible simultaneously (1–5 set via `slides_visible`). Slide width is `container_width / slides_visible`. On smaller screens the visible count is reduced to fit. The `imgleft` slide style is not supported and falls back to `imgtop`.

### `mini` — Mini Multi-Events Horizontal Scroll

Same as `multi` but slides_visible is calculated automatically from container width at 200px per slide. `imgtop` slide style is not supported and falls back to `def`.

### `micro` — Micro Multi-Events Horizontal Scroll

Same responsive calculation as `mini` but at 120px per slide. Intended for compact sidebars or narrow columns.

### `vertical` — Vertical Scroll

Slides are stacked vertically; the container height is set to `max_slide_height × slides_visible`. Navigation moves up/down rather than left/right.

---

## 3. Slide Content (Fields Displayed)

Each `.eventon_list_event` element is rendered by EventON core and contains the standard event card data. The slider plugin does not add or remove fields — it inherits whatever EventON renders per event. Typical fields:

- Event color accent (applied as `background-color` on the slide `div`)
- Event title
- Date / time
- Location (if set)
- Event type badge

When a slide style other than `def` is used, featured image display is enabled (`show_et_ft_img=yes` is forced, plus EventON `tiles=yes`). The image treatment depends on `slide_style`:

| `slide_style` | Image treatment |
|---|---|
| `def` | No image |
| `imgbg` | Event featured image as full-bleed slide background (`tile_bg=1`, `tile_style=0`) |
| `imgtop` | Featured image above event data block (`tile_style=1`) |
| `imgleft` | Featured image to the left of data (single-event type only; falls back to `imgtop` for `multi`) |

Slides with a dark event color automatically receive the `sldark` CSS class, which can invert text colors for readability.

---

## 4. Navigation Controls

Navigation is injected by `evosl_script.js` after layout calculation. The injection location and markup depend on `control_style`:

| `control_style` | Control position | Markup |
|---|---|---|
| `def` | Below slider (in `.evosl_footer`) | Left arrow circle + dot indicators (if enabled) + right arrow circle |
| `Dbac` | Below slider | Same as `def` but with dark styling via CSS class |
| `tb` | Top and bottom of `.evo_slider_outter` | Bar-style arrow buttons prepended/appended to outter |
| `lr` | Left and right of `.evo_slider_outter` | Same as `tb`, horizontal placement |
| `lrc` | Left and right (circular) | Same bar injection but CSS renders circles |

All navigation uses `<span class="evoslider_nav nav prev/next">` containing a FontAwesome arrow icon (`fa-angle-left` / `fa-angle-right`).

**Hide controls:** Setting `slide_hide_control=yes` suppresses prev/next insertion entirely.

**Nav dots:** When `slide_nav_dots=yes`, a `<span class="evoslider_dots">` is appended with one `<span>` per slide. Clicking a dot jumps to that slide. The active dot is styled via the admin-configured color (`evosl4` outer ring, `evosl5` fill, `evosl5h` hover fill).

---

## 5. Autoplay

When `slide_auto=yes`, the slider starts advancing automatically after initial layout. `slider_pause` controls the dwell time per slide (default 2000 ms); `slider_speed` controls the CSS transition duration (default 400 ms). When `slide_pause_hover=yes`, a `mouseenter` listener pauses the interval and `mouseleave` resumes it.

---

## 6. Responsive Behavior

The JS recalculates slide widths on `window.resize`. For `mini` and `micro` types, `slides_visible` is recalculated from the current container width on each resize event. For `multi` with a fixed `slides_visible`, the individual slide width shrinks proportionally. The vertical type recalculates the container height based on the tallest slide.

---

## 7. Slide Transition Mechanics

The plugin implements its own CSS-transform/jQuery-animate slider — it does **not** use Swiper, Slick, Flickity, or any other third-party carousel library. Slide movement is achieved by translating the `.eventon_events_list` container. The animation uses jQuery's `.animate()` with `{ marginLeft }` or equivalent CSS transform. `slider_speed` is passed directly to jQuery's animation duration argument.

---

## 8. Event Interaction

Clicking a slide opens the event according to `ux_val`:
- `3` — EventON lightbox popup (default)
- `4` — Navigate to single event page
- `X` — No interaction (slide is non-clickable)

This is handled by EventON core's standard event-open mechanism; the slider plugin does not intercept click events.

---

## 9. Loading State

Before the event list is populated and slide widths calculated, the plugin shows a preload skeleton: five full-width placeholder bars of 50px height each, horizontally centred (class `evofx_ai_c`), generated by `EVO()->elements->get_preload_html()`. The `.eventon_events_list` is hidden (`display:none`) until JS calls `fadeIn()` after layout is complete.

---

## 10. Enqueued Assets

- `evosl_styles` — `assets/evosl_styles.css` (layout, slide types, control styles, responsive breakpoints)
- `evosl_script` — `assets/evosl_script.js` (custom slider JS, jQuery dependency, footer placement)

Both are registered on `init` priority 15 via `register_styles_scripts()`. Scripts are enqueued immediately (not conditionally per-page); styles are enqueued via `wp_enqueue_scripts`.
