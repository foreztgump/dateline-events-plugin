---
plugin: eventon-slider
version: 2.1
analyzed: 2026-04-30
analyst: static-analysis
phase: 2
doc: 06-integrations
---

# eventon-slider 2.1 — Integrations

---

## Integration Architecture

eventon-slider has a single hard dependency (EventON core) and no optional integrations. It does not detect or conditionally load code for any other add-on. There are no webhooks, no REST endpoints, no external API calls, and no third-party JS libraries.

---

## 1. EventON Core (Required)

**Type:** Hard dependency.
**Check:** `plugins_loaded`; plugin self-disables with admin notice if `$GLOBALS['eventon']` or `evo_addons` class is absent.

The plugin delegates all event data retrieval to EventON's generator:

| EventON API used | Purpose |
|---|---|
| `EVO()->frontend->load_evo_scripts_styles()` | Ensure EventON's base CSS/JS are loaded when shortcode is used |
| `EVO()->evo_generator->get_supported_shortcode_atts()` | Merge all standard EventON shortcode attributes into slider args |
| `EVO()->calendar->process_arguments($args)` | Run EventON's standard argument processing (date ranges, filters, etc.) |
| `EVO()->evo_generator->_generate_events('html')` | Render the event list HTML that JS then converts into slides |
| `EVO()->calendar->body->print_evo_cal_data()` | Output the inline JSON data script tag that carries shortcode args to the frontend JS |
| `EVO()->elements->get_preload_html()` | Render the loading skeleton placeholder |
| `eventon_appearance_add` filter | Inject slider colour settings into EventON's Appearance tab |
| `eventon_inline_styles_array` filter | Emit slider colour overrides as inline CSS |
| `eventon_shortcode_popup` filter | Register the Event Slider option in EventON's shortcode generator UI |
| `eventon_shortcode_defaults` filter | Add slider-specific default attributes to EventON's shortcode arg registry |
| `eventon_cal_class` filter | Append `evoSL` class to the calendar container so CSS can target slider context |
| `evo_addons` class | Addon registration and version compatibility check |

---

## 2. No Third-Party JavaScript Libraries

The slider functionality is implemented entirely in `assets/evosl_script.js` as a custom jQuery plugin. It does **not** include or require Swiper.js, Slick Carousel, Flickity, Owl Carousel, or any other external carousel library. The only JavaScript dependency is jQuery (loaded by WordPress core). Slide transitions are achieved via jQuery's `.animate()` with margin-based translation.

---

## 3. No Other Add-On Integrations

Unlike eventon-rsvp or eventon-tickets, the slider has no integration files for other EventON add-ons (Virtual Events, QR Code, Webhooks, ActionUser, etc.). It operates purely as a display wrapper around EventON's existing event list output.

---

## Integration Summary Table

| Integration | Required? | Direction | Key API |
|---|---|---|---|
| EventON Core | Yes | Bidirectional | Multiple hooks + generator classes |
| jQuery | Yes (via WP) | Consumed | `animate()`, DOM manipulation |
| Any third-party carousel library | No | — | Not used |
| Other EventON add-ons | No | — | Not integrated |

---

## Dateline Design Notes

The absence of external dependencies makes this the simplest port in the add-on set. A Dateline `<EventCarousel>` component needs only the event list data API (already required by other views) and a CSS/JS carousel implementation. Any modern carousel library (Embla, Keen-Slider, CSS `scroll-snap`) is a valid replacement for the custom jQuery implementation — no compatibility constraints from the original.
