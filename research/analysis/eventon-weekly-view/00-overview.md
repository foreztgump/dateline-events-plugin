# eventon-weekly-view — Overview

**Version:** 2.1.4  
**Classification:** P2 add-on (week layout view)  
**Entry point:** `eventon-weekly-view.php` → `eventon_weeklyview` singleton  
**Requires:** EventON ≥ 4.6, WP ≥ 6.0  

## File Census

```
eventon-weekly-view.php            — bootstrap, singleton
includes/
  class-frontend.php               — EVOWV_frontend: hook wiring, JS data
  class-shortcode.php              — EVOWV_shortcode: [eventon_wv] shortcode
  class-ajax.php                   — AJAX handlers
  admin/admin-init.php             — settings
assets/
  wv_styles.css
  wv_script.js
guide.php / images/
```

## Architecture

Structurally identical to `eventon-full-cal`. A rendering wrapper over EventON's existing event list calendar, using `calendar_type='weekview'` (or equivalent) to activate a client-side week layout rendered via EventON's AJAX/JS system.

```
eventon_weeklyview
  └─ EVOWV_shortcode: [eventon_wv] → EVOWV_frontend.getCAL()
  └─ EVOWV_frontend: hooks into EventON's event list + AJAX pipeline
  └─ wv_script.js: renders 7-column week grid from EventON event data
```

## PHP Helper

```php
add_eventon_wv($args='')  // Direct PHP template call
```

## Key Difference from Full-Cal

Week view shows 7 columns (Mon–Sun or Sun–Sat) with events placed in their day column. Navigation advances/retreats by 7 days rather than by month. Data shape is identical to full-cal (events with start/end unix timestamps); the only difference is the rendering logic and navigation increment.
