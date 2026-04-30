# eventon-full-cal — Overview

**Version:** 2.1.3  
**Classification:** P2 add-on (month-grid calendar view)  
**Entry point:** `eventon-full-cal.php` → `EventON_full_cal` singleton  
**Requires:** EventON ≥ 4.8, WP ≥ 6.0  

## File Census

```
eventon-full-cal.php              — bootstrap, singleton
includes/
  class-frontend.php              — evofc_frontend: hook wiring, JS data, AJAX
  class-shortcode.php             — evo_fc_shortcode: [add_eventon_fc] shortcode
  class-ajax.php                  — AJAX handlers
  class-evo-fc-widget.php         — WordPress widget
  admin/admin-init.php            — settings
assets/
  fc_styles.css
  fc_script.js                    — Handlebars-based grid rendering
guide.php / images/               — admin guide
```

## Architecture

This plugin **wraps EventON's existing list calendar** with a month-grid overlay rendered via Handlebars templates on the client side.

- `evofc_frontend.getCAL()` calls `EVO()->calendar->_get_initial_calendar($atts)` with `calendar_type='fullcal'`.
- EventON's AJAX system returns event data; `fc_script.js` processes it using Handlebars templates injected via `init_ajax_data` filter.
- Two grid UX modes: standard (grid + list below) and lightbox (`grid_ux=2`, events open in modal).
- View switcher integration: adds "Month" button to EventON's view switcher.
- Widget support for sidebar placement.

## PHP Helper

```php
add_eventon_fc($args='')  // Drop-in PHP template function (bypasses shortcode)
```

## Key Design Pattern

Data flow is fully client-side post-initial-load. The calendar loads the EventON list calendar; `fc_script.js` reads event date data and renders the grid without additional server round-trips beyond EventON's standard AJAX pagination.

## Dateline Relevance

Lightweight view add-on. The month-grid pattern is a common requirement (P2). Dateline needs its own month-grid view component — this plugin shows the data shape needed: day-indexed events within a month range, with optional heat-map coloring (`evofc_heat` setting).
